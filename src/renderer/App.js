import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, BarChart2, Settings, Minus, Square, X, Zap, Bell, AlertTriangle, ArrowDownCircle, ShieldAlert, ShieldX } from 'lucide-react';
import './styles/globals.css';

import Dashboard from './pages/Dashboard';
import Cashier from './pages/Cashier';
import Warehouse from './pages/Warehouse';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import LicensePage from './pages/LicensePage';

export const AppContext = createContext(null);
export function useApp() { return useContext(AppContext); }
export function useToast() { return useContext(AppContext).showToast; }

// ── Notification panel ────────────────────────────────────────────────────────
function NotificationPanel({ lowStock, updateStatus, updateInfo, onClose, onGoToSettings }) {
  const hasUpdate = updateStatus === 'available' || updateStatus === 'downloaded';
  const isEmpty = !hasUpdate && lowStock.length === 0;

  return (
    <div style={{
      position: 'absolute', top: 'calc(var(--header-height) + 4px)', right: 8,
      width: 320, background: 'var(--bg-card)', border: '1px solid var(--border-bright)',
      borderRadius: 14, boxShadow: 'var(--shadow-lg)', zIndex: 8888,
      animation: 'slideUp 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>Уведомления</span>
        <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
          <X size={14} />
        </button>
      </div>

      {isEmpty ? (
        <div style={{ padding: '24px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Всё в порядке ✓
        </div>
      ) : (
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {/* Update notification */}
          {hasUpdate && (
            <div
              onClick={onGoToSettings}
              style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: updateStatus === 'downloaded' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <ArrowDownCircle size={15} color={updateStatus === 'downloaded' ? 'var(--accent-green)' : 'var(--accent-gold)'} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>
                    {updateStatus === 'downloaded' ? `v${updateInfo?.version} готова к установке` : `Доступна версия ${updateInfo?.version}`}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Настройки → Обновления</div>
                </div>
              </div>
            </div>
          )}

          {/* Low stock items */}
          {lowStock.length > 0 && (
            <div>
              <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                Низкий остаток ({lowStock.length})
              </div>
              {lowStock.map(p => (
                <div key={p.id} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--border)' }}>
                  <AlertTriangle size={14} color={p.stock_quantity === 0 ? 'var(--accent-red)' : 'var(--accent-gold)'} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: p.stock_quantity === 0 ? 'var(--accent-red)' : 'var(--accent-gold)', marginTop: 1 }}>
                      {p.stock_quantity === 0 ? 'Закончился' : `Осталось ${p.stock_quantity} ${p.unit}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── TitleBar ──────────────────────────────────────────────────────────────────
function TitleBar({ updateStatus, updateInfo, lowStock, notifOpen, onBellToggle, onGoToSettings }) {
  const hasUpdate = updateStatus === 'available' || updateStatus === 'downloaded';
  const totalBadge = (hasUpdate ? 1 : 0) + lowStock.length;

  return (
    <div style={{
      height: 'var(--header-height)', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 16px',
      background: 'var(--bg-base)', borderBottom: '1px solid var(--border)',
      WebkitAppRegion: 'drag', flexShrink: 0, position: 'relative', zIndex: 9000,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={14} color="white" />
        </div>
        <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.02em' }}>CyberCafe</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manager</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, WebkitAppRegion: 'no-drag' }}>
        {/* Bell */}
        <button onClick={onBellToggle} style={{
          width: 32, height: 32, border: 'none', borderRadius: 6, background: notifOpen ? 'var(--bg-hover)' : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', transition: 'all 0.15s',
          color: totalBadge > 0 ? 'var(--accent-gold)' : 'var(--text-muted)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => { if (!notifOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <Bell size={15} />
          {totalBadge > 0 && (
            <span style={{
              position: 'absolute', top: 3, right: 3,
              minWidth: 14, height: 14, borderRadius: 7,
              background: hasUpdate && updateStatus === 'downloaded' ? 'var(--accent-green)' : 'var(--accent-red)',
              border: '1px solid var(--bg-base)',
              fontSize: 9, fontWeight: 800, color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2px',
            }}>
              {totalBadge}
            </span>
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
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
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

function Sidebar({ appVersion, updateStatus, lowStock, licenseStatus }) {
  const hasUpdate = updateStatus === 'available' || updateStatus === 'downloaded';
  return (
    <aside style={{
      width: 'var(--sidebar-width)', height: '100%', background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
      padding: '12px 12px 20px', flexShrink: 0,
    }}>
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, icon: Icon, label }) => {
          let dot = null;
          if (to === '/settings') {
            if (licenseStatus === 'grace' || licenseStatus === 'readonly') dot = 'var(--accent-red)';
            else if (hasUpdate) dot = updateStatus === 'downloaded' ? 'var(--accent-green)' : 'var(--accent-gold)';
          } else if (to === '/warehouse' && lowStock.length > 0) {
            dot = 'var(--accent-gold)';
          }
          return (
            <NavLink key={to} to={to} end={to === '/'} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              textDecoration: 'none', fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
              color: isActive ? 'white' : 'var(--text-secondary)',
              background: isActive ? 'linear-gradient(135deg, var(--accent), #7c3aed)' : 'transparent',
              boxShadow: isActive ? 'var(--shadow-accent)' : 'none',
            })}
            onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon size={16} />
              {label}
              {dot && <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
            </NavLink>
          );
        })}
      </nav>
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>
          v{appVersion} — CyberCafe Manager
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [settings, setSettings] = useState({ club_name: 'CyberCafe', currency: 'сом' });
  const [toasts, setToasts] = useState([]);
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState(null); // null = loading
  const [licenseInfo, setLicenseInfo] = useState(null);
  const [dateWarning, setDateWarning] = useState('');
  const panelRef = useRef(null);

  const loadLicense = async () => {
    if (!window.api?.getLicenseStatus) return;
    const status = await window.api.getLicenseStatus();
    setLicenseStatus(status.status);
    setLicenseInfo(status);
  };

  useEffect(() => {
    if (!window.api) return;
    window.api.getSettings().then(s => s && setSettings(s));
    window.api.getVersion?.().then(v => v && setAppVersion(v));
    window.api.getLowStockProducts?.(5).then(items => setLowStock(items || []));
    loadLicense();

    // Check date integrity warning
    window.api.getDateIntegrity?.().then(res => {
      if (res?.suspicious) setDateWarning(res.reason);
    });

    window.api.onUpdateStatus?.((data) => {
      setUpdateStatus(data.status);
      if (data.version || data.percent !== undefined || data.error || data.releaseNotes !== undefined) {
        setUpdateInfo(prev => ({ ...prev, ...data }));
      }
    });

    return () => { window.api.offUpdateStatus?.(); };
  }, []);

  // Close panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [notifOpen]);

  if (!window.api) {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#07070d', color: '#f0f0ff', gap: 16, fontFamily: 'sans-serif' }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Откройте приложение в Electron</div>
        <div style={{ fontSize: 14, color: '#9898b8', textAlign: 'center', maxWidth: 400 }}>
          Запустите через <code style={{ background: '#1e1e38', padding: '2px 8px', borderRadius: 4 }}>npm start</code>
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

  const refreshLowStock = async () => {
    const items = await window.api.getLowStockProducts?.(5);
    setLowStock(items || []);
  };

  const goToSettings = () => {
    window.location.hash = '#/settings';
    setNotifOpen(false);
  };

  const isReadOnly = licenseStatus === 'readonly';

  // Show activation screen if not licensed
  if (licenseStatus === 'none' || licenseStatus === 'invalid') {
    return (
      <AppContext.Provider value={{ settings, updateSetting, showToast, appVersion, updateStatus, updateInfo, lowStock, refreshLowStock, licenseStatus, licenseInfo, isReadOnly }}>
        <LicensePage onActivated={loadLicense} />
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <span style={{ fontSize: 16 }}>{t.type === 'success' ? '✓' : '✗'}</span>
              <span style={{ fontSize: 13 }}>{t.message}</span>
            </div>
          ))}
        </div>
      </AppContext.Provider>
    );
  }

  return (
    <AppContext.Provider value={{ settings, updateSetting, showToast, appVersion, updateStatus, updateInfo, lowStock, refreshLowStock, licenseStatus, licenseInfo, isReadOnly, loadLicense }}>
      <HashRouter>
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} ref={panelRef}>
          <TitleBar
            updateStatus={updateStatus}
            updateInfo={updateInfo}
            lowStock={lowStock}
            notifOpen={notifOpen}
            onBellToggle={() => setNotifOpen(o => !o)}
            onGoToSettings={goToSettings}
          />
          {notifOpen && (
            <NotificationPanel
              lowStock={lowStock}
              updateStatus={updateStatus}
              updateInfo={updateInfo}
              onClose={() => setNotifOpen(false)}
              onGoToSettings={goToSettings}
            />
          )}

          {/* License warning banners */}
          {licenseStatus === 'grace' && licenseInfo && (
            <div style={{ background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.4)', padding: '7px 16px', fontSize: 12, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
              <ShieldAlert size={13} />
              Лицензия истекает через {licenseInfo.daysLeft} {licenseInfo.daysLeft === 1 ? 'день' : licenseInfo.daysLeft < 5 ? 'дня' : 'дней'}. Обновите ключ в Настройки → Лицензия.
            </div>
          )}
          {isReadOnly && (
            <div style={{ background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.4)', padding: '7px 16px', fontSize: 12, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
              <ShieldX size={13} />
              Лицензия истекла — режим просмотра. Создание новых счетов недоступно. Обратитесь к разработчику.
            </div>
          )}
          {dateWarning && (
            <div style={{ background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.4)', padding: '7px 16px', fontSize: 12, color: 'var(--accent-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
              <AlertTriangle size={13} />
              {dateWarning}
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <Sidebar appVersion={appVersion} updateStatus={updateStatus} lowStock={lowStock} licenseStatus={licenseStatus} />
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
