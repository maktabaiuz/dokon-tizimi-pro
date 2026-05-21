import React, { useState, useEffect } from 'react';
import { Delete, ArrowLeft, Store, ShieldCheck } from 'lucide-react';
import { Cashier } from '../types';

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
  const [success, setSuccess] = useState(false);

  const activeCashiers = cashiers.filter(c => c.isActive);

  const handleKeyPress = (num: string) => {
    if (success || pin.length >= 4) return;
    setError(false);
    setPin(prev => prev + num);
  };

  const handleBackspace = () => {
    if (success) return;
    setError(false);
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (success) return;
    setPin('');
    setError(false);
  };

  const handleSelectCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setPin('');
    setError(false);
    setSuccess(false);
  };

  const handleBack = () => {
    setSelectedCashier(null);
    setPin('');
    setError(false);
    setSuccess(false);
  };

  // Keyboard support on PIN screen
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

  // PIN validation
  useEffect(() => {
    if (!selectedCashier || pin.length !== 4) return;
    if (pin === selectedCashier.pin) {
      setSuccess(true);
      setTimeout(() => onLoginSuccess(selectedCashier), 500);
    } else {
      setError(true);
      setTimeout(() => { setPin(''); setError(false); }, 650);
    }
  }, [pin, selectedCashier]);

  // ── STAGE 1: Kasir tanlash ────────────────────────────────────────────────
  if (!selectedCashier) {
    return (
      <div className="min-h-screen bg-[#F0F3FF] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-[560px]">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#2563eb] flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black text-[#1E293B] tracking-tight">Do'kon Tizimi PRO</h1>
            <p className="text-sm text-[#64748B] mt-1 font-medium">Kassirni tanlang</p>
          </div>

          {/* Kasirlar grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {activeCashiers.map(cashier => {
              const color = getAvatarColor(cashier.id);
              return (
                <button
                  key={cashier.id}
                  onClick={() => handleSelectCashier(cashier)}
                  className="bg-white border-2 border-[#E2E8F0] rounded-2xl p-5 flex flex-col items-center gap-3 hover:border-[#2563eb] hover:shadow-lg active:scale-95 transition-all cursor-pointer select-none group"
                >
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black transition-transform group-hover:scale-105"
                    style={{ background: color.bg, color: color.text }}
                  >
                    {getInitials(cashier.name)}
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-xs text-[#1E293B] leading-tight">{cashier.name}</p>
                    <p className="text-[10px] text-[#64748B] mt-0.5">{cashier.storeLabel}</p>
                    {cashier.role === 'owner' && (
                      <span className="mt-1.5 inline-flex items-center gap-1 bg-[#2563eb] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-2.5 h-2.5" /> Egasi
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-center text-xs text-slate-400 mt-8 font-mono">
            Do'kon Tizimi PRO · v1.0
          </p>
        </div>
      </div>
    );
  }

  // ── STAGE 2: PIN kiritish ─────────────────────────────────────────────────
  const color = getAvatarColor(selectedCashier.id);

  return (
    <div className="min-h-screen bg-[#F0F3FF] flex items-center justify-center p-6">
      <div
        className={`bg-white w-full max-w-[380px] rounded-[28px] p-8 shadow-xl border-2 flex flex-col items-center transition-all duration-200 ${
          error ? 'border-red-400 animate-bounce' : success ? 'border-green-400' : 'border-[#E2E8F0]'
        }`}
      >
        {/* Orqaga tugma */}
        <button
          onClick={handleBack}
          className="self-start flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#2563eb] mb-5 cursor-pointer transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Kassirlar ro'yxati
        </button>

        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black mb-2 shadow-sm"
          style={{ background: color.bg, color: color.text }}
        >
          {getInitials(selectedCashier.name)}
        </div>
        <p className="font-black text-[#1E293B] text-base">{selectedCashier.name}</p>
        <p className="text-xs text-[#64748B] mt-0.5">{selectedCashier.storeLabel}</p>

        <p className={`text-xs mt-3 mb-6 font-semibold transition-colors ${
          success ? 'text-green-600' : error ? 'text-red-500' : 'text-[#94A3B8]'
        }`}>
          {success ? 'Kirish muvaffaqiyatli!' : error ? 'Xato PIN-kod! Qayta urinib ko\'ring' : 'PIN-kodingizni kiriting'}
        </p>

        {/* PIN nuqtalar */}
        <div className="flex gap-4 mb-8">
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                idx < pin.length
                  ? success ? 'bg-green-500 border-green-500'
                  : error ? 'bg-red-500 border-red-500'
                  : 'bg-[#1E293B] border-[#1E293B]'
                  : 'border-[#CBD5E1] bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Raqam klaviaturasi */}
        <div className="grid grid-cols-3 gap-y-3 gap-x-5">
          {['1','2','3','4','5','6','7','8','9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="w-[66px] h-[66px] rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-xl font-bold text-[#1E293B] hover:bg-[#f0f3ff] hover:border-[#2563eb]/30 active:scale-90 transition-all select-none cursor-pointer shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            className="w-[66px] h-[66px] rounded-full flex items-center justify-center text-[#64748B] hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
          >
            <Delete className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="w-[66px] h-[66px] rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-xl font-bold text-[#1E293B] hover:bg-[#f0f3ff] hover:border-[#2563eb]/30 active:scale-90 transition-all select-none cursor-pointer shadow-sm"
          >
            0
          </button>
          <button
            onClick={handleClear}
            className="w-[66px] h-[66px] rounded-full flex items-center justify-center text-[10px] font-semibold text-[#64748B] hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer"
          >
            Tozala
          </button>
        </div>
      </div>
    </div>
  );
}
