const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const { autoUpdater } = require('electron-updater');
const Logger = require('./logger');
const LicenseManager = require('./license');

let mainWindow;
let db;
let dbPath;
let logger;
let licenseManager;

// ─── Window state persistence ─────────────────────────────────────────────
const windowStatePath = () => path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(windowStatePath(), 'utf8'));
  } catch { return { width: 1400, height: 900 }; }
}

function saveWindowState(win) {
  if (win.isMaximized() || win.isMinimized()) return;
  try {
    const bounds = win.getBounds();
    fs.writeFileSync(windowStatePath(), JSON.stringify(bounds));
  } catch {}
}

// ─── Auto-updater setup ────────────────────────────────────────────────────
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
if (isDev) {
  autoUpdater.updateConfigPath = path.join(__dirname, '../../dev-app-update.yml');
}

function sendUpdaterStatus(status, extra = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', { status, ...extra });
  }
}

autoUpdater.on('checking-for-update', () => sendUpdaterStatus('checking'));
autoUpdater.on('update-available', (info) =>
  sendUpdaterStatus('available', { version: info.version, releaseNotes: info.releaseNotes || '' })
);
autoUpdater.on('update-not-available', () => sendUpdaterStatus('not-available'));
autoUpdater.on('download-progress', (p) =>
  sendUpdaterStatus('downloading', { percent: Math.round(p.percent), bytesPerSecond: p.bytesPerSecond })
);
autoUpdater.on('update-downloaded', (info) =>
  sendUpdaterStatus('downloaded', { version: info.version })
);
autoUpdater.on('error', (err) =>
  sendUpdaterStatus('error', { error: err.message })
);

