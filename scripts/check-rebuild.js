/**
 * Checks if better-sqlite3 is compiled for the current Electron ABI.
 * Runs electron-rebuild automatically if not.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const markerFile = path.join(__dirname, '..', 'node_modules', '.electron-rebuild-done');

function getElectronABI() {
  try {
    const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'package.json');
    const { version } = JSON.parse(fs.readFileSync(electronPath, 'utf8'));
    return version;
  } catch {
    return null;
  }
}

function getNativeABI() {
  try {
    const bindingPath = path.join(
      __dirname, '..', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'
    );
    // Read the first bytes to find NODE_MODULE_VERSION
    // It's embedded in the binary as "NODE_MODULE_VERSION=XXX"
    const buf = fs.readFileSync(bindingPath);
    const str = buf.toString('latin1');
    const match = str.match(/NODE_MODULE_VERSION[\x00=](\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

const electronVersion = getElectronABI();
let markerVersion = '';
try { markerVersion = fs.readFileSync(markerFile, 'utf8').trim(); } catch {}

if (markerVersion === electronVersion) {
  // Already rebuilt for this Electron version
  process.exit(0);
}

console.log('\x1b[33m[check-rebuild]\x1b[0m Rebuilding better-sqlite3 for Electron ' + electronVersion + '...');
try {
  execSync('npx electron-rebuild -f -w better-sqlite3', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });
  fs.writeFileSync(markerFile, electronVersion);
  console.log('\x1b[32m[check-rebuild]\x1b[0m Done.');
} catch (e) {
  console.error('\x1b[31m[check-rebuild]\x1b[0m Rebuild failed:', e.message);
  process.exit(1);
}
