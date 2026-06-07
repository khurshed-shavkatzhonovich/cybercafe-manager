/**
 * CyberCafe Manager — One-time RSA key pair generation
 * Run ONCE: node scripts/generate-keys.js
 * Then copy the PUBLIC KEY output into src/main/license.js (PUBLIC_KEY constant)
 * KEEP private.pem secret — never commit it to git
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const keysDir = path.join(__dirname, 'license-keys');
if (!fs.existsSync(keysDir)) fs.mkdirSync(keysDir, { recursive: true });

const privateKeyPath = path.join(keysDir, 'private.pem');
const publicKeyPath = path.join(keysDir, 'public.pem');

if (fs.existsSync(privateKeyPath)) {
  console.log('⚠️  Ключи уже существуют в scripts/license-keys/');
  console.log('   Удали их вручную, если хочешь сгенерировать новые.');
  console.log('   ВНИМАНИЕ: Новые ключи сделают все существующие лицензии недействительными!\n');
  const existing = fs.readFileSync(publicKeyPath, 'utf8');
  console.log('Текущий публичный ключ (уже должен быть в src/main/license.js):');
  console.log(existing);
  process.exit(0);
}

console.log('Генерируем RSA-2048 ключевую пару...');
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
fs.writeFileSync(publicKeyPath, publicKey);

console.log('✅ Ключи созданы:');
console.log('   Приватный: scripts/license-keys/private.pem  (СЕКРЕТНО, не коммитить!)');
console.log('   Публичный: scripts/license-keys/public.pem\n');
console.log('══════════════════════════════════════════════════════════════════');
console.log('СЛЕДУЮЩИЙ ШАГ: Скопируй этот публичный ключ в src/main/license.js');
console.log('(замени строку REPLACE_ME_RUN_generate-keys на содержимое ниже):');
console.log('══════════════════════════════════════════════════════════════════');
console.log(publicKey);
