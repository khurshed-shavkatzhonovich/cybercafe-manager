import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, ShoppingBag, Monitor, Package, Calendar } from 'lucide-react';
import { useApp } from '../App';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, fontWeight: 700, color: p.color || 'var(--text-primary)' }}>
          {p.name}: {Number(p.value).toLocaleString()} сом
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { settings } = useApp();
  const [period, setPeriod] = useState('week');
  const EMPTY_DATA = { revenue: { total: 0, computers: 0, products: 0, count: 0 }, daily: [], topProducts: [] };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openOrders, setOpenOrders] = useState([]);

  useEffect(() => {
    loadData();
    loadOpenOrders();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const now = new Date();
      let from, to;
      if (period === 'today') { from = to = format(now, 'yyyy-MM-dd'); }
      else if (period === 'week') { from = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'); to = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'); }
      else { from = format(startOfMonth(now), 'yyyy-MM-dd'); to = format(endOfMonth(now), 'yyyy-MM-dd'); }
      const result = await window.api?.getReportsSummary(from, to);
      setData(result || EMPTY_DATA);
    } catch {
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }

  async function loadOpenOrders() {
    try {
      const orders = await window.api?.getOrders({ status: 'open' });
      setOpenOrders(orders || []);
    } catch {
      setOpenOrders([]);
    }
  }

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  const { revenue, daily, topProducts } = data;
  const profit = (revenue.total || 0) - 0; // later: with cost prices
  const chartData = daily.map(d => ({
    date: d.date.slice(8) + '.' + d.date.slice(5, 7),
    Итого: Math.round(d.total || 0),
    Компьютеры: Math.round(d.computers || 0),
    Товары: Math.round(d.products || 0),
  }));

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 20 }}>
        <div>
          <h1 className="page-title">Дашборд</h1>
          <p className="page-subtitle">{settings.club_name} — обзор активности</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['today', 'Сегодня'], ['week', 'Неделя'], ['month', 'Месяц']].map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)} className={`btn btn-sm ${period === key ? 'btn-primary' : 'btn-secondary'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Stats row */}
        <div className="grid-4">
          {[
            { label: 'Выручка', value: `${Math.round(revenue.total || 0).toLocaleString()}`, unit: 'сом', icon: TrendingUp, color: 'var(--accent)' },
            { label: 'Компьютеры', value: `${Math.round(revenue.computers || 0).toLocaleString()}`, unit: 'сом', icon: Monitor, color: 'var(--accent-cyan)' },
            { label: 'Товары', value: `${Math.round(revenue.products || 0).toLocaleString()}`, unit: 'сом', icon: ShoppingBag, color: 'var(--accent-gold)' },
            { label: 'Закрыто счетов', value: revenue.count || 0, unit: 'шт', icon: Package, color: 'var(--accent-green)' },
          ].map(({ label, value, unit, icon: Icon, color }) => (
            <div key={label} className="stat-card" style={{ '--accent': color }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value" style={{ color }}>{value}</div>
                  <div className="stat-sub">{unit}</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
          {/* Revenue chart */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Выручка по дням</div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Итого" stroke="#6366f1" fill="url(#gTotal)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Компьютеры" stroke="#06b6d4" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="Товары" stroke="#f59e0b" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: 220 }}>
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-text">Нет данных за период</div>
              </div>
            )}
          </div>

          {/* Top products */}
          <div className="card">
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Топ товаров</div>
            {topProducts.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topProducts.slice(0, 6).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: `${COLORS[i % COLORS.length]}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: COLORS[i % COLORS.length], flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.product_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.qty} шт</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: COLORS[i % COLORS.length], flexShrink: 0 }}>
                      {Math.round(p.revenue).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <div style={{ fontSize: 32, opacity: 0.4 }}>🛍</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Нет продаж</div>
              </div>
            )}
          </div>
        </div>

        {/* Open orders */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Открытые счета
              {openOrders.length > 0 && (
                <span style={{ marginLeft: 8, background: 'var(--accent)', color: 'white', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 100 }}>
                  {openOrders.length}
                </span>
              )}
            </div>
          </div>
          {openOrders.length > 0 ? (
            <table className="table">
              <thead><tr><th>Счёт</th><th>Комната</th><th>Открыт</th><th>Компьютеры</th><th>Товары</th><th>Итого</th></tr></thead>
              <tbody>
                {openOrders.map(o => (
                  <tr key={o.id}>
                    <td className="font-mono" style={{ fontSize: 12 }}>{o.order_number}</td>
                    <td>{o.room_name || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{new Date(o.opened_at).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="font-mono">{Math.round(o.computer_amount || 0)} сом</td>
                    <td className="font-mono">{Math.round(o.products_amount || 0)} сом</td>
                    <td className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-light)' }}>{Math.round(o.total_amount || 0)} сом</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <div style={{ fontSize: 32, opacity: 0.4 }}>🎯</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Открытых счетов нет</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
