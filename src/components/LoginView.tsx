import React, { useState, useEffect } from 'react';
import { Delete, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Cashier } from '../types';
import { verifyPin } from '../utils/crypto';
import { fmtStore } from '../utils/format';

interface LoginViewProps {
  cashiers: Cashier[];
  onLoginSuccess: (cashier: Cashier) => void;
}

const AVATAR_COLORS = [
  { bg: '#e0e7ff', text: '#3730a3' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#e0f2fe', text: '#0c4a6e' },
  { bg: '#f3e8ff', text: '#6b21a8' },
  { bg: '#ffedd5', text: '#9a3412' },
  { bg: '#ecfdf5', text: '#065f46' },
];

function getAvatarColor(id: string) {
  const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function LoginView({ cashiers, onLoginSuccess }: LoginViewProps) {
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  const activeCashiers = cashiers.filter(c => c.isActive);

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  // Countdown ticker while locked
  useEffect(() => {
    if (!lockedUntil) return;
    const id = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setCountdown(0);
        setFailCount(0);
      } else {
        setCountdown(remaining);
      }
    }, 500);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const handleKeyPress = (num: string) => {
    if (success || pin.length >= 4 || isLocked) return;
    setError(false);
    setPin(prev => prev + num);
  };

  const handleBackspace = () => {
    if (success || isLocked) return;
    setError(false);
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (success || isLocked) return;
    setPin('');
    setError(false);
  };

  const handleSelectCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setPin('');
    setError(false);
    setSuccess(false);
    setFailCount(0);
    setLockedUntil(null);
    setCountdown(0);
  };

  const handleBack = () => {
    setSelectedCashier(null);
    setPin('');
    setError(false);
    setSuccess(false);
    setFailCount(0);
    setLockedUntil(null);
    setCountdown(0);
  };

  useEffect(() => {
    if (!selectedCashier) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKeyPress(e.key);
      else if (e.key === 'Backspace') handleBackspace();
      else if (e.key === 'Escape') handleBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pin, success, selectedCashier]);

  useEffect(() => {
    if (!selectedCashier || pin.length !== 4) return;
    if (lockedUntil !== null && Date.now() < lockedUntil) { setPin(''); return; }

    (async () => {
      let ok: boolean;
      if (selectedCashier.pinHash && selectedCashier.pinSalt) {
        ok = await verifyPin(pin, selectedCashier.pinHash, selectedCashier.pinSalt);
      } else {
        ok = pin.trim() === String(selectedCashier.pin ?? '').trim();
      }

      if (ok) {
        setSuccess(true);
        setTimeout(() => onLoginSuccess(selectedCashier), 500);
      } else {
        setFailCount(prev => {
          const next = prev + 1;
          if (next >= 3) setLockedUntil(Date.now() + 30000);
          return next;
        });
        setError(true);
        setShake(true);
        setTimeout(() => { setPin(''); setError(false); setShake(false); }, 650);
      }
    })();
  }, [pin, selectedCashier, lockedUntil]);

  const bgStyle: React.CSSProperties = {
    minHeight: '100vh',
    backgroundImage: "url('/fon.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  };

  // ── STAGE 1: Kasir tanlash ────────────────────────────────────────────────
  if (!selectedCashier) {
    return (
      <div style={bgStyle}>

        {/* Kontent */}
        <div style={{ width:'100%', maxWidth:'560px', position:'relative', zIndex:1 }}>
          {/* Header */}
          <div style={{ textAlign:'center', marginBottom:'32px' }}>
            <div style={{
              width:'64px', height:'64px', borderRadius:'18px',
              background:'rgba(255,255,255,0.15)',
              backdropFilter:'blur(10px)',
              border:'1px solid rgba(255,255,255,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 16px', boxShadow:'0 8px 32px rgba(0,0,0,0.3)'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9 22 9 12 15 12 15 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 style={{ fontSize:'26px', fontWeight:900, color:'white', letterSpacing:'-0.5px', margin:0 }}>
              Sarpolar to'plami
            </h1>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.6)', marginTop:'6px', fontWeight:500 }}>
              Kassirni tanlang
            </p>
          </div>

          {/* Kasirlar grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
            {activeCashiers.map(cashier => {
              const color = getAvatarColor(cashier.id);
              return (
                <button
                  key={cashier.id}
                  onClick={() => handleSelectCashier(cashier)}
                  style={{
                    background:'rgba(255,255,255,0.95)',
                    border:'2px solid rgba(255,255,255,0.2)',
                    borderRadius:'16px',
                    padding:'20px 12px',
                    display:'flex', flexDirection:'column',
                    alignItems:'center', gap:'10px',
                    cursor:'pointer', transition:'all 0.15s',
                    boxShadow:'0 4px 20px rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 30px rgba(0,0,0,0.35)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
                  }}
                >
                  <div style={{
                    width:'56px', height:'56px', borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'18px', fontWeight:900,
                    background: color.bg, color: color.text,
                  }}>
                    {getInitials(cashier.name)}
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ fontWeight:700, fontSize:'12px', color:'#1E293B', margin:0 }}>{cashier.name}</p>
                    <p style={{ fontSize:'10px', color:'#64748B', marginTop:'2px' }}>{fmtStore(cashier.storeLabel)}</p>
                    {cashier.role === 'owner' && (
                      <span style={{
                        marginTop:'6px', display:'inline-flex', alignItems:'center', gap:'3px',
                        background:'#2563eb', color:'white',
                        fontSize:'9px', fontWeight:700,
                        padding:'2px 8px', borderRadius:'999px'
                      }}>
                        <ShieldCheck style={{ width:'9px', height:'9px' }} /> Admin
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p style={{ textAlign:'center', fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'32px', fontFamily:'monospace' }}>
            Sarpolar to'plami · v1.0
          </p>
        </div>
      </div>
    );
  }

  // ── STAGE 2: PIN kiritish ─────────────────────────────────────────────────
  const color = getAvatarColor(selectedCashier.id);

  return (
    <div style={bgStyle}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
        .pin-shake { animation: shake 0.45s ease; }
      `}</style>

      <div
        className={shake ? 'pin-shake' : ''}
        style={{
          background:'white',
          width:'100%', maxWidth:'380px',
          borderRadius:'28px',
          padding:'32px',
          boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
          border: error ? '2px solid #f87171' : success ? '2px solid #4ade80' : '2px solid rgba(255,255,255,0.1)',
          display:'flex', flexDirection:'column', alignItems:'center',
          position:'relative', zIndex:1,
          transition:'border-color 0.2s',
        }}
      >
        {/* Orqaga tugma */}
        <button
          onClick={handleBack}
          style={{
            alignSelf:'flex-start', display:'flex', alignItems:'center', gap:'6px',
            fontSize:'12px', color:'#64748B', background:'none', border:'none',
            cursor:'pointer', marginBottom:'20px', fontWeight:500,
          }}
        >
          <ArrowLeft style={{ width:'14px', height:'14px' }} /> Kassirlar ro'yxati
        </button>

        {/* Avatar */}
        <div style={{
          width:'64px', height:'64px', borderRadius:'50%',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'20px', fontWeight:900, marginBottom:'8px',
          background: color.bg, color: color.text,
        }}>
          {getInitials(selectedCashier.name)}
        </div>
        <p style={{ fontWeight:900, color:'#1E293B', fontSize:'15px', margin:0 }}>{selectedCashier.name}</p>
        <p style={{ fontSize:'12px', color:'#64748B', marginTop:'2px' }}>{fmtStore(selectedCashier.storeLabel)}</p>

        <p style={{
          fontSize:'12px', marginTop:'12px', marginBottom:'24px', fontWeight:600,
          color: success ? '#16a34a' : error ? '#ef4444' : '#94A3B8',
        }}>
          {success
            ? 'Kirish muvaffaqiyatli!'
            : isLocked
              ? `Bloklandi! ${countdown}s — Ko'p noto'g'ri urinish`
              : error
                ? `Xato PIN! ${3 - failCount} urinish qoldi`
                : failCount > 0
                  ? `Xato PIN! ${3 - failCount} urinish qoldi`
                  : 'PIN-kodingizni kiriting'
          }
        </p>

        {/* PIN nuqtalar */}
        <div style={{ display:'flex', gap:'16px', marginBottom:'32px' }}>
          {[0, 1, 2, 3].map(idx => (
            <div key={idx} style={{
              width:'14px', height:'14px', borderRadius:'50%',
              border: `2px solid ${idx < pin.length ? (success ? '#4ade80' : error ? '#f87171' : '#1E293B') : '#CBD5E1'}`,
              background: idx < pin.length ? (success ? '#4ade80' : error ? '#f87171' : '#1E293B') : 'transparent',
              transition:'all 0.15s',
            }} />
          ))}
        </div>

        {/* Raqam klaviaturasi */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px 20px' }}>
          {['1','2','3','4','5','6','7','8','9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              style={{
                width:'66px', height:'66px', borderRadius:'50%',
                background:'white', border:'1px solid #E2E8F0',
                fontSize:'20px', fontWeight:700, color:'#1E293B',
                cursor:'pointer', transition:'all 0.1s',
                boxShadow:'0 2px 6px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0f3ff')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            style={{
              width:'66px', height:'66px', borderRadius:'50%',
              background:'transparent', border:'none',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'#64748B', cursor:'pointer',
            }}
          >
            <Delete style={{ width:'20px', height:'20px' }} />
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            style={{
              width:'66px', height:'66px', borderRadius:'50%',
              background:'white', border:'1px solid #E2E8F0',
              fontSize:'20px', fontWeight:700, color:'#1E293B',
              cursor:'pointer', transition:'all 0.1s',
              boxShadow:'0 2px 6px rgba(0,0,0,0.06)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f0f3ff')}
            onMouseLeave={e => (e.currentTarget.style.background = 'white')}
          >
            0
          </button>
          <button
            onClick={handleClear}
            style={{
              width:'66px', height:'66px', borderRadius:'50%',
              background:'transparent', border:'none',
              fontSize:'10px', fontWeight:600, color:'#64748B',
              cursor:'pointer',
            }}
          >
            Tozala
          </button>
        </div>
      </div>
    </div>
  );
}
