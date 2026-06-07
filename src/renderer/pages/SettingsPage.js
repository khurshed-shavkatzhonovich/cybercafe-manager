import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Save, Monitor, Upload, FileSpreadsheet, Check, AlertCircle, RefreshCw, Download, Zap } from 'lucide-react';
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
  const TYPES = [['standard', 'Стандарт'], ['vip', 'VIP'], ['comfort', 'Комфорт'], ['other', 'Другое']];
  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];
  const [form, setForm] = useState({ name: '', type: 'standard', color: '#6366f1', ...room });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { showToast('Введите название', 'error'); return; }
    try {
      if (room?.id) await window.api.updateRoom(room.id, form);
      else await window.api.createRoom(form);
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
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
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
      hint: 'Тип: standard / vip / comfort / other. Цвет: HEX (#6366f1) — необязательно.',
      example: [['Общий зал', 'standard', '#6366f1'], ['VIP зал', 'vip', '#f59e0b'], ['Комфорт', 'comfort', '#10b981']],
      parse: row => ({ name: String(row[0] || '').trim(), type: String(row[1] || 'standard').trim(), color: String(row[2] || '#6366f1').trim() }),
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

// ── Main Settings Page ────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { settings, updateSetting, appVersion, updateStatus, updateInfo } = useApp();
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

  const compsByRoom = rooms.map(r => ({
    ...r,
    computers: computers.filter(c => Number(c.room_id) === Number(r.id)),
  }));
  const noRoomComps = computers.filter(c => !c.room_id);

  const BTN_ROW = { display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 16 };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Настройки</h1>
        <p className="page-subtitle" style={{ marginBottom: 16 }}>Конфигурация клуба</p>
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)' }}>
          {[
            ['general', 'Основные', null],
            ['rooms', `Комнаты${rooms.length > 0 ? ` (${rooms.length})` : ''}`, null],
            ['computers', `Компьютеры${computers.length > 0 ? ` (${computers.length})` : ''}`, null],
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
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{r.type}</div>
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
