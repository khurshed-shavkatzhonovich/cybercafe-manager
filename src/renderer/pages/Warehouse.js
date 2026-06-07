import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Upload, Package, FileSpreadsheet, Check, AlertCircle, PlusCircle, History } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast, useApp } from '../App';

const UNITS = ['шт', 'л', 'мл', '500мл', '1л', '1.5л', '2л', 'кг', 'г', 'уп'];

// ── ESC hook ──────────────────────────────────────────────────────────────────
function useEscClose(onClose) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
}

// ── Product Modal ─────────────────────────────────────────────────────────────
function ProductModal({ product, categories, onClose, onSave }) {
  const showToast = useToast();
  useEscClose(onClose);
  const fileRef = useRef();
  const [form, setForm] = useState({
    name: '', price: '', cost_price: '',
    stock_quantity: '', unit: 'шт', photo: null, discount_percent: 0, is_active: 1,
    ...product,
    category: product?.category ? String(product.category) : String(categories[0]?.id ?? 1),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('photo', reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price) { showToast('Заполните название и цену', 'error'); return; }
    const payload = { ...form, price: Number(form.price), cost_price: Number(form.cost_price) || 0, stock_quantity: Number(form.stock_quantity) || 0, discount_percent: Number(form.discount_percent) || 0 };
    if (product?.id) await window.api?.updateProduct(product.id, payload);
    else await window.api?.createProduct(payload);
    showToast(product?.id ? 'Товар обновлён' : 'Товар добавлен');
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{product?.id ? 'Редактировать товар' : 'Новый товар'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Photo */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          <div onClick={() => fileRef.current.click()} style={{
            width: 90, height: 90, borderRadius: 12, border: '2px dashed var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
            background: 'var(--bg-hover)', transition: 'border-color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            {form.photo ? (
              <img src={form.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <Upload size={20} />
                <div style={{ fontSize: 10, marginTop: 4 }}>Фото</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
          <div style={{ flex: 1 }}>
            <div className="form-group" style={{ marginBottom: 10 }}>
              <label>Название *</label>
              <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="RC-Кола 1.5л" />
            </div>
            <div className="form-group">
              <label>Категория</label>
              <select className="select" value={form.category} onChange={e => set('category', e.target.value)}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
          <div className="form-group">
            <label>Цена продажи (сом) *</label>
            <input className="input" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Себестоимость (сом)</label>
            <input className="input" type="number" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Остаток</label>
            <input className="input" type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Ед. изм.</label>
            <select className="select" value={form.unit} onChange={e => set('unit', e.target.value)}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Скидка %</label>
            <input className="input" type="number" min={0} max={100} value={form.discount_percent} onChange={e => set('discount_percent', e.target.value)} placeholder="0" />
          </div>
          <div className="form-group">
            <label>Статус</label>
            <select className="select" value={form.is_active} onChange={e => set('is_active', Number(e.target.value))}>
              <option value={1}>Активен</option>
              <option value={0}>Скрыт</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSubmit}>{product?.id ? 'Сохранить' : 'Добавить'}</button>
        </div>
      </div>
    </div>
  );
}

// ── Product Import Modal ──────────────────────────────────────────────────────
function ProductImportModal({ categories, onClose, onDone }) {
  const showToast = useToast();
  useEscClose(onClose);
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  const COLUMNS = ['Название', 'Категория (ID или название)', 'Цена', 'Себестоимость', 'Остаток', 'Ед.изм', 'Скидка %'];
  const EXAMPLE = [
    ['RC-Кола 1.5л', 'Напитки', '25', '15', '50', 'шт', '0'],
    ['Чипсы Lays', 'Снеки', '30', '20', '30', 'шт', ''],
    ['Сэндвич', 'Еда', '45', '30', '10', 'шт', '5'],
  ];

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [COLUMNS, ...EXAMPLE];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = COLUMNS.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Товары');
    XLSX.writeFile(wb, 'template_products.xlsx');
  };

  const catMap = {};
  categories.forEach(c => {
    catMap[String(c.id)] = c.id;
    catMap[c.name.toLowerCase()] = c.id;
  });
  const defaultCatId = categories[0]?.id ?? 1;

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
        const dataRows = raw.slice(1).filter(r => r.some(cell => String(cell).trim()));
        if (!dataRows.length) { setError('Файл пустой или содержит только заголовки'); return; }

        const parsed = dataRows
          .map(row => {
            const name = String(row[0] || '').trim();
            const catKey = String(row[1] || '').toLowerCase().trim();
            const category = catMap[catKey] ?? catMap[String(row[1] || '').trim()] ?? defaultCatId;
            return {
              name,
              category,
              _catLabel: String(row[1] || '').trim() || '—',
              price: Number(row[2]) || 0,
              cost_price: Number(row[3]) || 0,
              stock_quantity: Number(row[4]) || 0,
              unit: String(row[5] || 'шт').trim() || 'шт',
              discount_percent: Number(row[6]) || 0,
              is_active: 1,
            };
          })
          .filter(r => r.name);

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
      await window.api.importProducts(preview);
      showToast(`Импортировано ${preview.length} товаров`);
      onDone();
    } catch (ex) {
      showToast('Ошибка импорта: ' + ex.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  const catById = Object.fromEntries(categories.map(c => [c.id, c]));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640, maxHeight: '85vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileSpreadsheet size={18} color="var(--accent-green)" />
            Импорт товаров из Excel
          </h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Instructions */}
        <div style={{ background: 'var(--bg-hover)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Формат файла</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            Категория: укажите название категории или её ID. Доступные: {categories.map(c => `${c.name} (ID:${c.id})`).join(', ')}.
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Ед.изм: шт, л, мл, 500мл, 1л, 1.5л, 2л, кг, г, уп. Скидка % — необязательно.
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {COLUMNS.map(c => (
                    <th key={c} style={{ padding: '4px 8px', background: 'var(--bg-active)', color: 'var(--accent-light)', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EXAMPLE.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: '4px 8px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{cell}</td>
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
                <span style={{ fontWeight: 700 }}>Готово к импорту: {preview.length} товаров</span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setPreview(null); setError(''); fileRef.current.value = ''; }}>
                Выбрать другой файл
              </button>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-hover)', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 700 }}>Название</th>
                    <th style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>Категория</th>
                    <th style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>Цена</th>
                    <th style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>Себест.</th>
                    <th style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>Остаток</th>
                    <th style={{ padding: '6px 10px', color: 'var(--text-secondary)', fontWeight: 700 }}>Ед.</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => {
                    const cat = catById[row.category];
                    const catFound = !!cat;
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '5px 10px', fontWeight: 600 }}>{row.name}</td>
                        <td style={{ padding: '5px 10px' }}>
                          {catFound
                            ? <span style={{ color: 'var(--text-primary)' }}>{cat.icon} {cat.name}</span>
                            : <span style={{ color: 'var(--accent-gold)', fontSize: 11 }}>⚠ {row._catLabel} → {categories[0]?.name}</span>}
                        </td>
                        <td style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)' }}>{row.price}</td>
                        <td style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{row.cost_price}</td>
                        <td style={{ padding: '5px 10px', fontFamily: 'var(--font-mono)' }}>{row.stock_quantity}</td>
                        <td style={{ padding: '5px 10px', color: 'var(--text-muted)' }}>{row.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={!preview || importing} onClick={handleImport}>
            {importing ? 'Импорт...' : `Импортировать ${preview ? preview.length : ''} товаров`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Restock Modal ─────────────────────────────────────────────────────────────
function RestockModal({ product, onClose, onDone }) {
  const showToast = useToast();
  useEscClose(onClose);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');

  const submit = async () => {
    const n = Number(qty);
    if (!n || n <= 0) { showToast('Введите количество', 'error'); return; }
    const res = await window.api.restockProduct?.(product.id, n, note);
    if (res?.ok) {
      showToast(`+${n} ${product.unit} добавлено`);
      onDone();
    } else showToast('Ошибка', 'error');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h2 className="modal-title">Пополнить склад</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>{product.name}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label>Количество ({product.unit})</label>
            <input className="input" type="number" min={1} value={qty} onChange={e => setQty(e.target.value)} placeholder="0" autoFocus />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Текущий остаток: <strong>{product.stock_quantity} {product.unit}</strong>
            {qty > 0 && <> → <strong style={{ color: 'var(--accent-green)' }}>{product.stock_quantity + Number(qty)} {product.unit}</strong></>}
          </div>
          <div className="form-group">
            <label>Примечание (необязательно)</label>
            <input className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Поступление от поставщика..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={submit}>Добавить</button>
        </div>
      </div>
    </div>
  );
}

// ── Movement History Modal ────────────────────────────────────────────────────
function MovementModal({ product, onClose }) {
  useEscClose(onClose);
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    window.api.getStockMovements?.(product.id).then(m => setMovements(m || []));
  }, [product.id]);

  const typeLabel = { restock: 'Поступление', sale: 'Продажа', cancel: 'Отмена продажи' };
  const typeColor = { restock: 'var(--accent-green)', sale: 'var(--accent-red)', cancel: 'var(--accent-gold)' };

  const fmt = (iso) => new Date(iso).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480, maxHeight: '80vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">История движения</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ fontWeight: 600, marginBottom: 14, color: 'var(--text-secondary)' }}>{product.name}</div>
        {movements.length === 0 ? (
          <div className="empty-state" style={{ padding: '30px 0' }}>
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">История пуста</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {movements.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-hover)', borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor[m.type] || 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{typeLabel[m.type] || m.type}</div>
                  {m.note && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.note}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: typeColor[m.type] }}>
                    {m.type === 'restock' ? '+' : '-'}{m.quantity} {product.unit}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmt(m.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Warehouse() {
  const { refreshLowStock } = useApp();
  const showToast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [restockProduct, setRestockProduct] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);

  const load = async () => {
    const [p, c] = await Promise.all([window.api?.getAllProducts(), window.api?.getProductCategories()]);
    setProducts(p || []); setCategories(c || []);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить товар?')) return;
    await window.api?.deleteProduct(id);
    showToast('Товар удалён');
    load();
  };

  const filtered = products.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));
  const totalValue = products.reduce((s, p) => s + p.price * p.stock_quantity, 0);
  const totalCost = products.reduce((s, p) => s + p.cost_price * p.stock_quantity, 0);

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 className="page-title">Склад</h1>
            <p className="page-subtitle">Товары и остатки</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
              <FileSpreadsheet size={15} /> Импорт из Excel
            </button>
            <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowModal(true); }}>
              <Plus size={15} /> Добавить товар
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Позиций', value: products.filter(p => p.is_active).length },
            { label: 'Стоимость склада', value: `${Math.round(totalValue).toLocaleString()} сом` },
            { label: 'Себестоимость', value: `${Math.round(totalCost).toLocaleString()} сом` },
            { label: 'Потенц. прибыль', value: `${Math.round(totalValue - totalCost).toLocaleString()} сом` },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <button onClick={() => setFilterCat('all')} className={`btn btn-sm ${filterCat === 'all' ? 'btn-primary' : 'btn-secondary'}`}>Все</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setFilterCat(String(c.id))} className={`btn btn-sm ${filterCat === String(c.id) ? 'btn-primary' : 'btn-secondary'}`}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <div className="empty-state-text">Товаров нет. Добавьте первый!</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(true)}>
                <FileSpreadsheet size={13} /> Импорт из Excel
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditProduct(null); setShowModal(true); }}>
                <Plus size={13} /> Добавить
              </button>
            </div>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Фото</th>
                <th>Название</th>
                <th>Категория</th>
                <th>Цена</th>
                <th>Себест.</th>
                <th>Прибыль</th>
                <th>Остаток</th>
                <th>Скидка</th>
                <th>Статус</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const profit = p.price - p.cost_price;
                const cat = catMap[p.category];
                return (
                  <tr key={p.id}>
                    <td>
                      {p.photo ? (
                        <img src={p.photo} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                          {cat?.icon || '📦'}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className="tag">{cat?.icon} {cat?.name || p.category}</span></td>
                    <td className="font-mono" style={{ fontWeight: 700 }}>{p.price} сом</td>
                    <td className="font-mono" style={{ color: 'var(--text-secondary)' }}>{p.cost_price || 0} сом</td>
                    <td className="font-mono" style={{ color: profit > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>{profit > 0 ? `+${profit}` : profit} сом</td>
                    <td>
                      <span style={{ color: p.stock_quantity > 5 ? 'var(--text-primary)' : p.stock_quantity > 0 ? 'var(--accent-gold)' : 'var(--accent-red)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {p.stock_quantity} {p.unit}
                      </span>
                    </td>
                    <td>{p.discount_percent > 0 ? <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>-{p.discount_percent}%</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td><span className={`badge ${p.is_active ? 'badge-open' : 'badge-cancelled'}`}>{p.is_active ? 'Активен' : 'Скрыт'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Пополнить" onClick={() => setRestockProduct(p)}><PlusCircle size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="История" onClick={() => setHistoryProduct(p)}><History size={14} /></button>
                        <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditProduct(p); setShowModal(true); }}><Edit2 size={14} /></button>
                        <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <ProductModal product={editProduct} categories={categories} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); load(); }} />
      )}
      {showImport && (
        <ProductImportModal categories={categories} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} />
      )}
      {restockProduct && (
        <RestockModal product={restockProduct} onClose={() => setRestockProduct(null)} onDone={() => { setRestockProduct(null); load(); refreshLowStock?.(); }} />
      )}
      {historyProduct && (
        <MovementModal product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  );
}
