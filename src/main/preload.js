const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // Rooms
  getRooms: () => ipcRenderer.invoke('rooms:getAll'),
  createRoom: (room) => ipcRenderer.invoke('rooms:create', room),
  updateRoom: (id, room) => ipcRenderer.invoke('rooms:update', id, room),
  deleteRoom: (id) => ipcRenderer.invoke('rooms:delete', id),

  // Computers
  getComputers: () => ipcRenderer.invoke('computers:getAll'),
  createComputer: (comp) => ipcRenderer.invoke('computers:create', comp),
  updateComputer: (id, comp) => ipcRenderer.invoke('computers:update', id, comp),
  deleteComputer: (id) => ipcRenderer.invoke('computers:delete', id),

  // Products
  getProducts: () => ipcRenderer.invoke('products:getAll'),
  getAllProducts: () => ipcRenderer.invoke('products:getAllIncludeInactive'),
  createProduct: (p) => ipcRenderer.invoke('products:create', p),
  updateProduct: (id, p) => ipcRenderer.invoke('products:update', id, p),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  getProductCategories: () => ipcRenderer.invoke('products:categories'),
  getLowStockProducts: (threshold) => ipcRenderer.invoke('products:lowStock', threshold),

  // Orders
  getOrders: (filter) => ipcRenderer.invoke('orders:getAll', filter),
  getOrderById: (id) => ipcRenderer.invoke('orders:getById', id),
  createOrder: (data) => ipcRenderer.invoke('orders:create', data),
  updateOrder: (id, data) => ipcRenderer.invoke('orders:update', id, data),
  closeOrder: (id) => ipcRenderer.invoke('orders:close', id),
  cancelOrder: (id) => ipcRenderer.invoke('orders:cancel', id),
  mergeOrders: (ids) => ipcRenderer.invoke('orders:merge', ids),

  // Reports
  getReportsSummary: (from, to) => ipcRenderer.invoke('reports:summary', from, to),

  // Bulk import
  importRooms: (rows) => ipcRenderer.invoke('rooms:importBulk', rows),
  importComputers: (rows) => ipcRenderer.invoke('computers:importBulk', rows),
  importProducts: (rows) => ipcRenderer.invoke('products:importBulk', rows),

  // Auto-updater
  getVersion: () => ipcRenderer.invoke('updater:getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  installUpdate: () => ipcRenderer.invoke('updater:install'),
  onUpdateStatus: (cb) => ipcRenderer.on('updater:status', (_, data) => cb(data)),
  offUpdateStatus: () => ipcRenderer.removeAllListeners('updater:status'),

  // Backup
  chooseBackupDir: () => ipcRenderer.invoke('backup:chooseDir'),
  getBackupPath: () => ipcRenderer.invoke('backup:getSavedPath'),
  setBackupPath: (p) => ipcRenderer.invoke('backup:setSavedPath', p),
  createBackup: (dir) => ipcRenderer.invoke('backup:create', dir),
  listBackups: (dir) => ipcRenderer.invoke('backup:list', dir),
  restoreBackup: (filePath) => ipcRenderer.invoke('backup:restore', filePath),

  // Stock movements
  restockProduct: (productId, qty, note) => ipcRenderer.invoke('stock:restock', productId, qty, note),
  getStockMovements: (productId) => ipcRenderer.invoke('stock:getMovements', productId),
  getAllStockMovements: () => ipcRenderer.invoke('stock:getAllMovements'),

  // License
  getMachineId: () => ipcRenderer.invoke('license:getMachineId'),
  getLicenseStatus: () => ipcRenderer.invoke('license:getStatus'),
  activateLicense: (key) => ipcRenderer.invoke('license:activate', key),
  getDateIntegrity: () => ipcRenderer.invoke('license:getDateIntegrity'),

  // Logs
  readLogs: () => ipcRenderer.invoke('logs:read'),
  clearLogs: () => ipcRenderer.invoke('logs:clear'),
  downloadLogs: () => ipcRenderer.invoke('logs:download'),
});
