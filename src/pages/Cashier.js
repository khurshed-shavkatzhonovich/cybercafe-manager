import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, Edit2, CheckCircle, XCircle, Merge, ChevronDown, Trash2, Monitor, ShoppingCart } from 'lucide-react';
import { useApp, useToast } from '../App';

// ── Order Form Modal ────────────────────────────────────────────────────────
function OrderModal({ order, onClose, onSave }) {
  const showToast = useToast();
  const [rooms, setRooms] = useState([]);
  const [computers, setComputers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchProduct, setSearchProduct] = useState('');

  const [roomId, setRoomId] = useState(order?.room_id || '');
  const [notes, setNotes] = useState(order?.notes || '');
  const [discountPercent, setDiscountPercent] = useState(order?.discount_percent || 0);
  const [orderComputers, setOrderComputers] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [computerAmount, setComputerAmount] = useState(order?.computer_amount || 0);

  useEffect(() => {
    Promise.all([
      window.api.getRooms(),
      window.api.getComputers(),
      window.api.getProducts(),
      window.api.getProductCategories(),
    ]).then(([r, c, p, cats]) => {
      setRooms(r); setComputers(c); setProducts(p); setCategories(cats);
    });
    if (order?.id) {
      window.api.getOrderById(order.id).then(full => {
        if (full) {
          setOrderComputers(full.computers || []);
          setOrderItems(full.items || []);
          setComputerAmount(full.computer_amount || 0);
        }
      });
    }
  }, []);

  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch = !searchProduct || p.name.toLowerCase().includes(searchProduct.toLowerCase());
    return matchCat && matchSearch;
  });

  const addComputer = () => {
    setOrderComputers(prev => [...prev, { _key: Date.now(), computer_id: null, computer_name: '', hours: 0, amount: 0 }]);
  };

  const updateComputer = (key, field, value) => {
    setOrderComputers(prev => prev.map(c => {
      if (c._key !== key && c.id !== key) return c;
      const updated = { ...c, [field]: value };
      if (field === 'computer_id' && value) {
        const comp = computers.find(x => x.id === Number(value));
        if (comp) updated.computer_name = comp.name;
      }
      return updated;
    }));
  };

  const removeComputer = (key) => setOrderComputers(prev => prev.filter(c => (c._key || c.id) !== key));

  const addProduct = (product) => {
    setOrderItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price * (1 - (i.discount_percent || 0) / 100) }
          : i);
      }
      const discP = product.discount_percent || 0;
      const price = product.price;
      return [...prev, {
        _key: Date.now(), product_id: product.id, product_name: product.name,
        quantity: 1, price, discount_percent: discP,
        total: price * (1 - discP / 100),
      }];
    });
  };

  const updateItemQty = (key, qty) => {
    if (qty < 1) return;
    setOrderItems(prev => prev.map(i => {
      if ((i._key || i.id) !== key) return i;
      return { ...i, quantity: qty, total: qty * i.price * (1 - (i.discount_percent || 0) / 100) };
    }));
  };

  const removeItem = (key) => setOrderItems(prev => prev.filter(i => (i._key || i.id) !== key));

  const productsTotal = orderItems.reduce((s, i) => s + i.total, 0);
  const computerTotalAmt = Number(computerAmount) || 0;
  const subtotal = productsTotal + computerTotalAmt;
  const discountAmt = subtotal * (discountPercent / 100);
  const total = subtotal - discountAmt;

  const handleSave = async (closeAfter = false) => {
    const payload = {
      room_id: roomId || null,
      notes,
      discount_percent: Number(discountPercent),
      computer_amount: computerTotalAmt,
      computers: orderComputers.map(c => ({ computer_id: c.computer_id || null, computer_name: c.computer_name, hours: c.hours, amount: c.amount })),
      items: orderItems.map(i => ({ product_id: i.product_id || null, product_name: i.product_name, quantity: i.quantity, price: i.price, discount_percent: i.discount_percent || 0, total: i.total })),
    };
    try {
      const saved = order?.id
        ? await window.api.updateOrder(order.id, payload)
        : await window.api.createOrder(payload);
      if (closeAfter && saved) await window.api.closeOrder(saved.id);
      showToast(closeAfter ? 'Счёт закрыт и оплачен' : (order?.id ? 'Счёт обновлён' : 'Счёт открыт'));
      onSave();
    } catch (e) { showToast('Ошибка при сохранении', 'error'); }
  };

  const catOptions = [{ id: 'all', name: 'Все', icon: '🛍' }, ...categories];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 0, padding: 0, maxHeight: '92vh' }}>
        {/* Left: order details */}
        <div style={{ padding: 28, borderRight: '1px solid var(--border)', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="modal-header" style={{ marginBottom: 0 }}>
            <h2 className="modal-title">{order?.id ? `Счёт ${order.order_number}` : 'Новый счёт'}</h2>
            <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
          </div>

          {/* Room */}
          <div className="form-group">
            <label>Комната</label>
            <select className="select" value={roomId} onChange={e => setRoomId(e.target.value)}>
              <option value="">— Без комнаты —</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {/* Computers section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Компьютеры</label>
              <button className="btn btn-secondary btn-sm" onClick={addComputer}><Plus size={13} /> Добавить</button>
            </div>
            {orderComputers.length === 0 ? (
              <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Компьютеры не добавлены</div>
                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <label style={{ whiteSpace: 'nowrap', marginBottom: 0 }}>Сумма вручную:</label>
                  <input className="input" type="number" placeholder="0" value={computerAmount} onChange={e => setComputerAmount(e.target.value)} style={{ maxWidth: 140 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>сом</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orderComputers.map(c => (
                  <div key={c._key || c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px auto', gap: 8, alignItems: 'center' }}>
                    <select className="select" value={c.computer_id || ''} onChange={e => updateComputer(c._key || c.id, 'computer_id', e.target.value)}>
                      <option value="">Введите название</option>
                      {computers.map(x => <option key={x.id} value={x.id}>{x.name} ({x.room_name || '—'})</option>)}
                    </select>
                    <input className="input" type="number" placeholder="Часы" value={c.hours} onChange={e => updateComputer(c._key || c.id, 'hours', e.target.value)} />
                    <input className="input" type="number" placeholder="Сумма" value={c.amount} onChange={e => updateComputer(c._key || c.id, 'amount', e.target.value)} />
                    <button className="btn btn-ghost btn-icon" onClick={() => removeComputer(c._key || c.id)}><X size={14} /></button>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>+ доп. сумма вручную:</span>
                  <input className="input" type="number" placeholder="0" value={computerAmount} onChange={e => setComputerAmount(e.target.value)} style={{ maxWidth: 120 }} />
                </div>
              </div>
            )}
          </div>

          {/* Order items */}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Товары в счёте</div>
            {orderItems.length === 0 ? (
              <div style={{ background: 'var(--bg-hover)', borderRadius: 8, padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>Выберите товары справа →</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {orderItems.map(item => (
                  <div key={item._key || item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-hover)', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{item.product_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => updateItemQty(item._key || item.id, item.quantity - 1)}><span style={{ fontSize: 16 }}>−</span></button>
                      <span style={{ fontSize: 13, fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                      <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => updateItemQty(item._key || item.id, item.quantity + 1)}><span style={{ fontSize: 16 }}>+</span></button>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', minWidth: 80, textAlign: 'right' }}>
                      {Math.round(item.total)} сом
                    </div>
                    <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => removeItem(item._key || item.id)}><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes & discount */}
          <div className="grid-2">
            <div className="form-group">
              <label>Скидка %</label>
              <input className="input" type="number" min={0} max={100} value={discountPercent} onChange={e => setDiscountPercent(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Примечание</label>
              <input className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Опционально" />
            </div>
          </div>

          {/* Totals */}
          <div style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(124,58,237,0.05))', border: '1px solid var(--border-bright)', borderRadius: 12, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Компьютеры</span>
              <span className="font-mono">{Math.round(computerTotalAmt + orderComputers.reduce((s, c) => s + Number(c.amount || 0), 0))} сом</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Товары</span>
              <span className="font-mono">{Math.round(productsTotal)} сом</span>
            </div>
            {discountPercent > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--accent-green)' }}>
                <span>Скидка ({discountPercent}%)</span>
                <span className="font-mono">−{Math.round(discountAmt)} сом</span>
              </div>
            )}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 800 }}>
              <span>Итого</span>
              <span className="font-mono" style={{ color: 'var(--accent-light)' }}>{Math.round(total)} сом</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary flex-1" onClick={onClose}>Отмена</button>
            <button className="btn btn-primary flex-1" onClick={() => handleSave(false)}>
              {order?.id ? 'Сохранить' : 'Открыть счёт'}
            </button>
            {order?.id && (
              <button className="btn btn-success flex-1" onClick={() => handleSave(true)}>
                <CheckCircle size={15} /> Оплатить
              </button>
            )}
          </div>
        </div>

        {/* Right: product picker */}
        <div style={{ padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Быстрые заказы</div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Поиск товара..." value={searchProduct} onChange={e => setSearchProduct(e.target.value)} style={{ paddingLeft: 32 }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {catOptions.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.id)} className={`btn btn-sm ${activeCategory === String(c.id) ? 'btn-primary' : 'btn-secondary'}`} style={{ fontSize: 11 }}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flex: 1, overflowY: 'auto' }}>
            {filteredProducts.map(p => (
              <button key={p.id} onClick={() => addProduct(p)} style={{
                background: 'var(--bg-hover)', border: '1px solid var(--border)',
                borderRadius: 10, padding: 12, cursor: 'pointer',
                textAlign: 'left', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-active)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{p.name}</div>
                <div style={{ fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-light)' }}>{p.price} сом</div>
                {p.discount_percent > 0 && <div style={{ fontSize: 10, color: 'var(--accent-green)' }}>-{p.discount_percent}%</div>}
                <div style={{ fontSize: 10, color: p.stock_quantity > 5 ? 'var(--text-muted)' : 'var(--accent-red)' }}>
                  {p.stock_quantity > 0 ? `${p.stock_quantity} ${p.unit}` : '⚠ Нет в наличии'}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Merge Modal ─────────────────────────────────────────────────────────────
function MergeModal({ orders, onClose, onMerge }) {
  const [selected, setSelected] = useState([]);
  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Объединить счета</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>Выберите счета для объединения (минимум 2)</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(o => (
            <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: selected.includes(o.id) ? 'var(--bg-active)' : 'var(--bg-hover)', border: `1px solid ${selected.includes(o.id) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} style={{ accentColor: 'var(--accent)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{o.order_number}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{o.room_name || '—'}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-light)' }}>{Math.round(o.total_amount)} сом</div>
            </label>
          ))}
        </div>
        {selected.length >= 2 && (
          <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-active)', borderRadius: 8, fontSize: 13, color: 'var(--accent-light)', fontWeight: 700 }}>
            Итого: {Math.round(orders.filter(o => selected.includes(o.id)).reduce((s, o) => s + o.total_amount, 0))} сом
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" disabled={selected.length < 2} onClick={() => onMerge(selected)}>
            <Merge size={15} /> Объединить
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Cashier Page ───────────────────────────────────────────────────────
export default function Cashier() {
  const showToast = useToast();
  const [tab, setTab] = useState('open');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [editOrder, setEditOrder] = useState(null);
  const [showMerge, setShowMerge] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await window.api?.getOrders({ status: tab === 'open' ? 'open' : tab === 'closed' ? 'closed' : 'cancelled' });
    setOrders(data || []);
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleClose = async (id) => {
    if (!window.confirm('Закрыть и пометить как оплаченный?')) return;
    await window.api.closeOrder(id);
    showToast('Счёт оплачен');
    load();
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Отменить счёт?')) return;
    await window.api.cancelOrder(id);
    showToast('Счёт отменён');
    load();
  };

  const handleMerge = async (ids) => {
    await window.api.mergeOrders(ids);
    showToast('Счета объединены');
    setShowMerge(false);
    load();
  };

  const STATUS_COLORS = { open: 'badge-open', closed: 'badge-closed', cancelled: 'badge-cancelled' };
  const STATUS_LABELS = { open: 'Открыт', closed: 'Закрыт', cancelled: 'Отменён' };

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 className="page-title">Касса</h1>
            <p className="page-subtitle">Управление счетами</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {tab === 'open' && orders.length >= 2 && (
              <button className="btn btn-secondary" onClick={() => setShowMerge(true)}><Merge size={15} /> Объединить</button>
            )}
            <button className="btn btn-primary" onClick={() => { setEditOrder(null); setShowOrderModal(true); }}>
              <Plus size={15} /> Новый счёт
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {[['open', 'Открытые'], ['closed', 'Закрытые'], ['cancelled', 'Отменённые']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '8px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
              color: tab === key ? 'var(--accent-light)' : 'var(--text-muted)',
              borderBottom: `2px solid ${tab === key ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1, transition: 'all 0.15s',
            }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}><div className="spinner" /></div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">{tab === 'open' ? '🎮' : tab === 'closed' ? '✅' : '🗑'}</div>
            <div className="empty-state-text">
              {tab === 'open' ? 'Нет открытых счетов' : tab === 'closed' ? 'Нет закрытых счетов' : 'Нет отменённых счетов'}
            </div>
            {tab === 'open' && <button className="btn btn-primary btn-sm" onClick={() => { setEditOrder(null); setShowOrderModal(true); }}><Plus size={13} /> Создать счёт</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {orders.map(order => (
              <div key={order.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '14px 18px',
                display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr 1fr auto',
                alignItems: 'center', gap: 16,
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-bright)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>{order.order_number}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(order.opened_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div>
                  {order.room_name ? (
                    <span style={{ fontSize: 12, background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', color: order.room_color || 'var(--text-secondary)' }}>{order.room_name}</span>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Компьютеры</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{Math.round(order.computer_amount || 0)} сом</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Товары</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700 }}>{Math.round(order.products_amount || 0)} сом</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Итого</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 800, color: 'var(--accent-light)' }}>{Math.round(order.total_amount || 0)} сом</div>
                  {order.discount_percent > 0 && <div style={{ fontSize: 10, color: 'var(--accent-green)' }}>Скидка {order.discount_percent}%</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`badge ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                  {tab === 'open' && (
                    <>
                      <button className="btn btn-ghost btn-icon btn-sm" title="Редактировать" onClick={() => { setEditOrder(order); setShowOrderModal(true); }}><Edit2 size={14} /></button>
                      <button className="btn btn-success btn-icon btn-sm" title="Закрыть/Оплатить" onClick={() => handleClose(order.id)}><CheckCircle size={14} /></button>
                      <button className="btn btn-danger btn-icon btn-sm" title="Отменить" onClick={() => handleCancel(order.id)}><XCircle size={14} /></button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showOrderModal && (
        <OrderModal order={editOrder} onClose={() => setShowOrderModal(false)} onSave={() => { setShowOrderModal(false); load(); }} />
      )}
      {showMerge && (
        <MergeModal orders={orders} onClose={() => setShowMerge(false)} onMerge={handleMerge} />
      )}
    </div>
  );
}
