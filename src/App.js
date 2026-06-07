import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, BarChart2, Settings, Minus, Square, X, Zap } from 'lucide-react';
import './styles/globals.css';

// Pages
import Dashboard from './pages/Dashboard';
import Cashier from './pages/Cashier';
import Warehouse from './pages/Warehouse';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';

// Context
export const AppContext = createContext(null);

export function useApp() { return useContext(AppContext); }

function TitleBar() {
  return (
    <div style={{
      height: 'var(--header-height)', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 16px',
      background: 'var(--bg-base)',
      borderBottom: '1px solid var(--border)',
      WebkitAppRegion: 'drag', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={14} color="white" />
        </div>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.02em' }}>CyberCafe</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manager</span>
      </div>
      <div style={{ display: 'flex', gap: 4, WebkitAppRegion: 'no-drag' }}>
        {[
          { icon: Minus, action: () => window.api?.minimize(), color: 'var(--accent-gold)' },
          { icon: Square, action: () => window.api?.maximize(), color: 'var(--accent-green)' },
          { icon: X, action: () => window.api?.close(), color: 'var(--accent-red)' },
        ].map(({ icon: Icon, action, color }, i) => (
          <button key={i} onClick={action} style={{
            width: 28, height: 28, border: 'none', borderRadius: 6,
            background: 'transparent', color: 'var(--text-muted)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = color; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  );
}

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/cashier', icon: ShoppingCart, label: 'Касса' },
  { to: '/warehouse', icon: Package, label: 'Склад' },
  { to: '/reports', icon: BarChart2, label: 'Отчёты' },
  { to: '/settings', icon: Settings, label: 'Настройки' },
];

function Sidebar() {
  return (
    <aside style={{
      width: 'var(--sidebar-width)', height: '100%',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '12px 12px 20px', flexShrink: 0,
    }}>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 'var(--radius-sm)',
            textDecoration: 'none', fontWeight: 600, fontSize: 13,
            transition: 'all 0.15s',
            color: isActive ? 'white' : 'var(--text-secondary)',
            background: isActive
              ? 'linear-gradient(135deg, var(--accent), #7c3aed)'
              : 'transparent',
            boxShadow: isActive ? 'var(--shadow-accent)' : 'none',
          })}
          onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
          v1.0.0 — CyberCafe Manager
        </div>
      </div>
    </aside>
  );
}

// Toast system
export function useToast() {
  const ctx = useApp();
  return ctx.showToast;
}

export default function App() {
  const [settings, setSettings] = useState({ club_name: 'CyberCafe', currency: 'сом' });
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    window.api?.getSettings().then(s => s && setSettings(s));
  }, []);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  const updateSetting = async (key, value) => {
    await window.api?.setSetting(key, value);
    setSettings(s => ({ ...s, [key]: value }));
  };

  return (
    <AppContext.Provider value={{ settings, updateSetting, showToast }}>
      <HashRouter>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TitleBar />
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Sidebar />
            <main style={{ flex: 1, overflow: 'hidden', background: 'var(--bg-base)' }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/cashier" element={<Cashier />} />
                <Route path="/warehouse" element={<Warehouse />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
        </div>

        {/* Toasts */}
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <span style={{ fontSize: 16 }}>{t.type === 'success' ? '✓' : '✗'}</span>
              <span style={{ fontSize: 13 }}>{t.message}</span>
            </div>
          ))}
        </div>
      </HashRouter>
    </AppContext.Provider>
  );
}
