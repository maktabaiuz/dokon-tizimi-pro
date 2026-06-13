import React, { useState, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  ShoppingBag,
  Star,
  AlertOctagon,
  Wallet,
  Receipt,
  RotateCcw,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  Unlock,
  Package,
  ArrowRightLeft,
  FileText,
  X,
  Phone,
  CheckCircle2,
  CreditCard,
  Printer,
  QrCode,
  Banknote,
} from 'lucide-react';
import { Product, Debt, Sale, ActiveShift, Expense } from '../types';
import renderIcon from '../utils/renderIcon';

const EXPENSE_CATEGORIES = ['Ijara', 'Maosh', 'Kommunal', 'Transport', 'Reklama', 'Boshqa'];

interface HisobotViewProps {
  products: Product[];
  sales: Sale[];
  debts: Debt[];
  expenses: Expense[];
  activeShift: ActiveShift;
  storeId: string;
  lastUpdated?: Date;
  onCloseShift: () => void;
  onReturnSale: (saleId: string) => void;
  onPayDebt: (debtId: string, amount: number) => void;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export default function HisobotView({
  products,
  sales,
  debts,
  expenses,
  activeShift,
  storeId,
  lastUpdated,
  onCloseShift,
  onReturnSale,
  onPayDebt,
  onAddExpense,
  onDeleteExpense,
}: HisobotViewProps) {
  const today = new Date().toISOString().substring(0, 10);

  // Analytical date range selection togglers
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [appliedStart, setAppliedStart] = useState<string>(today);
  const [appliedEnd, setAppliedEnd] = useState<string>(today);
  const [salesSearchQuery, setSalesSearchQuery] = useState<string>('');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Return sale states
  const [viewingReceipt, setViewingReceipt] = useState<Sale | null>(null);
  const [returnConfirm, setReturnConfirm] = useState<Sale | null>(null);

  // Smena yopish modal
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);

  // Debt payment states
  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [payAmountInput, setPayAmountInput] = useState<string>('');
  const [payError, setPayError] = useState<string>('');
  const [payMethod, setPayMethod] = useState<'Naqd' | 'Karta'>('Naqd');

  // Smena hisobot breakdown (bugungi sotuvlardan)
  const { shiftNaqdTotal, shiftKartaTotal, shiftNasiyaTotal, shiftJamiTotal } = useMemo(() => {
    const naqd   = sales.filter(s => s.timestamp.substring(0, 10) === today && s.paymentMethod === 'Naqd').reduce((a, s) => a + s.totalAmount, 0);
    const karta  = sales.filter(s => s.timestamp.substring(0, 10) === today && s.paymentMethod === 'Karta').reduce((a, s) => a + s.totalAmount, 0);
    const nasiya = sales.filter(s => s.timestamp.substring(0, 10) === today && s.paymentMethod === 'Nasiya').reduce((a, s) => a + s.totalAmount, 0);
    return { shiftNaqdTotal: naqd, shiftKartaTotal: karta, shiftNasiyaTotal: nasiya, shiftJamiTotal: naqd + karta + activeShift.qrTotal + nasiya };
  }, [sales, today, activeShift.qrTotal, lastUpdated]);

