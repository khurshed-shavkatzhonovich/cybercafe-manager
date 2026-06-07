import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Save, Monitor, Upload, FileSpreadsheet, Check, AlertCircle, RefreshCw, Download, Zap, KeyRound, Copy, ShieldCheck, ShieldAlert, ShieldX, ScrollText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useApp, useToast } from '../App';

// ── ESC hook ──────────────────────────────────────────────────────────────────
function useEscClose(onClose) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
}

// ── Room Modal ────────────────────────────────────────────────────────────────
function RoomModal({ room, onClose, onSave }) {
  const showToast = useToast();
  useEscClose(onClose);
  const PRESETS = ['standard', 'vip', 'comfort'];
  const PRESET_LABELS = { standard: 'Стандарт', vip: 'VIP', comfort: 'Комфорт' };
  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];

  const initType = room?.type || 'standard';
  const isCustom = initType && !PRESETS.includes(initType);
  const [form, setForm] = useState({ name: '', color: '#6366f1', ...room, type: isCustom ? '__custom__' : initType });
  const [customType, setCustomType] = useState(isCustom ? initType : '');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { showToast('Введите название', 'error'); return; }
    const finalType = form.type === '__custom__' ? (customType.trim() || 'other') : form.type;
    try {
      if (room?.id) await window.api.updateRoom(room.id, { ...form, type: finalType });
      else await window.api.createRoom({ ...form, type: finalType });
      showToast(room?.id ? 'Комната обновлена' : 'Комната добавлена');
      onSave();
    } catch { showToast('Ошибка при сохранении', 'error'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">{room?.id ? 'Редактировать комнату' : 'Новая комната'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Название</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="VIP зал" autoFocus />
          </div>
          <div className="form-group">
            <label>Тип</label>
            <select className="select" value={form.type} onChange={e => set('type', e.target.value)}>
              {PRESETS.map(v => <option key={v} value={v}>{PRESET_LABELS[v]}</option>)}
              <option value="__custom__">Другое (своё название)</option>
            </select>
            {form.type === '__custom__' && (
              <input
                className="input"
                style={{ marginTop: 8 }}
                value={customType}
                onChange={e => setCustomType(e.target.value)}
                placeholder="Например: Игровой зал, Лаунж..."
                autoFocus
              />
            )}
          </div>
          <div className="form-group">
            <label>Цвет</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => set('color', c)} style={{
                  width: 28, height: 28, borderRadius: 7, background: c, cursor: 'pointer',
                  border: `2px solid ${form.color === c ? 'white' : 'transparent'}`,
                  outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
                }} />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={submit}>{room?.id ? 'Сохранить' : 'Добавить'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Computer Modal ────────────────────────────────────────────────────────────
function ComputerModal({ computer, rooms, onClose, onSave }) {
  const showToast = useToast();
  useEscClose(onClose);
  const [form, setForm] = useState({ name: '', room_id: '', rate_per_hour: 0, ...computer });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { showToast('Введите название', 'error'); return; }
    try {
      const payload = { ...form, room_id: form.room_id ? Number(form.room_id) : null, rate_per_hour: Number(form.rate_per_hour) || 0 };
      if (computer?.id) await window.api.updateComputer(computer.id, payload);
      else await window.api.createComputer(payload);
      showToast(computer?.id ? 'Компьютер обновлён' : 'Компьютер добавлен');
      onSave();
    } catch { showToast('Ошибка при сохранении', 'error'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">{computer?.id ? 'Редактировать ПК' : 'Новый ПК'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Название / Номер</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="ПК-1 или VIP-3" autoFocus />
          </div>
          <div className="form-group">
            <label>Комната</label>
            <select className="select" value={form.room_id || ''} onChange={e => set('room_id', e.target.value)}>
              <option value="">— Без комнаты —</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Тариф (сом/час)</label>
            <input className="input" type="number" min={0} value={form.rate_per_hour} onChange={e => set('rate_per_hour', e.target.value)} placeholder="0" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={submit}>{computer?.id ? 'Сохранить' : 'Добавить'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Excel Import Modal ────────────────────────────────────────────────────────
function ImportModal({ type, rooms, onClose, onDone }) {
  const showToast = useToast();
  useEscClose(onClose);
  const fileRef = useRef();
  const [preview, setPreview] = useState(null); // parsed rows
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const CONFIGS = {
    rooms: {
      title: 'Импорт комнат из Excel',
      columns: ['Название', 'Тип', 'Цвет'],
      hint: 'Тип: standard / vip / comfort — или любое своё название (например "Игровой зал"). Цвет: HEX (#6366f1) — необязательно.',
      example: [['Общий зал', 'standard', '#6366f1'], ['VIP зал', 'vip', '#f59e0b'], ['Игровой', 'Игровой', '#06b6d4']],
      parse: row => {
        const rawType = String(row[1] || '').trim();
        const type = rawType || 'standard';
        return { name: String(row[0] || '').trim(), type, color: String(row[2] || '#6366f1').trim() };
      },
      validate: r => r.name,
    },
    computers: {
      title: 'Импорт компьютеров из Excel',
      columns: ['Название', 'Комната (название)', 'Тариф сом/ч'],
      hint: 'Укажите точное название комнаты как в системе. Тариф — необязательно.',
      example: [['ПК-1', 'Общий зал', '30'], ['ПК-2', 'Общий зал', '30'], ['VIP-1', 'VIP зал', '60']],
      parse: (row, roomsMap) => {
        const roomName = String(row[1] || '').trim();
        const room = roomsMap[roomName.toLowerCase()];
        return { name: String(row[0] || '').trim(), room_id: room?.id || null, rate_per_hour: Number(row[2]) || 0, _roomName: roomName };
      },
      validate: r => r.name,
    },
  };

  const cfg = CONFIGS[type];

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [cfg.columns, ...cfg.example];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = cfg.columns.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Данные');
    XLSX.writeFile(wb, `template_${type}.xlsx`);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        // Skip header row (first row)
        const dataRows = raw.slice(1).filter(r => r.some(cell => String(cell).trim()));
        if (!dataRows.length) { setError('Файл пустой или содержит только заголовки'); return; }

        const roomsMap = {};
        if (rooms) rooms.forEach(r => { roomsMap[r.name.toLowerCase()] = r; });

        const parsed = dataRows.map(row => cfg.parse(row, roomsMap)).filter(r => cfg.validate(r));
        if (!parsed.length) { setError('Нет валидных строк. Проверьте формат.'); return; }
        setPreview(parsed);
      } catch (ex) {
        setError('Не удалось прочитать файл: ' + ex.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!preview?.length) return;
    setImporting(true);
    try {
      if (type === 'rooms') await window.api.importRooms(preview);
      if (type === 'computers') await window.api.importComputers(preview);
      showToast(`Импортировано ${preview.length} записей`);
      onDone();
    } catch (ex) {
      showToast('Ошибка импорта: ' + ex.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 580, maxHeight: '85vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={18} color="var(--accent-green)" />
            {cfg.title}
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Instructions */}
        <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Формат файла</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{cfg.hint}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {cfg.columns.map(c => (
                    <th key={c} style={{ padding: '4px 10px', background: 'var(--bg-active)', color: 'var(--accent-light)', fontWeight: 700, textAlign: 'left', borderRadius: 4 }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cfg.example.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: '4px 10px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={downloadTemplate}>
            <Upload size={13} /> Скачать шаблон .xlsx
          </button>
        </div>

        {/* File picker */}
        {!preview && (
          <div
            onClick={() => fileRef.current.click()}
            style={{
              border: '2px dashed var(--border)', borderRadius: 12, padding: 32,
              textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <FileSpreadsheet size={32} color="var(--text-muted)" style={{ marginBottom: 8 }} />
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Выберите Excel-файл</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>.xlsx, .xls, .csv</div>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '10px 14px', color: 'var(--accent-red)', fontSize: 13 }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={16} color="var(--accent-green)" />
                <span style={{ fontWeight: 700 }}>Готово к импорту: {preview.length} строк</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setPreview(null); setError(''); fileRef.current.value = ''; }}>
                Выбрать другой файл
              </button>
            </div>
            <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)', position: 'sticky', top: 0 }}>
                    {cfg.columns.map(c => (
                      <th key={c} style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700 }}>{c}</th>
                    ))}
                    {type === 'computers' && <th style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>Статус</th>}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '5px 10px' }}>{row.name}</td>
                      {type === 'rooms' && <>
                        <td style={{ padding: '5px 10px', color: 'var(--text-muted)' }}>{row.type}</td>
                        <td style={{ padding: '5px 10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 14, height: 14, borderRadius: 4, background: row.color }} />
                            {row.color}
                          </div>
                        </td>
                      </>}
                      {type === 'computers' && <>
                        <td style={{ padding: '5px 10px', color: 'var(--text-muted)' }}>{row._roomName || '—'}</td>
                        <td style={{ padding: '5px 10px', color: 'var(--text-muted)' }}>{row.rate_per_hour} сом/ч</td>
                        <td style={{ padding: '5px 10px' }}>
                          {row.room_id
                            ? <span style={{ color: 'var(--accent-green)', fontSize: 11 }}>✓ Комната найдена</span>
                            : row._roomName
                              ? <span style={{ color: 'var(--accent-red)', fontSize: 11 }}>⚠ Комната не найдена</span>
                              : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Без комнаты</span>}
                        </td>
                      </>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={!preview || importing} onClick={handleImport}>
            {importing ? 'Импорт...' : `Импортировать ${preview ? preview.length : ''} записей`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Updates Tab ───────────────────────────────────────────────────────────────
function UpdatesTab({ appVersion, updateStatus, updateInfo }) {
  const showToast = useToast();
  const [checking, setChecking] = useState(false);

  const statusLabels = {
    idle: { text: 'Не проверялось', color: 'var(--text-muted)' },
    checking: { text: 'Проверяем...', color: 'var(--accent-light)' },
    'not-available': { text: 'Обновлений нет', color: 'var(--accent-green)' },
    available: { text: `Доступна версия ${updateInfo?.version || ''}`, color: 'var(--accent-gold)' },
    downloading: { text: `Скачивание... ${updateInfo?.percent || 0}%`, color: 'var(--accent-light)' },
    downloaded: { text: `Загружена v${updateInfo?.version || ''} — готова к установке`, color: 'var(--accent-green)' },
    error: { text: 'Ошибка: ' + (updateInfo?.error || ''), color: 'var(--accent-red)' },
  };

  const st = statusLabels[updateStatus] || statusLabels.idle;

  const handleCheck = async () => {
    setChecking(true);
    const res = await window.api.checkForUpdates?.();
    setChecking(false);
    if (res && !res.ok) showToast('Нет доступа к серверу обновлений', 'error');
  };

  const handleDownload = async () => {
    const res = await window.api.downloadUpdate?.();
    if (res && !res.ok) showToast('Ошибка загрузки: ' + res.error, 'error');
  };

  const handleInstall = () => {
    window.api.installUpdate?.();
  };

  return (
    <div style={{ maxWidth: 540 }}>
      <div className="card">
        {/* Current version */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Zap size={24} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>CyberCafe Manager</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
              Текущая версия: v{appVersion}
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Статус обновления
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(updateStatus === 'checking' || checking) && (
              <RefreshCw size={14} color="var(--accent-light)" style={{ animation: 'spin 1s linear infinite' }} />
            )}
            {updateStatus === 'downloading' && (
              <Download size={14} color="var(--accent-light)" />
            )}
            {updateStatus === 'downloaded' && (
              <Check size={14} color="var(--accent-green)" />
            )}
            <span style={{ fontSize: 13, color: st.color, fontWeight: 600 }}>{st.text}</span>
          </div>

          {/* Download progress bar */}
          {updateStatus === 'downloading' && updateInfo?.percent !== undefined && (
            <div style={{ marginTop: 10, background: 'var(--bg-hover)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 4, width: `${updateInfo.percent}%`, transition: 'width 0.3s' }} />
            </div>
          )}
        </div>

        {/* Update available info */}
        {(updateStatus === 'available' || updateStatus === 'downloaded') && updateInfo?.version && (
          <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Версия {updateInfo.version}</div>
            {updateInfo.releaseNotes && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, whiteSpace: 'pre-wrap' }}>
                {typeof updateInfo.releaseNotes === 'string' ? updateInfo.releaseNotes : ''}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {(updateStatus === 'idle' || updateStatus === 'not-available' || updateStatus === 'error') && (
            <button className="btn btn-primary" onClick={handleCheck} disabled={checking || updateStatus === 'checking'}>
              <RefreshCw size={14} />
              {checking || updateStatus === 'checking' ? 'Проверяем...' : 'Проверить обновления'}
            </button>
          )}
          {updateStatus === 'available' && (
            <button className="btn btn-primary" onClick={handleDownload}>
              <Download size={14} /> Скачать обновление
            </button>
          )}
          {updateStatus === 'downloaded' && (
            <button className="btn btn-primary" onClick={handleInstall} style={{ background: 'var(--accent-green)', borderColor: 'var(--accent-green)' }}>
              <Zap size={14} /> Установить и перезапустить
            </button>
          )}
          {updateStatus === 'downloading' && (
            <button className="btn btn-secondary" disabled>
              <Download size={14} /> Скачивание {updateInfo?.percent || 0}%...
            </button>
          )}
        </div>

        <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          Приложение автоматически проверяет обновления при каждом запуске.
          После загрузки обновления оно установится при следующем запуске или через кнопку выше.
        </div>
      </div>
    </div>
  );
}

// ── Backup Tab ────────────────────────────────────────────────────────────────
function BackupTab() {
  const showToast = useToast();
  const [backupPath, setBackupPath] = useState('');
  const [backups, setBackups] = useState([]);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    window.api.getBackupPath?.().then(p => {
      setBackupPath(p || '');
      if (p) loadBackups(p);
    });
  }, []);

  const loadBackups = async (dir) => {
    const list = await window.api.listBackups?.(dir) || [];
    setBackups(list);
  };

  const chooseDir = async () => {
    const dir = await window.api.chooseBackupDir?.();
    if (!dir) return;
    await window.api.setBackupPath?.(dir);
    setBackupPath(dir);
    loadBackups(dir);
    showToast('Папка сохранена');
  };

  const createNow = async () => {
    if (!backupPath) { showToast('Сначала выберите папку', 'error'); return; }
    setCreating(true);
    const res = await window.api.createBackup?.(backupPath);
    setCreating(false);
    if (res?.ok) { showToast('Резервная копия создана'); loadBackups(backupPath); }
    else showToast('Ошибка: ' + (res?.error || ''), 'error');
  };

  const restore = async (b) => {
    if (!window.confirm(`Восстановить базу данных из "${b.name}"?\n\nПриложение перезапустится автоматически.`)) return;
    setRestoring(b.path);
    await window.api.restoreBackup?.(b.path);
  };

  const fmt = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('ru', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ maxWidth: 580 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Папка резервных копий</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <input className="input" readOnly value={backupPath || 'Папка не выбрана'} style={{ flex: 1, color: backupPath ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'default' }} />
          <button className="btn btn-secondary" onClick={chooseDir}>Обзор...</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          При каждом запуске приложения автоматически создаётся копия. Хранятся последние 7 копий.
        </div>
        <button className="btn btn-primary" onClick={createNow} disabled={creating || !backupPath}>
          {creating ? 'Создаём...' : 'Создать копию сейчас'}
        </button>
      </div>

      {backups.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Доступные копии ({backups.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {backups.map((b, i) => (
              <div key={b.path} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--bg-hover)', borderRadius: 10,
                border: i === 0 ? '1px solid var(--accent)' : '1px solid transparent',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {i === 0 && <span style={{ fontSize: 10, background: 'var(--accent)', color: 'white', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>Последняя</span>}
                    {fmt(b.date)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{b.size} КБ</div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={restoring === b.path}
                  onClick={() => restore(b)}
                  style={{ fontSize: 11 }}
                >
                  {restoring === b.path ? 'Восстановление...' : 'Восстановить'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {backupPath && backups.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">💾</div>
          <div className="empty-state-text">Резервных копий ещё нет</div>
          <button className="btn btn-primary btn-sm" onClick={createNow}>Создать первую</button>
        </div>
      )}
    </div>
  );
}

// ── License Tab ───────────────────────────────────────────────────────────────
function LicenseTab() {
  const showToast = useToast();
  const { licenseStatus, licenseInfo, loadLicense } = useApp();
  const [machineId, setMachineId] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showRenewInput, setShowRenewInput] = useState(false);

  useEffect(() => {
    window.api?.getMachineId?.().then(id => setMachineId(id || ''));
  }, []);

  const copyText = async (text, setter) => {
    try { await navigator.clipboard.writeText(text); setter(true); setTimeout(() => setter(false), 2000); } catch {}
  };

  const handleActivate = async () => {
    const key = keyInput.trim();
    if (!key) { setError('Введите ключ'); return; }
    setActivating(true);
    setError('');
    const result = await window.api?.activateLicense?.(key);
    setActivating(false);
    if (result?.ok) {
      await loadLicense?.();
      showToast('Лицензия активирована');
      setShowRenewInput(false);
      setKeyInput('');
    } else {
      setError(result?.error || 'Неверный ключ');
    }
  };

  const statusConfig = {
    active: { color: 'var(--accent-green)', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: ShieldCheck, label: 'Активна' },
    grace: { color: 'var(--accent-gold)', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: ShieldAlert, label: 'Истекает' },
    readonly: { color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: ShieldX, label: 'Истекла (просмотр)' },
    invalid: { color: 'var(--accent-red)', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: ShieldX, label: 'Недействительна' },
    none: { color: 'var(--text-muted)', bg: 'var(--bg-hover)', border: 'var(--border)', icon: ShieldX, label: 'Не активирована' },
  };

  const cfg = statusConfig[licenseStatus] || statusConfig.none;
  const StatusIcon = cfg.icon;
  const hasLicense = licenseInfo && licenseStatus !== 'none' && licenseStatus !== 'invalid';
  const typeLabels = { annual: 'Годовая', biennial: 'Двухлетняя', lifetime: 'Бессрочная', trial: 'Пробная' };

  return (
    <div style={{ maxWidth: 520 }}>
      {/* Status Card */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Статус лицензии</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, marginBottom: hasLicense ? 16 : 0 }}>
          <StatusIcon size={22} color={cfg.color} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: cfg.color }}>{cfg.label}</div>
            {licenseStatus === 'grace' && licenseInfo && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Осталось {licenseInfo.daysLeft} {licenseInfo.daysLeft === 1 ? 'день' : licenseInfo.daysLeft < 5 ? 'дня' : 'дней'} — обновите ключ
              </div>
            )}
            {licenseStatus === 'readonly' && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Создание новых операций заблокировано</div>
            )}
          </div>
        </div>

        {hasLicense && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Клуб', licenseInfo.clubName],
              ['Тип', typeLabels[licenseInfo.licenseType] || licenseInfo.licenseType],
              ['Дата выдачи', licenseInfo.issuedAt],
              ['Действует до', licenseInfo.expiresAt],
            ].map(([label, value]) => value && (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Machine ID */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Идентификатор компьютера</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1, padding: '10px 14px', background: 'var(--bg-hover)',
            border: '1px solid var(--border)', borderRadius: 10,
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-primary)',
            wordBreak: 'break-all', lineHeight: 1.5,
          }}>
            {machineId || 'Загрузка...'}
          </div>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => copyText(machineId, setCopiedId)}
            title="Скопировать"
            style={{ color: copiedId ? 'var(--accent-green)' : undefined }}
          >
            {copiedId ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
          Отправьте этот идентификатор разработчику для получения лицензионного ключа
        </div>
      </div>

      {/* Activate / Renew */}
      {(!hasLicense || showRenewInput) && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>
            {hasLicense ? 'Обновить лицензию' : 'Ввести лицензионный ключ'}
          </div>
          <div className="form-group">
            <label>Лицензионный ключ</label>
            <textarea
              className="input"
              value={keyInput}
              onChange={e => { setKeyInput(e.target.value); setError(''); }}
              placeholder="Вставьте ключ, полученный от разработчика..."
              rows={4}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6, resize: 'vertical' }}
            />
          </div>
          {error && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)', borderRadius: 8, padding: '8px 12px', color: 'var(--accent-red)', fontSize: 12, marginBottom: 12 }}>
              <AlertCircle size={13} /> {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {showRenewInput && (
              <button className="btn btn-secondary" onClick={() => { setShowRenewInput(false); setKeyInput(''); setError(''); }}>Отмена</button>
            )}
            <button className="btn btn-primary" onClick={handleActivate} disabled={activating || !keyInput.trim()}>
              <KeyRound size={14} />
              {activating ? 'Проверка...' : 'Активировать'}
            </button>
          </div>
        </div>
      )}

      {hasLicense && !showRenewInput && (
        <button className="btn btn-secondary" onClick={() => setShowRenewInput(true)}>
          <KeyRound size={14} /> Обновить лицензионный ключ
        </button>
      )}
    </div>
  );
}

// ── Logs Tab ──────────────────────────────────────────────────────────────────
function LogsTab() {
  const showToast = useToast();
  const [logs, setLogs] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [downloading, setDownloading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const logsRef = useRef(null);

  const loadLogs = async () => {
    const content = await window.api?.readLogs?.() || '';
    setLogs(content);
  };

  useEffect(() => { loadLogs(); }, []);

  // Auto-scroll to bottom when logs load
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs, filter]);

  const filteredLines = logs.split('\n').filter(l => {
    if (!l.trim()) return false;
    if (filter === 'ALL') return true;
    return l.includes(`[${filter}]`);
  });

  const lineColor = (line) => {
    if (line.includes('[ERROR]')) return 'var(--accent-red)';
    if (line.includes('[WARN]')) return 'var(--accent-gold)';
    if (line.includes('[INFO]')) return 'var(--accent-light)';
    return 'var(--text-secondary)';
  };

  const handleDownload = async () => {
    setDownloading(true);
    const result = await window.api?.downloadLogs?.();
    setDownloading(false);
    if (result?.ok) showToast('Файл сохранён');
    else if (result?.error) showToast(result.error, 'error');
  };

  const handleClear = async () => {
    if (!window.confirm('Очистить лог-файл?')) return;
    setClearing(true);
    await window.api?.clearLogs?.();
    setLogs('');
    setClearing(false);
    showToast('Лог очищен');
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Журнал ошибок</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Filter buttons */}
            <div style={{ display: 'flex', gap: 2, background: 'var(--bg-hover)', borderRadius: 8, padding: 3 }}>
              {['ALL', 'ERROR', 'WARN', 'INFO'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '4px 10px', border: 'none', borderRadius: 6, cursor: 'pointer',
                  background: filter === f ? 'var(--bg-active)' : 'transparent',
                  color: filter === f
                    ? (f === 'ERROR' ? 'var(--accent-red)' : f === 'WARN' ? 'var(--accent-gold)' : f === 'INFO' ? 'var(--accent-light)' : 'var(--text-primary)')
                    : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
                }}>
                  {f}
                </button>
              ))}
            </div>
            <button className="btn btn-secondary btn-sm" onClick={loadLogs}><RefreshCw size={13} /></button>
            <button className="btn btn-secondary btn-sm" onClick={handleDownload} disabled={downloading}>
              <Download size={13} /> {downloading ? 'Сохраняем...' : 'Скачать'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleClear} disabled={clearing}>
              <X size={13} /> Очистить
            </button>
          </div>
        </div>

        {filteredLines.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <ScrollText size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>Записей нет</div>
          </div>
        ) : (
          <div
            ref={logsRef}
            style={{
              maxHeight: 480, overflowY: 'auto',
              background: '#0a0a10', borderRadius: 10, padding: '12px 14px',
              fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.7,
              border: '1px solid var(--border)',
            }}
          >
            {filteredLines.map((line, i) => (
              <div key={i} style={{ color: lineColor(line), wordBreak: 'break-all', padding: '1px 0' }}>
                {line}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-muted)' }}>
          Хранятся записи за последние 30 дней. Последние {filteredLines.length} строк.
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { settings, updateSetting, appVersion, updateStatus, updateInfo, licenseStatus } = useApp();
  const showToast = useToast();
  const [tab, setTab] = useState('general');
  const [rooms, setRooms] = useState([]);
  const [computers, setComputers] = useState([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [showCompModal, setShowCompModal] = useState(false);
  const [editComp, setEditComp] = useState(null);
  const [showImport, setShowImport] = useState(null); // 'rooms' | 'computers'
  const [clubName, setClubName] = useState(settings.club_name || '');
  const [currency, setCurrency] = useState(settings.currency || 'сом');

  useEffect(() => {
    setClubName(settings.club_name || '');
    setCurrency(settings.currency || 'сом');
  }, [settings.club_name, settings.currency]);

  const loadRooms = useCallback(async () => {
    const r = await window.api.getRooms();
    setRooms(r || []);
  }, []);

  const loadComps = useCallback(async () => {
    const c = await window.api.getComputers();
    setComputers(c || []);
  }, []);

  useEffect(() => { loadRooms(); loadComps(); }, [loadRooms, loadComps]);

  useEffect(() => {
    if (tab === 'rooms') loadRooms();
    if (tab === 'computers') { loadRooms(); loadComps(); }
  }, [tab]);

  const saveGeneral = async () => {
    await updateSetting('club_name', clubName);
    await updateSetting('currency', currency);
    showToast('Настройки сохранены');
  };

  const deleteRoom = async (id) => {
    if (!window.confirm('Удалить комнату? Это не удалит компьютеры в ней.')) return;
    await window.api.deleteRoom(id);
    showToast('Комната удалена');
    loadRooms();
  };

  const deleteComp = async (id) => {
    if (!window.confirm('Удалить ПК?')) return;
    await window.api.deleteComputer(id);
    showToast('ПК удалён');
    loadComps();
  };

  const natSort = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });

  const compsByRoom = rooms.map(r => ({
    ...r,
    computers: computers.filter(c => Number(c.room_id) === Number(r.id)).sort(natSort),
  }));
  const noRoomComps = computers.filter(c => !c.room_id).sort(natSort);

  const BTN_ROW = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Настройки</h1>
        <p className="page-subtitle" style={{ marginBottom: 16 }}>Конфигурация клуба</p>
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
          {[
            ['general', 'Основные', null],
            ['rooms', `Комнаты${rooms.length > 0 ? ` (${rooms.length})` : ''}`, null],
            ['computers', `Компьютеры${computers.length > 0 ? ` (${computers.length})` : ''}`, null],
            ['backup', 'Резервные копии', null],
            ['license', 'Лицензия', (licenseStatus === 'grace' || licenseStatus === 'readonly') ? 'var(--accent-red)' : null],
            ['logs', 'Логи', null],
            ['updates', 'Обновления', (updateStatus === 'available' || updateStatus === 'downloaded') ? (updateStatus === 'downloaded' ? 'var(--accent-green)' : 'var(--accent-gold)') : null],
          ].map(([key, label, dot]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '8px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, marginBottom: -1,
              color: tab === key ? 'var(--accent-light)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
              transition: 'all 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {label}
              {dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, display: 'inline-block' }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">

        {/* ── General ── */}
        {tab === 'general' && (
          <div style={{ maxWidth: 480 }}>
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Основные настройки</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group">
                  <label>Название клуба</label>
                  <input className="input" value={clubName} onChange={e => setClubName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Валюта</label>
                  <select className="select" value={currency} onChange={e => setCurrency(e.target.value)}>
                    <option value="сом">Сомони (сом)</option>
                    <option value="руб">Рубль (руб)</option>
                    <option value="USD">Доллар (USD)</option>
                    <option value="KGS">Кыргызский сом (KGS)</option>
                  </select>
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={saveGeneral}>
                  <Save size={15} /> Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Rooms ── */}
        {tab === 'rooms' && (
          <div>
            <div style={BTN_ROW}>
              <button className="btn btn-secondary" onClick={() => setShowImport('rooms')}>
                <FileSpreadsheet size={15} /> Импорт из Excel
              </button>
              <button className="btn btn-primary" onClick={() => { setEditRoom(null); setShowRoomModal(true); }}>
                <Plus size={15} /> Добавить комнату
              </button>
            </div>

            {rooms.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🏠</div>
                <div className="empty-state-text">Комнаты не добавлены</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowImport('rooms')}>
                    <FileSpreadsheet size={13} /> Импорт из Excel
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEditRoom(null); setShowRoomModal(true); }}>
                    <Plus size={13} /> Добавить первую комнату
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {rooms.map(r => (
                  <div key={r.id} className="card" style={{ borderColor: (r.color || '#6366f1') + '55' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, background: r.color || '#6366f1', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {{ standard: 'Стандарт', vip: 'VIP', comfort: 'Комфорт' }[r.type] || r.type}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditRoom(r); setShowRoomModal(true); }}><Edit2 size={13} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteRoom(r.id)}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                      {computers.filter(c => Number(c.room_id) === Number(r.id)).length} компьютеров
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Computers ── */}
        {tab === 'computers' && (
          <div>
            <div style={BTN_ROW}>
              <button className="btn btn-secondary" onClick={() => setShowImport('computers')}>
                <FileSpreadsheet size={15} /> Импорт из Excel
              </button>
              <button className="btn btn-primary" onClick={() => { setEditComp(null); setShowCompModal(true); }}>
                <Plus size={15} /> Добавить ПК
              </button>
            </div>

            {computers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🖥</div>
                <div className="empty-state-text">Компьютеры не добавлены</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setShowImport('computers')}>
                    <FileSpreadsheet size={13} /> Импорт из Excel
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={() => { setEditComp(null); setShowCompModal(true); }}>
                    <Plus size={13} /> Добавить первый ПК
                  </button>
                </div>
              </div>
            ) : (
              <>
                {compsByRoom.map(room => room.computers.length > 0 && (
                  <div key={room.id} style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: room.color || '#6366f1', flexShrink: 0 }} />
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{room.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{room.computers.length} шт</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                      {room.computers.map(c => (
                        <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Monitor size={16} color={room.color || 'var(--text-muted)'} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div>
                              {c.rate_per_hour > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.rate_per_hour} сом/ч</div>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditComp(c); setShowCompModal(true); }}><Edit2 size={12} /></button>
                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteComp(c.id)}><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {noRoomComps.length > 0 && (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-muted)' }}>
                      Без комнаты ({noRoomComps.length} шт)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                      {noRoomComps.map(c => (
                        <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Monitor size={16} color="var(--text-muted)" />
                            <div><div style={{ fontWeight: 700, fontSize: 13 }}>{c.name}</div></div>
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditComp(c); setShowCompModal(true); }}><Edit2 size={12} /></button>
                            <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteComp(c.id)}><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Backup ── */}
        {tab === 'backup' && <BackupTab />}

        {/* ── License ── */}
        {tab === 'license' && <LicenseTab />}

        {/* ── Logs ── */}
        {tab === 'logs' && <LogsTab />}

        {/* ── Updates ── */}
        {tab === 'updates' && (
          <UpdatesTab appVersion={appVersion} updateStatus={updateStatus} updateInfo={updateInfo} />
        )}
      </div>

      {showRoomModal && (
        <RoomModal room={editRoom} onClose={() => setShowRoomModal(false)} onSave={() => { setShowRoomModal(false); loadRooms(); }} />
      )}
      {showCompModal && (
        <ComputerModal computer={editComp} rooms={rooms} onClose={() => setShowCompModal(false)} onSave={() => { setShowCompModal(false); loadComps(); }} />
      )}
      {showImport && (
        <ImportModal
          type={showImport}
          rooms={rooms}
          onClose={() => setShowImport(null)}
          onDone={() => { setShowImport(null); loadRooms(); loadComps(); }}
        />
      )}
    </div>
  );
}
