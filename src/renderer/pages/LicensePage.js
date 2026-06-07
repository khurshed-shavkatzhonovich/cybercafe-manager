import React, { useState, useEffect } from 'react';
import { Zap, Copy, Check, KeyRound, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function LicensePage({ onActivated }) {
  const [machineId, setMachineId] = useState('Загрузка...');
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    window.api?.getMachineId?.().then(id => setMachineId(id || 'Недоступно'));
  }, []);

  const copyMachineId = async () => {
    try {
      await navigator.clipboard.writeText(machineId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleActivate = async () => {
    const key = keyInput.trim();
    if (!key) { setError('Введите лицензионный ключ'); return; }
    setLoading(true);
    setError('');
    try {
      const result = await window.api?.activateLicense?.(key);
      if (result?.ok) {
        onActivated();
      } else {
        setError(result?.error || 'Неверный ключ');
      }
    } catch (e) {
      setError('Ошибка активации: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-base)', padding: 24,
    }}>
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-bright)',
        borderRadius: 20, padding: 36,
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
          }}>
            <Zap size={30} color="white" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 22, letterSpacing: '-0.01em' }}>CyberCafe Manager</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Требуется активация</div>
        </div>

        {/* Machine ID */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Идентификатор компьютера (Machine ID)
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{
              flex: 1, padding: '10px 14px', borderRadius: 10,
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-primary)',
              wordBreak: 'break-all', lineHeight: 1.5,
            }}>
              {machineId}
            </div>
            <button
              onClick={copyMachineId}
              title="Скопировать Machine ID"
              style={{
                width: 40, height: 40, border: '1px solid var(--border)',
                borderRadius: 10, background: 'var(--bg-hover)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: copied ? 'var(--accent-green)' : 'var(--text-secondary)',
                transition: 'all 0.15s', flexShrink: 0,
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            Отправьте этот ID разработчику для получения лицензионного ключа
          </div>
        </div>

        {/* License key input */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <KeyRound size={12} />
            Лицензионный ключ
          </div>
          <textarea
            value={keyInput}
            onChange={e => { setKeyInput(e.target.value); setError(''); }}
            placeholder="Вставьте лицензионный ключ здесь..."
            rows={4}
            style={{
              width: '100%', padding: '12px 14px',
              background: 'var(--bg-input)', border: `1px solid ${error ? 'var(--accent-red)' : 'var(--border)'}`,
              borderRadius: 10, color: 'var(--text-primary)',
              fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6,
              resize: 'vertical', outline: 'none', boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { if (!error) e.target.style.borderColor = 'var(--accent)'; }}
            onBlur={e => { if (!error) e.target.style.borderColor = 'var(--border)'; }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', gap: 8, alignItems: 'flex-start',
            background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)',
            borderRadius: 8, padding: '10px 14px', color: 'var(--accent-red)',
            fontSize: 13, marginBottom: 16,
          }}>
            <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* Activate button */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14, fontWeight: 700 }}
          onClick={handleActivate}
          disabled={loading || !keyInput.trim()}
        >
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              Проверка...
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={16} />
              Активировать
            </span>
          )}
        </button>

        <div style={{ marginTop: 20, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          Свяжитесь с разработчиком для получения лицензии
        </div>
      </div>
    </div>
  );
}
