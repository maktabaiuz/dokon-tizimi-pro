import React, { useEffect, useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import QRCode from 'qrcode';

const QR_SYSTEMS = [
  { id: 'click',   name: 'Click',     short: 'CLICK', bg: '#E8F4FF', color: '#0077BB' },
  { id: 'payme',   name: 'Payme',     short: 'PAY',   bg: '#E6F7F4', color: '#0F8A7A' },
  { id: 'uzum',    name: 'Uzum Bank', short: 'UZUM',  bg: '#FFF3EE', color: '#CC4A18' },
  { id: 'apelsin', name: 'Apelsin',   short: 'APS',   bg: '#FFF0EB', color: '#CC3D00' },
  { id: 'humans',  name: 'Humans',    short: 'HUM',   bg: '#F3EEFF', color: '#5228BE' },
  { id: 'zoodpay', name: 'Zoodpay',   short: 'ZOO',   bg: '#E8F3FC', color: '#1A7AB0' },
];

function buildPaymentUrl(system: string, merchantId: string, amount: number): string {
  const orderId = `POS-${Date.now()}`;
  const mid = merchantId || 'demo';
  switch (system) {
    case 'click':
      return `https://my.click.uz/services/pay?service_id=${mid}&merchant_id=${mid}&amount=${amount}&transaction_param=${orderId}`;
    case 'payme': {
      const params = btoa(`m=${mid};ac.order_id=${orderId};a=${amount * 100}`);
      return `https://checkout.paycom.uz/${params}`;
    }
    case 'uzum':
      return `uzumbank://pay?merchant_id=${mid}&amount=${amount}&order_id=${orderId}`;
    case 'apelsin':
      return `apelsin://pay?merchant=${mid}&amount=${amount}&order=${orderId}`;
    case 'humans':
      return `humans://pay?merchant=${mid}&amount=${amount}&order=${orderId}`;
    default:
      return `${system}://pay?merchant=${mid}&amount=${amount}&order=${orderId}`;
  }
}

interface Props {
  isOpen: boolean;
  amount: number;
  storeName: string;
  merchantId: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function QRPaymentModal({ isOpen, amount, storeName, merchantId, onClose, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) { setQrDataUrl(''); return; }
    setLoading(true);
    const url = buildPaymentUrl(selected, merchantId, amount);
    QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: '#1E293B', light: '#ffffff' } })
      .then(dataUrl => { setQrDataUrl(dataUrl); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selected, amount, merchantId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-t-[24px] sm:rounded-[24px] p-6" onClick={e => e.stopPropagation()}>

        <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[17px] font-semibold text-[#1E293B]">To'lov tizimini tanlang</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-[22px] font-medium text-[#2563EB] text-center mb-1">
          {amount.toLocaleString('uz-UZ')} so'm
        </p>
        <p className="text-center text-[11px] text-slate-400 mb-4">{storeName}</p>

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
            {loading ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center border border-[#E2E8F0] rounded-xl">
                <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt="QR kod" className="rounded-xl border border-[#E2E8F0]" width={200} height={200} />
            ) : null}
            <p className="text-[13px] text-[#64748B] mt-2">Telefonda skanerlang</p>
            {!merchantId && (
              <p className="text-[11px] text-amber-600 font-semibold mt-1">
                Sozlamalarda Merchant ID kiriting
              </p>
            )}
          </div>
        )}

        {!selected && (
          <p className="text-center text-xs text-amber-600 font-semibold mb-2">
            ↑ Avval to'lov tizimini tanlang
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={onClose}
            className="py-3 rounded-xl border border-[#E2E8F0] text-[#64748B] font-medium text-sm cursor-pointer hover:bg-slate-50">
            Bekor qilish
          </button>
          <button onClick={onConfirm} disabled={!selected}
            className={`py-3 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-all ${
              selected ? 'bg-[#16A34A] hover:bg-green-700 cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}>
            <CheckCircle className="w-4 h-4" /> To'landi ✓
          </button>
        </div>
      </div>
    </div>
  );
}
