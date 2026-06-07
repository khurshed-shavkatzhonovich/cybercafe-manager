const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// RSA public key — generated once with scripts/generate-keys.js
// Private key stays in scripts/license-keys/private.pem (developer only, not in git)
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuBcRfDctTtqbO3h5uDOU
N3Poqujw9/CBchEjfNcCrxau5ldXqP0L7GKnnDp2g1kjnwvWKGmcxMNcum3F4EIX
JRhaN3HM09rMbPGs26dP4v++NvCuRw6pr4cDGv0saYbelwPB2Wat2ARYHf6JOvsQ
DF73V5HFo1AooJ1KbYQkhB1SkXUaU6PcqvKHFYdx/MEKMVvRcpXz6bg5YIQJBTOD
ntWxdzI+S3r8FjIYCXaCwgEuP1VGD46QBUZMX/wBZn3fqdYGrg8AifIyry4x/5CD
9mF9DXeA4TXO2jUoiTw6kf70xph8QlP0yjeRzXijx4o59oV0Xliy4zvpGHOGWxHJ
xwIDAQAB
-----END PUBLIC KEY-----`;

// License states:
//   active     — valid, more than 14 days remaining
//   grace      — valid, 0–14 days remaining (warning shown, app works normally)
//   readonly   — expired, read-only mode (can view and close open orders)
//   invalid    — signature wrong or machine mismatch
//   none       — no license file found (activation required)

class LicenseManager {
  constructor(userDataPath, machineId) {
    this.licensePath = path.join(userDataPath, '.lic');
    this.metaPath = path.join(userDataPath, '.meta');
    this.rawMachineId = machineId;
    this.machineIdHash = crypto.createHash('sha256').update(machineId).digest('hex');
  }

  getMachineId() { return this.rawMachineId; }

  _verifySignature(dataStr, signatureB64) {
    try {
      const verify = crypto.createVerify('SHA256');
      verify.update(dataStr);
      return verify.verify(PUBLIC_KEY, signatureB64, 'base64');
    } catch { return false; }
  }

  validate(keyStr) {
    try {
      const dot = keyStr.trim().lastIndexOf('.');
      if (dot === -1) return { valid: false, error: 'Неверный формат ключа' };
      const dataB64 = keyStr.trim().slice(0, dot);
      const sigB64 = keyStr.trim().slice(dot + 1);
      if (!dataB64 || !sigB64) return { valid: false, error: 'Неверный формат ключа' };

      let dataStr;
      try { dataStr = Buffer.from(dataB64, 'base64url').toString('utf8'); } catch { return { valid: false, error: 'Ошибка декодирования ключа' }; }

      if (!this._verifySignature(dataStr, sigB64)) {
        return { valid: false, error: 'Подпись ключа недействительна' };
      }

      const data = JSON.parse(dataStr);
      if (data.m !== this.machineIdHash) {
        return { valid: false, error: 'Ключ привязан к другому компьютеру' };
      }
      return { valid: true, data };
    } catch (e) {
      return { valid: false, error: 'Ошибка проверки: ' + e.message };
    }
  }

  getStatus() {
    try {
      if (!fs.existsSync(this.licensePath)) return { status: 'none' };
      const keyStr = fs.readFileSync(this.licensePath, 'utf8').trim();
      if (!keyStr) return { status: 'none' };

      const { valid, data, error } = this.validate(keyStr);
      if (!valid) return { status: 'invalid', error };

      const now = new Date();
      const expiry = new Date(data.e);
      const daysLeft = Math.floor((expiry - now) / 86400000);

      const base = {
        clubName: data.c,
        issuedAt: data.i,
        expiresAt: data.e,
        licenseType: data.t,
        daysLeft,
      };

      if (daysLeft > 14) return { status: 'active', ...base };
      if (daysLeft >= 0) return { status: 'grace', ...base };
      return { status: 'readonly', ...base };
    } catch (e) {
      return { status: 'invalid', error: 'Ошибка чтения лицензии: ' + e.message };
    }
  }

  activate(keyStr) {
    const { valid, data, error } = this.validate(keyStr);
    if (!valid) return { ok: false, error };
    try {
      fs.writeFileSync(this.licensePath, keyStr.trim(), 'utf8');
      return { ok: true, data };
    } catch (e) {
      return { ok: false, error: 'Не удалось сохранить лицензию: ' + e.message };
    }
  }

  // Hybrid date integrity check — detects clock rollback
  // Returns { suspicious: bool, reason: string }
  checkDateIntegrity() {
    const now = Date.now();
    const result = { suspicious: false, reason: '' };
    try {
      if (fs.existsSync(this.metaPath)) {
        const raw = fs.readFileSync(this.metaPath, 'utf8');
        const meta = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        const { firstRun, lastRun } = meta;

        // System clock is more than 2 days behind the last recorded run
        if (lastRun && now < lastRun - 172800000) {
          const lastDate = new Date(lastRun).toLocaleDateString('ru');
          result.suspicious = true;
          result.reason = `Системные часы переведены назад. Последний запуск: ${lastDate}`;
        }
        // System clock is before the very first run (impossible normally)
        if (!result.suspicious && firstRun && now < firstRun - 86400000) {
          result.suspicious = true;
          result.reason = 'Системная дата раньше даты первого запуска приложения';
        }

        // Update meta
        fs.writeFileSync(
          this.metaPath,
          Buffer.from(JSON.stringify({ firstRun: firstRun || now, lastRun: now })).toString('base64'),
          'utf8'
        );
      } else {
        fs.writeFileSync(
          this.metaPath,
          Buffer.from(JSON.stringify({ firstRun: now, lastRun: now })).toString('base64'),
          'utf8'
        );
      }
    } catch {}
    return result;
  }
}

module.exports = LicenseManager;
