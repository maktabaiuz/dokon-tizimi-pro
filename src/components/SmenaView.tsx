import { useState, useMemo } from 'react';
import {
  Clock,
  Unlock,
  Banknote,
  CreditCard,
  QrCode,
  Wallet,
  ShoppingBag,
  X,
  Printer,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import { Sale, ActiveShift } from '../types';

interface SmenaViewProps {
  cashierName: string;
  sales: Sale[];
  activeShift: ActiveShift;
  lastUpdated?: Date;
  onCloseShift: () => void;
}

export default function SmenaView({ cashierName, sales, activeShift, lastUpdated, onCloseShift }: SmenaViewProps) {
  const [showModal, setShowModal] = useState(false);

  const today = new Date().toISOString().substring(0, 10);

  const { mySales, naqdTotal, kartaTotal, nasiyaTotal, jamiTotal } = useMemo(() => {
    const my     = sales.filter(s => s.timestamp.substring(0, 10) === today && s.cashier === cashierName);
    const naqd   = my.filter(s => s.paymentMethod === 'Naqd').reduce((a, s) => a + s.totalAmount, 0);
    const karta  = my.filter(s => s.paymentMethod === 'Karta').reduce((a, s) => a + s.totalAmount, 0);
    const nasiya = my.filter(s => s.paymentMethod === 'Nasiya').reduce((a, s) => a + s.totalAmount, 0);
    return { mySales: my, naqdTotal: naqd, kartaTotal: karta, nasiyaTotal: nasiya, jamiTotal: naqd + karta + activeShift.qrTotal + nasiya };
  }, [sales, cashierName, today, activeShift.qrTotal, lastUpdated]);

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="flex-1 p-6 bg-[#F9F9FF] overflow-y-auto custom-scrollbar">
      <div className="max-w-xl mx-auto space-y-5">

        {/* Sarlavha */}
        <div>
          <h1 className="text-2xl font-bold text-[#1E293B]">Mening Smena</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Kassir: <span className="font-bold text-[#2563eb]">{cashierName}</span>
            &nbsp;·&nbsp;Boshlangan: <span className="font-bold">{activeShift.startTime}</span>
          </p>
        </div>

        {/* To'lov turlari kartochkalari */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Naqd",   value: naqdTotal,          icon: Banknote,  color: "text-green-600",  bg: "bg-green-50",  border: "border-green-100" },
            { label: "Karta",  value: kartaTotal,         icon: CreditCard,color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100"  },
            { label: "QR",     value: activeShift.qrTotal,icon: QrCode,    color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100"},
            { label: "Nasiya", value: nasiyaTotal,         icon: Wallet,    color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100" },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} className={`${bg} border ${border} rounded-2xl p-4 flex items-center gap-3`}>
              <Icon className={`w-5 h-5 ${color} shrink-0`} />
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className={`text-base font-black ${color} font-mono`}>{fmt(value)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Jami stat */}
        <div className="bg-white border border-[#c3c6d7] rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <ShoppingBag className="w-4 h-4" /> Jami sotuvlar soni
            </span>
            <span className="font-black text-[#1E293B]">{mySales.length} ta chek</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <span className="flex items-center gap-2 text-sm font-black text-[#2563eb]">
              <TrendingUp className="w-4 h-4" /> Jami summa
            </span>
            <span className="text-xl font-black text-[#2563eb] font-mono">{fmt(jamiTotal)} UZS</span>
          </div>
        </div>

        {/* Bugungi cheklar */}
        <div className="bg-white border border-[#c3c6d7] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E2E8F0] bg-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-[#1E293B]">Bugungi cheklar</h3>
            <span className="text-[10px] text-slate-400 font-mono">{today}</span>
          </div>
          {mySales.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-slate-300" />
              Bugun hali sotuv amalga oshirilmadi
            </div>
          ) : (
            <div className="divide-y divide-[#E2E8F0] max-h-64 overflow-y-auto">
              {mySales.map(sale => (
                <div key={sale.id} className="px-5 py-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-bold text-slate-700 font-mono">{sale.id}</p>
                    <p className="text-[10px] text-slate-400">{sale.timestamp.split(' ')[1]} · {sale.customerName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sale.paymentMethod === 'Naqd'   ? 'bg-green-50 text-green-700 border border-green-200' :
                      sale.paymentMethod === 'Karta'  ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>{sale.paymentMethod}</span>
                    <span className="font-black text-[#2563eb] font-mono">{fmt(sale.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Smena yopish tugma */}
        <button
          onClick={() => setShowModal(true)}
          className="w-full py-4 bg-gradient-to-r from-[#1E2933] to-[#263143] hover:from-[#263143] hover:to-[#1E2933] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer text-sm"
        >
          <Unlock className="w-4 h-4 text-orange-400" />
          Smenani yopish
        </button>
      </div>

      {/* Smena yopish modali */}
      {showModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <style>{`
            @media print {
              body > * { visibility: hidden !important; }
              #smena-kassir-hisobot { visibility: visible !important; position: fixed !important; top: 0; left: 0; width: 100%; padding: 32px; }
              #smena-kassir-hisobot * { visibility: visible !important; }
              .print-hide { display: none !important; }
            }
          `}</style>

          <div id="smena-kassir-hisobot" className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="bg-gradient-to-r from-[#1E2933] to-[#263143] px-6 py-5 text-white flex justify-between items-start">
              <div>
                <h2 className="font-black text-base">Smena Yakuniy Hisobot</h2>
                <p className="text-xs text-slate-400 mt-0.5">{cashierName} · {today}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="print-hide p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-0 text-sm divide-y divide-slate-100">
              <div className="pb-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Smena boshlanish</span>
                  <span className="font-bold text-xs">{activeShift.startTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-medium">Mas'ul kassir</span>
                  <span className="font-bold text-xs">{cashierName}</span>
                </div>
              </div>

              <div className="py-4 space-y-2.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">To'lov turlari</p>
                {[
                  { label: "Naqd",   value: naqdTotal,           icon: Banknote,   color: "text-green-700"  },
                  { label: "Karta",  value: kartaTotal,          icon: CreditCard, color: "text-blue-700"   },
                  { label: "QR",     value: activeShift.qrTotal, icon: QrCode,     color: "text-purple-700" },
                  { label: "Nasiya", value: nasiyaTotal,          icon: Wallet,     color: "text-amber-700"  },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="flex justify-between items-center">
                    <span className="text-slate-600 text-xs font-medium flex items-center gap-1.5">
                      <Icon className={`w-3.5 h-3.5 ${color}`} /> {label} sotuvlar
                    </span>
                    <span className={`font-bold text-xs font-mono ${color}`}>{fmt(value)} UZS</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" /> Jami sotuvlar soni
                  </span>
                  <span className="font-bold text-xs">{mySales.length} ta</span>
                </div>
                <div className="flex justify-between items-center bg-[#f0f3ff] px-4 py-3 rounded-xl">
                  <span className="text-[#2563eb] text-xs font-black uppercase tracking-wide">Jami summa</span>
                  <span className="font-black text-[#2563eb] text-sm font-mono">{fmt(jamiTotal)} UZS</span>
                </div>
              </div>
            </div>

            <div className="print-hide px-6 pb-6 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#c3c6d7] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" /> Chop etish
              </button>
              <button
                onClick={() => { onCloseShift(); setShowModal(false); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer transition-all"
              >
                <Unlock className="w-4 h-4" /> Smenani yop
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
