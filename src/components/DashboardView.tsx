import React from 'react';
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
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
}

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString('uz-UZ');
}

export default function DashboardView({ products, sales, debts, expenses, settings, activeShift, cashierName }: Props) {
  const today = new Date().toISOString().substring(0, 10);

  const todaySales = sales.filter(s => s.timestamp.startsWith(today));
  const todayRevenue = todaySales.reduce((s, sale) => s + sale.totalAmount, 0);
  const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);

  const totalCost = sales.reduce((sum, sale) => {
    return sum + sale.items.reduce((s, item) => {
      const prod = products.find(p => p.id === item.productId);
      return s + (prod ? prod.costPrice * item.quantity : 0);
    }, 0);
  }, 0);
  const totalProfit = totalRevenue - totalCost;
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalProfit - totalExpenses;

  const lowStockProducts = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5));
  const outOfStock = products.filter(p => p.stock === 0).length;
  const totalDebt = debts.reduce((s, d) => s + (d.amount - d.paidAmount), 0);

  const last5Sales = sales.slice(0, 5);

  // Simple bar chart: last 7 days revenue
  const days: { label: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().substring(0, 10);
    const amount = sales.filter(s => s.timestamp.startsWith(key)).reduce((s, sale) => s + sale.totalAmount, 0);
    days.push({ label: d.toLocaleDateString('uz-UZ', { weekday: 'short' }), amount });
  }
  const maxDay = Math.max(...days.map(d => d.amount), 1);

  // Top 5 products by soldCount
  const topProducts = [...products]
    .filter(p => (p.soldCount || 0) > 0)
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 5);
  const maxSold = Math.max(...topProducts.map(p => p.soldCount || 0), 1);

  const payMethods = ['Naqd', 'Karta', 'Nasiya'] as const;
  const payTotals = payMethods.map(m => ({
    method: m,
    amount: sales.filter(s => s.paymentMethod === m).reduce((s, sale) => s + sale.totalAmount, 0),
  }));
  const paySum = payTotals.reduce((s, p) => s + p.amount, 1);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 overflow-auto h-full">

      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-[#1E293B] dark:text-slate-100">
            Xush kelibsiz, {cashierName}!
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {settings.storeName} &middot; {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-xl border border-green-100 dark:border-green-800">
          <Clock className="w-3.5 h-3.5" />
          Smena ochiq
        </div>
      </div>

      {/* 6 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            label: "Bugungi savdo",
            value: fmtMoney(todayRevenue) + " so'm",
            sub: `${todaySales.length} ta tranzaksiya`,
            icon: <ShoppingCart className="w-5 h-5" />,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/30',
            trend: todaySales.length > 0 ? 'up' : null,
          },
          {
            label: "Umumiy foyda",
            value: fmtMoney(netProfit) + " so'm",
            sub: `Xarajat: ${fmtMoney(totalExpenses)}`,
            icon: <TrendingUp className="w-5 h-5" />,
            color: netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            bg: netProfit >= 0 ? 'bg-green-50 dark:bg-green-900/30' : 'bg-red-50 dark:bg-red-900/30',
            trend: netProfit >= 0 ? 'up' : 'down',
          },
          {
            label: "Mahsulotlar",
            value: String(products.length),
            sub: `Kam qolgan: ${lowStockProducts.length} ta`,
            icon: <Package className="w-5 h-5" />,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-900/30',
            trend: null,
          },
          {
            label: "Tugagan mahsulot",
            value: String(outOfStock),
            sub: "Zaxira yo'q",
            icon: <AlertTriangle className="w-5 h-5" />,
            color: outOfStock > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400',
            bg: outOfStock > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-slate-50 dark:bg-slate-800',
            trend: null,
          },
          {
            label: "Nasiya qarzdorlik",
            value: fmtMoney(totalDebt) + " so'm",
            sub: `${debts.length} ta mijoz`,
            icon: <Users className="w-5 h-5" />,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-900/30',
            trend: null,
          },
          {
            label: "Kassa (naqd)",
            value: fmtMoney(activeShift.currentCash) + " so'm",
            sub: `Terminal: ${fmtMoney(activeShift.terminal)}`,
            icon: <CreditCard className="w-5 h-5" />,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-900/30',
            trend: null,
          },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-xl ${card.bg}`}>
                <span className={card.color}>{card.icon}</span>
              </div>
              {card.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-green-500" />}
              {card.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500" />}
            </div>
            <div>
              <p className={`text-lg font-black leading-tight ${card.color}`}>{card.value}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{card.label}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 7-day Revenue Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-sm font-bold text-[#1E293B] dark:text-slate-200 mb-4">So'nggi 7 kunlik savdo</h3>
          <div className="flex items-end gap-2 h-32">
            {days.map((d, i) => {
              const pct = maxDay > 0 ? (d.amount / maxDay) * 100 : 0;
              const isToday = i === 6;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end" style={{ height: '96px' }}>
                    <div
                      className={`w-full rounded-t-lg transition-all ${isToday ? 'bg-[#2563eb]' : 'bg-slate-200 dark:bg-slate-600'}`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                      title={`${d.amount.toLocaleString('uz-UZ')} so'm`}
                    />
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? 'text-[#2563eb]' : 'text-slate-400 dark:text-slate-500'}`}>{d.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment method donut-style */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm">
          <h3 className="text-sm font-bold text-[#1E293B] dark:text-slate-200 mb-4">To'lov usullari</h3>
          <div className="space-y-3">
            {payTotals.map(p => {
              const pct = Math.round((p.amount / paySum) * 100);
              const colors: Record<string, string> = {
                Naqd: 'bg-green-500',
                Karta: 'bg-blue-500',
                Nasiya: 'bg-amber-500',
              };
              return (
                <div key={p.method}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{p.method}</span>
                    <span className="text-slate-400 dark:text-slate-400">{fmtMoney(p.amount)} so'm ({pct}%)</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colors[p.method]}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top products */}
          <h3 className="text-sm font-bold text-[#1E293B] dark:text-slate-200 mt-5 mb-3">Top mahsulotlar</h3>
          <div className="space-y-2">
            {topProducts.map((p, i) => {
              const pct = Math.round(((p.soldCount || 0) / maxSold) * 100);
              return (
                <div key={p.id} className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{p.name}</p>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mt-0.5 overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{p.soldCount} ta</span>
                </div>
              );
            })}
            {topProducts.length === 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Savdo ma'lumotlari yo'q</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent 5 sales */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-bold text-[#1E293B] dark:text-slate-200">So'nggi savdolar</h3>
        </div>
        <div className="divide-y divide-slate-50 dark:divide-slate-700">
          {last5Sales.length === 0 && (
            <p className="px-5 py-4 text-xs text-slate-400 dark:text-slate-500">Savdo mavjud emas</p>
          )}
          {last5Sales.map(sale => {
            const methodColors: Record<string, string> = {
              Naqd: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              Karta: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              Nasiya: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
            };
            return (
              <div key={sale.id} className="px-5 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{sale.customerName}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{sale.timestamp} &middot; {sale.cashier}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold ${methodColors[sale.paymentMethod]}`}>
                  {sale.paymentMethod}
                </span>
                <span className="text-sm font-black text-[#1E293B] dark:text-slate-100 shrink-0">
                  {sale.totalAmount.toLocaleString('uz-UZ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Low stock warning */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-bold text-amber-800 dark:text-amber-300">Kam qolgan mahsulotlar</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.map(p => (
              <div key={p.id} className="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 border border-amber-100 dark:border-amber-800">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{p.name}</span>
                <span className="text-xs font-black text-amber-600 dark:text-amber-400">{p.stock} ta</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
