import React, { useState, useEffect } from 'react';
import { Lock, Delete } from 'lucide-react';

interface LoginViewProps {
  correctPin: string;
  onLoginSuccess: (cashierName: string) => void;
}

export default function LoginView({ correctPin, onLoginSuccess }: LoginViewProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  // Digital keypad press
  const handleKeyPress = (num: string) => {
    if (success) return;
    setError(false);
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
    }
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

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, success]);

  // PIN validation when code reaches 4 digits
  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        setSuccess(true);
        setTimeout(() => {
          onLoginSuccess('Asadbek O.');
        }, 500);
      } else {
        setError(true);
        // Play error shake and reset after 600ms
        const timer = setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [pin, correctPin, onLoginSuccess]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-6">
      <div
        className={`bg-white w-full max-w-[420px] rounded-[24px] p-10 shadow-lg border border-[#E2E8F0] flex flex-col items-center transition-all duration-300 ${
          error ? 'animate-bounce border-red-400' : ''
        }`}
      >
        {/* Header Block */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#f0f3ff] flex items-center justify-center mb-4 text-[#004ac6] shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E293B] tracking-tight">Do'kon Tizimi PRO</h1>
          <p
            className={`text-sm mt-1 transition-colors duration-200 ${
              success ? 'text-green-600 font-semibold' : error ? 'text-red-500 font-semibold' : 'text-[#64748B]'
            }`}
          >
            {success ? 'Kirish muvaffaqiyatli!' : error ? 'Xato PIN-kod kiritildi!' : 'Xavfsizlik uchun operator PIN-kodini kiriting'}
          </p>
        </div>

        {/* Visual PIN Dots Indicator */}
        <div className="flex gap-4 mb-10 h-4 items-center">
          {[0, 1, 2, 3].map(idx => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150 ${
                idx < pin.length
                  ? success
                    ? 'bg-green-500 border-green-500'
                    : error
                    ? 'bg-red-500 border-red-500'
                    : 'bg-[#1E293B] border-[#1E293B]'
                  : 'border-[#CBD5E1] bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Numeric keypad layout */}
        <div className="grid grid-cols-3 gap-y-4 gap-x-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="w-[72px] h-[72px] rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-xl font-bold text-[#1E293B] hover:bg-[#F8F9FA] active:scale-90 transition-all select-none cursor-pointer shadow-sm"
            >
              {num}
            </button>
          ))}
          {/* Backspace */}
          <button
            type="button"
            onClick={handleBackspace}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[#64748B] hover:bg-[#F8F9FA] active:scale-95 transition-all select-none cursor-pointer"
          >
            <Delete className="w-6 h-6" />
          </button>
          {/* 0 */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="w-[72px] h-[72px] rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-xl font-bold text-[#1E293B] hover:bg-[#F8F9FA] active:scale-90 transition-all select-none cursor-pointer shadow-sm"
          >
            0
          </button>
          {/* Dot/Clear */}
          <button
            type="button"
            onClick={handleClear}
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-xs font-semibold text-[#64748B] hover:bg-red-50 hover:text-red-500 rounded-full transition-all select-none cursor-pointer"
          >
            Tozalash
          </button>
        </div>

        {/* Footer info text */}
        <div className="mt-8">
          <p className="text-xs text-[#94a3b8] text-center font-mono">
            Sinflar: Inter &middot; 4 raqamli kalit
          </p>
        </div>
      </div>
    </div>
  );
}
