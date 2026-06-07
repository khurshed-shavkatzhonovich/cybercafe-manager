import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Calendar, TrendingUp, Monitor, ShoppingBag, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-bright)', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, fontWeight: 700, color: p.fill || p.color || 'var(--text-primary)', marginBottom: 2 }}>
          {p.name}: {Number(p.value).toLocaleString()} сом
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const [period, setPeriod] = useState('week');
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const EMPTY_DATA = { revenue: { total: 0, computers: 0, products: 0, count: 0 }, daily: [], topProducts: [] };
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const getRange = () => {
    const now = new Date();
    if (period === 'today') return [format(now, 'yyyy-MM-dd'), format(now, 'yyyy-MM-dd')];
    if (period === 'yesterday') { const y = subDays(now, 1); return [format(y, 'yyyy-MM-dd'), format(y, 'yyyy-MM-dd')]; }
    if (period === 'week') return [format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')];
    if (period === 'month') return [format(startOfMonth(now), 'yyyy-MM-dd'), format(endOfMonth(now), 'yyyy-MM-dd')];
    if (period === 'last_month') { const lm = subMonths(now, 1); return [format(startOfMonth(lm), 'yyyy-MM-dd'), format(endOfMonth(lm), 'yyyy-MM-dd')]; }
    return [customFrom, customTo];
  };

  useEffect(() => { load(); }, [period, customFrom, customTo]);

  async function load() {
    setLoading(true);
    try {
      const [from, to] = getRange();
      const result = await window.api?.getReportsSummary(from, to);
      setData(result || EMPTY_DATA);
    } catch {
      setData(EMPTY_DATA);
    } finally {
      setLoading(false);
    }
  }

  const exportExcel = () => {
    if (!data) return;
    const [from, to] = getRange();
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows = [
      ['Период', `${from} — ${to}`],
      ['Выручка всего', data.revenue.total],
      ['Компьютеры', data.revenue.computers],
      ['Товары', data.revenue.products],
      ['Количество счетов', data.revenue.count],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
    ws1['!cols'] = [{ wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Сводка');

    // Daily sheet
    if (data.daily.length > 0) {
      const dailyRows = [['Дата', 'Счетов', 'Компьютеры (сом)', 'Товары (сом)', 'Итого (сом)'],
        ...data.daily.map(d => [d.date, d.count, Math.round(d.computers || 0), Math.round(d.products || 0), Math.round(d.total || 0)])];
      const ws2 = XLSX.utils.aoa_to_sheet(dailyRows);
      ws2['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'По дням');
    }

    // Top products sheet
    if (data.topProducts.length > 0) {
      const prodRows = [['Товар', 'Продано (шт)', 'Выручка (сом)'],
        ...data.topProducts.map(p => [p.product_name, p.qty, Math.round(p.revenue)])];
      const ws3 = XLSX.utils.aoa_to_sheet(prodRows);
      ws3['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws3, 'Топ товаров');
    }

    XLSX.writeFile(wb, `report_${from}_${to}.xlsx`);
  };

  if (loading) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" /></div>;

  const { revenue, daily, topProducts } = data;

  const chartData = daily.map(d => ({
    date: d.date.slice(5).replace('-', '.'),
    Компьютеры: Math.round(d.computers || 0),
    Товары: Math.round(d.products || 0),
  }));

  const pieData = [
    { name: 'Компьютеры', value: Math.round(revenue.computers || 0) },
    { name: 'Товары', value: Math.round(revenue.products || 0) },
  ].filter(d => d.value > 0);

  return (
    <div className="page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 className="page-title">Отчётность</h1>
            <p className="page-subtitle">Финансовая статистика</p>
          </div>
          <button className="btn btn-secondary" onClick={exportExcel}>
            <Download size={15} /> Экспорт в Excel
          </button>
        </div>

        {/* Period filter */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            ['today', 'Сегодня'], ['yesterday', 'Вчера'],
            ['week', 'Неделя'], ['month', 'Месяц'], ['last_month', 'Прошлый месяц'],
            ['custom', 'Период'],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setPeriod(key)} className={`btn btn-sm ${period === key ? 'btn-primary' : 'btn-secondary'}`}>{label}</button>
          ))}
          {period === 'custom' && (
            <>
              <input type="date" className="input" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 140 }} />
              <span style={{ color: 'var(--text-muted)' }}>—</span>
              <input type="date" className="input" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 140 }} />
            </>
          )}
        </div>
      </div>

      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Summary stats */}
        <div className="grid-4">
          {[
            { label: 'Выручка', value: Math.round(revenue.total || 0), color: 'var(--accent)', icon: TrendingUp },
            { label: 'Компьютеры', value: Math.round(revenue.computers || 0), color: 'var(--accent-cyan)', icon: Monitor },
            { label: 'Товары', value: Math.round(revenue.products || 0), color: 'var(--accent-gold)', icon: ShoppingBag },
            { label: 'Кол-во счетов', value: revenue.count || 0, color: 'var(--accent-green)', icon: Calendar, unit: 'шт' },
          ].map(({ label, value, color, icon: Icon, unit }) => (
            <div key={label} className="stat-card" style={{ '--accent': color }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="stat-label">{label}</div>
                  <div className="stat-value" style={{ color }}>{value.toLocaleString()}</div>
                  <div className="stat-sub">{unit || 'сом'}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Выручка по дням</div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Компьютеры" fill="#06b6d4" radius={[4,4,0,0]} />
                  <Bar dataKey="Товары" fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: 240 }}><div className="empty-state-icon">📊</div><div>Нет данных</div></div>
            )}
          </div>

          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Структура выручки</div>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={['#6366f1', '#f59e0b'][i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v.toLocaleString()} сом`]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {pieData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: ['#6366f1', '#f59e0b'][i], flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12 }}>{d.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{d.value.toLocaleString()} сом</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ height: 180 }}><div>Нет данных</div></div>
            )}
          </div>
        </div>

        {/* Top products table */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Топ товаров по выручке</div>
          {topProducts.length > 0 ? (
            <table className="table">
              <thead><tr><th>#</th><th>Товар</th><th>Продано</th><th>Выручка</th><th>Доля</th></tr></thead>
              <tbody>
                {topProducts.map((p, i) => {
                  const pct = revenue.products > 0 ? Math.round((p.revenue / revenue.products) * 100) : 0;
                  return (
                    <tr key={i}>
                      <td><span style={{ width: 24, height: 24, borderRadius: 6, background: `${COLORS[i % COLORS.length]}22`, color: COLORS[i % COLORS.length], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800 }}>{i + 1}</span></td>
                      <td style={{ fontWeight: 600 }}>{p.product_name}</td>
                      <td className="font-mono">{p.qty} шт</td>
                      <td className="font-mono" style={{ fontWeight: 700 }}>{Math.round(p.revenue).toLocaleString()} сом</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3 }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 30 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: '30px 0' }}><div className="empty-state-icon">📦</div><div>Нет продаж за период</div></div>
          )}
        </div>

        {/* Daily table */}
        {daily.length > 0 && (
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Детализация по дням</div>
            <table className="table">
              <thead><tr><th>Дата</th><th>Счетов</th><th>Компьютеры</th><th>Товары</th><th>Итого</th></tr></thead>
              <tbody>
                {daily.map((d, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{d.date}</td>
                    <td className="font-mono">{d.count}</td>
                    <td className="font-mono">{Math.round(d.computers || 0).toLocaleString()} сом</td>
                    <td className="font-mono">{Math.round(d.products || 0).toLocaleString()} сом</td>
                    <td className="font-mono" style={{ fontWeight: 800, color: 'var(--accent-light)' }}>{Math.round(d.total || 0).toLocaleString()} сом</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
