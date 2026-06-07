/**
 * CyberCafe Manager — License Key Generator (Developer Tool)
 * Usage: node scripts/generate-license.js
 *
 * Requirements:
 *   - scripts/license-keys/private.pem must exist (run generate-keys.js first)
 *
 * Workflow:
 *   1. Get Machine ID from client (shown in app → Settings → Лицензия tab)
 *   2. Run this script
 *   3. Send the generated key to the client
 *   4. Client enters the key in Settings → Лицензия tab
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const privateKeyPath = path.join(__dirname, 'license-keys', 'private.pem');
if (!fs.existsSync(privateKeyPath)) {
  console.error('❌ Приватный ключ не найден!');
  console.error('   Запусти сначала: node scripts/generate-keys.js');
  process.exit(1);
}

const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

async function main() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('   CyberCafe Manager — Генератор лицензионных ключей');
  console.log('══════════════════════════════════════════════════════\n');

  const machineId = (await ask('Machine ID клиента (из приложения → Настройки → Лицензия): ')).trim();
  if (!machineId) { console.error('❌ Machine ID не введён'); rl.close(); process.exit(1); }

  const clubName = (await ask('Название клуба: ')).trim() || 'CyberCafe';

  const typeInput = (await ask('Тип лицензии (1=Годовая, 2=Двухлетняя, 3=Бессрочная) [1]: ')).trim() || '1';
  const typeMap = { '1': { t: 'annual', days: 365, label: 'Годовая' }, '2': { t: 'biennial', days: 730, label: 'Двухлетняя' }, '3': { t: 'lifetime', days: 0, label: 'Бессрочная' } };
  const licType = typeMap[typeInput] || typeMap['1'];

  rl.close();

  const machineIdHash = crypto.createHash('sha256').update(machineId).digest('hex');
  const now = new Date();
  const expiry = licType.days === 0 ? new Date('2099-12-31') : new Date(now.getTime() + licType.days * 86400000);

  const payload = {
    m: machineIdHash,
    c: clubName,
    i: now.toISOString().slice(0, 10),
    e: expiry.toISOString().slice(0, 10),
    t: licType.t,
  };

  const dataStr = JSON.stringify(payload);
  const dataB64 = Buffer.from(dataStr).toString('base64url');

  const sign = crypto.createSign('SHA256');
  sign.update(dataStr);
  const signature = sign.sign(privateKey, 'base64');

  const licenseKey = `${dataB64}.${signature}`;

  console.log('\n══════════════════════════════════════════════════════');
  console.log('✅ ЛИЦЕНЗИОННЫЙ КЛЮЧ СГЕНЕРИРОВАН:');
  console.log('══════════════════════════════════════════════════════');
  console.log(licenseKey);
  console.log('══════════════════════════════════════════════════════');
  console.log(`Клуб:     ${clubName}`);
  console.log(`Тип:      ${licType.label}`);
  console.log(`Выдан:    ${now.toLocaleDateString('ru')}`);
  console.log(`Действует до: ${expiry.toLocaleDateString('ru')}`);
  console.log('══════════════════════════════════════════════════════');
  console.log('\nОтправь этот ключ клиенту. Он вводит его в:');
  console.log('Настройки → Лицензия → поле "Введите ключ"\n');

  // Save to log file
  const logPath = path.join(__dirname, 'license-keys', 'issued-licenses.log');
  const logEntry = `[${now.toISOString()}] Club="${clubName}" Type=${licType.t} MachineID=${machineId.slice(0, 12)}... Expires=${expiry.toISOString().slice(0,10)}\n`;
  fs.appendFileSync(logPath, logEntry, 'utf8');
  console.log(`Запись сохранена в: scripts/license-keys/issued-licenses.log`);
}

main().catch(e => { console.error('Ошибка:', e.message); rl.close(); process.exit(1); });
