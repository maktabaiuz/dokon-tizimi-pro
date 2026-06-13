import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Banknote,
  CreditCard,
  Users,
  QrCode,
  Package,
  Trophy,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Product, Sale, Debt, Expense, StoreSettings, ActiveShift } from '../types';

interface Props {
  products: Product[];
  sales: Sale[];
  debts: Debt[];
  expenses: Expense[];
  settings: StoreSettings;
  activeShift: ActiveShift;
  cashierName: string;
  lastUpdated?: Date;
}

const UZ_MONTHS = [
  'Yanvar','Fevral','Mart','Aprel','May','Iyun',
  'Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr',
];
const UZ_DAYS_LONG = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba'];
const UZ_DAYS_SHORT = ['Du','Se','Ch','Pa','Ju','Sh','Ya'];

function localDayKey(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateLong(d: Date): string {
  return `${d.getDate()} ${UZ_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${UZ_DAYS_LONG[d.getDay()]}`;
}

const fmt = (n: number) => n.toLocaleString('uz-UZ') + " so'm";

export default function DashboardView({ products, sales, debts, lastUpdated }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [now, setNow] = useState(new Date());

  // Live clock — ticks every second
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayKey = localDayKey(now);

  // All sales calculations memoised — recompute only when sales or lastUpdated changes
  const todaySales = useMemo(
    () => sales.filter(s => s.timestamp.startsWith(todayKey)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sales, todayKey, lastUpdated]
  );

  const yesterdaySales = useMemo(() => {
    const yd = new Date(now);
    yd.setDate(yd.getDate() - 1);
    return sales.filter(s => s.timestamp.startsWith(localDayKey(yd)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales, todayKey, lastUpdated]);

  const getTotal = (arr: Sale[], method?: string) =>
    arr.filter(s => !method || (s.paymentMethod as string) === method)
       .reduce((a, s) => a + s.totalAmount, 0);

  const todayTotal     = useMemo(() => getTotal(todaySales),           [todaySales]);
  const yesterdayTotal = useMemo(() => getTotal(yesterdaySales),       [yesterdaySales]);
  const naqdTotal      = useMemo(() => getTotal(todaySales, 'Naqd'),   [todaySales]);
  const kartaTotal     = useMemo(() => getTotal(todaySales, 'Karta'),  [todaySales]);
  const nasiyaTotal    = useMemo(() => getTotal(todaySales, 'Nasiya'), [todaySales]);
  const qrTotal        = useMemo(() => getTotal(todaySales, 'QR'),     [todaySales]);

  const trendPct = yesterdayTotal > 0
    ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100)
    : todayTotal > 0 ? 100 : 0;
  const trendUp = todayTotal >= yesterdayTotal;

  // Top product today
  const topProduct = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    todaySales.forEach(s =>
      s.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.name, count: 0 };
        map[item.productId].count += item.quantity;
      })
    );
    return Object.values(map).sort((a, b) => b.count - a.count)[0] ?? null;
  }, [todaySales]);

  const lowStockCount = useMemo(
    () => products.filter(p => p.stock <= (p.lowStockThreshold ?? 5)).length,
    [products]
  );

  const totalDebt = useMemo(
    () => debts.reduce((s, d) => s + (d.amount - d.paidAmount), 0),
    [debts]
  );

  // Calendar logic
  const calYear = calendarMonth.getFullYear();
  const calMon  = calendarMonth.getMonth();
  const firstDay    = new Date(calYear, calMon, 1);
  const lastDay     = new Date(calYear, calMon + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const daysWithSales = useMemo(() => {
    const set = new Set<string>();
    sales.forEach(s => {
      const key = s.timestamp.slice(0, 10);
      if (key.startsWith(`${calYear}-${String(calMon + 1).padStart(2, '0')}`)) set.add(key);
    });
    return set;
  }, [sales, calYear, calMon]);

  const selectedKey     = localDayKey(selectedDate);
  const isSelectedToday = selectedKey === todayKey;

  const selectedSales = useMemo(
    () => sales.filter(s => s.timestamp.startsWith(selectedKey)),
    [sales, selectedKey]
  );
  const selectedTotal = useMemo(() => getTotal(selectedSales), [selectedSales]);

  function prevMonth() { setCalendarMonth(new Date(calYear, calMon - 1, 1)); }
  function nextMonth() {
    const next = new Date(calYear, calMon + 1, 1);
    if (next <= now) setCalendarMonth(next);
  }
  const canGoNext = new Date(calYear, calMon + 1, 1) <= now;

  const payCards = [
    { icon: <Banknote className="w-5 h-5" />,   color: '#22C55E', label: 'Naqd pul',     method: 'Naqd',  sub: 'ta tranzaksiya', total: naqdTotal,  count: todaySales.filter(s => s.paymentMethod === 'Naqd').length  },
    { icon: <CreditCard className="w-5 h-5" />, color: '#0071E3', label: 'Karta',         method: 'Karta', sub: 'ta tranzaksiya', total: kartaTotal,  count: todaySales.filter(s => s.paymentMethod === 'Karta').length },
    { icon: <Users className="w-5 h-5" />,      color: '#F97316', label: 'Nasiya (qarz)', method: 'Nasiya',sub: 'ta mijoz',       total: nasiyaTotal, count: todaySales.filter(s => s.paymentMethod === 'Nasiya').length},
    { icon: <QrCode className="w-5 h-5" />,     color: '#A855F7', label: "QR to'lov",    method: 'QR',    sub: 'ta tranzaksiya', total: qrTotal,     count: todaySales.filter(s => (s.paymentMethod as string) === 'QR').length   },
  ];

  const hov = {
    style: { transition: 'transform 0.2s' } as React.CSSProperties,
    onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'scale(1.01)'; },
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => { e.currentTarget.style.transform = 'scale(1)'; },
  };

  const liveTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;

  return (
    <div className="overflow-auto h-full" style={{ backgroundColor: '#F5F5F7' }}>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4 pb-10">

        {/* ── HERO ── */}
        <div className="bg-white rounded-[20px] shadow-sm p-6 sm:p-8" {...hov}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <p className="text-[13px] text-gray-400 mb-1">Bugungi umumiy tushum</p>
              <p className="font-bold text-black leading-none" style={{ fontSize: 48 }}>
                {fmt(todayTotal)}
              </p>
              <p className="text-[13px] text-gray-400 mt-2">
                {`${now.getFullYear()} yil ${now.getDate()} ${UZ_MONTHS[now.getMonth()]}, ${UZ_DAYS_LONG[now.getDay()]} · `}
                <span className="font-mono font-semibold text-black">{liveTime}</span>
              </p>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              <p className="text-[11px] text-gray-400">Kechagiga nisbatan</p>
              <div
                className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-sm"
                style={{ backgroundColor: trendUp ? '#F0FDF4' : '#FFF1F2', color: trendUp ? '#16A34A' : '#DC2626' }}
              >
                {trendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {trendUp && trendPct > 0 ? '+' : ''}{trendPct}%
              </div>
              <p className="text-[11px] text-gray-400">Kecha: {fmt(yesterdayTotal)}</p>
              {/* Live indicator */}
              <span className="flex items-center gap-1 text-xs text-green-500 mt-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Real vaqt
              </span>
            </div>
          </div>
        </div>

        {/* ── PAYMENT METHODS ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {payCards.map(card => (
            <div
              key={card.method}
              className="bg-white rounded-[20px] shadow-sm overflow-hidden flex flex-col"
              {...hov}
            >
              <div className="p-4 flex-1">
                <div className="mb-3" style={{ color: card.color }}>{card.icon}</div>
                <p className="font-bold text-black text-base leading-snug">{fmt(card.total)}</p>
                <p className="text-[13px] font-semibold text-black mt-1.5">{card.label}</p>
                <p className="text-[11px] text-gray-400">{card.count} {card.sub}</p>
              </div>
              <div style={{ height: 4, backgroundColor: card.color }} />
            </div>
          ))}
        </div>

        {/* ── INFO ROW ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-[20px] shadow-sm p-4" {...hov}>
            <Package className="w-5 h-5 mb-2" style={{ color: '#0071E3' }} />
            <p className="font-bold text-black text-2xl leading-tight">{products.length}</p>
            <p className="text-[13px] font-semibold text-black">Mahsulotlar</p>
            <p className="text-[11px] font-semibold" style={{ color: '#F97316' }}>
              {lowStockCount} ta kam qolgan
            </p>
          </div>

          <div className="bg-white rounded-[20px] shadow-sm p-4" {...hov}>
            <CreditCard className="w-5 h-5 mb-2" style={{ color: '#0071E3' }} />
            <p className="font-bold text-black text-base leading-snug">{fmt(totalDebt)}</p>
            <p className="text-[13px] font-semibold text-black">Qarzdorlik</p>
            <p className="text-[11px] text-gray-400">{debts.length} ta mijoz</p>
          </div>

          <div className="bg-white rounded-[20px] shadow-sm p-4" {...hov}>
            <Trophy className="w-5 h-5 mb-2" style={{ color: '#0071E3' }} />
            <p className="font-bold text-black text-sm leading-snug line-clamp-2">
              {topProduct ? topProduct.name : '—'}
            </p>
            <p className="text-[13px] font-semibold text-black">Top mahsulot</p>
            <p className="text-[11px] text-gray-400">
              {topProduct ? `${topProduct.count} ta sotildi` : "Bugun savdo yo'q"}
            </p>
          </div>
        </div>

        {/* ── HISTORY ── */}
        <div className="bg-white rounded-[20px] shadow-sm p-5" {...hov}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5" style={{ color: '#0071E3' }} />
            <h3 className="font-bold text-black text-base">Kunlik tarix</h3>
          </div>

          {/* Calendar header */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="font-semibold text-black text-sm">
              {UZ_MONTHS[calMon]} {calYear}
            </span>
            <button
              onClick={nextMonth}
              disabled={!canGoNext}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
              style={{ color: canGoNext ? '#6B7280' : '#D1D5DB', cursor: canGoNext ? 'pointer' : 'default' }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day labels */}
          <div className="grid grid-cols-7 mb-1">
            {UZ_DAYS_SHORT.map(d => (
              <div key={d} className="flex items-center justify-center">
                <span className="text-[11px] font-semibold text-gray-400">{d}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const cellDate = new Date(calYear, calMon, day);
              const cellKey  = localDayKey(cellDate);
              const isToday    = cellKey === todayKey;
              const isSelected = cellKey === selectedKey;
              const hasSales   = daysWithSales.has(cellKey);
              const isFuture   = cellDate > now;
              return (
                <div key={day} className="flex flex-col items-center">
                  <button
                    disabled={isFuture}
                    onClick={() => !isFuture && setSelectedDate(new Date(cellDate))}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-[13px] font-medium transition-all duration-150"
                    style={{
                      backgroundColor: isToday ? '#0071E3' : isSelected ? '#374151' : 'transparent',
                      color: isToday || isSelected ? 'white' : isFuture ? '#D1D5DB' : '#111827',
                      fontWeight: isToday || isSelected ? 700 : 500,
                      cursor: isFuture ? 'default' : 'pointer',
                    }}
                  >
                    {day}
                  </button>
                  <div className="w-1 h-1 rounded-full mt-0.5"
                    style={{ backgroundColor: hasSales && !isToday && !isSelected ? '#0071E3' : 'transparent' }} />
                </div>
              );
            })}
          </div>

          {/* Selected day summary — always shown */}
          <div className="mt-5 rounded-2xl p-4" style={{ backgroundColor: '#F5F5F7' }}>
            <p className="text-center text-[13px] text-gray-400 mb-1">
              {isSelectedToday ? 'Bugun' : formatDateLong(selectedDate)}
            </p>
            <p className="text-center font-bold text-black leading-none" style={{ fontSize: 32 }}>
              {fmt(selectedTotal)}
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4 mb-3">
              {[
                { label: 'Naqd',   method: 'Naqd',   color: '#22C55E' },
                { label: 'Karta',  method: 'Karta',  color: '#0071E3' },
                { label: 'Nasiya', method: 'Nasiya', color: '#F97316' },
                { label: 'QR',     method: 'QR',     color: '#A855F7' },
              ].map(({ label, method, color }) => {
                const amt = getTotal(selectedSales, method);
                const cnt = selectedSales.filter(s => (s.paymentMethod as string) === method).length;
                return (
                  <div key={method} className="bg-white rounded-xl p-3 shadow-sm">
                    <p className="font-bold text-black text-sm leading-snug">{fmt(amt)}</p>
                    <p className="text-[11px] font-semibold mt-0.5" style={{ color }}>{label}</p>
                    <p className="text-[10px] text-gray-400">{cnt} ta</p>
                  </div>
                );
              })}
            </div>
            <p className="text-center text-[12px] text-gray-400">
              Jami {selectedSales.length} ta tranzaksiya
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
