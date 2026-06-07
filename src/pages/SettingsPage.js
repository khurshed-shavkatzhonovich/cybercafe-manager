import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Save, Monitor } from 'lucide-react';
import { useApp, useToast } from '../App';

function RoomModal({ room, onClose, onSave }) {
  const showToast = useToast();
  const TYPES = [['standard', 'Стандарт'], ['vip', 'VIP'], ['comfort', 'Комфорт'], ['other', 'Другое']];
  const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#8b5cf6', '#ec4899', '#f97316'];
  const [form, setForm] = useState({ name: '', type: 'standard', color: '#6366f1', ...room });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name) { showToast('Введите название', 'error'); return; }
    if (room?.id) await window.api.updateRoom(room.id, form);
    else await window.api.createRoom(form);
    showToast(room?.id ? 'Комната обновлена' : 'Комната добавлена');
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">{room?.id ? 'Редактировать комнату' : 'Новая комната'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group"><label>Название</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="VIP зал" /></div>
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
                  outline: form.color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
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

function ComputerModal({ computer, rooms, onClose, onSave }) {
  const showToast = useToast();
  const [form, setForm] = useState({ name: '', room_id: '', rate_per_hour: 0, ...computer });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name) { showToast('Введите название', 'error'); return; }
    if (computer?.id) await window.api.updateComputer(computer.id, { ...form, room_id: form.room_id || null, rate_per_hour: Number(form.rate_per_hour) || 0 });
    else await window.api.createComputer({ ...form, room_id: form.room_id || null, rate_per_hour: Number(form.rate_per_hour) || 0 });
    showToast(computer?.id ? 'Компьютер обновлён' : 'Компьютер добавлен');
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="modal-title">{computer?.id ? 'Редактировать ПК' : 'Новый ПК'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group"><label>Название / Номер</label><input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="ПК-1 или VIP-3" /></div>
          <div className="form-group">
            <label>Комната</label>
            <select className="select" value={form.room_id || ''} onChange={e => set('room_id', e.target.value)}>
              <option value="">— Без комнаты —</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Тариф (сом/час)</label><input className="input" type="number" value={form.rate_per_hour} onChange={e => set('rate_per_hour', e.target.value)} placeholder="0" /></div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={submit}>{computer?.id ? 'Сохранить' : 'Добавить'}</button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSetting } = useApp();
  const showToast = useToast();
  const [tab, setTab] = useState('general');
  const [rooms, setRooms] = useState([]);
  const [computers, setComputers] = useState([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [showCompModal, setShowCompModal] = useState(false);
  const [editComp, setEditComp] = useState(null);
  const [clubName, setClubName] = useState(settings.club_name || '');
  const [currency, setCurrency] = useState(settings.currency || 'сом');

  const loadRooms = async () => { const r = await window.api.getRooms(); setRooms(r || []); };
  const loadComps = async () => { const c = await window.api.getComputers(); setComputers(c || []); };

  useEffect(() => { loadRooms(); loadComps(); }, []);

  const saveGeneral = async () => {
    await updateSetting('club_name', clubName);
    await updateSetting('currency', currency);
    showToast('Настройки сохранены');
  };

  const deleteRoom = async (id) => {
    if (!window.confirm('Удалить комнату?')) return;
    await window.api.deleteRoom(id);
    showToast('Удалено');
    loadRooms();
  };

  const deleteComp = async (id) => {
    if (!window.confirm('Удалить ПК?')) return;
    await window.api.deleteComputer(id);
    showToast('Удалено');
    loadComps();
  };

  const compsByRoom = rooms.map(r => ({
    ...r,
    computers: computers.filter(c => c.room_id === r.id),
  }));
  const noRoomComps = computers.filter(c => !c.room_id);

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Настройки</h1>
        <p className="page-subtitle" style={{ marginBottom: 16 }}>Конфигурация клуба</p>
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)' }}>
          {[['general', 'Основные'], ['rooms', 'Комнаты'], ['computers', 'Компьютеры']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '8px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, marginBottom: -1,
              color: tab === key ? 'var(--accent-light)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
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

        {tab === 'rooms' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => { setEditRoom(null); setShowRoomModal(true); }}><Plus size={15} /> Добавить комнату</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {rooms.map(r => (
                <div key={r.id} className="card" style={{ borderColor: r.color + '44', position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 4, background: r.color }} />
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
                    {computers.filter(c => c.room_id === r.id).length} компьютеров
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'computers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => { setEditComp(null); setShowCompModal(true); }}><Plus size={15} /> Добавить ПК</button>
            </div>
            {compsByRoom.map(room => room.computers.length > 0 && (
              <div key={room.id} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: room.color }} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{room.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{room.computers.length} шт</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                  {room.computers.map(c => (
                    <div key={c.id} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Monitor size={16} color={room.color} />
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
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-muted)' }}>Без комнаты</div>
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
            {computers.length === 0 && (
              <div className="empty-state"><div className="empty-state-icon">🖥</div><div>Компьютеры не добавлены</div></div>
            )}
          </div>
        )}
      </div>

      {showRoomModal && <RoomModal room={editRoom} onClose={() => setShowRoomModal(false)} onSave={() => { setShowRoomModal(false); loadRooms(); }} />}
      {showCompModal && <ComputerModal computer={editComp} rooms={rooms} onClose={() => setShowCompModal(false)} onSave={() => { setShowCompModal(false); loadComps(); }} />}
    </div>
  );
}
