const fs = require('fs');

class Logger {
  constructor(logPath) {
    this.logPath = logPath;
  }

  _write(level, message, error) {
    try {
      const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
      let line = `[${ts}] [${level}] ${message}`;
      if (error) {
        line += ' | ' + (error instanceof Error ? (error.stack || error.message) : String(error));
      }
      fs.appendFileSync(this.logPath, line + '\n', 'utf8');
    } catch {}
  }

  info(msg) { this._write('INFO', msg); }
  warn(msg) { this._write('WARN', msg); }
  error(msg, err) { this._write('ERROR', msg, err); if (err) console.error('[CCM]', msg, err); }

  // Remove entries older than 30 days
  prune() {
    try {
      if (!fs.existsSync(this.logPath)) return;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const lines = fs.readFileSync(this.logPath, 'utf8').split('\n').filter(l => {
        if (!l.trim()) return false;
        const m = l.match(/^\[(\d{4}-\d{2}-\d{2})/);
        return m ? new Date(m[1]) >= cutoff : true;
      });
      fs.writeFileSync(this.logPath, lines.join('\n') + (lines.length ? '\n' : ''), 'utf8');
    } catch {}
  }

  // Read last N lines
  read(limit = 300) {
    try {
      if (!fs.existsSync(this.logPath)) return '';
      const lines = fs.readFileSync(this.logPath, 'utf8').split('\n').filter(Boolean);
      return lines.slice(-limit).join('\n');
    } catch { return ''; }
  }

  clear() {
    try { fs.writeFileSync(this.logPath, '', 'utf8'); } catch {}
  }

  getPath() { return this.logPath; }
}

module.exports = Logger;