function initDatabase() {
  const Database = require('better-sqlite3');
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'cybercafe.db');
  
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    
    INSERT OR IGNORE INTO settings VALUES ('club_name', 'CyberCafe');
    INSERT OR IGNORE INTO settings VALUES ('currency', 'сом');
  `);

  // Rooms
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'standard',
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    INSERT OR IGNORE INTO rooms (id, name, type, color) VALUES 
      (1, 'Общий зал', 'standard', '#6366f1'),
      (2, 'VIP', 'vip', '#f59e0b'),
      (3, 'Комфорт', 'comfort', '#10b981');
  `);

  // Computers
  db.exec(`
    CREATE TABLE IF NOT EXISTS computers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      room_id INTEGER,
      rate_per_hour REAL DEFAULT 0,
      status TEXT DEFAULT 'free',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );
  `);

  // Products (warehouse)
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'other',
      price REAL NOT NULL,
      cost_price REAL DEFAULT 0,
      stock_quantity INTEGER DEFAULT 0,
      unit TEXT DEFAULT 'шт',
      photo TEXT,
      is_active INTEGER DEFAULT 1,
      discount_percent REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Product categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT DEFAULT '📦',
      color TEXT DEFAULT '#6366f1'
    );
    
    INSERT OR IGNORE INTO product_categories (id, name, icon, color) VALUES
      (1, 'Напитки', '🥤', '#3b82f6'),
      (2, 'Еда', '🍕', '#f59e0b'),
      (3, 'Снеки', '🍿', '#10b981'),
      (4, 'Прочее', '📦', '#6b7280');
  `);

  // Orders (bills)
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'open',
      room_id INTEGER,
      computer_amount REAL DEFAULT 0,
      products_amount REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      notes TEXT,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME,
      FOREIGN KEY (room_id) REFERENCES rooms(id)
    );
  `);

  // Order computers
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_computers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      computer_id INTEGER,
      computer_name TEXT,
      hours REAL DEFAULT 0,
      amount REAL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
  `);

  // Order items (products)
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      quantity INTEGER DEFAULT 1,
      price REAL NOT NULL,
      discount_percent REAL DEFAULT 0,
      total REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  // Stock movements
  db.exec(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations
  try { db.exec('ALTER TABLE orders ADD COLUMN customer_name TEXT DEFAULT ""'); } catch {}
  try { db.exec('ALTER TABLE order_computers ADD COLUMN rate_per_hour REAL DEFAULT 0'); } catch {}

  console.log('Database initialized at:', dbPath);
}

function createWindow() {
  const saved = loadWindowState();
  mainWindow = new BrowserWindow({
    width: saved.width || 1400,
    height: saved.height || 900,
    x: saved.x,
    y: saved.y,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, '../../assets/icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Save window state on resize/move
  ['resize', 'move'].forEach(evt => mainWindow.on(evt, () => saveWindowState(mainWindow)));

  // Confirm close if open orders exist
  mainWindow.on('close', (e) => {
    try {
      const openCount = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='open'").get()?.c || 0;
      if (openCount > 0) {
        e.preventDefault();
        dialog.showMessageBox(mainWindow, {
          type: 'warning',
          buttons: ['Закрыть всё равно', 'Отмена'],
          defaultId: 1,
          cancelId: 1,
          title: 'Открытые счета',
          message: `Есть ${openCount} открыт${openCount === 1 ? 'ый' : 'ых'} счёт${openCount === 1 ? '' : 'а'}`,
          detail: 'Данные сохранены в базе, счета останутся открытыми. Закрыть приложение?',
        }).then(({ response }) => { if (response === 0) mainWindow.destroy(); });
      }
    } catch {}
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../build/index.html'));
  }
}

app.whenReady().then(async () => {
  const userDataPath = app.getPath('userData');

  // ── Logger (init first so everything below can use it) ──────────────────
  logger = new Logger(path.join(userDataPath, 'error.log'));
  logger.prune();
  logger.info(`App started v${app.getVersion()}`);

  // ── License check ────────────────────────────────────────────────────────
  try {
    const { machineId } = require('node-machine-id');
    const mid = await machineId();
    licenseManager = new LicenseManager(userDataPath, mid);
    const dateCheck = licenseManager.checkDateIntegrity();
    if (dateCheck.suspicious) {
      logger.warn('Date integrity warning: ' + dateCheck.reason);
    }
    const status = licenseManager.getStatus();
    logger.info(`License status: ${status.status}${status.expiresAt ? ' expires ' + status.expiresAt : ''}`);
  } catch (e) {
    logger.error('License init error', e);
  }

  // Catch unhandled exceptions in main process
  process.on('uncaughtException', (err) => {
    logger && logger.error('Uncaught exception', err);
  });
  process.on('unhandledRejection', (reason) => {
    logger && logger.error('Unhandled rejection', reason instanceof Error ? reason : new Error(String(reason)));
  });

  initDatabase();
  createWindow();

  // Auto-backup on startup
  try {
    const backupDir = db.prepare("SELECT value FROM settings WHERE key='backup_path'").get()?.value;
    if (backupDir && fs.existsSync(backupDir)) {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const dest = path.join(backupDir, `cybercafe-${stamp}.db`);
      db.backup(dest).catch(() => {});
      // Keep only last 7 backups
      const files = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('cybercafe-') && f.endsWith('.db'))
        .map(f => ({ f, t: fs.statSync(path.join(backupDir, f)).mtimeMs }))
        .sort((a, b) => b.t - a.t);
      files.slice(7).forEach(({ f }) => { try { fs.unlinkSync(path.join(backupDir, f)); } catch {} });
    }
  } catch {}

  // Check for updates 3 seconds after window ready (only in packaged app)
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {});
    }, 3000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Updater IPC ───────────────────────────────────────────────────────────
ipcMain.handle('updater:getVersion', () => app.getVersion());
ipcMain.handle('updater:check', async () => {
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall();
});

// ─── Low stock ─────────────────────────────────────────────────────────────
ipcMain.handle('products:lowStock', (_, threshold = 5) => {
  return db.prepare('SELECT * FROM products WHERE stock_quantity <= ? AND is_active = 1 ORDER BY stock_quantity ASC').all(threshold);
});

// ─── Backup ────────────────────────────────────────────────────────────────
ipcMain.handle('backup:chooseDir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'], title: 'Выберите папку для резервных копий' });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('backup:getSavedPath', () => {
  return db.prepare("SELECT value FROM settings WHERE key='backup_path'").get()?.value || '';
});

ipcMain.handle('backup:setSavedPath', (_, p) => {
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('backup_path', ?)").run(p);
  return true;
});

ipcMain.handle('backup:create', async (_, dir) => {
  if (!dir || !fs.existsSync(dir)) return { ok: false, error: 'Папка не найдена' };
  try {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    const dest = path.join(dir, `cybercafe-${stamp}.db`);
    await db.backup(dest);
    // Keep last 7
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('cybercafe-') && f.endsWith('.db'))
      .map(f => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    files.slice(7).forEach(({ f }) => { try { fs.unlinkSync(path.join(dir, f)); } catch {} });
    return { ok: true, path: dest };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('backup:list', (_, dir) => {
  if (!dir || !fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.startsWith('cybercafe-') && f.endsWith('.db'))
    .map(f => {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      return { name: f, path: full, size: Math.round(stat.size / 1024), date: stat.mtime.toISOString() };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
});

ipcMain.handle('backup:restore', async (_, filePath) => {
  if (!fs.existsSync(filePath)) return { ok: false, error: 'Файл не найден' };
  try {
    db.close();
    fs.copyFileSync(filePath, dbPath);
    app.relaunch();
    app.exit(0);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ─── Stock movements ───────────────────────────────────────────────────────
ipcMain.handle('stock:restock', (_, productId, qty, note) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return { ok: false };
  db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(qty, productId);
  db.prepare("INSERT INTO stock_movements (product_id, product_name, type, quantity, note) VALUES (?, ?, 'restock', ?, ?)").run(productId, product.name, qty, note || '');
  return { ok: true, newQty: (product.stock_quantity + qty) };
});

ipcMain.handle('stock:getMovements', (_, productId) => {
  return db.prepare('SELECT * FROM stock_movements WHERE product_id = ? ORDER BY created_at DESC LIMIT 100').all(productId);
});

ipcMain.handle('stock:getAllMovements', () => {
  return db.prepare(`
    SELECT m.*, p.stock_quantity as current_qty
    FROM stock_movements m LEFT JOIN products p ON m.product_id = p.id
    ORDER BY m.created_at DESC LIMIT 200
  `).all();
});

// ─── Window controls ───────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ─── Settings ──────────────────────────────────────────────────────────────
ipcMain.handle('settings:get', () => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
});
ipcMain.handle('settings:set', (_, key, value) => {
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  return true;
});

// ─── Rooms ─────────────────────────────────────────────────────────────────
ipcMain.handle('rooms:getAll', () => db.prepare('SELECT * FROM rooms ORDER BY id').all());
ipcMain.handle('rooms:create', (_, room) => {
  const stmt = db.prepare('INSERT INTO rooms (name, type, color) VALUES (?, ?, ?)');
  const result = stmt.run(room.name, room.type, room.color || '#6366f1');
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(result.lastInsertRowid);
});
ipcMain.handle('rooms:update', (_, id, room) => {
  db.prepare('UPDATE rooms SET name=?, type=?, color=? WHERE id=?').run(room.name, room.type, room.color, id);
  return db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
});
ipcMain.handle('rooms:delete', (_, id) => {
  db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
  return true;
});

// ─── Computers ─────────────────────────────────────────────────────────────
ipcMain.handle('computers:getAll', () => {
  return db.prepare(`
    SELECT c.*, r.name as room_name, r.color as room_color, r.type as room_type
    FROM computers c LEFT JOIN rooms r ON c.room_id = r.id
    ORDER BY r.id, c.name
  `).all();
});
ipcMain.handle('computers:create', (_, comp) => {
  const result = db.prepare('INSERT INTO computers (name, room_id, rate_per_hour) VALUES (?, ?, ?)').run(comp.name, comp.room_id, comp.rate_per_hour || 0);
  return db.prepare('SELECT c.*, r.name as room_name FROM computers c LEFT JOIN rooms r ON c.room_id = r.id WHERE c.id = ?').get(result.lastInsertRowid);
});
ipcMain.handle('computers:update', (_, id, comp) => {
  db.prepare('UPDATE computers SET name=?, room_id=?, rate_per_hour=? WHERE id=?').run(comp.name, comp.room_id, comp.rate_per_hour, id);
  return true;
});
ipcMain.handle('computers:delete', (_, id) => {
  db.prepare('DELETE FROM computers WHERE id = ?').run(id);
  return true;
});

// ─── Products ──────────────────────────────────────────────────────────────
ipcMain.handle('products:getAll', () => db.prepare('SELECT * FROM products WHERE is_active=1 ORDER BY category, name').all());
ipcMain.handle('products:getAllIncludeInactive', () => db.prepare('SELECT * FROM products ORDER BY category, name').all());
ipcMain.handle('products:create', (_, product) => {
  const result = db.prepare(`
    INSERT INTO products (name, category, price, cost_price, stock_quantity, unit, photo, discount_percent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(product.name, product.category || 'other', product.price, product.cost_price || 0, product.stock_quantity || 0, product.unit || 'шт', product.photo || null, product.discount_percent || 0);
  return db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
});
ipcMain.handle('products:update', (_, id, product) => {
  db.prepare(`
    UPDATE products SET name=?, category=?, price=?, cost_price=?, stock_quantity=?,
    unit=?, photo=?, discount_percent=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(product.name, product.category, product.price, product.cost_price, product.stock_quantity, product.unit, product.photo, product.discount_percent, product.is_active ?? 1, id);
  return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
});
ipcMain.handle('products:delete', (_, id) => {
  db.prepare('UPDATE products SET is_active=0 WHERE id=?').run(id);
  return true;
});
ipcMain.handle('products:categories', () => db.prepare('SELECT * FROM product_categories ORDER BY id').all());

// ─── Bulk Import ────────────────────────────────────────────────────────────
ipcMain.handle('rooms:importBulk', (_, rows) => {
  const ins = db.prepare('INSERT INTO rooms (name, type, color) VALUES (?, ?, ?)');
  const run = db.transaction(() => {
    for (const r of rows) ins.run(r.name, r.type || 'standard', r.color || '#6366f1');
  });
  run();
  return db.prepare('SELECT * FROM rooms ORDER BY id').all();
});

ipcMain.handle('computers:importBulk', (_, rows) => {
  const ins = db.prepare('INSERT INTO computers (name, room_id, rate_per_hour) VALUES (?, ?, ?)');
  const run = db.transaction(() => {
    for (const r of rows) ins.run(r.name, r.room_id || null, r.rate_per_hour || 0);
  });
  run();
  return true;
});

ipcMain.handle('products:importBulk', (_, rows) => {
  const ins = db.prepare(`
    INSERT INTO products (name, category, price, cost_price, stock_quantity, unit, discount_percent)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const run = db.transaction(() => {
    for (const r of rows) ins.run(r.name, r.category || '1', r.price || 0, r.cost_price || 0, r.stock_quantity || 0, r.unit || 'шт', r.discount_percent || 0);
  });
  run();
  return true;
});

// ─── Orders ────────────────────────────────────────────────────────────────
function generateOrderNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0,10).replace(/-/g,'');
  const timeStr = now.toTimeString().slice(0,8).replace(/:/g,'');
  return `#${dateStr}-${timeStr}`;
}