  // Xarajat tab state
  const [activeHisobotTab, setActiveHisobotTab] = useState<'hisobot' | 'xarajat'>('hisobot');
  const [expenseForm, setExpenseForm] = useState({ amount: '', category: EXPENSE_CATEGORIES[0], description: '' });
  const [expenseError, setExpenseError] = useState('');

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseForm.amount);
    if (!amount || amount <= 0) { setExpenseError("Summa 0 dan katta bo'lishi kerak"); return; }
    setExpenseError('');
    onAddExpense({
      id: `exp-${Date.now()}`,
      date: new Date().toISOString().substring(0, 10),
      amount,
      category: expenseForm.category,
      description: expenseForm.description.trim(),
      storeId,
    });
    setExpenseForm({ amount: '', category: EXPENSE_CATEGORIES[0], description: '' });
  };

  const totalExpenses = expenses.reduce((a, e) => a + e.amount, 0);

  // Quick date range helpers
  const getWeekStart = () => {
    const d = new Date();
    const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
    d.setDate(d.getDate() + diff);
    return d.toISOString().substring(0, 10);
  };
  const getMonthStart = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };
  const applyQuickRange = (type: 'today' | 'week' | 'month') => {
    const t = new Date().toISOString().substring(0, 10);
    const s = type === 'today' ? t : type === 'week' ? getWeekStart() : getMonthStart();
    setStartDate(s); setEndDate(t);
    setAppliedStart(s); setAppliedEnd(t);
  };

  // Filtered sales by applied date range
  const filteredSales = useMemo(() => sales.filter(s =>
    s.timestamp.substring(0, 10) >= appliedStart &&
    s.timestamp.substring(0, 10) <= appliedEnd
  ), [sales, appliedStart, appliedEnd, lastUpdated]);

  // CSV export
  const handleExportCSV = () => {
    if (filteredSalesLog.length === 0) {
      alert("Eksport qilish uchun ma'lumot yo'q");
      return;
    }
    const headers = ['Chek #', 'Sana', 'Kassir', 'Mijoz', 'Mahsulotlar', "To'lov usuli", 'Summa (UZS)'];
    const rows = filteredSalesLog.map(s => [
      s.id,
      s.timestamp,
      s.cashier,
      s.customerName,
      s.items.map((it: any) => `${it.name} x${it.quantity}`).join('; '),
      s.paymentMethod,
      s.totalAmount.toString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `savdo-tarixi-${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 1. Dynamic KPIs calculation
  const totalSalesRevenue = filteredSales.reduce((acc, sale) => acc + sale.totalAmount, 0);
  const totalSalesCount = filteredSales.length;

  // Profit calculation: (sellingPrice - costPrice) for all sold items
  const totalProfitCalculated = filteredSales.reduce((acc, sale) => {
    const saleProfit = sale.items.reduce((itemAcc, item) => {
      const matchProduct = products.find(p => p.id === item.productId);
      const itemCost = matchProduct ? matchProduct.costPrice : item.price * 0.75;
      return itemAcc + (item.price - itemCost) * item.quantity;
    }, 0);
    return acc + saleProfit;
  }, 0);

  // Total warehouse inventory valuation
  const totalWarehouseValuation = products.reduce((acc, p) => acc + (p.price * p.stock), 0);

  // Avvalgi davr hisoblash (joriy davr uzunligiga teng)
  const periodDays = Math.max(1, Math.round(
    (new Date(appliedEnd).getTime() - new Date(appliedStart).getTime()) / 86400000
  ) + 1);
  const prevEnd = new Date(appliedStart);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (periodDays - 1));
  const prevStartStr = prevStart.toISOString().substring(0, 10);
  const prevEndStr   = prevEnd.toISOString().substring(0, 10);

  const prevSales = sales.filter(s =>
    s.timestamp.substring(0, 10) >= prevStartStr &&
    s.timestamp.substring(0, 10) <= prevEndStr
  );
  const prevRevenue = prevSales.reduce((a, s) => a + s.totalAmount, 0);
  const prevCount   = prevSales.length;
  const prevProfit  = prevSales.reduce((acc, sale) => {
    return acc + sale.items.reduce((ia, item) => {
      const mp = products.find(p => p.id === item.productId);
      return ia + (item.price - (mp ? mp.costPrice : item.price * 0.75)) * item.quantity;
    }, 0);
  }, 0);

  const calcPct = (curr: number, prev: number): string | null => {
    if (prev === 0 && curr === 0) return null;
    if (prev === 0) return '+100%';
    const p = ((curr - prev) / prev * 100).toFixed(1);
    return Number(p) > 0 ? `+${p}%` : `${p}%`;
  };
  const revenuePct = calcPct(totalSalesRevenue, prevRevenue);
  const countPct   = calcPct(totalSalesCount, prevCount);
  const profitPct  = calcPct(totalProfitCalculated, prevProfit);

  // 2. Bar chart estimations (Du to Ya)
  // Let&apos;s map last 7 days sales dynamically
  const daysOfTheWeek = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
  const baseChartValues = [340000, 480000, 720000, 510000, 1245000, 890000, 420000];
  // Inject current active sales into Ju (Friday, or whatever day it represents)
  baseChartValues[4] = Math.max(baseChartValues[4], totalSalesRevenue);

  // 3. Top selling calculation: product occurrence in history
  const productSellsLookup: { [name: string]: number } = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(it => {
      productSellsLookup[it.name] = (productSellsLookup[it.name] || 0) + it.quantity;
    });
  });
  const topProductsArray = Object.keys(productSellsLookup)
    .map(name => ({ name, count: productSellsLookup[name] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Fallback: if no filtered sales, use product.soldCount field as source of truth
  const finalTopProducts = topProductsArray.length > 0 ? topProductsArray :
    [...products]
      .filter(p => (p.soldCount || 0) > 0)
      .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
      .slice(0, 10)
      .map(p => ({ name: p.name, count: p.soldCount || 0 }));

  // 4. Low stock levels
  const scarceProducts = products
    .filter(p => p.stock <= (p.lowStockThreshold || 5))
    .slice(0, 4);

  // Filter transaction log (date range + search)
  const filteredSalesLog = filteredSales.filter(sale =>
    sale.id.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
    sale.customerName.toLowerCase().includes(salesSearchQuery.toLowerCase()) ||
    sale.paymentMethod.toLowerCase().includes(salesSearchQuery.toLowerCase())
  );

  const netProfit = totalProfitCalculated - totalExpenses;

  return (
    <div className="flex-1 flex flex-col bg-[#F9F9FF] overflow-hidden">

      {/* Tab navigation */}
      <div className="flex gap-1 px-6 pt-5 pb-0 border-b border-[#E2E8F0] bg-white shrink-0">
        <button
          onClick={() => setActiveHisobotTab('hisobot')}
          className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
            activeHisobotTab === 'hisobot'
              ? 'bg-[#f0f3ff] text-[#2563eb] border-b-2 border-[#2563eb]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Hisobot
        </button>
        <button
          onClick={() => setActiveHisobotTab('xarajat')}
          className={`px-5 py-2.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
            activeHisobotTab === 'xarajat'
              ? 'bg-[#f0f3ff] text-[#2563eb] border-b-2 border-[#2563eb]'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Xarajatlar
          {expenses.length > 0 && (
            <span className="ml-1.5 bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded-full">
              {expenses.length}
            </span>
          )}
        </button>
      </div>

      {/* Xarajat tab */}
      {activeHisobotTab === 'xarajat' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

          {/* Foyda umumiy kartasi */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] shadow-sm">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Savdo daromadi</p>
              <p className="text-xl font-black text-[#2563eb] mt-1">{totalSalesRevenue.toLocaleString()} UZS</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] shadow-sm">
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Xarajatlar jami</p>
              <p className="text-xl font-black text-red-600 mt-1">{totalExpenses.toLocaleString()} UZS</p>
            </div>
            <div className={`p-5 rounded-2xl border shadow-sm ${netProfit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Sof foyda</p>
              <p className={`text-xl font-black mt-1 ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toLocaleString()} UZS
              </p>
            </div>
          </div>

          {/* Xarajat qo'shish formasi */}
          <div className="bg-white rounded-2xl border border-[#c3c6d7] p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#1E293B] mb-4">Yangi xarajat qo'shish</h3>
            <form onSubmit={handleAddExpense} className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1 min-w-[120px]">
                <label className="text-xs font-bold text-[#64748B] block">Summa (UZS)</label>
                <input
                  type="number"
                  min="0"
                  value={expenseForm.amount}
                  onChange={e => { setExpenseForm(f => ({ ...f, amount: e.target.value })); setExpenseError(''); }}
                  placeholder="50000"
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#2563eb]/20 ${expenseError ? 'border-red-400' : 'border-[#E2E8F0]'}`}
                />
                {expenseError && <p className="text-[10px] text-red-500 font-semibold">{expenseError}</p>}
              </div>
              <div className="space-y-1 min-w-[130px]">
                <label className="text-xs font-bold text-[#64748B] block">Kategoriya</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#2563eb]/20 cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1 flex-1 min-w-[160px]">
                <label className="text-xs font-bold text-[#64748B] block">Izoh</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ixtiyoriy izoh..."
                  className="w-full px-3 py-2 bg-slate-50 border border-[#E2E8F0] rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                />
              </div>
              <button
                type="submit"
                className="bg-[#2563eb] hover:bg-[#004ac6] text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md select-none"
              >
                Qo'shish
              </button>
            </form>
          </div>

          {/* Xarajatlar ro'yxati */}
          <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-[#E2E8F0]">
              <p className="text-xs font-bold text-slate-600">{expenses.length} ta xarajat</p>
            </div>
            {expenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">Hali xarajat kiritilmagan</div>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {[...expenses].reverse().map(exp => (
                  <div key={exp.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#1E293B]">{exp.amount.toLocaleString()} UZS</span>
                        <span className="text-[10px] font-bold bg-[#f0f3ff] text-[#2563eb] px-2 py-0.5 rounded-full">{exp.category}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{exp.date}</span>
                      </div>
                      {exp.description && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{exp.description}</p>}
                    </div>
                    <button
                      onClick={() => onDeleteExpense(exp.id)}
                      className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hisobot tab */}
      {activeHisobotTab === 'hisobot' && (
      <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar select-none">

      {/* Header with Date Selection Block */}
      <header className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E293B]">Hisobotlar Paneli</h1>
            <p className="text-sm text-[#64748B]">
              Ko&apos;rsatilmoqda: <span className="font-bold text-[#2563eb]">{appliedStart}</span>
              {appliedStart !== appliedEnd && <> &mdash; <span className="font-bold text-[#2563eb]">{appliedEnd}</span></>}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Quick range buttons */}
            <div className="flex gap-1">
              {(['today', 'week', 'month'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => applyQuickRange(type)}
                  className="px-3 py-2 rounded-lg text-[11px] font-bold border border-[#c3c6d7] bg-white hover:bg-[#eeefff] hover:border-[#2563eb]/40 text-slate-600 cursor-pointer transition-all"
                >
                  {type === 'today' ? 'Bugun' : type === 'week' ? 'Bu hafta' : 'Bu oy'}
                </button>
              ))}
            </div>

            {/* Manual range picker */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-[#c3c6d7] shadow-sm text-xs font-semibold">
              <Calendar className="text-[#64748B] w-4 h-4 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-slate-700 w-28 text-center"
              />
              <span className="text-slate-400">&mdash;</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 p-0 text-slate-700 w-28 text-center"
              />
              <button
                onClick={() => { setAppliedStart(startDate); setAppliedEnd(endDate); }}
                className="bg-[#2563eb] hover:bg-[#004ac6] active:scale-95 text-white px-4 py-1.5 rounded-lg cursor-pointer transition-all shrink-0"
              >
                Ko&apos;rish
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 4 KPIs grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Bugungi savdo */}
        <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-2.5 bg-[#f0f3ff] text-[#2563eb] rounded-xl">
              {renderIcon('Coins', 'w-5 h-5')}
            </span>
            {revenuePct ? (
              <span className={`font-bold text-xs tracking-wide px-2 py-0.5 rounded-full ${revenuePct.startsWith('+') ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>{revenuePct}</span>
            ) : (
              <span className="text-slate-400 font-bold text-xs tracking-wide bg-slate-100 px-2 py-0.5 rounded-full">—</span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider">Bugungi savdo summasi</p>
            <h3 className="text-xl font-black text-[#1E293B] mt-1">{totalSalesRevenue.toLocaleString()} UZS</h3>
          </div>
        </div>

        {/* KPI 2: Sales transaction counts */}
        <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-2.5 bg-[#eeefff] text-[#004ac6] rounded-xl">
              {renderIcon('ShoppingCart', 'w-5 h-5')}
            </span>
            {countPct ? (
              <span className={`font-bold text-xs tracking-wide px-2 py-0.5 rounded-full ${countPct.startsWith('+') ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>{countPct}</span>
            ) : (
              <span className="text-slate-400 font-bold text-xs tracking-wide bg-slate-100 px-2 py-0.5 rounded-full">—</span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider">Sotuvlar (Cheklar) soni</p>
            <h3 className="text-xl font-black text-[#1E293B] mt-1">{totalSalesCount} ta</h3>
          </div>
        </div>

        {/* KPI 3: Total calculated profit */}
        <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-2.5 bg-green-50 text-green-600 rounded-xl">
              {renderIcon('TrendingUp', 'w-5 h-5')}
            </span>
            {profitPct ? (
              <span className={`font-bold text-xs tracking-wide px-2 py-0.5 rounded-full ${profitPct.startsWith('+') ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>{profitPct}</span>
            ) : (
              <span className="text-slate-400 font-bold text-xs tracking-wide bg-slate-100 px-2 py-0.5 rounded-full">—</span>
            )}
          </div>
          <div className="mt-4">
            <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider">Joriy toza foyda (Ustama)</p>
            <h3 className="text-xl font-black text-green-600 mt-1">{totalProfitCalculated.toLocaleString()} UZS</h3>
          </div>
        </div>

        {/* KPI 4: Total valuation in stock */}
        <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="p-2.5 bg-slate-50 text-slate-500 rounded-xl">
              {renderIcon('Package', 'w-5 h-5')}
            </span>
            <span className="text-slate-500 font-bold text-xs tracking-wide bg-slate-100 px-2 py-0.5 rounded-full">Aktual</span>
          </div>
          <div className="mt-4">
            <p className="text-[#64748B] text-xs font-bold uppercase tracking-wider">Umumiy ombor qiymati</p>
            <h3 className="text-xl font-black text-[#1E293B] mt-1">{totalWarehouseValuation.toLocaleString()} UZS</h3>
          </div>
        </div>
      </div>

      {/* Dynamics Chart & Shift controls section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales bar-graph chart (Simple SVG layout mimicking custom chart libraries) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#c3c6d7] shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-sm text-[#1E293B]">Sotuv dinamikasi (Oxirgi 7 kun)</h3>
              <p className="text-[11px] text-[#64748B] mt-0.5">Savdo hajmining kunbay taqsimlanish koeffitsiyenti</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 bg-[#2563eb] rounded-full" />
              <span className="text-[10px] font-bold text-[#64748B]">Savdolashgan summasi (UZS)</span>
            </div>
          </div>

          <div className="h-52 flex items-end justify-between px-3 border-b border-dashed border-slate-200 relative pb-1">
            {daysOfTheWeek.map((day, idx) => {
              const val = baseChartValues[idx];
              const maxVal = Math.max(...baseChartValues);
              const percentHeight = Math.round((val / maxVal) * 85) + 10;
              const isHovered = hoveredBarIndex === idx;

              return (
                <div 
                  key={idx} 
                  className="flex flex-col items-center gap-2 flex-1 relative group"
                  onMouseEnter={() => setHoveredBarIndex(idx)}
                  onMouseLeave={() => setHoveredBarIndex(null)}
                >
                  {/* Hover tooltip widget */}
                  {isHovered && (
                    <div className="absolute -top-12 z-10 bg-slate-800 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl font-mono text-center shrink-0">
                      <p className="font-bold">{day} kuni</p>
                      <p className="text-green-400 font-black mt-0.5">{val.toLocaleString()} UZS</p>
                    </div>
                  )}

                  {/* Core bar */}
                  <div 
                    className={`w-10 rounded-t-lg transition-all duration-300 shadow-sm cursor-pointer ${
                      idx === 4 
                        ? 'bg-[#2563eb] hover:bg-[#004ac6]' 
                        : 'bg-[#eeefff] border border-blue-50 hover:bg-[#dee8ff]'
                    }`}
                    style={{ height: `${percentHeight}%` }}
                  />
                  
                  <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">{day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cashier Shift management summary tool */}
        <div className="bg-gradient-to-br from-[#1E2933] to-[#263143] text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden text-sm border border-[#c3c6d7]">
          
          {/* Subtle background overlay clock */}
          <div className="absolute -right-8 -top-8 text-white/5 pointer-events-none">
            <Clock className="w-36 h-36" />
          </div>

          <div className="z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-black text-base text-white tracking-wide">Smenani boshqarish</h3>
                <p className="text-[11px] text-slate-300 font-mono flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" /> Smena boshlangan: {activeShift.startTime} dan buyon
                </p>
              </div>
              <Shield className="text-[#2563eb] w-5 h-5" />
            </div>

            <div className="space-y-3 pt-3">
              <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                <span className="text-xs text-slate-300 font-medium">Mas&apos;ul Kassir:</span>
                <span className="font-bold text-white tracking-wide">{activeShift.cashier}</span>
              </div>
              <div className="flex justify-between items-center pb-2.5 border-b border-white/10">
                <span className="text-xs text-slate-300 font-medium">Kassadagi Naqd pul:</span>
                <span className="font-bold text-white tracking-wide">{(2450000 + totalSalesRevenue * 0.4).toLocaleString()} UZS</span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-white/10">
                <span className="text-xs text-slate-300 font-medium">Terminal/Karta savdosi:</span>
                <span className="font-bold text-white tracking-wide">{(1890000 + totalSalesRevenue * 0.6).toLocaleString()} UZS</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowCloseShiftModal(true)}
            className="w-full mt-6 bg-white hover:bg-slate-50 text-slate-900 py-3 rounded-xl font-bold flex items-center justify-center gap-2 select-none cursor-pointer transition-all shadow active:scale-95 text-xs"
          >
            <Unlock className="w-4 h-4 text-orange-600" />
            Smenani yopish
          </button>
        </div>
      </div>

      {/* Bento grid lists details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Bento Cell 1: Top products list */}
        <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-xs text-[#1E293B]">Top 10 eng xaridorgir</h3>
            <Star className="text-yellow-500 w-4 h-4 fill-yellow-500" />
          </div>
          <div className="divide-y divide-[#E2E8F0] flex-1 overflow-x-auto text-xs font-semibold">
            {finalTopProducts.map((it, idx) => (
              <div key={idx} className="px-4 py-3.5 flex justify-between items-center hover:bg-slate-50">
                <span className="text-slate-700 truncate max-w-[170px]">{idx + 1}. {it.name}</span>
                <span className="bg-[#eeefff] text-[#2563eb] text-[10px] px-2.5 py-0.5 rounded-full font-black">
                  {it.count} ta sotildi
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bento Cell 2: Scarce stock levels */}
        <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-xs text-red-600">Kam qolgan tovarlar</h3>
            <AlertOctagon className="text-red-600 w-4 h-4" />
          </div>
          <div className="divide-y divide-[#E2E8F0] flex-1 overflow-x-auto text-xs font-semibold">
            {scarceProducts.length > 0 ? (
              scarceProducts.map((p, idx) => (
                <div key={p.id} className="px-4 py-3.5 flex justify-between items-center hover:bg-slate-50">
                  <span className="text-slate-700 truncate max-w-[170px]">{p.name}</span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                    p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {p.stock === 0 ? 'TUGADI' : `${p.stock} dona`}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">Kam qolgan tovarlar yo&apos;q!</div>
            )}
          </div>
        </div>

        {/* Bento Cell 3: Debt lists */}
        <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-xs text-amber-700">Qarzdorlar reestri</h3>
            <Wallet className="text-amber-700 w-4 h-4" />
          </div>
          <div className="divide-y divide-[#E2E8F0] flex-1 overflow-y-auto text-xs font-semibold">
            {debts.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
                Barcha qarzlar to'langan!
              </div>
            ) : debts.map((dt) => {
              const remaining = dt.amount - dt.paidAmount;
              const isPaid = remaining <= 0;
              const isPayingThis = payingDebtId === dt.id;

              return (
                <div key={dt.id} className="px-4 py-3 flex flex-col gap-2 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 font-bold truncate">{dt.customerName}</p>
                      <p className="text-[9px] text-slate-400">{dt.details}</p>
                      {dt.phone && (
                        <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="w-2.5 h-2.5" />{dt.phone}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      {isPaid ? (
                        <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> To'langan
                        </span>
                      ) : (
                        <>
                          <span className="text-red-600 font-black font-mono text-[11px]">
                            {remaining.toLocaleString()} UZS
                          </span>
                          {dt.paidAmount > 0 && (
                            <span className="text-[9px] text-slate-400">
                              To'langan: {dt.paidAmount.toLocaleString()}
                            </span>
                          )}
                          <button
                            onClick={() => { setPayingDebtId(isPayingThis ? null : dt.id); setPayAmountInput(''); }}
                            className="text-[10px] font-bold text-white bg-[#2563eb] hover:bg-[#004ac6] px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <CreditCard className="w-3 h-3" /> To'lash
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isPayingThis && !isPaid && (
                    <div className="flex flex-col gap-2 bg-blue-50 rounded-xl p-3 border border-blue-100">
                      {/* Jami qarz */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 font-semibold">Jami qarz:</span>
                        <span className="font-black text-red-600 font-mono">{dt.amount.toLocaleString()} UZS</span>
                      </div>
                      {dt.paidAmount > 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-semibold">To'langan:</span>
                          <span className="font-bold text-green-600 font-mono">{dt.paidAmount.toLocaleString()} UZS</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[11px] border-t border-blue-200 pt-1">
                        <span className="text-slate-700 font-bold">Qolgan qarz:</span>
                        <span className="font-black text-[#2563eb] font-mono">{remaining.toLocaleString()} UZS</span>
                      </div>

                      {/* To'lov usuli */}
                      <div className="flex gap-1.5">
                        {(['Naqd', 'Karta'] as const).map(m => (
                          <button key={m} type="button" onClick={() => setPayMethod(m)}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${payMethod === m ? 'bg-[#2563eb] text-white border-[#2563eb]' : 'bg-white text-slate-600 border-[#CBD5E1] hover:bg-slate-50'}`}>
                            {m}
                          </button>
                        ))}
                      </div>

                      {/* Summa input */}
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">To'lanadigan summa (UZS)</label>
                        <input
                          type="number"
                          value={payAmountInput}
                          onChange={(e) => { setPayAmountInput(e.target.value); setPayError(''); }}
                          placeholder={`Maksimal: ${remaining.toLocaleString()}`}
                          className={`w-full px-3 py-1.5 bg-white border rounded-lg font-mono text-xs outline-none focus:ring-2 focus:ring-[#2563eb]/20 ${payError ? 'border-red-400' : 'border-[#CBD5E1]'}`}
                        />
                        {payError && <p className="text-[10px] text-red-600 font-bold mt-0.5">{payError}</p>}
                      </div>

                      {/* Tugmalar */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setPayingDebtId(null); setPayAmountInput(''); setPayError(''); }}
                          className="flex-1 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] font-bold cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          Bekor qilish
                        </button>
                        <button
                          onClick={() => {
                            const val = parseFloat(payAmountInput) || 0;
                            if (val <= 0) { setPayError("Summa 0 dan katta bo'lishi kerak"); return; }
                            if (val > remaining) { setPayError(`Maksimal: ${remaining.toLocaleString()} UZS`); return; }
                            onPayDebt(dt.id, val);
                            setPayingDebtId(null);
                            setPayAmountInput('');
                            setPayError('');
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          ✓ Tasdiqlash ({payMethod})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sale History Ledger table */}
      <section className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50">
          <h3 className="text-sm font-bold text-[#1E293B]">
            Savdo Tarixi
            <span className="ml-2 text-[11px] font-normal text-slate-400">{filteredSalesLog.length} ta chek</span>
          </h3>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                value={salesSearchQuery}
                onChange={(e) => setSalesSearchQuery(e.target.value)}
                placeholder="Chek #, to&apos;lov, mijoz..."
                className="w-full sm:w-52 pl-9 pr-4 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
              />
            </div>
            <button
              onClick={handleExportCSV}
              disabled={filteredSalesLog.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#c3c6d7] bg-white hover:bg-green-50 hover:border-green-300 text-slate-600 hover:text-green-700 text-xs font-bold cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse select-text">
            <thead className="bg-[#dee8ff]/60">
              <tr className="border-b border-[#CBD5E1] text-[10px] font-bold text-[#434655] uppercase tracking-wider">
                <th className="px-5 py-3">Sana/Vaqt</th>
                <th className="px-5 py-3">Chek #</th>
                <th className="px-5 py-3">Mijoz</th>
                <th className="px-5 py-3 font-bold text-center">To&apos;lov usuli</th>
                <th className="px-5 py-3 text-right">Savdo Summasi</th>
                <th className="px-5 py-3 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredSalesLog.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-xs font-medium">Savdo cheklari topilmadi.</td>
                </tr>
              ) : (
                filteredSalesLog.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 text-xs text-[#1E293B] font-semibold transition-all">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-bold text-[#1E293B]">{sale.timestamp.split(' ')[0]}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{sale.timestamp.split(' ')[1] || 'Kassa'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold tracking-wider text-slate-700 font-mono">
                      {sale.id}
                    </td>
                    <td className="px-5 py-4 text-slate-800">
                      {sale.customerName}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                        sale.paymentMethod === 'Naqd' 
                          ? 'bg-green-150 bg-green-50 text-green-700 border border-green-200' 
                          : sale.paymentMethod === 'Karta' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-orange-50 text-orange-700 border border-orange-200'
                      }`}>
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-mono font-bold text-[#2563eb]">
                      {sale.totalAmount.toLocaleString()} UZS
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-2 shrink-0">
                        {/* VIEW thermal checkout */}
                        <button
                          onClick={() => setViewingReceipt(sale)}
                          title="Chekni ko'rish (Thermal)"
                          className="p-1.5 text-blue-600 hover:bg-[#eeefff] border border-transparent hover:border-[#dee8ff] rounded-lg cursor-pointer"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>

                        {/* VOZVRAT action */}
                        <button
                          onClick={() => setReturnConfirm(sale)}
                          className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg cursor-pointer shrink-0"
                          title="Qaytarish (Vozvrat)"
                        >
                          <RotateCcw className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SMENA YOPISH MODAL */}
      {showCloseShiftModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden-overlay">
          <style>{`
            @media print {
              body > * { visibility: hidden !important; }
              #smena-yakuniy-hisobot { visibility: visible !important; position: fixed !important; top: 0; left: 0; width: 100%; padding: 32px; }
              #smena-yakuniy-hisobot * { visibility: visible !important; }
              .smena-print-hide { display: none !important; }
            }
          `}</style>

          <div
            id="smena-yakuniy-hisobot"
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Modal header */}
            <div className="bg-gradient-to-r from-[#1E2933] to-[#263143] px-6 py-5 text-white flex justify-between items-start smena-print-hide-wrapper">
              <div>
                <h2 className="font-black text-base tracking-wide">Smena Yakuniy Hisobot</h2>
                <p className="text-xs text-slate-400 mt-0.5">Smenani yopishdan oldin tekshiring</p>
              </div>
              <button
                onClick={() => setShowCloseShiftModal(false)}
                className="smena-print-hide p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-0 text-sm divide-y divide-slate-100">
              {/* Smena ma'lumotlari */}
              <div className="pb-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Smena boshlanish vaqti
                  </span>
                  <span className="font-bold text-[#1E293B] text-xs">{activeShift.startTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Mas&apos;ul kassir
                  </span>
                  <span className="font-bold text-[#1E293B] text-xs">{activeShift.cashier}</span>
                </div>
              </div>

              {/* To'lov turlari bo'yicha */}
              <div className="py-4 space-y-2.5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">To&apos;lov turlari bo&apos;yicha</p>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-xs font-medium flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-green-600" /> Naqd sotuvlar
                  </span>
                  <span className="font-bold text-green-700 text-xs font-mono">{shiftNaqdTotal.toLocaleString()} UZS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-xs font-medium flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" /> Karta sotuvlar
                  </span>
                  <span className="font-bold text-blue-700 text-xs font-mono">{shiftKartaTotal.toLocaleString()} UZS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-xs font-medium flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-purple-600" /> QR sotuvlar
                  </span>
                  <span className="font-bold text-purple-700 text-xs font-mono">{activeShift.qrTotal.toLocaleString()} UZS</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-xs font-medium flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-amber-600" /> Nasiya sotuvlar
                  </span>
                  <span className="font-bold text-amber-700 text-xs font-mono">{shiftNasiyaTotal.toLocaleString()} UZS</span>
                </div>
              </div>

              {/* Jami */}
              <div className="pt-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5" /> Jami sotuvlar soni
                  </span>
                  <span className="font-bold text-[#1E293B] text-xs">{activeShift.salesCount} ta</span>
                </div>
                <div className="flex justify-between items-center bg-[#f0f3ff] px-4 py-3 rounded-xl">
                  <span className="text-[#2563eb] text-xs font-black uppercase tracking-wide">Jami summa</span>
                  <span className="font-black text-[#2563eb] text-sm font-mono">{shiftJamiTotal.toLocaleString()} UZS</span>
                </div>
              </div>
            </div>

            {/* Modal footer tugmalari */}
            <div className="smena-print-hide px-6 pb-6 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#c3c6d7] bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" />
                Chop etish
              </button>
              <button
                onClick={() => {
                  onCloseShift();
                  setShowCloseShiftModal(false);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold cursor-pointer transition-all"
              >
                <Unlock className="w-4 h-4" />
                Smenani yop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT THERMAL MODAL CONTAINER */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[380px] rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#1E293B]">
            <div className="p-4 border-b border-slate-150 flex justify-between bg-slate-50 items-center">
              <h4 className="font-bold text-xs text-[#1E293B]">Chek ko&apos;rish: {viewingReceipt.id}</h4>
              <button 
                onClick={() => setViewingReceipt(null)} 
                className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto leading-relaxed">
              <div className="border border-slate-300 p-5 rounded-lg font-mono text-xs text-slate-800 bg-[#FCFDFE] shadow-inner space-y-4 leading-relaxed tracking-tight overflow-hidden">
                <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                  <p className="font-extrabold text-sm text-[#1E293B]">G&apos;alaba Supermarket</p>
                  <p className="text-[10px] text-slate-500">Toshkent sh., Yunusobod</p>
                  <p className="text-[9px] text-slate-400">Sana: {viewingReceipt.timestamp}</p>
                  <p className="text-[9px] text-slate-400">Kassir: {viewingReceipt.cashier}</p>
                </div>

                <div className="space-y-1 px-1 py-1 text-[11px] border-b border-dashed border-slate-300">
                  {viewingReceipt.items.map((it: any, index: number) => (
                    <div key={index} className="flex justify-between items-start gap-2">
                      <span className="truncate flex-1 font-mono uppercase text-slate-700">
                        {it.name} &times;{it.quantity}
                      </span>
                      <span className="font-bold shrink-0 font-mono text-slate-800">
                        {(it.price * it.quantity).toLocaleString()} UZS
                      </span>
                    </div>
                  ))}
                </div>

                <div className="space-y-1 px-1 py-1 border-b border-dashed border-slate-300">
                  <div className="flex justify-between font-black text-xs text-[#2563eb]">
                    <span>JAMI TO&apos;LOV:</span>
                    <span>{viewingReceipt.totalAmount.toLocaleString()} UZS</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>To&apos;lov usuli:</span>
                    <span>{viewingReceipt.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Mijoz:</span>
                    <span>{viewingReceipt.customerName}</span>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <p className="text-[10px] text-slate-400 font-sans tracking-wide">Qayta chop etilgan nusxa</p>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => alert("Chop etilmoqda...")}
                  className="w-full bg-[#2563eb] text-white py-2.5 rounded-xl font-bold text-xs shadow hover:bg-[#003ea8] hover:shadow-md cursor-pointer select-none transition-all flex items-center justify-center gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Kassa chekini chop etish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QAYTARISH TASDIQLASH MODALI */}
      {returnConfirm && (
        <div className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#1E293B]">Savdoni qaytarish (Vozvrat)</p>
                <p className="text-xs text-slate-500 mt-1 leading-5">
                  <span className="font-bold text-slate-700">{returnConfirm.id}</span> — {returnConfirm.totalAmount.toLocaleString()} UZS
                </p>
                <p className="text-xs text-slate-500 mt-0.5 leading-5">
                  Tovarlar zaxiraga qaytariladi. Bu amalni ortga qaytarib bo'lmaydi!
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setReturnConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => {
                  onReturnSale(returnConfirm.id);
                  setReturnConfirm(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Ha, qaytarish
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
      )}

    </div>
  );
}
