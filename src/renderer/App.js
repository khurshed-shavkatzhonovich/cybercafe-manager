import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, BarChart2, Settings, Minus, Square, X, Zap, Bell } from 'lucide-react';
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

// ── TitleBar ──────────────────────────────────────────────────────────────────
function TitleBar({ updateStatus, onBellClick }) {
  const hasUpdate = updateStatus === 'available' || updateStatus === 'downloaded';

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, WebkitAppRegion: 'no-drag' }}>
        {/* Bell notification */}
        <button
          onClick={onBellClick}
          title={updateStatus === 'downloaded' ? 'Обновление готово к установке' : updateStatus === 'available' ? 'Доступно обновление' : 'Обновления'}
          style={{
            width: 32, height: 32, border: 'none', borderRadius: 6,
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', transition: 'all 0.15s',
            color: hasUpdate ? 'var(--accent-gold)' : 'var(--text-muted)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Bell size={15} />
          {hasUpdate && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 8, height: 8, borderRadius: '50%',
              background: updateStatus === 'downloaded' ? 'var(--accent-green)' : 'var(--accent-gold)',
              border: '1px solid var(--bg-base)',
            }} />
          )}
        </button>

        {/* Window controls */}
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

function Sidebar({ appVersion, updateStatus }) {
  const hasUpdate = updateStatus === 'available' || updateStatus === 'downloaded';
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
            {to === '/settings' && hasUpdate && (
              <span style={{
                marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%',
                background: updateStatus === 'downloaded' ? 'var(--accent-green)' : 'var(--accent-gold)',
                flexShrink: 0,
              }} />
            )}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
          v{appVersion} — CyberCafe Manager
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
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle|checking|available|downloading|downloaded|error|not-available
  const [updateInfo, setUpdateInfo] = useState(null); // { version, releaseNotes, percent, error }

  useEffect(() => {
    if (!window.api) return;
    window.api.getSettings().then(s => s && setSettings(s));
    window.api.getVersion?.().then(v => v && setAppVersion(v));

    // Subscribe to updater events
    window.api.onUpdateStatus?.((data) => {
      setUpdateStatus(data.status);
      if (data.version || data.percent !== undefined || data.error || data.releaseNotes !== undefined) {
        setUpdateInfo(prev => ({ ...prev, ...data }));
      }
    });

    return () => { window.api.offUpdateStatus?.(); };
  }, []);

  if (!window.api) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#07070d', color: '#f0f0ff', gap: 16, fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Откройте приложение в Electron</div>
        <div style={{ fontSize: 14, color: '#9898b8', textAlign: 'center', maxWidth: 400 }}>
          Это десктоп-приложение. Запустите его через <code style={{ background: '#1e1e38', padding: '2px 8px', borderRadius: 4 }}>npm start</code> и работайте в открывшемся окне приложения, а не в браузере.
        </div>
      </div>
    );
  }

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000);
  };

  const updateSetting = async (key, value) => {
    await window.api?.setSetting(key, value);
    setSettings(s => ({ ...s, [key]: value }));
  };

  const goToUpdates = () => {
    // Navigate to settings/updates — we trigger via hash
    window.location.hash = '#/settings?tab=updates';
  };

  return (
    <AppContext.Provider value={{ settings, updateSetting, showToast, appVersion, updateStatus, updateInfo }}>
      <HashRouter>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TitleBar updateStatus={updateStatus} onBellClick={goToUpdates} />
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Sidebar appVersion={appVersion} updateStatus={updateStatus} />
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
