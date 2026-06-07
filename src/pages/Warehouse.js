import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, Upload, Package } from 'lucide-react';
import { useToast } from '../App';

const UNITS = ['шт', 'л', 'мл', '500мл', '1л', '1.5л', '2л', 'кг', 'г', 'уп'];

function ProductModal({ product, categories, onClose, onSave }) {
  const showToast = useToast();
  const fileRef = useRef();
  const [form, setForm] = useState({
    name: '', category: 'other', price: '', cost_price: '',
    stock_quantity: '', unit: 'шт', photo: null, discount_percent: 0, is_active: 1,
    ...product,
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
    if (product?.id) await window.api.updateProduct(product.id, payload);
    else await window.api.createProduct(payload);
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

export default function Warehouse() {
  const showToast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const load = async () => {
    const [p, c] = await Promise.all([window.api.getAllProducts(), window.api.getProductCategories()]);
    setProducts(p || []); setCategories(c || []);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить товар?')) return;
    await window.api.deleteProduct(id);
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
          <button className="btn btn-primary" onClick={() => { setEditProduct(null); setShowModal(true); }}>
            <Plus size={15} /> Добавить товар
          </button>
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
            <button className="btn btn-primary btn-sm" onClick={() => { setEditProduct(null); setShowModal(true); }}><Plus size={13} /> Добавить</button>
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
    </div>
  );
}