ipcMain.handle('orders:getAll', (_, filter) => {
  let query = `
    SELECT o.*, r.name as room_name, r.color as room_color
    FROM orders o LEFT JOIN rooms r ON o.room_id = r.id
  `;
  const params = [];
  const where = [];
  if (filter?.status) { where.push('o.status = ?'); params.push(filter.status); }
  if (filter?.dateFrom) { where.push('date(o.opened_at) >= ?'); params.push(filter.dateFrom); }
  if (filter?.dateTo) { where.push('date(o.opened_at) <= ?'); params.push(filter.dateTo); }
  if (filter?.search) {
    const s = `%${filter.search}%`;
    where.push("(o.customer_name LIKE ? OR r.name LIKE ? OR o.order_number LIKE ?)");
    params.push(s, s, s);
  }
  if (where.length) query += ' WHERE ' + where.join(' AND ');
  query += ' ORDER BY o.opened_at DESC';
  return db.prepare(query).all(...params);
});

ipcMain.handle('orders:getById', (_, id) => {
  const order = db.prepare('SELECT o.*, r.name as room_name FROM orders o LEFT JOIN rooms r ON o.room_id = r.id WHERE o.id = ?').get(id);
  if (!order) return null;
  order.computers = db.prepare('SELECT * FROM order_computers WHERE order_id = ?').all(id);
  order.items = db.prepare(`
    SELECT oi.*, p.photo as product_photo FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(id);
  return order;
});

ipcMain.handle('orders:create', (_, orderData) => {
  const number = generateOrderNumber();
  const totalComputer = orderData.computer_amount || 0;
  const totalProducts = (orderData.items || []).reduce((s, i) => s + i.total, 0);
  const discountAmt = ((totalComputer + totalProducts) * (orderData.discount_percent || 0)) / 100;
  const total = totalComputer + totalProducts - discountAmt;

  const result = db.prepare(`
    INSERT INTO orders (order_number, status, room_id, customer_name, computer_amount, products_amount, total_amount, discount_percent, discount_amount, notes)
    VALUES (?, 'open', ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(number, orderData.room_id || null, orderData.customer_name || '', totalComputer, totalProducts, total, orderData.discount_percent || 0, discountAmt, orderData.notes || '');

  const orderId = result.lastInsertRowid;

  if (orderData.computers?.length) {
    const insComp = db.prepare('INSERT INTO order_computers (order_id, computer_id, computer_name, hours, rate_per_hour, amount) VALUES (?,?,?,?,?,?)');
    for (const c of orderData.computers) insComp.run(orderId, c.computer_id || null, c.computer_name, c.hours || 0, c.rate_per_hour || 0, c.amount || 0);
  }
  if (orderData.items?.length) {
    const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, price, discount_percent, total) VALUES (?,?,?,?,?,?,?)');
    for (const item of orderData.items) {
      insItem.run(orderId, item.product_id || null, item.product_name, item.quantity, item.price, item.discount_percent || 0, item.total);
      if (item.product_id) db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.quantity, item.product_id);
    }
  }
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
});

