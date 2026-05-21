import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Scan,
  Tag,
  CreditCard,
  Coins,
  BookOpen,
  Printer,
  X,
  CheckCircle,
  PackageCheck,
  PackageX,
  Package,
  QrCode
} from 'lucide-react';
import { Product, Category, CartItem } from '../types';
import * as Icons from 'lucide-react';
import QRPaymentModal from './QRPaymentModal';

interface KassaViewProps {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  carts: CartItem[][];
  activeCart: 0 | 1 | 2;
  onSetActiveCart: (idx: 0 | 1 | 2) => void;
  onAddToCart: (product: Product) => void;
  onUpdateCartQuantity: (productId: string, delta: number) => void;
  onClearCart: () => void;
  onCheckout: (paymentMethod: 'Naqd' | 'Karta' | 'Nasiya', customerName: string, discountPercent: number, customerPhone: string) => void;
}

const CART_TABS = [
  { label: 'Mijoz 1', color: '#2563EB', bg: '#EEF2FF' },
  { label: 'Mijoz 2', color: '#F59E0B', bg: '#FEF3C7' },
  { label: 'Mijoz 3', color: '#64748B', bg: '#F1F5F9' },
];

export default function KassaView({
  products,
  categories,
  cart,
  carts,
  activeCart,
  onSetActiveCart,
  onAddToCart,
  onUpdateCartQuantity,
  onClearCart,
  onCheckout,
}: KassaViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Checkout modal states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [showQR, setShowQR] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<'Naqd' | 'Karta' | 'Nasiya' | 'QR'>('Naqd');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [isSuccessCheckout, setIsSuccessCheckout] = useState<boolean>(false);
  const [lastCompletedReceipt, setLastCompletedReceipt] = useState<any>(null);

  // Dynamic Lucide icon lookup helper
  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    const LucideIcon = (Icons as any)[iconName] || Icons.Box;
    return <LucideIcon className={className} />;
  };

  // Filter products by category and search term
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Vitrina (featured) products
  const featuredProducts = products
    .filter(p => p.isFeatured && p.stock > 0)
    .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0));

  // Top 3 most sold — for 🔥 badge in catalog
  const topSoldIds = new Set(
    [...products]
      .filter(p => (p.soldCount || 0) > 0)
      .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
      .slice(0, 3)
      .map(p => p.id)
  );

  // Automatically add item if barcode is fully scanned/matched
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const match = products.find(p => p.barcode === searchQuery || p.name.toLowerCase() === searchQuery.toLowerCase());
      if (match) {
        if (match.stock > 0) {
          onAddToCart(match);
          setSearchQuery('');
          setPromoMessage({ text: `"${match.name}" savatga qo'shildi`, isError: false });
          setTimeout(() => setPromoMessage(null), 3500);
        } else {
          setPromoMessage({ text: `Xato: "${match.name}" omborda qolmagan!`, isError: true });
          setTimeout(() => setPromoMessage(null), 3500);
        }
      } else {
        setPromoMessage({ text: "Mahsulot topilmadi!", isError: true });
        setTimeout(() => setPromoMessage(null), 3000);
      }
    }
  };

  // Promo code discounts
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'PRO5') {
      setAppliedDiscount(5);
      setPromoMessage({ text: '5% lik chegirma muvaffaqiyatli qo\'shildi!', isError: false });
    } else if (code === 'AISTUDIO') {
      setAppliedDiscount(15);
      setPromoMessage({ text: '15% lik maxsus chegirma qo\'shildi!', isError: false });
    } else if (code === 'CHEMPI') {
      setAppliedDiscount(20);
      setPromoMessage({ text: '20% Chempionlar chegirmasi qo\'shildi!', isError: false });
    } else if (code === '') {
      setAppliedDiscount(0);
      setPromoMessage(null);
    } else {
      setAppliedDiscount(0);
      setPromoMessage({ text: 'Xato kelishuv kodi!', isError: true });
    }
  };

  // Cart math calculations
  const totalItemsCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const discountAmount = Math.round((subtotal * appliedDiscount) / 100);
  const totalAmount = subtotal - discountAmount;

  // Change calculator
  const parsedCash = parseFloat(cashReceived) || 0;
  const refundAmount = parsedCash > totalAmount ? Math.round(parsedCash - totalAmount) : 0;

  const handleQRConfirm = () => {
    setShowQR(false);
    const receipt = {
      id: `TR-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      cashier: 'Asadbek O.',
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
      paymentMethod: 'QR',
      customerName: customerName.trim() || 'Oddiy mijoz',
      discountAmount,
      totalAmount,
      cashReceived: totalAmount,
      refundAmount: 0,
    };
    setLastCompletedReceipt(receipt);
    setIsCheckoutOpen(true);
    setIsSuccessCheckout(true);
    onCheckout('Karta', customerName.trim() || 'Oddiy mijoz', appliedDiscount, customerPhone.trim());
  };

  // Finalize transaction
  const handleFinalCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (paymentMethod === 'QR') {
      setShowQR(true);
      return;
    }

    // Create receipt structure to display in printed version
    const receipt = {
      id: `TR-${Math.floor(10000 + Math.random() * 90000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      cashier: 'Asadbek O.',
      items: cart.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
      })),
      paymentMethod,
      customerName: customerName.trim() || 'Oddiy mijoz',
      discountAmount,
      totalAmount,
      cashReceived: paymentMethod === 'Naqd' ? (parsedCash || totalAmount) : totalAmount,
      refundAmount: paymentMethod === 'Naqd' ? refundAmount : 0
    };

    setLastCompletedReceipt(receipt);
    setIsSuccessCheckout(true);

    // Update parent stock levels immediately
    onCheckout(paymentMethod as 'Naqd' | 'Karta' | 'Nasiya', customerName.trim() || 'Oddiy mijoz', appliedDiscount, customerPhone.trim());
  };

  const handleCloseSuccessfulReceipt = () => {
    setIsSuccessCheckout(false);
    setIsCheckoutOpen(false);
    setLastCompletedReceipt(null);
    setCashReceived('');
    setCustomerName('');
    setCustomerPhone('');
    setPromoCode('');
    setAppliedDiscount(0);
    setPromoMessage(null);
  };

  // Quick ticker warnings (extremely matching layout)
  const lowStockItems = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5));

  return (
    <div className="flex-1 flex flex-col min-h-0 relative select-none bg-[#F9F9FF]">
      
      {/* Ticker / Warning Ribbon for Low Stock Items */}
      <div className="w-full bg-[#f9e9e9] border-b border-[#ffd2d2] text-[#93000a] py-1 px-4 overflow-hidden relative h-7">
        <div className="inline-block whitespace-nowrap min-w-full absolute flex items-center gap-1 marquee-animation font-medium text-xs font-sans tracking-wide">
          DIQQAT: {lowStockItems.length > 0 ? (
            lowStockItems.map((item, idx) => (
              <span key={item.id} className="mr-6">
                &bull; {item.name} ({item.stock === 0 ? 'Tugagan' : `${item.stock} dona qoldi`})
              </span>
            ))
          ) : (
            <span>Barcha mahsulotlar omborda yetarli miqdorda mavjud. Tizim ishga tayyor!</span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-[#E2E8F0] min-h-0">
        
        {/* Left Area: Filters & Product Grid (60%) */}
        <div className="lg:w-[62%] flex flex-col p-6 gap-6 min-h-0 overflow-y-auto custom-scrollbar">
          
          {/* Scanning & Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center bg-white border border-[#CBD5E1] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#004ac6]/20 transition-all shadow-sm">
              <Scan className="text-[#64748B] w-5 h-5 mr-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyPress}
                placeholder="Shtrix-kod yoki mahsulot nomini kiriting... (Enter bosing)"
                className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-[#1E293B] placeholder-[#94A3B8] w-full text-sm font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="p-1 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                const e = { key: 'Enter' } as React.KeyboardEvent<HTMLInputElement>;
                handleSearchKeyPress(e);
              }}
              className="bg-[#004ac6] hover:bg-[#003ea8] active:scale-95 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md select-none transition-all duration-150 text-sm"
            >
              <Search className="w-4 h-4" />
              Qidiruv
            </button>
          </div>

          {/* Scrolling Categories List */}
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 select-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#2563eb] text-white shadow-md'
                    : 'bg-[#eeefff] text-[#434655] hover:bg-[#dee8ff] active:scale-95'
                }`}
              >
                {renderIcon(cat.icon, 'w-3.5 h-3.5')}
                {cat.name}
              </button>
            ))}
          </div>

          {/* Feedback/Notifier for scans */}
          {promoMessage && (
            <div className={`p-3 rounded-lg text-xs font-medium border ${
              promoMessage.isError 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              {promoMessage.text}
            </div>
          )}

          {/* ⭐ Vitrina — Trend Mahsulotlar */}
          {featuredProducts.length > 0 && (
            <div style={{marginBottom: '24px'}}>
              <h2 style={{fontSize:'16px', fontWeight:600, marginBottom:'12px'}}>
                ⭐ Trend Mahsulotlar
              </h2>
              <div style={{display:'flex', gap:'12px', overflowX:'auto', paddingBottom:'8px'}}>
                {featuredProducts.map(product => (
                  <div key={product.id}
                    onClick={() => onAddToCart(product)}
                    style={{minWidth:'160px', height:'220px',
                      borderRadius:'16px', overflow:'hidden',
                      position:'relative', cursor:'pointer',
                      flexShrink:0, border:'1px solid #E2E8F0'}}>
                    <img src={product.image} alt={product.name}
                      style={{width:'100%', height:'100%', objectFit:'cover'}}/>
                    <div style={{position:'absolute', bottom:0,
                      left:0, right:0, padding:'12px',
                      background:'linear-gradient(transparent, rgba(0,0,0,0.8))',
                      color:'white'}}>
                      <div style={{fontSize:'13px', fontWeight:500}}>{product.name}</div>
                      <div style={{fontSize:'16px', fontWeight:700}}>
                        {product.price.toLocaleString()} so'm
                      </div>
                      <div style={{fontSize:'11px', opacity:0.8}}>
                        🔥 {product.soldCount ?? 0} ta sotilgan
                      </div>
                    </div>
                    {product.discount ? (
                      <div style={{position:'absolute', top:'8px',
                        left:'8px', background:'#DC2626',
                        color:'white', borderRadius:'6px',
                        padding:'2px 6px', fontSize:'11px',
                        fontWeight:700}}>
                        -{product.discount}%
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barcha Mahsulotlar */}
          <div className="flex-1 min-h-[250px] pb-6">
            <h2 className="text-sm font-black text-[#1E293B] mb-3">Barcha Mahsulotlar</h2>
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center h-full border-2 border-dashed border-[#E2E8F0] bg-white rounded-2xl">
                <p className="text-[#64748B] text-sm font-medium">Bunday mahsulot topilmadi</p>
                <p className="text-[#94A3B8] text-xs mt-1">Boshqa kalit so&apos;z yoki shtrix kodni sinab ko&apos;ring</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold || 5);
                  const isTopSold = topSoldIds.has(product.id);
                  
                  return (
                    <div
                      key={product.id}
                      onClick={() => !isOutOfStock && onAddToCart(product)}
                      className={`group border rounded-2xl p-4 flex flex-col gap-3 transition-all duration-150 cursor-pointer shadow-sm relative overflow-hidden bg-white select-none ${
                        isOutOfStock 
                          ? 'opacity-65 border-[#E2E8F0]' 
                          : 'hover:shadow-md border-[#E2E8F0] hover:border-[#2563eb]/40 active:scale-97'
                      }`}
                    >
                      {/* 🔥 Top-sold badge */}
                      {isTopSold && !isOutOfStock && (
                        <div className="absolute top-3 left-3 z-10 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                          🔥 Top
                        </div>
                      )}

                      {/* Product Stock Status Ribbon */}
                      <div className="absolute top-3 right-3 z-10">
                        {isOutOfStock ? (
                          <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <PackageX className="w-3 h-3" /> Tugagan
                          </span>
                        ) : isLowStock ? (
                          <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Kam qoldi: {product.stock} ta
                          </span>
                        ) : (
                          <span className="bg-[#7cf994]/25 text-[#006e2d] text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100 flex items-center gap-1">
                            <PackageCheck className="w-3 h-3" /> Omborda bor
                          </span>
                        )}
                      </div>

                      {/* Image Frame */}
                      <div className="h-32 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-200"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="bg-[#eeefff] p-4 rounded-full text-[#004ac6]">
                            {renderIcon(product.icon || 'Box', 'w-8 h-8')}
                          </div>
                        )}
                      </div>

                      {/* Info Frame */}
                      <div className="flex flex-col flex-1">
                        <h3 className="text-sm font-bold text-[#1E293B] line-clamp-1 group-hover:text-[#2563eb]">
                          {product.name}
                        </h3>
                        <p className="text-[10px] text-[#94A3B8] font-mono mt-0.5">
                          Shtrix: {product.barcode}
                        </p>
                        <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex justify-between items-baseline">
                          <span className="text-xs text-[#64748B]">Narxi:</span>
                          <span className="text-lg font-extrabold text-[#2563eb]">
                            {product.price.toLocaleString()} <span className="text-[10px] font-normal text-[#64748B]">so&apos;m</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Area: Checkout Basket Panel (40%) */}
        <aside className="lg:w-[38%] flex flex-col bg-[#F0F3FF] min-h-0">

          {/* Mijoz tablari */}
          <div className="flex border-b border-[#CBD5E1] bg-white shrink-0">
            {CART_TABS.map((tab, i) => {
              const count = carts[i].reduce((a, item) => a + item.quantity, 0);
              const isActive = activeCart === i;
              return (
                <button
                  key={i}
                  onClick={() => onSetActiveCart(i as 0 | 1 | 2)}
                  className="flex-1 py-2.5 px-2 flex flex-col items-center gap-0.5 transition-all cursor-pointer relative"
                  style={{ borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent' }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: tab.color }} />
                    <span
                      className="text-[11px] font-bold truncate"
                      style={{ color: isActive ? tab.color : '#64748B' }}
                    >
                      {count > 0 ? `${tab.label}` : tab.label}
                    </span>
                    {count > 0 && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white leading-none"
                        style={{ background: tab.color }}
                      >
                        {count}
                      </span>
                    )}
                  </div>
                  <span className="text-[9px]" style={{ color: isActive ? tab.color : '#94A3B8' }}>
                    {count > 0 ? `${count} ta mahsulot` : "Bo'sh"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col flex-1 p-6 min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#CBD5E1]">
            <h2 className="text-lg font-bold text-[#1E293B] flex items-center gap-2">
              <ShoppingCart className="text-[#2563eb] w-5 h-5" />
              Savat
              {totalItemsCount > 0 && (
                <span className="bg-[#2563eb] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {totalItemsCount} ta
                </span>
              )}
            </h2>
            {cart.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Tozalash
              </button>
            )}
          </div>

          {/* Cart Products List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mb-4 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-full text-slate-400 shadow-inner">
                  <ShoppingCart className="w-10 h-10 stroke-[1.5]" />
                </div>
                <p className="text-sm font-semibold text-slate-500">Hozircha savat bo&apos;sh</p>
                <p className="text-xs text-slate-400 text-center max-w-[200px]">
                  Kassa bo&apos;limidan mahsulot tanlab savatchaga qo&apos;shing
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="bg-white p-3 rounded-xl border border-[#E2E8F0] flex items-center justify-between shadow-sm animate-in slide-in-from-right-4 duration-150"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="text-xs font-bold text-[#1E293B] truncate">{item.product.name}</h4>
                    <p className="text-[10px] text-[#64748B] font-medium leading-4">
                      {item.product.price.toLocaleString()} so&apos;m &times; {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-xs text-[#2563eb]">
                      {(item.product.price * item.quantity).toLocaleString()} so&apos;m
                    </p>
                    <div className="flex items-center border border-[#CBD5E1] rounded-lg bg-slate-50 overflow-hidden shrink-0">
                      <button
                        onClick={() => onUpdateCartQuantity(item.product.id, -1)}
                        className="py-1 px-2.5 hover:bg-slate-200 text-[#1E293B] transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold font-mono text-center min-w-[20px]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateCartQuantity(item.product.id, 1)}
                        className="py-1 px-2.5 hover:bg-slate-200 text-[#1E293B] transition-colors"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pricing Summary Engine */}
          <div className="bg-white p-5 rounded-2xl border border-[#CBD5E1] space-y-4 shadow-md mt-auto">
            
            <div className="space-y-2 text-xs text-[#64748B]">
              <div className="flex justify-between items-center font-medium">
                <span>Mahsulotlar soni:</span>
                <span className="font-bold text-[#1E293B]">{totalItemsCount} ta</span>
              </div>
              <div className="flex justify-between items-center font-medium">
                <span>Oraliq jami (Subtotal):</span>
                <span className="font-bold text-[#1E293B]">{subtotal.toLocaleString()} so&apos;m</span>
              </div>
              {appliedDiscount > 0 && (
                <div className="flex justify-between items-center font-medium text-green-600">
                  <span>Chegirma ({appliedDiscount}%):</span>
                  <span>-{discountAmount.toLocaleString()} so&apos;m</span>
                </div>
              )}
            </div>

            {/* Promo coupon form */}
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-[#F1F5F9] rounded-xl px-3 py-2 border border-[#E2E8F0]">
                <Tag className="text-[#64748B] w-4 h-4 mr-2" />
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Kupon kodi (masalan, PRO5)"
                  className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-xs text-[#1E293B] placeholder-slate-400 w-full font-semibold"
                />
              </div>
              <button
                onClick={handleApplyPromo}
                className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-300 active:scale-95 transition-all select-none cursor-pointer border border-slate-300"
              >
                Qo&apos;shish
              </button>
            </div>

            <div className="pt-3 border-t border-[#F1F5F9] flex justify-between items-end">
              <span className="text-sm font-bold text-[#1E293B]">Jami to&apos;lov:</span>
              <span className="text-2xl font-black text-[#2563eb]">
                {totalAmount.toLocaleString()} <span className="text-xs font-normal text-[#64748B]">so&apos;m</span>
              </span>
            </div>

            {/* Final purchase Trigger */}
            <button
              onClick={() => {
                if (cart.length === 0) return;
                if (paymentMethod === 'QR') { setShowQR(true); return; }
                setIsCheckoutOpen(true);
              }}
              disabled={cart.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 shadow-md transition-all duration-150 border select-none ${
                cart.length === 0
                  ? 'bg-slate-300 border-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-[#16A34A] border-[#16A34A] hover:bg-[#15803d] text-white hover:shadow-lg active:scale-97 cursor-pointer'
              }`}
            >
              <Coins className="w-5 h-5 animate-pulse" />
              Savdoni yakunla
            </button>
          </div>
          </div>{/* /flex flex-col flex-1 p-6 */}
        </aside>
      </div>

      {/* Checkout Modal Frame */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[460px] rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#1E293B]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
              <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2">
                <CheckCircle className="text-[#16A34A] w-5 h-5" />
                Savdo hisobini yakunlash
              </h3>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {!isSuccessCheckout ? (
                <form onSubmit={handleFinalCheckoutSubmit} className="space-y-4">
                  {/* Totals */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-[#E2E8F0] text-center space-y-1">
                    <p className="text-xs text-[#64748B] font-semibold uppercase tracking-wider">Jami to&apos;lov summasi</p>
                    <p className="text-3xl font-black text-[#2563eb]">{totalAmount.toLocaleString()} UZS</p>
                    {appliedDiscount > 0 && (
                      <p className="text-xs text-[#16A34A] font-semibold">Maxsus kupon orqali {appliedDiscount}% chegirma kiritildi</p>
                    )}
                  </div>

                  {/* Payment method picker */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#64748B] block">To&apos;lov usuli</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Naqd')}
                        className={`py-3 px-3 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1.5 transition-all select-none cursor-pointer ${
                          paymentMethod === 'Naqd'
                            ? 'border-[#2563eb] bg-[#eeefff] text-[#2563eb]'
                            : 'border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Coins className="w-4 h-4" />
                        Naqd
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Karta')}
                        className={`py-3 px-3 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1.5 transition-all select-none cursor-pointer ${
                          paymentMethod === 'Karta'
                            ? 'border-[#2563eb] bg-[#eeefff] text-[#2563eb]'
                            : 'border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        Bank kartasi
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('Nasiya')}
                        className={`py-3 px-3 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1.5 transition-all select-none cursor-pointer ${
                          paymentMethod === 'Nasiya'
                            ? 'border-[#2563eb] bg-[#eeefff] text-[#2563eb]'
                            : 'border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <BookOpen className="w-4 h-4" />
                        Nasiya daftari
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod('QR'); setShowQR(true); }}
                        className={`py-3 px-3 rounded-xl border-2 text-xs font-bold flex flex-col items-center gap-1.5 transition-all select-none cursor-pointer ${
                          paymentMethod === 'QR'
                            ? 'border-[#2563eb] bg-[#eeefff] text-[#2563eb]'
                            : 'border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <QrCode className="w-4 h-4" />
                        QR to&apos;lov
                      </button>
                    </div>
                  </div>

                  {/* Customer details input */}
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#64748B] block">
                        Mijoz ismi {paymentMethod === 'Nasiya' && <span className="text-red-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Mijoz ismi yoki taxallusi..."
                        required={paymentMethod === 'Nasiya'}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl font-medium focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-sm"
                      />
                    </div>
                    {paymentMethod === 'Nasiya' && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-[#64748B] block">
                          Telefon raqam <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+998 __ ___ __ __"
                          required
                          className="w-full px-4 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl font-medium focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-sm font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Cash received calculator for Cash payments */}
                  {paymentMethod === 'Naqd' && (
                    <div style={{
                      background:'#F8F9FA', borderRadius:'12px',
                      padding:'12px', marginBottom:'12px'
                    }}>
                      <label style={{
                        fontSize:'12px', color:'#64748B',
                        fontWeight:500, display:'block',
                        marginBottom:'6px'
                      }}>
                        Mijoz bergan pul (so'm)
                      </label>
                      <input
                        type="number"
                        placeholder={totalAmount.toString()}
                        value={cashReceived}
                        onChange={e => setCashReceived(e.target.value)}
                        style={{
                          width:'100%', padding:'10px 12px',
                          borderRadius:'10px', border:'1px solid #E2E8F0',
                          fontSize:'16px', fontWeight:600,
                          outline:'none', boxSizing:'border-box'
                        }}
                      />
                      {Number(cashReceived) >= totalAmount && cashReceived !== '' && (
                        <div style={{
                          marginTop:'8px', padding:'8px 12px',
                          background:'#DCFCE7', borderRadius:'8px',
                          display:'flex', justifyContent:'space-between',
                          alignItems:'center'
                        }}>
                          <span style={{fontSize:'13px', color:'#166534', fontWeight:500}}>
                            Qaytim:
                          </span>
                          <span style={{fontSize:'18px', color:'#16A34A', fontWeight:700}}>
                            {(Number(cashReceived) - totalAmount).toLocaleString('uz-UZ')} so'm
                          </span>
                        </div>
                      )}
                      {Number(cashReceived) < totalAmount && cashReceived !== '' && (
                        <div style={{
                          marginTop:'8px', padding:'8px 12px',
                          background:'#FEE2E2', borderRadius:'8px',
                          display:'flex', justifyContent:'space-between',
                          alignItems:'center'
                        }}>
                          <span style={{fontSize:'13px', color:'#991B1B', fontWeight:500}}>
                            Yetishmaydi:
                          </span>
                          <span style={{fontSize:'18px', color:'#DC2626', fontWeight:700}}>
                            {(totalAmount - Number(cashReceived)).toLocaleString('uz-UZ')} so'm
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Complete button */}
                  <button
                    type="submit"
                    className="w-full mt-4 bg-[#16A34A] hover:bg-[#15803d] text-white py-3.5 rounded-xl font-bold text-sm shadow-md active:scale-97 select-none cursor-pointer transition-all duration-150"
                  >
                    Tranzaksiyani yakunlash (Chek yaratish)
                  </button>
                </form>
              ) : (
                
                /* Printable Invoice Receipt View */
                <div className="space-y-6">
                  {/* Digitalized POS paper thermal ticket matching custom styling rules */}
                  <div className="border border-slate-300 p-5 rounded-lg font-mono text-xs text-slate-800 bg-[#FCFDFE] shadow-inner space-y-4 leading-relaxed tracking-tight max-w-[340px] mx-auto overflow-hidden">
                    
                    <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                      <p className="font-extrabold text-sm text-[#1E293B]">G&apos;alaba Supermarket</p>
                      <p className="text-[10px] text-slate-500">Toshkent sh., Yunusobod tumani</p>
                      <p className="text-[10px] text-slate-500">Tel: +998 90 123 45 67</p>
                      <p className="text-[9px] text-slate-400">Sana: {lastCompletedReceipt?.timestamp}</p>
                      <p className="text-[9px] text-slate-400">Kassir: {lastCompletedReceipt?.cashier}</p>
                    </div>

                    <div className="space-y-1 px-1 py-1 text-[11px] border-b border-dashed border-slate-300">
                      <div className="flex justify-between font-bold text-[10px] text-slate-400 pb-1">
                        <span>MAHSULOT</span>
                        <span>SUMMA</span>
                      </div>
                      {lastCompletedReceipt?.items.map((it: any, index: number) => (
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

                    <div className="space-y-1 px-1 py-2 border-b border-dashed border-slate-300">
                      <div className="flex justify-between font-bold text-[11px] text-slate-700">
                        <span>ORALIK JAMI:</span>
                        <span>{(lastCompletedReceipt?.totalAmount + lastCompletedReceipt?.discountAmount).toLocaleString()} UZS</span>
                      </div>
                      {lastCompletedReceipt?.discountAmount > 0 && (
                        <div className="flex justify-between text-[11px] text-green-600 font-bold">
                          <span>CHEGIRMA:</span>
                          <span>-{lastCompletedReceipt?.discountAmount.toLocaleString()} UZS</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-black text-[#2563eb] pt-1">
                        <span>YAKUNIY JAMI:</span>
                        <span>{lastCompletedReceipt?.totalAmount.toLocaleString()} UZS</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 px-1 py-1 text-[11px] text-[#434655]">
                      <div className="flex justify-between font-semibold">
                        <span>To&apos;lov usuli:</span>
                        <span className="font-bold tracking-wide text-slate-700">{lastCompletedReceipt?.paymentMethod}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Mijoz:</span>
                        <span className="font-bold text-slate-700">{lastCompletedReceipt?.customerName}</span>
                      </div>
                      <div className="flex justify-between font-semibold">
                        <span>Chek raqami:</span>
                        <span className="font-bold tracking-wider">{lastCompletedReceipt?.id}</span>
                      </div>
                      {lastCompletedReceipt?.paymentMethod === 'Naqd' && (
                        <>
                          <div className="flex justify-between font-semibold">
                            <span>Kiritilgan naqd pul:</span>
                            <span className="font-bold">{(lastCompletedReceipt?.cashReceived || 0).toLocaleString()} UZS</span>
                          </div>
                          <div className="flex justify-between text-green-600 font-bold">
                            <span>Kassa qaytim (Qaytarildi):</span>
                            <span>{lastCompletedReceipt?.refundAmount.toLocaleString()} UZS</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="text-center pt-3 border-t border-dashed border-slate-300 font-sans space-y-2">
                      <p className="text-[10px] text-slate-400 font-medium">Xaridingiz uchun tashakkur!</p>
                      <div className="border border-slate-200 bg-white p-2 rounded inline-block">
                        {/* Fake barcode block to simulate layout standard */}
                        <div className="w-40 h-8 flex justify-between items-center gap-0.5 outline-slate-100 outline-1">
                          {[2,3,1,4,1,2,3,1,2,4,2,1,1,3,2,4,2,1,3,2,1,2,1,3].map((h, i) => (
                            <div key={i} className="bg-black flex-1" style={{ height: `${h * 20 + 30}%` }} />
                          ))}
                        </div>
                        <p className="text-[8px] font-mono tracking-[0.2em] text-center mt-1 text-slate-400">
                          {lastCompletedReceipt?.id}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => alert(`Chek (${lastCompletedReceipt?.id}) muvaffaqiyatli chop etildi!`)}
                      className="flex-1 max-w-[170px] bg-[#004ac6] hover:bg-[#003ea8] hover:shadow text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 border border-[#004ac6] select-none cursor-pointer transition-all text-xs"
                    >
                      <Printer className="w-4 h-4" />
                      Chop etish
                    </button>
                    <button
                      onClick={handleCloseSuccessfulReceipt}
                      className="flex-1 max-w-[170px] bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#1E293B] py-2.5 rounded-xl font-bold text-xs cursor-pointer select-none transition-all"
                    >
                      Yopish (Kassaga qaytish)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <QRPaymentModal
        isOpen={showQR}
        amount={totalAmount}
        storeName="G'alaba Supermarket"
        onClose={() => setShowQR(false)}
        onConfirm={handleQRConfirm}
      />
    </div>
  );
}
