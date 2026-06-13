import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag,
  Settings,
  BarChart3,
  QrCode,
  LogOut,
  UserCircle2,
  Store,
  Clock,
  Sparkles,
  ChevronDown,
  Check,
  Sun,
  Moon,
  LayoutDashboard,
} from 'lucide-react';
import { Product, Category, CartItem, Debt, Sale, ActiveShift, StoreSettings, Cashier, Store as StoreType, Expense } from './types';

import { loadCashiers, saveCashiers, loadStores, saveStores, loadActiveStoreId, saveActiveStoreId, loadStoreData, saveStoreData, loadExpenses, saveExpenses } from './utils/storage';
import { sendTelegramMessage } from './utils/telegram';
import { fmtStore } from './utils/format';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  INITIAL_DEBTS,
  INITIAL_SALES,
  INITIAL_SETTINGS,
  INITIAL_CASHIERS,
} from './data';

import LoginView from './components/LoginView';
import KassaView from './components/KassaView';
import AdminView from './components/AdminView';
import HisobotView from './components/HisobotView';
import BarkodView from './components/BarkodView';
import SmenaView from './components/SmenaView';
import AIView from './components/AIView';
import DashboardView from './components/DashboardView';

export default function App() {
  // Authentication Gate State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [cashierName, setCashierName] = useState<string>('');
  const [cashierRole, setCashierRole] = useState<'owner' | 'cashier'>('cashier');

  // Cashiers database (global, not per-store)
  const [cashiers, setCashiers] = useState<Cashier[]>(() => loadCashiers() ?? INITIAL_CASHIERS);
  useEffect(() => { saveCashiers(cashiers); }, [cashiers]);

  // Multi-store state
  const DEFAULT_STORE: StoreType = { id: 'store1', name: "Do'kon 1", address: '', phone: '' };
  const [stores, setStores] = useState<StoreType[]>(() => loadStores() ?? [DEFAULT_STORE]);
  const [activeStoreId, setActiveStoreId] = useState<string>(() => loadActiveStoreId() ?? 'store1');
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const storeDropdownRef = useRef<HTMLDivElement>(null);

  // Ref always tracks current activeStoreId for save effects
  const activeStoreIdRef = useRef(activeStoreId);
  activeStoreIdRef.current = activeStoreId;

  useEffect(() => { saveStores(stores); }, [stores]);
  useEffect(() => { saveActiveStoreId(activeStoreId); }, [activeStoreId]);

  // Click-outside closes store dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (storeDropdownRef.current && !storeDropdownRef.current.contains(e.target as Node))
        setShowStoreDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Per-store databases — loaded for the initial activeStoreId
  const [products, setProducts] = useState<Product[]>(() => {
    const sid = loadActiveStoreId() ?? 'store1';
    return loadStoreData<Product[]>(sid, 'products') ?? INITIAL_PRODUCTS;
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const sid = loadActiveStoreId() ?? 'store1';
    const saved = loadStoreData<Category[]>(sid, 'categories');
    const OLD_IDS = ['drinks', 'fruits', 'stationery'];
    if (!saved || saved.some(c => OLD_IDS.includes(c.id))) return INITIAL_CATEGORIES;
    return saved;
  });
  const [debts, setDebts] = useState<Debt[]>(() => {
    const sid = loadActiveStoreId() ?? 'store1';
    return loadStoreData<Debt[]>(sid, 'debts') ?? INITIAL_DEBTS;
  });
  const [sales, setSales] = useState<Sale[]>(() => {
    const sid = loadActiveStoreId() ?? 'store1';
    return loadStoreData<Sale[]>(sid, 'sales') ?? INITIAL_SALES;
  });

  // Shared config & session values
  const [settings, setSettings] = useState<StoreSettings>(() => {
    const sid = loadActiveStoreId() ?? 'store1';
    return loadStoreData<StoreSettings>(sid, 'settings') ?? INITIAL_SETTINGS;
  });

  // Expenses per store
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const sid = loadActiveStoreId() ?? 'store1';
    return loadExpenses(sid) ?? [];
  });
  useEffect(() => { saveExpenses(activeStoreIdRef.current, expenses); }, [expenses]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kassa' | 'admin' | 'hisobot' | 'barkod' | 'smena' | 'ai'>('kassa');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Dark mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  useEffect(() => {
    localStorage.setItem('darkMode', String(isDarkMode));
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Multi-cart state (3 parallel carts)
  const [carts, setCarts] = useState<CartItem[][]>([[], [], []]);
  const [activeCart, setActiveCart] = useState<0 | 1 | 2>(0);

  // Save per-store data (always to activeStoreIdRef, which is up-to-date during render)
  useEffect(() => { saveStoreData(activeStoreIdRef.current, 'products', products); }, [products]);
  useEffect(() => { saveStoreData(activeStoreIdRef.current, 'categories', categories); }, [categories]);
  useEffect(() => { saveStoreData(activeStoreIdRef.current, 'sales', sales); }, [sales]);
  useEffect(() => { saveStoreData(activeStoreIdRef.current, 'debts', debts); }, [debts]);
  useEffect(() => { saveStoreData(activeStoreIdRef.current, 'settings', settings); }, [settings]);

  // Shift management logs
  const [activeShift, setActiveShift] = useState<ActiveShift>({
    startTime: '08:30',
    cashier: 'Asadbek O.',
    initialCash: 1200000,
    currentCash: 1245000,
    terminal: 1890000,
    qrTotal: 0,
    salesCount: 142,
    isClosed: false,
  });

  // Action: Authenticate Cashier
  const handleLoginSuccess = (cashier: Cashier) => {
    // Owner har doim o'z do'koniga (bosh ofis), kassir o'z do'koniga kiradi
    handleChangeStore(cashier.id);
    setCashierName(cashier.name);
    setCashierRole(cashier.role);
    setIsLoggedIn(true);
    setActiveTab(cashier.role === 'owner' ? 'dashboard' : 'kassa');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCashierName('');
    setCashierRole('cashier');
  };

  // Cashier CRUD
  const handleAddCashier = (data: Omit<Cashier, 'id'>) => {
    const newCashier: Cashier = { ...data, id: `cashier-${Date.now()}` };
    setCashiers(prev => [...prev, newCashier]);
  };
  const handleUpdateCashier = (updated: Cashier) => {
    setCashiers(prev => prev.map(c => c.id === updated.id ? updated : c));
  };
  const handleDeleteCashier = (id: string) => {
    setCashiers(prev => prev.filter(c => c.id !== id));
  };

  // Store management — derived from cashiers
  const activeCashierEntry = cashiers.find(c => c.id === activeStoreId);
  const activeStore: StoreType = activeCashierEntry
    ? { id: activeStoreId, name: fmtStore(activeCashierEntry.storeLabel), address: settings.address, phone: settings.phone }
    : (stores.find(s => s.id === activeStoreId) ?? { id: activeStoreId, name: settings.storeName, address: settings.address, phone: settings.phone });

  const handleChangeStore = (newStoreId: string) => {
    const newProducts = loadStoreData<Product[]>(newStoreId, 'products') ?? INITIAL_PRODUCTS;
    const newSaved = loadStoreData<Category[]>(newStoreId, 'categories');
    const OLD_IDS = ['drinks', 'fruits', 'stationery'];
    const newCategories = (!newSaved || newSaved.some(c => OLD_IDS.includes(c.id))) ? INITIAL_CATEGORIES : newSaved;
    const newSettings = loadStoreData<StoreSettings>(newStoreId, 'settings') ?? INITIAL_SETTINGS;
    const newDebts = loadStoreData<Debt[]>(newStoreId, 'debts') ?? INITIAL_DEBTS;
    const newSales = loadStoreData<Sale[]>(newStoreId, 'sales') ?? INITIAL_SALES;
    const newExpenses = loadExpenses(newStoreId) ?? [];
    setActiveStoreId(newStoreId);
    setProducts(newProducts);
    setCategories(newCategories);
    setSettings(newSettings);
    setDebts(newDebts);
    setSales(newSales);
    setExpenses(newExpenses);
    setCarts([[], [], []]);
  };

  const handleUpdateStore = (updated: StoreType) => {
    setStores(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  // Action: Add Product to Basket (Kassa view)
  const handleAddToCart = (product: Product) => {
    setCarts(prev => {
      const current = prev[activeCart];
      const match = current.find(item => item.product.id === product.id);
      if (match) {
        if (match.quantity >= product.stock) {
          return prev; // KassaView handles over-stock notification
        }
        return prev.map((c, i) =>
          i === activeCart
            ? c.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
            : c
        );
      }
      return prev.map((c, i) => i === activeCart ? [...c, { product, quantity: 1 }] : c);
    });
  };

  // Action: Increment/Decrement quantities in shopping cart
  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCarts(prev =>
      prev.map((c, i) =>
        i === activeCart
          ? c.map(item => item.product.id === productId ? { ...item, quantity: item.quantity + delta } : item)
               .filter(item => item.quantity > 0)
          : c
      )
    );
  };

  const handleClearCart = () => {
    setCarts(prev => prev.map((c, i) => i === activeCart ? [] : c));
  };

  // Action: Checkout / Complete Purchase Operation
  const handleCheckoutSubmit = (paymentMethod: 'Naqd' | 'Karta' | 'Nasiya', customerName: string, discountPercent: number, customerPhone: string) => {
    const currentCart = carts[activeCart];
    const totalAmount = currentCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const finalAmount = Math.round(totalAmount - (totalAmount * discountPercent) / 100);

    // 1. Deduct stock levels and increment soldCount
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const cartItem = currentCart.find((item) => item.product.id === p.id);
        if (cartItem) {
          return {
            ...p,
            stock: Math.max(0, p.stock - cartItem.quantity),
            soldCount: (p.soldCount || 0) + cartItem.quantity,
          };
        }
        return p;
      })
    );

    // 2. Generate and prepend sale registration log
    const newSaleId = `TR-${Math.floor(40000 + Math.random() * 50000)}`;
    const newSale: Sale = {
      id: newSaleId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      cashier: cashierName || 'Asadbek O.',
      items: currentCart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
      paymentMethod,
      customerName: customerName || 'Oddiy mijoz',
      totalAmount: finalAmount,
    };

    setSales((prevSales) => [newSale, ...prevSales]);

    // Telegram: savdo xabarnomasi
    sendTelegramMessage(
      settings.telegramBotToken,
      settings.telegramChatId,
      `🛒 <b>Yangi savdo</b> — ${settings.storeName}\n` +
      `💰 Summa: <b>${finalAmount.toLocaleString('uz-UZ')} so'm</b>\n` +
      `💳 To'lov: ${paymentMethod}\n` +
      `👤 Mijoz: ${customerName || 'Oddiy mijoz'}\n` +
      `🧾 Chek: ${newSaleId}\n` +
      `👷 Kassir: ${cashierName}`
    );

    // Telegram: kam zaxira ogohlantirish
    const newlyLowStock = currentCart
      .map(item => products.find(p => p.id === item.product.id))
      .filter((p): p is Product => !!p && (p.stock - (currentCart.find(ci => ci.product.id === p.id)?.quantity || 0)) <= (p.lowStockThreshold || 5) && p.stock > 0);
    if (newlyLowStock.length > 0) {
      const list = newlyLowStock.map(p => `• ${p.name}: ${p.stock - (currentCart.find(ci => ci.product.id === p.id)?.quantity || 0)} ta`).join('\n');
      sendTelegramMessage(
        settings.telegramBotToken,
        settings.telegramChatId,
        `⚠️ <b>Kam qolgan mahsulotlar</b> — ${settings.storeName}\n${list}`
      );
    }

    // 3. Register debt log dynamically if payment type is Debt
    if (paymentMethod === 'Nasiya') {
      const newDebt: Debt = {
        id: `debt-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: customerName || 'Noma\'lum qarzdor',
        details: 'Kassadan nasiya',
        amount: finalAmount,
        date: new Date().toISOString().substring(0, 10),
        phone: customerPhone || '',
        paidAmount: 0,
      };
      setDebts((prevDebts) => [newDebt, ...prevDebts]);

      // Telegram: nasiya xabarnomasi
      sendTelegramMessage(
        settings.telegramBotToken,
        settings.telegramChatId,
        `📋 <b>Nasiya qo'shildi</b> — ${settings.storeName}\n` +
        `👤 Mijoz: <b>${customerName || 'Noma\'lum'}</b>\n` +
        `💸 Miqdor: <b>${finalAmount.toLocaleString('uz-UZ')} so'm</b>\n` +
        `📅 Sana: ${new Date().toISOString().substring(0, 10)}`
      );
    }

    // 4. Update active shift diagnostics
    setActiveShift((prev) => ({
      ...prev,
      salesCount: prev.salesCount + 1,
      currentCash: paymentMethod === 'Naqd' ? prev.currentCash + finalAmount : prev.currentCash,
      terminal: paymentMethod === 'Karta' ? prev.terminal + finalAmount : prev.terminal,
    }));

    // 5. Clear only the active cart
    setCarts(prev => prev.map((c, i) => i === activeCart ? [] : c));

    setLastUpdated(new Date());
  };

  // Action: Add new product to inventory database (Admin view)
  const handleAddProduct = (pData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...pData,
      id: `prod-${Date.now()}`,
    };
    setProducts((prev) => [newProd, ...prev]);
  };

  // Action: Update product attributes (Admin view)
  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  // Action: Delete product (Admin view)
  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((item) => item.id !== id));
  };

  // Action: Customize system settings (Admin view)
  const handleUpdateSettings = (updated: StoreSettings) => {
    setSettings(updated);
  };

  // Action: Register new merchandise category (Admin view)
  const handleAddCategory = (cData: Omit<Category, 'id'>) => {
    const newCat: Category = {
      ...cData,
      id: cData.name.toLowerCase().replace(/\s+/g, '-'),
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter(c => c.id !== id));
  };

  // Action: Close active cashier shift
  const handleCloseShift = () => {
    setActiveShift({
      startTime: new Date().toLocaleTimeString().substring(0, 5),
      cashier: cashierName || 'Asadbek O.',
      initialCash: 1200000,
      currentCash: 1200000,
      terminal: 0,
      qrTotal: 0,
      salesCount: 0,
      isClosed: false,
    });
  };

  const handlePayDebt = (debtId: string, amount: number) => {
    setDebts(prev => prev
      .map(d => d.id === debtId ? { ...d, paidAmount: d.paidAmount + amount } : d)
      .filter(d => d.paidAmount < d.amount)
    );
    setLastUpdated(new Date());
  };

  // Action: Return/Vozvrat Completed Sales (Hisobot view)
  const handleReturnSale = (saleId: string) => {
    const matchedSale = sales.find(s => s.id === saleId);
    if (!matchedSale) return;

    // 1. Refund the stock back
    setProducts(prevProducts =>
      prevProducts.map(p => {
        const returnedItem = matchedSale.items.find(it => it.productId === p.id);
        if (returnedItem) {
          return {
            ...p,
            stock: p.stock + returnedItem.quantity,
            soldCount: Math.max(0, (p.soldCount || 0) - returnedItem.quantity),
          };
        }
        return p;
      })
    );

    // 2. Erase or negate sale from sales log
    setSales(prevSales => prevSales.filter(s => s.id !== saleId));

    // 3. Compensate shift totals
    setActiveShift((prev) => ({
      ...prev,
      salesCount: Math.max(0, prev.salesCount - 1),
      currentCash: matchedSale.paymentMethod === 'Naqd'
        ? Math.max(0, prev.currentCash - matchedSale.totalAmount)
        : prev.currentCash,
      terminal: matchedSale.paymentMethod === 'Karta'
        ? Math.max(0, prev.terminal - matchedSale.totalAmount)
        : prev.terminal,
    }));

    setLastUpdated(new Date());
  };

  const lowStockCount = products.filter((p: Product) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)).length;
  const isOwner = cashierRole === 'owner';

  // Landing guard page (PIN code security screen matching visual mockups)
  if (!isLoggedIn) {
    return (
      <LoginView
        cashiers={cashiers}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9FF] dark:bg-slate-950 select-none text-[#1E293B] dark:text-slate-100 antialiased">

      {/* Universal Top Application Bar */}
      <header className="bg-white dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-700 shadow-sm shrink-0 sticky top-0 z-40">
        <div className="w-full px-6 h-16 flex items-center justify-between">
          
          {/* Logo Brand container */}
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#f0f3ff] text-[#2563eb] rounded-xl flex items-center justify-center border border-[#dee8ff]">
              <Store className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-sm font-black text-[#2563eb] tracking-tight truncate max-w-[150px] sm:max-w-none">
                {settings.storeName}
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                PRO v1.0 &middot; {cashierName}
              </p>
            </div>
            {/* Store selector — owner only, derived from cashiers */}
            {isOwner && (
              <div className="relative ml-2" ref={storeDropdownRef}>
                <button
                  onClick={() => setShowStoreDropdown(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f3ff] border border-[#dee8ff] rounded-xl text-xs font-bold text-[#2563eb] hover:bg-[#e8edff] transition-all cursor-pointer select-none"
                >
                  <span className="max-w-[110px] truncate">{activeStore.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${showStoreDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showStoreDropdown && (
                  <div className="absolute top-full left-0 mt-1.5 w-56 bg-white border border-[#E2E8F0] rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden">
                    {cashiers.map(cashier => (
                      <button
                        key={cashier.id}
                        onClick={() => { handleChangeStore(cashier.id); setShowStoreDropdown(false); }}
                        className={`w-full text-left px-3 py-2.5 text-xs font-semibold flex items-center gap-2.5 transition-all ${cashier.id === activeStoreId ? 'text-[#2563eb] bg-[#f0f3ff]' : 'text-[#1E293B] hover:bg-slate-50'}`}
                      >
                        <Check className={`w-3.5 h-3.5 shrink-0 ${cashier.id === activeStoreId ? 'opacity-100' : 'opacity-0'}`} />
                        <div className="min-w-0">
                          <p className="truncate font-bold">{fmtStore(cashier.storeLabel)}</p>
                          <p className="text-[10px] text-slate-400 font-medium truncate">{cashier.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Core horizontal app headers navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            {/* Dashboard — barcha rollar uchun */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-[#2563eb]/10 text-[#2563eb]'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Bosh sahifa</span>
            </button>

            {!isOwner && (
              <button
                onClick={() => setActiveTab('kassa')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'kassa'
                    ? 'bg-[#2563eb]/10 text-[#2563eb]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden sm:inline">Kassa</span>
              </button>
            )}

            {!isOwner && (
              <button
                onClick={() => setActiveTab('smena')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'smena'
                    ? 'bg-[#2563eb]/10 text-[#2563eb]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="hidden sm:inline">Smena</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => setActiveTab('admin')}
                title={activeTab === 'admin' ? "Siz allaqachon Admin panelidasiz" : "Boshqaruv paneli"}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-[#2563eb]/10 text-[#2563eb]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => setActiveTab('hisobot')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'hisobot'
                    ? 'bg-[#2563eb]/10 text-[#2563eb]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Hisobot</span>
              </button>
            )}

            {isOwner && (
              <button
                onClick={() => setActiveTab('barkod')}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'barkod'
                    ? 'bg-[#2563eb]/10 text-[#2563eb]'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Barkod</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden sm:inline">AI</span>
            </button>
          </nav>

          {/* User Profile / Status Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 pr-3 border-r border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <UserCircle2 className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 leading-none">{cashierName}</p>
                <p className="text-[9px] text-green-600 font-semibold mt-0.5">Smenada ochiq</p>
              </div>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={() => setIsDarkMode(v => !v)}
              title={isDarkMode ? "Yorug' rejim" : "Qorong'i rejim"}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all cursor-pointer"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={handleLogout}
              title="Tizimdan chiqish (Lock screen)"
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all cursor-pointer select-none"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

        </div>
      </header>

      {/* Primary Dynamic Applet Render Sandbox canvas */}
      <main className="flex-grow flex flex-col min-h-0 relative">
        {activeTab === 'dashboard' && (
          <DashboardView
            products={products}
            sales={sales}
            debts={debts}
            expenses={expenses}
            settings={settings}
            activeShift={activeShift}
            cashierName={cashierName}
            lastUpdated={lastUpdated}
          />
        )}

        {activeTab === 'kassa' && (
          <KassaView
            products={products}
            categories={categories}
            cart={carts[activeCart]}
            carts={carts}
            activeCart={activeCart}
            onSetActiveCart={setActiveCart}
            onAddToCart={handleAddToCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onClearCart={handleClearCart}
            onCheckout={handleCheckoutSubmit}
            cashierName={cashierName}
            settings={settings}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView
            products={products}
            categories={categories}
            settings={settings}
            cashiers={cashiers}
            activeStore={activeStore}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateSettings={handleUpdateSettings}
            onUpdateStore={handleUpdateStore}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onAddCashier={handleAddCashier}
            onUpdateCashier={handleUpdateCashier}
            onDeleteCashier={handleDeleteCashier}
          />
        )}

        {activeTab === 'hisobot' && (
          <HisobotView
            products={products}
            sales={sales}
            debts={debts}
            expenses={expenses}
            activeShift={activeShift}
            storeId={activeStoreId}
            lastUpdated={lastUpdated}
            onCloseShift={handleCloseShift}
            onReturnSale={handleReturnSale}
            onPayDebt={handlePayDebt}
            onAddExpense={(exp) => setExpenses(prev => [...prev, exp])}
            onDeleteExpense={(id) => setExpenses(prev => prev.filter(e => e.id !== id))}
          />
        )}

        {activeTab === 'barkod' && (
          <BarkodView
            products={products}
          />
        )}

        {activeTab === 'smena' && (
          <SmenaView
            cashierName={cashierName}
            sales={sales}
            activeShift={activeShift}
            lastUpdated={lastUpdated}
            onCloseShift={handleCloseShift}
          />
        )}

        {activeTab === 'ai' && (
          <AIView
            products={products}
            settings={settings}
            sales={sales}
          />
        )}
      </main>
    </div>
  );
}