ipcMain.handle('orders:update', (_, id, orderData) => {
  // Restore stock from old items
  const oldItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  for (const item of oldItems) {
    if (item.product_id) db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.product_id);
  }
  
  db.prepare('DELETE FROM order_computers WHERE order_id = ?').run(id);
  db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);

  const totalComputer = orderData.computer_amount || 0;
  const totalProducts = (orderData.items || []).reduce((s, i) => s + i.total, 0);
  const discountAmt = ((totalComputer + totalProducts) * (orderData.discount_percent || 0)) / 100;
  const total = totalComputer + totalProducts - discountAmt;

  db.prepare(`
    UPDATE orders SET room_id=?, customer_name=?, computer_amount=?, products_amount=?, total_amount=?,
    discount_percent=?, discount_amount=?, notes=? WHERE id=?
  `).run(orderData.room_id || null, orderData.customer_name || '', totalComputer, totalProducts, total, orderData.discount_percent || 0, discountAmt, orderData.notes || '', id);

  if (orderData.computers?.length) {
    const ins = db.prepare('INSERT INTO order_computers (order_id, computer_id, computer_name, hours, rate_per_hour, amount) VALUES (?,?,?,?,?,?)');
    for (const c of orderData.computers) ins.run(id, c.computer_id || null, c.computer_name, c.hours || 0, c.rate_per_hour || 0, c.amount || 0);
  }
  if (orderData.items?.length) {
    const ins = db.prepare('INSERT INTO order_items (order_id, product_id, product_name, quantity, price, discount_percent, total) VALUES (?,?,?,?,?,?,?)');
    for (const item of orderData.items) {
      ins.run(id, item.product_id || null, item.product_name, item.quantity, item.price, item.discount_percent || 0, item.total);
      if (item.product_id) db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(item.quantity, item.product_id);
    }
  }
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
});

