import React, { useEffect, useRef, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';

const QR_SYSTEMS = [
  { id: 'click',    name: 'Click',     short: 'CLICK', bg: '#E8F4FF', color: '#0077BB' },
  { id: 'payme',    name: 'Payme',     short: 'PAY',   bg: '#E6F7F4', color: '#0F8A7A' },
  { id: 'uzum',     name: 'Uzum Bank', short: 'UZUM',  bg: '#FFF3EE', color: '#CC4A18' },
  { id: 'apelsin',  name: 'Apelsin',   short: 'APS',   bg: '#FFF0EB', color: '#CC3D00' },
  { id: 'humans',   name: 'Humans',    short: 'HUM',   bg: '#F3EEFF', color: '#5228BE' },
  { id: 'zoodpay',  name: 'Zoodpay',   short: 'ZOO',   bg: '#E8F3FC', color: '#1A7AB0' },
];

interface Props {
  isOpen: boolean;
  amount: number;
  storeName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function QRPaymentModal({ isOpen, amount, storeName, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!selected || !canvasRef.current) return;
    const text = `${storeName}|${amount}|${selected}|${Date.now()}`;
    drawQR(canvasRef.current, text);
  }, [selected, amount, storeName]);

  function drawQR(canvas: HTMLCanvasElement, text: string) {
    const size = 180;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    const cells = 21;
    const cell = Math.floor(size / cells);
    let hash = 0;
    for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash) + text.charCodeAt(i);
    ctx.fillStyle = '#1E293B';
    for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        const isCorner = (r < 7 && c < 7) || (r < 7 && c > cells-8) || (r > cells-8 && c < 7);
        const val = isCorner ? 1 : ((hash ^ (r * 31 + c * 17)) % 2);
        if (val) ctx.fillRect(c * cell + 2, r * cell + 2, cell - 1, cell - 1);
      }
    }
    [[0,0],[0,cells-7],[cells-7,0]].forEach(([r,c]) => {
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 2;
      ctx.strokeRect(c * cell + 2, r * cell + 2, 7 * cell - 2, 7 * cell - 2);
    });
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[24px] p-6" onClick={e => e.stopPropagation()}>

        <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[17px] font-semibold text-[#1E293B]">To'lov tizimini tanlang</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[22px] font-medium text-[#2563EB] text-center mb-5">
          {amount.toLocaleString('uz-UZ')} so'm
        </p>

        <div className="grid grid-cols-3 gap-2 mb-5">
          {QR_SYSTEMS.map(sys => (
            <button
              key={sys.id}
              onClick={() => setSelected(sys.id)}
              className={`rounded-2xl border p-3 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                selected === sys.id
                  ? 'border-[#2563EB] border-2 bg-[#EFF6FF]'
                  : 'border-[#E2E8F0] hover:border-slate-300'
              }`}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-[11px]"
                style={{ background: sys.bg, color: sys.color }}>
                {sys.short}
              </div>
              <span className="text-[11px] font-medium text-[#1E293B] text-center leading-tight">{sys.name}</span>
            </button>
          ))}
        </div>

        {selected && (
          <div className="flex flex-col items-center mb-5">
            <canvas ref={canvasRef} className="rounded-xl border border-[#E2E8F0]" />
            <p className="text-[13px] text-[#64748B] mt-2">Telefonda skanerlang</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose}
            className="py-3 rounded-xl border border-[#E2E8F0] text-[#64748B] font-medium text-sm cursor-pointer hover:bg-slate-50">
            Bekor qilish
          </button>
          <button onClick={onConfirm} disabled={!selected}
            className={`py-3 rounded-xl font-semibold text-sm text-white cursor-pointer flex items-center justify-center gap-2 transition-all ${
              selected ? 'bg-[#16A34A] hover:bg-green-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}>
            <CheckCircle className="w-4 h-4" /> To'landi ✓
          </button>
        </div>
      </div>
    </div>
  );
}
