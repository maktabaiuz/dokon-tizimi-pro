import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Settings, 
  BarChart3, 
  QrCode, 
  LogOut, 
  UserCircle2, 
  Store,
  FolderLock
} from 'lucide-react';
import { Product, Category, CartItem, Debt, Sale, ActiveShift, StoreSettings } from './types';
import { loadProducts, saveProducts, loadCategories, saveCategories, loadSales, saveSales, loadDebts, saveDebts, loadSettings, saveSettings } from './utils/storage';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CATEGORIES, 
  INITIAL_DEBTS, 
  INITIAL_SALES, 
  INITIAL_SETTINGS 
} from './data';

import LoginView from './components/LoginView';
import KassaView from './components/KassaView';
import AdminView from './components/AdminView';
import HisobotView from './components/HisobotView';
import BarkodView from './components/BarkodView';

export default function App() {
  // Authentication Gate State
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [cashierName, setCashierName] = useState<string>('');

  // Primary shared databases
  const [products, setProducts] = useState<Product[]>(() => loadProducts() ?? INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(() => loadCategories() ?? INITIAL_CATEGORIES);
  const [debts, setDebts] = useState<Debt[]>(() => loadDebts() ?? INITIAL_DEBTS);
  const [sales, setSales] = useState<Sale[]>(() => loadSales() ?? INITIAL_SALES);
  
  // Shared config & session values
  const [settings, setSettings] = useState<StoreSettings>(() => loadSettings() ?? INITIAL_SETTINGS);
  const [activeTab, setActiveTab] = useState<'kassa' | 'admin' | 'hisobot' | 'barkod'>('kassa');
  
  // Basket State
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => { saveProducts(products); }, [products]);
  useEffect(() => { saveCategories(categories); }, [categories]);
  useEffect(() => { saveSales(sales); }, [sales]);
  useEffect(() => { saveDebts(debts); }, [debts]);
  useEffect(() => { saveSettings(settings); }, [settings]);

  // Shift management logs
  const [activeShift, setActiveShift] = useState<ActiveShift>({
    startTime: '08:30',
    cashier: 'Asadbek O.',
    initialCash: 1200000,
    currentCash: 1245000,
    terminal: 1890000,
    salesCount: 142,
    isClosed: false,
  });

  // Action: Authenticate Cashier
  const handleLoginSuccess = (name: string) => {
    setCashierName(name);
    setIsLoggedIn(true);
    setActiveTab('kassa');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCashierName('');
  };

  // Action: Add Product to Basket (Kassa view)
  const handleAddToCart = (product: Product) => {
    setCart((prevCart) => {
      const match = prevCart.find((item) => item.product.id === product.id);
      if (match) {
        // Stop adding if it exceeds actual stock levels
        if (match.quantity >= product.stock) {
          alert(`Ogohlantirish: Omborda ushbu tovardan ortiqcha soni mavjud emas! Maksimal: ${product.stock} ta`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1 }];
    });
  };

  // Action: Increment/Decrement quantities in shopping cart
  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.product.id === productId) {
            const nextQty = item.quantity + delta;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Action: Checkout / Complete Purchase Operation
  const handleCheckoutSubmit = (paymentMethod: 'Naqd' | 'Karta' | 'Nasiya', customerName: string, discountPercent: number, customerPhone: string) => {
    const totalAmount = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    const finalAmount = Math.round(totalAmount - (totalAmount * discountPercent) / 100);

    // 1. Deduct stock levels from general product database
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const cartItem = cart.find((item) => item.product.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
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
      items: cart.map(item => ({
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
    }

    // 4. Update active shift diagnostics
    setActiveShift((prev) => ({
      ...prev,
      salesCount: prev.salesCount + 1,
      currentCash: paymentMethod === 'Naqd' ? prev.currentCash + finalAmount : prev.currentCash,
      terminal: paymentMethod === 'Karta' ? prev.terminal + finalAmount : prev.terminal,
    }));

    // 5. Clear shopping session
    setCart([]);
  };

  // Action: Add new product to inventory database (Admin view)
  const handleAddProduct = (pData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...pData,
      id: `prod-${products.length + 1}`,
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

  // Action: Close active cashier shift
  const handleCloseShift = () => {
    setActiveShift({
      startTime: new Date().toLocaleTimeString().substring(0, 5),
      cashier: cashierName || 'Asadbek O.',
      initialCash: 1200000,
      currentCash: 1200000,
      terminal: 0,
      salesCount: 0,
      isClosed: false,
    });
  };

  const handlePayDebt = (debtId: string, amount: number) => {
    setDebts(prev => prev
      .map(d => d.id === debtId ? { ...d, paidAmount: d.paidAmount + amount } : d)
      .filter(d => d.paidAmount < d.amount)
    );
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
          return { ...p, stock: p.stock + returnedItem.quantity };
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
  };

  const lowStockCount = products.filter((p: Product) => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5)).length;

  // Landing guard page (PIN code security screen matching visual mockups)
  if (!isLoggedIn) {
    return (
      <LoginView 
        correctPin={settings.operatorPin} 
        onLoginSuccess={handleLoginSuccess} 
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F9FF] select-none text-[#1E293B] antialiased">
      
      {/* Universal Top Application Bar */}
      <header className="bg-white border-b border-[#E2E8F0] shadow-sm shrink-0 sticky top-0 z-40">
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
          </div>

          {/* Core horizontal app headers navigation */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('kassa')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'kassa'
                  ? 'bg-[#2563eb]/10 text-[#2563eb]'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Kassa</span>
              {lowStockCount > 0 && (
                <span className="bg-amber-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none">
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#2563eb]/10 text-[#2563eb]'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </button>

            <button
              onClick={() => setActiveTab('hisobot')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'hisobot'
                  ? 'bg-[#2563eb]/10 text-[#2563eb]'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Hisobot</span>
            </button>

            <button
              onClick={() => setActiveTab('barkod')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'barkod'
                  ? 'bg-[#2563eb]/10 text-[#2563eb]'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Barkod</span>
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

            <button
              onClick={handleLogout}
              title="Tizimdan chiqish (Lock screen)"
              className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer select-none"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

        </div>
      </header>

      {/* Primary Dynamic Applet Render Sandbox canvas */}
      <main className="flex-grow flex flex-col min-h-0 relative">
        {activeTab === 'kassa' && (
          <KassaView
            products={products}
            categories={categories}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateCartQuantity={handleUpdateCartQuantity}
            onClearCart={handleClearCart}
            onCheckout={handleCheckoutSubmit}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView
            products={products}
            categories={categories}
            settings={settings}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onUpdateSettings={handleUpdateSettings}
            onAddCategory={handleAddCategory}
          />
        )}

        {activeTab === 'hisobot' && (
          <HisobotView
            products={products}
            sales={sales}
            debts={debts}
            activeShift={activeShift}
            onCloseShift={handleCloseShift}
            onReturnSale={handleReturnSale}
            onPayDebt={handlePayDebt}
          />
        )}

        {activeTab === 'barkod' && (
          <BarkodView 
            products={products} 
          />
        )}
      </main>
    </div>
  );
}