ipcMain.handle('orders:close', (_, id) => {
  db.prepare("UPDATE orders SET status='closed', closed_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
  return true;
});
ipcMain.handle('orders:cancel', (_, id) => {
  // Restore stock
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  for (const item of items) {
    if (item.product_id) db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(item.quantity, item.product_id);
  }
  db.prepare("UPDATE orders SET status='cancelled', closed_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
  return true;
});

ipcMain.handle('orders:merge', (_, orderIds) => {
  if (!orderIds || orderIds.length < 2) return null;
  const orders = orderIds.map(id => db.prepare('SELECT * FROM orders WHERE id = ?').get(id));
  const totalComputer = orders.reduce((s, o) => s + (o.computer_amount || 0), 0);
  const totalProducts = orders.reduce((s, o) => s + (o.products_amount || 0), 0);
  const total = totalComputer + totalProducts;

  const number = generateOrderNumber() + '-M';
  const result = db.prepare(`
    INSERT INTO orders (order_number, status, room_id, computer_amount, products_amount, total_amount, notes)
    VALUES (?, 'open', ?, ?, ?, ?, ?)
  `).run(number, orders[0].room_id, totalComputer, totalProducts, total, 'Объединённый счёт');

  const newId = result.lastInsertRowid;
  for (const oid of orderIds) {
    db.prepare('UPDATE order_computers SET order_id=? WHERE order_id=?').run(newId, oid);
    db.prepare('UPDATE order_items SET order_id=? WHERE order_id=?').run(newId, oid);
    db.prepare("UPDATE orders SET status='cancelled' WHERE id=?").run(oid);
  }
  return db.prepare('SELECT * FROM orders WHERE id = ?').get(newId);
});

// ─── License ───────────────────────────────────────────────────────────────
ipcMain.handle('license:getMachineId', async () => {
  if (licenseManager) return licenseManager.getMachineId();
  try {
    const { machineId } = require('node-machine-id');
    return await machineId();
  } catch (e) { return 'unavailable'; }
});

ipcMain.handle('license:getStatus', () => {
  if (!licenseManager) return { status: 'none' };
  return licenseManager.getStatus();
});

ipcMain.handle('license:activate', (_, keyStr) => {
  if (!licenseManager) return { ok: false, error: 'Менеджер лицензий не инициализирован' };
  const result = licenseManager.activate(keyStr);
  if (result.ok) logger && logger.info('License activated successfully');
  else logger && logger.warn('License activation failed: ' + result.error);
  return result;
});

ipcMain.handle('license:getDateIntegrity', () => {
  if (!licenseManager) return { suspicious: false };
  return licenseManager.checkDateIntegrity();
});

// ─── Logs ─────────────────────────────────────────────────────────────────
ipcMain.handle('logs:read', () => logger ? logger.read() : '');
ipcMain.handle('logs:clear', () => { if (logger) logger.clear(); return true; });
ipcMain.handle('logs:getPath', () => logger ? logger.getPath() : null);
ipcMain.handle('logs:download', async () => {
  if (!logger) return { ok: false };
  const logPath = logger.getPath();
  if (!fs.existsSync(logPath)) return { ok: false, error: 'Лог-файл пуст' };
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Сохранить лог-файл',
      defaultPath: 'cybercafe-error.log',
      filters: [{ name: 'Log files', extensions: ['log', 'txt'] }],
    });
    if (result.canceled) return { ok: false };
    fs.copyFileSync(logPath, result.filePath);
    shell.showItemInFolder(result.filePath);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ─── Reports ───────────────────────────────────────────────────────────────
ipcMain.handle('reports:summary', (_, dateFrom, dateTo) => {
  const base = `FROM orders WHERE status='closed' AND date(closed_at) BETWEEN ? AND ?`;
  const revenue = db.prepare(`SELECT COALESCE(SUM(total_amount),0) as total, COALESCE(SUM(computer_amount),0) as computers, COALESCE(SUM(products_amount),0) as products, COUNT(*) as count ${base}`).get(dateFrom, dateTo);
  const daily = db.prepare(`SELECT date(closed_at) as date, SUM(total_amount) as total, SUM(computer_amount) as computers, SUM(products_amount) as products, COUNT(*) as count ${base} GROUP BY date(closed_at) ORDER BY date`).all(dateFrom, dateTo);
  const topProducts = db.prepare(`
    SELECT oi.product_name, SUM(oi.quantity) as qty, SUM(oi.total) as revenue
    FROM order_items oi JOIN orders o ON oi.order_id = o.id
    WHERE o.status='closed' AND date(o.closed_at) BETWEEN ? AND ?
    GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 10
  `).all(dateFrom, dateTo);
  return { revenue, daily, topProducts };
});
