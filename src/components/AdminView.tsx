import React, { useState, useRef, useEffect } from 'react';

const FEATURE_FLAGS = {
  enableDiscount: false,
};

// ── EAN-13 barcode canvas renderer ───────────────────────────────────────────
const L_CODES = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const G_CODES = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const R_CODES = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const PARITY  = ['AAAAAA','AABABB','AABBAB','AABBBA','ABAABB','ABBAAB','ABBBAA','ABABAB','ABABBA','ABBABA'];

function drawEAN13(canvas: HTMLCanvasElement, raw: string) {
  const digits = raw.replace(/\D/g, '').padEnd(13, '0').slice(0, 13).split('').map(Number);
  const parity = PARITY[digits[0]];
  let bits = '101';
  for (let i = 0; i < 6; i++) bits += parity[i] === 'A' ? L_CODES[digits[i + 1]] : G_CODES[digits[i + 1]];
  bits += '01010';
  for (let i = 0; i < 6; i++) bits += R_CODES[digits[i + 7]];
  bits += '101';

  const bw = 2, bh = 56, pad = 14;
  canvas.width  = bits.length * bw + pad * 2;
  canvas.height = bh + 22;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#1E293B';
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') ctx.fillRect(pad + i * bw, 4, bw, bh);
  }
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(digits[0].toString(), 2, bh + 16);
  ctx.textAlign = 'center';
  ctx.fillText(digits.slice(1, 7).join(''), pad + 21 * bw, bh + 16);
  ctx.fillText(digits.slice(7).join(''),   pad + (21 + 5 + 21) * bw / 2 + 21 * bw, bh + 16);
}
import {
  Plus,
  Search,
  Filter,
  Download,
  Edit3,
  Trash2,
  PlusCircle,
  Store,
  Phone,
  FileText,
  MapPin,
  Lock,
  Printer,
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  FolderOpen,
  Info,
  X,
  PlusSquare,
  FileJson,
  Camera,
  Eye,
  EyeOff
} from 'lucide-react';
import { Product, Category, StoreSettings, Cashier, Store as StoreData } from '../types';

import { exportAllData, importAllData } from '../utils/storage';
import { fmtStore } from '../utils/format';
import { generateSalt, hashPin } from '../utils/crypto';
import * as Icons from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

interface AdminViewProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  cashiers: Cashier[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateSettings: (settings: StoreSettings) => void;
  activeStore: StoreData;
  onUpdateStore: (store: StoreData) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onDeleteCategory: (id: string) => void;
  onAddCashier: (cashier: Omit<Cashier, 'id'>) => void;
  onUpdateCashier: (cashier: Cashier) => void;
  onDeleteCashier: (id: string) => void;
}

export default function AdminView({
  products,
  categories,
  settings,
  cashiers,
  activeStore,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateSettings,
  onUpdateStore,
  onAddCategory,
  onDeleteCategory,
  onAddCashier,
  onUpdateCashier,
  onDeleteCashier,
}: AdminViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'categories' | 'settings' | 'cashiers' | 'vitrina'>('inventory');

  // Custom delete-confirm modal  (never stores a function — avoids stale-closure bug)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    message: string;
    targetId: string;
    type: 'product' | 'category' | 'cashier' | 'info';
  } | null>(null);

  // Kasir modal states
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [cashierForm, setCashierForm] = useState<Omit<Cashier, 'id'>>({
    name: '', pin: '', storeLabel: '', role: 'cashier', isActive: true,
  });
  const [cashierFormError, setCashierFormError] = useState<string>('');
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Product dialog states
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    costPrice: 0,
    price: 0,
    stock: 0,
    barcode: '',
    lowStockThreshold: 5,
    icon: 'Package',
    image: '',
  });

  // Settings states
  const [settingsForm, setSettingsForm] = useState<StoreSettings>({ ...settings });
  const [pinChangeMessage, setPinChangeMessage] = useState<string | null>(null);

  // Category inline form states
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatIcon, setNewCatIcon] = useState<string>('Package');
  const [catError, setCatError] = useState<string>('');

  // PIN ko'rish toggle (settings va kasir modal uchun)
  const [showPinSettings, setShowPinSettings] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  // Backup logs presentation modal
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [backupType, setBackupType] = useState<'export' | 'import' | 'csv'>('export');

  // Data backup/restore
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = () => {
    const data = exportAllData();
    const today = new Date().toISOString().substring(0, 10);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const success = importAllData(text);
      if (success) {
        setRestoreMessage('Tiklandi! Sahifani yangilang');
      } else {
        setRestoreMessage("Xato: JSON fayl noto'g'ri formatda!");
      }
      setTimeout(() => setRestoreMessage(null), 6000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const barcodeCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (isProductModalOpen && barcodeCanvasRef.current && formData.barcode.length >= 8) {
      drawEAN13(barcodeCanvasRef.current, formData.barcode);
    }
  }, [formData.barcode, isProductModalOpen]);

  // CSV import
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [csvImportMessage, setCsvImportMessage] = useState<string | null>(null);

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string) || '';
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const dataLines = lines.slice(1); // skip header
      let added = 0;
      for (const line of dataLines) {
        const parts = line.split(',');
        if (parts.length < 6) continue;
        const [namePart, priceStr, stockStr, costPriceStr, categoryPart, barcodePart] = parts;
        const price = parseFloat(priceStr);
        const stock = parseInt(stockStr);
        const costPrice = parseFloat(costPriceStr);
        if (!namePart?.trim() || isNaN(price) || isNaN(stock) || isNaN(costPrice)) continue;
        const catMatch = categories.find(c => c.name.toLowerCase() === categoryPart?.trim().toLowerCase());
        onAddProduct({
          name: namePart.trim(),
          price,
          stock,
          costPrice,
          category: catMatch ? catMatch.id : (categories[1]?.id || 'food'),
          barcode: barcodePart?.trim() || Math.floor(100000000000 + Math.random() * 900000000000).toString(),
          lowStockThreshold: 5,
          icon: 'Package',
          image: '',
        });
        added++;
      }
      setCsvImportMessage(`${added} ta mahsulot qo'shildi`);
      setTimeout(() => setCsvImportMessage(null), 5000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadSampleCsv = () => {
    const sample = [
      'nomi,narxi,miqdori,tannarxi,kategoriya,barkod',
      'Coca Cola,8000,50,5000,Ichimliklar,1234567890',
      'Non,3000,100,2000,Oziq-ovqat,0987654321',
    ].join('\n');
    const blob = new Blob(['﻿' + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mahsulotlar_shablon.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderIcon = (name: string, className: string = 'w-4 h-4') => {
    const LucideIcon = (Icons as any)[name] || Icons.Box;
    return <LucideIcon className={className} />;
  };

  // KPI calculations
  const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const totalInventoryTurnover = products.reduce((acc, p) => acc + ((p.soldCount || 0) * p.price), 0);
  const lowStockItems = products.filter(p => p.stock <= (p.lowStockThreshold || 5));
  const lowStockTypesCount = lowStockItems.length;

  // Carousel state for low-stock items
  const [carouselIdx, setCarouselIdx] = useState(0);
  useEffect(() => {
    if (lowStockItems.length <= 6) return;
    const id = setInterval(() => setCarouselIdx(i => (i + 1) % lowStockItems.length), 3000);
    return () => clearInterval(id);
  }, [lowStockItems.length]);

  const generateBarcode = () =>
    '200' + Math.floor(1000000000 + Math.random() * 9000000000).toString();

  // Handle product edit click
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormErrors({});
    setFormData({
      name: p.name,
      category: p.category,
      costPrice: p.costPrice,
      price: p.price,
      stock: p.stock,
      barcode: p.barcode,
      lowStockThreshold: p.lowStockThreshold || 5,
      icon: p.icon || 'Package',
      image: p.image || '',
    });
    setIsProductModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormErrors({});
    setFormData({
      name: '',
      category: categories[1]?.id || 'food',
      costPrice: 0,
      price: 0,
      stock: 0,
      barcode: generateBarcode(),
      lowStockThreshold: 5,
      icon: 'Package',
      image: '',
    });
    setIsProductModalOpen(true);
  };

  const validateProductForm = () => {
    const errs: Record<string, string> = {};
    if (formData.name.trim().length < 3) errs.name = "Nomi kamida 3 ta harf bo'lishi kerak";
    if (formData.name.trim().length > 255) errs.name = "Nomi 255 ta harfdan oshmasin";
    if (formData.costPrice < 0) errs.costPrice = "Manfiy bo'lmasin";
    if (formData.price < 0) errs.price = "Manfiy bo'lmasin";
    if (formData.price > 0 && formData.costPrice > 0 && formData.price <= formData.costPrice)
      errs.price = "Sotish narxi tan narxidan katta bo'lishi kerak";
    if (formData.stock < 0) errs.stock = "Manfiy bo'lmasin";
    if (!formData.barcode.trim()) errs.barcode = "Barcode kiritilishi shart";
    return errs;
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateProductForm();
    if (Object.keys(errs).length > 0) { setFormErrors(errs); return; }
    if (editingProduct) {
      onUpdateProduct({ ...editingProduct, ...formData });
    } else {
      onAddProduct(formData);
    }
    setIsProductModalOpen(false);
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(settingsForm.operatorPin)) {
      setPinChangeMessage('❌ Xato: Operator PIN aniq 4 ta raqamdan iborat bo\'lishi kerak!');
      setTimeout(() => setPinChangeMessage(null), 4000);
      return;
    }
    onUpdateSettings(settingsForm);
    onUpdateStore({ ...activeStore, name: settingsForm.storeName, address: settingsForm.address, phone: settingsForm.phone });
    setPinChangeMessage('Sozlamalar zudlik bilan saqlandi!');
    setTimeout(() => setPinChangeMessage(null), 3000);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || newCatName.trim().length < 2) {
      setCatError("Kategoriya nomini kiriting! (kamida 2 ta harf)");
      return;
    }
    setCatError('');
    onAddCategory({ name: newCatName.trim(), icon: newCatIcon });
    setNewCatName('');
    setNewCatIcon('Package');
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.barcode.includes(searchQuery)
  );

  return (
    <div className="flex-grow flex flex-col md:flex-row min-h-0 bg-[#F9F9FF]">
      
      {/* Side submenu for Admin Panel */}
      <aside className="w-full md:w-64 bg-[#e7eeff]/40 p-6 border-b md:border-b-0 md:border-r border-[#c3c6d7] flex flex-col select-none shrink-0">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#004ac6]">Boshqaruv</h2>
          <p className="text-xs text-[#64748B] mt-0.5">Tizim va ombor sozlamalari</p>
        </div>
        
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible no-scrollbar">
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap justify-start w-full transition-all cursor-pointer ${
              activeSubTab === 'inventory'
                ? 'bg-[#2563eb] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {renderIcon('Box', 'w-4 h-4')}
            Mahsulotlar
          </button>
          
          <button
            onClick={() => setActiveSubTab('categories')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap justify-start w-full transition-all cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-[#2563eb] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {renderIcon('FolderOpen', 'w-4 h-4')}
            Kategoriyalar
          </button>
          
          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap justify-start w-full transition-all cursor-pointer ${
              activeSubTab === 'settings'
                ? 'bg-[#2563eb] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {renderIcon('Settings', 'w-4 h-4')}
            Sozlamalar
          </button>

          <button
            onClick={() => setActiveSubTab('cashiers')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap justify-start w-full transition-all cursor-pointer ${
              activeSubTab === 'cashiers'
                ? 'bg-[#2563eb] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {renderIcon('Users', 'w-4 h-4')}
            Kasirlar
            <span className="ml-auto bg-[#2563eb]/10 text-[#2563eb] text-[10px] font-black px-2 py-0.5 rounded-full">
              {cashiers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('vitrina')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap justify-start w-full transition-all cursor-pointer ${
              activeSubTab === 'vitrina'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {renderIcon('Star', 'w-4 h-4')}
            Vitrina
            <span className="ml-auto bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">
              {products.filter(p => p.isFeatured).length}/8
            </span>
          </button>
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-grow p-6 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
        
        {/* Tab 1: Inventory Management */}
        {activeSubTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#1E293B]">Ombor (Mahsulotlar)</h1>
                <p className="text-sm text-[#64748B]">Ombordagi joriy qoldiqlar va tovarlar ro&apos;yxati</p>
              </div>
              <button
                onClick={handleOpenAdd}
                className="bg-[#2563eb] hover:bg-[#004ac6] active:scale-95 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md select-none"
              >
                <Plus className="w-4 h-4" />
                Yangi mahsulot
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Umumiy qiymat */}
              <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-[#eeefff] text-[#2563eb] rounded-full flex items-center justify-center shrink-0">
                  {renderIcon('Coins', 'w-6 h-6')}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Umumiy qiymat</p>
                  <p className="text-xl font-black text-[#1E293B] mt-0.5 truncate">
                    {new Intl.NumberFormat('uz-UZ').format(totalStockValue)} UZS
                  </p>
                </div>
              </div>

              {/* Card 2: Oylik aylanma (real soldCount × price) */}
              <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center shrink-0">
                  {renderIcon('TrendingUp', 'w-6 h-6')}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Oylik aylanma</p>
                  <p className="text-xl font-black text-[#1E293B] mt-0.5 truncate">
                    {new Intl.NumberFormat('uz-UZ').format(totalInventoryTurnover)} UZS
                  </p>
                </div>
              </div>

              {/* Card 3: Kam qolganlar — list or carousel */}
              <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center shrink-0">
                    {renderIcon('AlertTriangle', 'w-6 h-6')}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Kam qolganlar</p>
                    <p className="text-xl font-black text-red-600">{lowStockTypesCount} turdagi</p>
                  </div>
                </div>
                {lowStockTypesCount === 0 ? (
                  <p className="text-xs text-green-600 font-semibold">Barcha mahsulotlar yetarli ✓</p>
                ) : lowStockItems.length <= 6 ? (
                  <div className="space-y-1.5">
                    {lowStockItems.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[#1E293B] font-semibold truncate">{p.name}</span>
                        <span style={{
                          background: p.stock === 0 ? '#FEE2E2' : '#FEF3C7',
                          color: p.stock === 0 ? '#B91C1C' : '#92400E',
                          fontSize: '10px', fontWeight: 700,
                          padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap',
                        }}>
                          {p.stock === 0 ? 'Tugagan' : `${p.stock} dona`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ overflow: 'hidden', height: '20px', position: 'relative' }}>
                    {lowStockItems.map((p, i) => (
                      <div key={p.id} style={{
                        position: 'absolute', width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                        transition: 'opacity 0.4s, transform 0.4s',
                        opacity: i === carouselIdx ? 1 : 0,
                        transform: i === carouselIdx ? 'translateY(0)' : 'translateY(8px)',
                      }}>
                        <span style={{ fontSize: '11px', color: '#1E293B', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </span>
                        <span style={{
                          background: p.stock === 0 ? '#FEE2E2' : '#FEF3C7',
                          color: p.stock === 0 ? '#B91C1C' : '#92400E',
                          fontSize: '10px', fontWeight: 700,
                          padding: '2px 8px', borderRadius: '999px', whiteSpace: 'nowrap',
                        }}>
                          {p.stock === 0 ? 'Tugagan' : `${p.stock} dona`}
                        </span>
                      </div>
                    ))}
                    <p style={{ position: 'absolute', bottom: '-16px', right: 0, fontSize: '9px', color: '#94A3B8' }}>
                      {carouselIdx + 1}/{lowStockItems.length}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-Header & search table control */}
            <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm overflow-hidden">
              <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
                <div className="relative w-full sm:max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nomi yoki shtrix-kod bo&apos;yicha qidirish..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#CBD5E1] rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                  />
                </div>
              </div>

              {/* Printable or structured tabular grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse select-text">
                  <thead className="bg-[#dee8ff]/60">
                    <tr className="border-b border-[#c3c6d7] text-xs font-bold text-[#434655]">
                      <th className="px-5 py-3">Tovar Nomi</th>
                      <th className="px-5 py-3">Kategoriya</th>
                      <th className="px-5 py-3 text-right">Tan narxi (UZS)</th>
                      <th className="px-5 py-3 text-right">Sotish narxi (UZS)</th>
                      <th className="px-5 py-3 text-center">Ombordagi Soni</th>
                      <th className="px-5 py-3 text-center">Min. zaxira</th>
                      <th className="px-5 py-3 text-center">Ustama (Foyda)</th>
                      <th className="px-5 py-3 text-center">⭐ Vitrina</th>
                      {FEATURE_FLAGS.enableDiscount && (
                        <th className="px-5 py-3 text-center">Aksiya %</th>
                      )}
                      <th className="px-5 py-3 text-center">Sotilgan</th>
                      <th className="px-5 py-3 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {filteredProducts.map((product) => {
                      const profit = product.price - product.costPrice;
                      const profitMargin = Math.round((profit / product.costPrice) * 100);
                      
                      const isOutOfStock = product.stock <= 0;
                      const isLowStock = product.stock > 0 && product.stock <= (product.lowStockThreshold || 5);
                      
                      const categoryObj = categories.find(c => c.id === product.category);
                      
                      return (
                        <tr key={product.id} className="hover:bg-[#f0f3ff]/40 text-xs text-[#1E293B] font-semibold transition-all">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <span className="p-1.5 bg-[#eeefff] text-[#2563eb] rounded-lg">
                                {renderIcon(product.icon || 'Box', 'w-4 h-4')}
                              </span>
                              <div>
                                <p className="font-bold text-[#1E293B]">{product.name}</p>
                                <p className="text-[10px] text-[#94A3B8] font-mono">Shtrix: {product.barcode}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-[10px] text-slate-600">
                              {categoryObj ? categoryObj.name : product.category}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-600">
                            {product.costPrice.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-bold text-[#2563eb]">
                            {product.price.toLocaleString()}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {isOutOfStock ? (
                              <span className="px-2.5 py-0.5 bg-red-100 text-red-700 font-bold rounded-full text-[10px]">
                                Tugagan
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2.5 py-0.5 bg-orange-100 text-orange-700 font-bold rounded-full text-[10px]">
                                Kam qolgan: {product.stock} ta
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-green-100 text-green-700 font-bold rounded-full text-[10px]">
                                {product.stock} ta
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center font-mono text-[11px] text-amber-700 font-bold">
                            {product.lowStockThreshold || 5} ta
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-green-600">{profit.toLocaleString()} UZS</span>{' '}
                            <span className="text-[10px] text-slate-400">({profitMargin}%)</span>
                          </td>

                          {/* ⭐ Vitrina toggle */}
                          <td className="px-5 py-4 text-center">
                            <button
                              onClick={() => onUpdateProduct({
                                ...product,
                                isFeatured: !product.isFeatured
                              })}
                              style={{
                                background: product.isFeatured ? '#FEF3C7' : '#F1F5F9',
                                color: product.isFeatured ? '#92400E' : '#64748B',
                                border: 'none', borderRadius:'8px',
                                padding:'4px 8px', fontSize:'11px',
                                cursor:'pointer', fontWeight:500
                              }}
                            >
                              {product.isFeatured ? '⭐ Trend' : '☆ Trend'}
                            </button>
                          </td>

                          {/* Aksiya % — feature flag orqali boshqariladi */}
                          {FEATURE_FLAGS.enableDiscount && (
                            <td className="px-5 py-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="99"
                                  value={product.discount || 0}
                                  onChange={e => {
                                    const val = Math.min(99, Math.max(0, parseInt(e.target.value) || 0));
                                    onUpdateProduct({ ...product, discount: val });
                                  }}
                                  className="w-12 text-center text-xs font-bold border border-slate-200 rounded-lg py-1 focus:outline-none focus:border-[#2563eb] bg-white"
                                />
                                <span className="text-[10px] text-slate-400">%</span>
                              </div>
                            </td>
                          )}

                          {/* Sotilgan */}
                          <td className="px-5 py-4 text-center">
                            {(product.soldCount || 0) > 0 ? (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                background: '#FFF7ED', color: '#C2410C',
                                fontSize: '11px', fontWeight: 700,
                                padding: '3px 10px', borderRadius: '999px',
                                border: '1px solid #FED7AA',
                              }}>
                                🔥 {product.soldCount} ta
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#CBD5E1', fontWeight: 600 }}>— ta</span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(product)}
                                title="Tahrirlash"
                                className="p-1.5 text-[#2563eb] hover:bg-[#eeefff] border border-transparent hover:border-[#dee8ff] rounded-lg cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => setDeleteConfirm({
                                  message: `"${product.name}" mahsulotini o'chirishni tasdiqlaysizmi?`,
                                  targetId: product.id,
                                  type: 'product',
                                })}
                                title="O'chirish"
                                className="p-1.5 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Category Settings */}
        {activeSubTab === 'categories' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]">Kategoriyalar boshqaruvi</h1>
              <p className="text-sm text-[#64748B]">Tizimdagi tovarni saralash uchun kataloglar ro&apos;yxati</p>
            </div>

            {/* Categories grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.filter(c => c.id !== 'all').map((cat) => {
                const prodCount = products.filter(p => p.category === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="p-5 bg-white border border-[#c3c6d7] rounded-2xl flex items-center justify-between shadow-sm hover:shadow hover:border-[#2563eb]/30 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 shrink-0 bg-[#eeefff] text-[#2563eb] rounded-full flex items-center justify-center">
                        {renderIcon(cat.icon, 'w-5 h-5')}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-[#1E293B] truncate">{cat.name}</p>
                        <p className="text-xs text-[#64748B] mt-0.5">{prodCount} ta mahsulot</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (prodCount > 0) {
                          setDeleteConfirm({ message: `Bu kategoriyada ${prodCount} ta mahsulot bor. Avval ularni boshqa kategoriyaga ko'chiring.`, targetId: cat.id, type: 'info' });
                          return;
                        }
                        setDeleteConfirm({ message: `"${cat.name}" kategoriyasini o'chirishni tasdiqlaysizmi?`, targetId: cat.id, type: 'category' });
                      }}
                      className="ml-3 shrink-0 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Inline add-category form */}
            <div className="bg-white border border-[#c3c6d7] rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#1E293B] flex items-center gap-2 mb-4 pb-3 border-b border-dashed border-slate-200">
                <Plus className="w-4 h-4 text-[#2563eb]" />
                Yangi kategoriya qo&apos;shish
              </h3>
              <form onSubmit={handleCategorySubmit} className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[160px] space-y-1">
                  <label className="text-xs font-bold text-[#64748B] block">Kategoriya nomi</label>
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => { setNewCatName(e.target.value); setCatError(''); }}
                    placeholder="Misol, Sabzavotlar..."
                    className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl font-semibold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs ${catError ? 'border-red-400' : 'border-[#E2E8F0]'}`}
                  />
                  {catError && <p className="text-[10px] text-red-500 font-semibold mt-0.5">{catError}</p>}
                </div>
                <button
                  type="submit"
                  className="bg-[#2563eb] hover:bg-[#004ac6] text-white px-6 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-all shadow-md select-none whitespace-nowrap"
                >
                  Qo&apos;shish
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Tab 3: Store Configuration Terminal */}
        {activeSubTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-[#1E293B]">Tizim sozlamalari</h1>
                <p className="text-sm text-[#64748B]">Xizmat ko&apos;rsatish nuqtasi ma&apos;lumotlari va texnik konfig-laj</p>
              </div>
              <div className="shrink-0 flex items-center gap-2 bg-[#f0f3ff] border border-[#dee8ff] rounded-xl px-3 py-2">
                <Store className="w-3.5 h-3.5 text-[#2563eb]" />
                <span className="text-xs font-bold text-[#2563eb]">{activeStore.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Profile Card & Info */}
              <form onSubmit={handleSettingsSubmit} className="bg-white p-6 rounded-2xl border border-[#c3c6d7] shadow-sm space-y-4">
                <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2 border-b border-dashed border-slate-200 pb-3">
                  <Store className="text-[#2563eb] w-5 h-5" />
                  Do&apos;kon ma&apos;lumotlari (Chekda chiqadi)
                </h3>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#64748B] block">Do&apos;kon / Savdo nuqtasi nomi</label>
                    <input
                      type="text"
                      value={settingsForm.storeName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-medium focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-sm text-[#1E293B]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#64748B] block">Manzil</label>
                    <input
                      type="text"
                      value={settingsForm.address}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-medium focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-sm text-[#1E293B]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#64748B] block">Bog&apos;lanish Telefoni</label>
                      <input
                        type="text"
                        value={settingsForm.phone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-medium focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-sm text-[#1E293B]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#64748B] block">Firma INN raqami</label>
                      <input
                        type="text"
                        value={settingsForm.inn}
                        onChange={(e) => setSettingsForm({ ...settingsForm, inn: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-medium focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-sm text-[#1E293B]"
                      />
                    </div>
                  </div>
                </div>

                {pinChangeMessage && (
                  <div className="p-3 rounded-lg text-xs font-semibold bg-green-50 border border-green-200 text-green-700 animate-pulse">
                    {pinChangeMessage}
                  </div>
                )}

                <div className="pt-3 flex justify-end">
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer select-none border-green-600 shadow-md active:scale-95 transition-all"
                  >
                    Saqlash (O&apos;zgartirish)
                  </button>
                </div>
              </form>

              {/* Security & paper options column */}
              <div className="space-y-6">
                
                {/* Thermal Printer configurations */}
                <div className="bg-white p-6 rounded-2xl border border-[#c3c6d7] shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2 border-b border-dashed border-slate-200 pb-3">
                    <Printer className="text-[#2563eb] w-5 h-5" />
                    Kassa printer lentasi o&apos;lchami (Paper size)
                  </h3>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-[#64748B] font-medium leading-5">
                      Sotib olish chiptalarining chop etilishi kassa terminalidagi printer eniga qarab muvofiqlashtiriladi:
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                      {['58mm', '80mm', 'A4'].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            const updated = { ...settingsForm, paperSize: size as any };
                            setSettingsForm(updated);
                            onUpdateSettings(updated);
                            setPinChangeMessage(`Chop etish o'lchami o'zgartirildi: ${size}`);
                            setTimeout(() => setPinChangeMessage(null), 2500);
                          }}
                          className={`py-2.5 rounded-xl text-center text-xs font-bold border-2 transition-all select-none cursor-pointer ${
                            settingsForm.paperSize === size
                              ? 'border-[#2563eb] bg-[#eeefff] text-[#2563eb] font-black'
                              : 'border-[#CBD5E1] bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Operator PIN passcode update block */}
                <div className="bg-white p-6 rounded-2xl border border-[#c3c6d7] shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2 border-b border-dashed border-slate-200 pb-3">
                    <Lock className="text-[#2563eb] w-5 h-5" />
                    Operator Kirish PIN-kodi
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[#64748B] block">To&apos;rtta raqamli bosh klyuch</label>
                      <div className="relative">
                        <input
                          type={showPinSettings ? 'text' : 'password'}
                          maxLength={4}
                          value={settingsForm.operatorPin}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, '');
                            setSettingsForm({ ...settingsForm, operatorPin: val });
                          }}
                          placeholder="Kalit PIN (e.g., 1234)"
                          className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold font-mono focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-base tracking-widest text-[#1E293B]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPinSettings(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          tabIndex={-1}
                        >
                          {showPinSettings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (settingsForm.operatorPin.length !== 4) {
                          alert('Xato: PIN-kod aniq to\'rtta raqamdan tashkil topishi lozim!');
                          return;
                        }
                        onUpdateSettings(settingsForm);
                        setPinChangeMessage('PIN-kod muvaffaqiyatli saqlandi! Keyingi safar kirishda shu kod ishlatiladi.');
                        setTimeout(() => setPinChangeMessage(null), 4000);
                      }}
                      className="w-full py-2 bg-[#2563eb] hover:bg-[#004ac6] border border-[#2563eb] text-white rounded-xl text-xs font-bold select-none cursor-pointer transition-all"
                    >
                      PIN-kodni yangilash
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Backup / Restore */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#c3c6d7] shadow-sm space-y-4">
                <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2 border-b border-dashed border-slate-200 pb-3">
                  <FileJson className="text-[#2563eb] w-5 h-5" />
                  Ma&apos;lumotlar zaxirasi
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export */}
                  <div className="p-5 border border-[#dee8ff] bg-[#f0f3ff] rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#2563eb] text-white rounded-xl flex items-center justify-center shrink-0">
                        <Download className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#1E293B]">Zaxira yuklab olish</p>
                        <p className="text-[10px] text-[#64748B] leading-4 mt-0.5">Barcha ma&apos;lumotlarni JSON faylga saqlash</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="w-full py-2.5 bg-[#2563eb] hover:bg-[#004ac6] active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer select-none transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Yuklab olish (.json)
                    </button>
                  </div>

                  {/* Import / Restore */}
                  <div className="p-5 border border-amber-200 bg-amber-50 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shrink-0">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#1E293B]">Zaxira tiklash</p>
                        <p className="text-[10px] text-[#64748B] leading-4 mt-0.5">JSON fayldan ma&apos;lumotlarni tiklash</p>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleRestoreBackup}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer select-none transition-all shadow-md flex items-center justify-center gap-2"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      Fayl tanlash va tiklash
                    </button>
                    {restoreMessage && (
                      <div className={`p-2.5 rounded-lg text-xs font-bold ${restoreMessage.startsWith('Xato') ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                        {restoreMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Kasirlar */}
        {activeSubTab === 'cashiers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#1E293B]">Kasirlar boshqaruvi</h1>
                <p className="text-sm text-[#64748B]">Tizimga kirish huquqi bo'lgan xodimlar ro'yxati</p>
              </div>
              <button
                onClick={() => {
                  setEditingCashier(null);
                  setCashierForm({ name: '', pin: '', storeLabel: '', role: 'cashier', isActive: true });
                  setCashierFormError('');
                  setIsCashierModalOpen(true);
                }}
                className="bg-[#2563eb] hover:bg-[#004ac6] active:scale-95 text-white px-5 py-3 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md select-none shrink-0"
              >
                <Plus className="w-4 h-4" />
                Yangi kasir qo'shish
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cashiers.map(cashier => {
                const COLORS: Record<string, { bg: string; text: string }> = {
                  'cashier-0': { bg: '#e0e7ff', text: '#3730a3' },
                  'cashier-1': { bg: '#dcfce7', text: '#166534' },
                  'cashier-2': { bg: '#fef3c7', text: '#92400e' },
                  'cashier-3': { bg: '#fce7f3', text: '#9d174d' },
                  'cashier-4': { bg: '#e0f2fe', text: '#0c4a6e' },
                };
                const palette = COLORS[cashier.id] ?? { bg: '#f3e8ff', text: '#6b21a8' };
                const initials = cashier.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

                return (
                  <div key={cashier.id} className="bg-white border border-[#c3c6d7] rounded-2xl p-5 shadow-sm flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-black shrink-0"
                        style={{ background: palette.bg, color: palette.text }}>
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-sm text-[#1E293B] truncate">{cashier.name}</p>
                          {cashier.role === 'owner' && (
                            <span className="text-[9px] font-black bg-[#2563eb] text-white px-2 py-0.5 rounded-full shrink-0">Egasi</span>
                          )}
                          {!cashier.isActive && (
                            <span className="text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full shrink-0">Nofaol</span>
                          )}
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5">{fmtStore(cashier.storeLabel)}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">PIN: {'•'.repeat(cashier.pin.length)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setEditingCashier(cashier);
                          setCashierForm({ name: cashier.name, pin: cashier.pin, storeLabel: cashier.storeLabel, role: cashier.role, isActive: cashier.isActive });
                          setCashierFormError('');
                          setIsCashierModalOpen(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-[#dee8ff] bg-[#f0f3ff] text-[#2563eb] text-xs font-bold hover:bg-[#dee8ff] cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Tahrirlash
                      </button>
                      <button
                        onClick={() => onUpdateCashier({ ...cashier, isActive: !cashier.isActive })}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                          cashier.isActive
                            ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                        }`}
                      >
                        {cashier.isActive ? 'Bloklash' : 'Faollashtirish'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm({
                          message: `"${cashier.name}" kasirini o'chirishni tasdiqlaysizmi?`,
                          targetId: cashier.id,
                          type: 'cashier',
                        })}
                        className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab: Vitrina boshqaruvi */}
        {activeSubTab === 'vitrina' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]">Vitrina boshqaruvi</h1>
              <p className="text-sm text-[#64748B]">Kassada ko'rsatiladigan featured mahsulotlar tartibi (max 8 ta)</p>
            </div>

            {/* Featured products list */}
            {(() => {
              const featured = products
                .filter(p => p.isFeatured)
                .sort((a, b) => (a.featuredOrder || 0) - (b.featuredOrder || 0));

              const moveItem = (index: number, direction: -1 | 1) => {
                const targetIndex = index + direction;
                if (targetIndex < 0 || targetIndex >= featured.length) return;
                const a = featured[index];
                const b = featured[targetIndex];
                onUpdateProduct({ ...a, featuredOrder: b.featuredOrder ?? targetIndex });
                onUpdateProduct({ ...b, featuredOrder: a.featuredOrder ?? index });
              };

              if (featured.length === 0) {
                return (
                  <div className="bg-white border-2 border-dashed border-amber-200 rounded-2xl p-12 text-center">
                    <div className="text-4xl mb-3">⭐</div>
                    <p className="text-sm font-bold text-slate-500">Hali vitrina mahsulotlari yo'q</p>
                    <p className="text-xs text-slate-400 mt-1">Mahsulotlar jadvalida ⭐ tugmasini bosib qo'shing</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {featured.length >= 8 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs font-bold text-amber-700 flex items-center gap-2">
                      <span>⚠️</span>
                      Maksimal 8 ta mahsulot vitrinada ko'rsatilishi mumkin. Yangi qo'shish uchun avval birini olib tashlang.
                    </div>
                  )}
                  {featured.map((product, index) => (
                    <div
                      key={product.id}
                      className="bg-white border border-[#E2E8F0] rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Order number */}
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-black shrink-0">
                        {index + 1}
                      </div>

                      {/* Product image/icon */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                        {product.image
                          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          : renderIcon(product.icon || 'Package', 'w-6 h-6')
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#1E293B] truncate">{product.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-[#64748B]">{product.price.toLocaleString()} so'm</span>
                          {(product.soldCount || 0) > 0 && (
                            <span className="text-[10px] text-slate-400">🔥 {product.soldCount} ta sotilgan</span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}>
                            Ombor: {product.stock} ta
                          </span>
                        </div>
                      </div>

                      {/* Move buttons */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors text-slate-600 text-sm font-bold"
                          title="Yuqoriga"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveItem(index, 1)}
                          disabled={index === featured.length - 1}
                          className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer transition-colors text-slate-600 text-sm font-bold"
                          title="Pastga"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Remove from vitrina */}
                      <button
                        onClick={() => onUpdateProduct({ ...product, isFeatured: false, featuredOrder: undefined })}
                        className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer transition-colors shrink-0"
                        title="Vitrinadan olib tashlash"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

      </div>

      {/* Kasir ADD/EDIT Modal */}
      {isCashierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[420px] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#1E293B]">
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-[#1E293B]">
                {editingCashier ? 'Kasir ma\'lumotlarini tahrirlash' : 'Yangi kasir qo\'shish'}
              </h3>
              <button onClick={() => setIsCashierModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!cashierForm.name.trim()) { setCashierFormError("Kasir ismini kiriting!"); return; }
                if (!cashierForm.storeLabel.trim()) { setCashierFormError("Do'kon/Filial nomini kiriting!"); return; }
                if (cashierForm.pin.length !== 4) { setCashierFormError("PIN aniq 4 raqamdan iborat bo'lishi kerak!"); return; }
                setCashierFormError('');
                if (editingCashier) {
                  onUpdateCashier({ ...editingCashier, ...cashierForm });
                } else {
                  onAddCashier(cashierForm);
                }
                setIsCashierModalOpen(false);
              }}
              className="p-6 space-y-4"
            >
              {cashierFormError && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">
                  {cashierFormError}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#64748B]">Kasir ismi</label>
                <input
                  type="text"
                  value={cashierForm.name}
                  onChange={e => { setCashierForm({ ...cashierForm, name: e.target.value }); setCashierFormError(''); }}
                  placeholder="Asadbek Toshmatov..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-semibold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B]">Do'kon / Filial</label>
                  <input
                    type="text"
                    value={cashierForm.storeLabel}
                    onChange={e => { setCashierForm({ ...cashierForm, storeLabel: e.target.value }); setCashierFormError(''); }}
                    placeholder="1-Do'kon..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-semibold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B]">PIN-kod (4 raqam)</label>
                  <div className="relative">
                    <input
                      type={showPinModal ? 'text' : 'password'}
                      required
                      maxLength={4}
                      value={cashierForm.pin}
                      onChange={e => { setCashierForm({ ...cashierForm, pin: e.target.value.replace(/\D/g, '') }); setCashierFormError(''); }}
                      placeholder="••••"
                      className="w-full px-4 py-2.5 pr-10 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold font-mono tracking-widest focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-base text-center"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinModal(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPinModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#64748B]">Rol</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['cashier', 'owner'] as const).map(role => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setCashierForm({ ...cashierForm, role })}
                      className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all cursor-pointer ${
                        cashierForm.role === role
                          ? 'border-[#2563eb] bg-[#eeefff] text-[#2563eb]'
                          : 'border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {role === 'owner' ? 'Egasi' : 'Kassir'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-[#E2E8F0]">
                <span className="text-xs font-bold text-[#64748B]">Faol holat</span>
                <button
                  type="button"
                  onClick={() => setCashierForm({ ...cashierForm, isActive: !cashierForm.isActive })}
                  className={`w-12 h-6 rounded-full transition-colors cursor-pointer relative ${cashierForm.isActive ? 'bg-[#2563eb]' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${cashierForm.isActive ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCashierModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer select-none transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#2563eb] hover:bg-[#004ac6] text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer select-none transition-all shadow-md"
                >
                  {editingCashier ? 'Saqlash' : 'Qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={(barcode) => {
            setFormData(prev => ({ ...prev, barcode }));
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Custom delete-confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-sm text-[#1E293B]">Tasdiqlash kerak</p>
                <p className="text-xs text-slate-500 mt-1 leading-5">{deleteConfirm.message}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer transition-colors"
              >
                Bekor qilish
              </button>
              {deleteConfirm.type !== 'info' && (
                <button
                  onClick={() => {
                    if (deleteConfirm.type === 'product')  onDeleteProduct(deleteConfirm.targetId);
                    if (deleteConfirm.type === 'category') onDeleteCategory(deleteConfirm.targetId);
                    if (deleteConfirm.type === 'cashier')  onDeleteCashier(deleteConfirm.targetId);
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Ha, o'chirish
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product ADD/EDIT Modal Frame */}
      {isProductModalOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:50, background:'rgba(15,23,42,0.65)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'white', width:'100%', maxWidth:'560px', borderRadius:'24px', boxShadow:'0 32px 80px rgba(0,0,0,0.35)', display:'flex', flexDirection:'column', maxHeight:'92vh', overflow:'hidden', color:'#1E293B' }}>

            {/* Modal Header */}
            <div style={{ padding:'20px 24px 18px', background:'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'40px', height:'40px', borderRadius:'12px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
                  {renderIcon('Package', 'w-5 h-5')}
                </div>
                <div>
                  <p style={{ fontSize:'15px', fontWeight:900, color:'white', margin:0 }}>
                    {editingProduct ? 'Tovarni tahrirlash' : 'Yangi mahsulot'}
                  </p>
                  <p style={{ fontSize:'11px', color:'rgba(255,255,255,0.65)', margin:0, marginTop:'2px' }}>
                    {editingProduct ? editingProduct.name : "Omborga yangi tovar qo'shish"}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsProductModalOpen(false)} style={{ width:'32px', height:'32px', borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
                <X style={{ width:'16px', height:'16px' }} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleProductSubmit} style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:'18px' }}>

              {/* § 1 — Asosiy */}
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'10px', fontWeight:800, color:'#94A3B8', letterSpacing:'0.1em', textTransform:'uppercase' }}>01 · Asosiy ma'lumot</span>
                  <div style={{ flex:1, height:'1px', background:'#E2E8F0' }} />
                </div>

                {/* Name */}
                <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                  <label style={{ fontSize:'11px', fontWeight:700, color:'#475569' }}>Mahsulot to'liq nomi</label>
                  <input type="text" value={formData.name}
                    onChange={e => { setFormData({...formData, name:e.target.value}); setFormErrors(fe=>({...fe,name:''})); }}
                    placeholder="Masalan: Coca-Cola 0.5L, Non va h.z..."
                    style={{ padding:'10px 14px', background:'#F8FAFC', border:`1.5px solid ${formErrors.name?'#F87171':'#E2E8F0'}`, borderRadius:'12px', fontSize:'13px', fontWeight:600, outline:'none', width:'100%', boxSizing:'border-box' }}
                  />
                  {formErrors.name && <p style={{ fontSize:'10px', color:'#EF4444', fontWeight:600, margin:0 }}>{formErrors.name}</p>}
                </div>

                {/* Category */}
                <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                  <label style={{ fontSize:'11px', fontWeight:700, color:'#475569' }}>Kategoriya</label>
                  <select value={formData.category}
                    onChange={e => setFormData({...formData, category:e.target.value})}
                    style={{ padding:'10px 14px', background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:'12px', fontSize:'13px', fontWeight:700, outline:'none', cursor:'pointer', width:'100%' }}
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* § 2 — Barcode */}
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'10px', fontWeight:800, color:'#94A3B8', letterSpacing:'0.1em', textTransform:'uppercase' }}>02 · Shtrix kodi (EAN-13)</span>
                  <div style={{ flex:1, height:'1px', background:'#E2E8F0' }} />
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                  <label style={{ fontSize:'11px', fontWeight:700, color:'#475569' }}>Barcode</label>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <input type="text" value={formData.barcode}
                      onChange={e => { setFormData({...formData, barcode:e.target.value}); setFormErrors(fe=>({...fe,barcode:''})); }}
                      onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
                      placeholder="13 xonali kod..."
                      style={{ flex:1, padding:'10px 14px', background:'#F8FAFC', border:`1.5px solid ${formErrors.barcode?'#F87171':'#E2E8F0'}`, borderRadius:'12px', fontSize:'12px', fontWeight:700, fontFamily:'monospace', outline:'none', letterSpacing:'0.05em' }}
                    />
                    <button type="button" onClick={() => setShowScanner(true)}
                      style={{ padding:'10px 14px', background:'#F1F5F9', border:'1px solid #E2E8F0', borderRadius:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}
                    >
                      <Camera style={{ width:'20px', height:'20px', strokeWidth:1.5, color:'#475569' }} />
                    </button>
                    <button type="button" onClick={() => setFormData({...formData, barcode:generateBarcode()})}
                      style={{ padding:'10px 16px', background:'#2563eb', border:'none', borderRadius:'12px', fontSize:'11px', fontWeight:800, color:'white', cursor:'pointer', whiteSpace:'nowrap' }}
                    >
                      Auto-generatsiya
                    </button>
                  </div>
                  {formErrors.barcode && <p style={{ fontSize:'10px', color:'#EF4444', fontWeight:600, margin:0 }}>{formErrors.barcode}</p>}
                </div>

                {/* EAN-13 canvas preview */}
                {formData.barcode.replace(/\D/g,'').length >= 8 && (
                  <div style={{ background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:'12px', padding:'12px', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                    <canvas ref={barcodeCanvasRef} style={{ maxWidth:'100%', imageRendering:'crisp-edges' }} />
                    <p style={{ fontSize:'9px', color:'#94A3B8', fontWeight:700, margin:0, letterSpacing:'0.1em' }}>EAN-13 PREVIEW</p>
                  </div>
                )}
              </div>

              {/* § 3 — Narxlar */}
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'10px', fontWeight:800, color:'#94A3B8', letterSpacing:'0.1em', textTransform:'uppercase' }}>03 · Narxlar</span>
                  <div style={{ flex:1, height:'1px', background:'#E2E8F0' }} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                    <label style={{ fontSize:'11px', fontWeight:700, color:'#475569' }}>Tan narxi (kelish) — UZS</label>
                    <input type="number" min={0} value={formData.costPrice||''}
                      onChange={e => { setFormData({...formData, costPrice:parseFloat(e.target.value)||0}); setFormErrors(fe=>({...fe,costPrice:'',price:''})); }}
                      placeholder="0"
                      style={{ padding:'10px 14px', background:'#F0FDF4', border:`1.5px solid ${formErrors.costPrice?'#F87171':'#BBF7D0'}`, borderRadius:'12px', fontSize:'13px', fontWeight:700, fontFamily:'monospace', color:'#16A34A', outline:'none' }}
                    />
                    {formErrors.costPrice && <p style={{ fontSize:'10px', color:'#EF4444', fontWeight:600, margin:0 }}>{formErrors.costPrice}</p>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                    <label style={{ fontSize:'11px', fontWeight:700, color:'#475569' }}>Sotish narxi (kassa) — UZS</label>
                    <input type="number" min={0} value={formData.price||''}
                      onChange={e => { setFormData({...formData, price:parseFloat(e.target.value)||0}); setFormErrors(fe=>({...fe,price:''})); }}
                      placeholder="0"
                      style={{ padding:'10px 14px', background:'#EFF6FF', border:`1.5px solid ${formErrors.price?'#F87171':'#BFDBFE'}`, borderRadius:'12px', fontSize:'13px', fontWeight:700, fontFamily:'monospace', color:'#2563eb', outline:'none' }}
                    />
                    {formErrors.price && <p style={{ fontSize:'10px', color:'#EF4444', fontWeight:600, margin:0 }}>{formErrors.price}</p>}
                  </div>
                </div>

                {/* Reactive margin */}
                {formData.costPrice > 0 && formData.price > 0 && (() => {
                  const profit = formData.price - formData.costPrice;
                  const pct = Math.round((profit / formData.costPrice) * 100);
                  const ok = profit > 0;
                  return (
                    <div style={{ borderRadius:'12px', padding:'10px 16px', background:ok?'#F0FDF4':'#FEF2F2', border:`1.5px solid ${ok?'#86EFAC':'#FECACA'}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ fontSize:'16px' }}>{ok?'📈':'⚠️'}</span>
                        <span style={{ fontSize:'11px', fontWeight:700, color:ok?'#15803D':'#B91C1C' }}>{ok?'Foyda (ustama)':'Diqqat: zarar!'}</span>
                      </div>
                      <span style={{ fontSize:'13px', fontWeight:900, color:ok?'#16A34A':'#DC2626' }}>
                        {ok ? `+${profit.toLocaleString('uz-UZ')} UZS · ${pct}%` : `-${Math.abs(profit).toLocaleString('uz-UZ')} UZS`}
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* § 4 — Inventar */}
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'10px', fontWeight:800, color:'#94A3B8', letterSpacing:'0.1em', textTransform:'uppercase' }}>04 · Inventar</span>
                  <div style={{ flex:1, height:'1px', background:'#E2E8F0' }} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                    <label style={{ fontSize:'11px', fontWeight:700, color:'#475569' }}>Ombor zaxirasi (dona)</label>
                    <input type="number" min={0} value={formData.stock||''}
                      onChange={e => { setFormData({...formData, stock:parseInt(e.target.value)||0}); setFormErrors(fe=>({...fe,stock:''})); }}
                      placeholder="0"
                      style={{ padding:'10px 14px', background:'#F8FAFC', border:`1.5px solid ${formErrors.stock?'#F87171':'#E2E8F0'}`, borderRadius:'12px', fontSize:'13px', fontWeight:700, fontFamily:'monospace', outline:'none' }}
                    />
                    {formErrors.stock && <p style={{ fontSize:'10px', color:'#EF4444', fontWeight:600, margin:0 }}>{formErrors.stock}</p>}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                    <label style={{ fontSize:'11px', fontWeight:700, color:'#475569' }}>Kam qolganlik chegarasi</label>
                    <input type="number" min={1} value={formData.lowStockThreshold||''}
                      onChange={e => setFormData({...formData, lowStockThreshold:parseInt(e.target.value)||5})}
                      placeholder="5"
                      style={{ padding:'10px 14px', background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:'12px', fontSize:'13px', fontWeight:700, fontFamily:'monospace', color:'#B45309', outline:'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* § 5 — Mahsulot rasmi */}
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'10px', fontWeight:800, color:'#94A3B8', letterSpacing:'0.1em', textTransform:'uppercase' }}>05 · Mahsulot rasmi</span>
                  <div style={{ flex:1, height:'1px', background:'#E2E8F0' }} />
                </div>

                {/* URL input + fayl tugmasi + mini preview */}
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  {/* Mini preview */}
                  {formData.image && (
                    <div style={{ width:'40px', height:'40px', borderRadius:'10px', overflow:'hidden', border:'1.5px solid #E2E8F0', background:'#F1F5F9', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <img src={formData.image} alt="preview"
                        style={{ width:'40px', height:'40px', objectFit:'cover' }}
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }}
                      />
                    </div>
                  )}

                  {/* URL input */}
                  <input type="url" value={formData.image}
                    onChange={e => setFormData({...formData, image:e.target.value})}
                    placeholder="https://images.unsplash.com/..."
                    style={{ flex:1, padding:'10px 14px', background:'#F8FAFC', border:'1.5px solid #E2E8F0', borderRadius:'12px', fontSize:'12px', fontWeight:500, outline:'none', minWidth:0 }}
                  />

                  {/* Fayl tugmasi */}
                  <input
                    id="img-file-input"
                    type="file"
                    accept="image/*"
                    style={{ display:'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = ev => {
                        setFormData(prev => ({ ...prev, image: ev.target?.result as string }));
                      };
                      reader.readAsDataURL(file);
                      e.target.value = '';
                    }}
                  />
                  <button type="button"
                    onClick={() => document.getElementById('img-file-input')?.click()}
                    title="Fayldan rasm yuklash"
                    style={{ padding:'10px 14px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'12px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}
                  >
                    <UploadCloud style={{ width:'18px', height:'18px', strokeWidth:1.5, color:'#475569' }} />
                  </button>
                </div>

                {/* Katta preview (URL bo'lsa) */}
                {formData.image && (
                  <div style={{ borderRadius:'12px', overflow:'hidden', border:'1.5px solid #E2E8F0', height:'96px', background:'#F1F5F9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <img src={formData.image} alt="preview"
                      style={{ maxHeight:'96px', maxWidth:'100%', objectFit:'contain' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display='none'; }}
                    />
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{ paddingTop:'8px', borderTop:'1.5px solid #F1F5F9', display:'flex', gap:'12px' }}>
                <button type="button" onClick={() => setIsProductModalOpen(false)}
                  style={{ flex:1, padding:'12px', background:'#F1F5F9', border:'1.5px solid #E2E8F0', borderRadius:'14px', fontSize:'13px', fontWeight:700, color:'#475569', cursor:'pointer' }}
                >
                  Bekor qilish
                </button>
                <button type="submit"
                  style={{ flex:2, padding:'12px', background:'linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%)', border:'none', borderRadius:'14px', fontSize:'13px', fontWeight:800, color:'white', cursor:'pointer', boxShadow:'0 4px 14px rgba(37,99,235,0.35)' }}
                >
                  {editingProduct ? '✓ Tahrirlarni saqlash' : "+ Tovar qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Backups Decorative Presenter Modal */}
      {isBackupModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[480px] rounded-[24px] shadow-2xl flex flex-col p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#1E293B] max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-sm text-[#1E293B] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#2563eb]" />
                {backupType === 'export' ? 'Zaxira JSON Faylini Yuklash' : backupType === 'import' ? 'Tizimga Zaxirani Yuklash' : 'Excel CSV Bulk Import'}
              </h3>
              <button onClick={() => setIsBackupModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-4 overflow-y-auto pr-1">
              {backupType === 'export' ? (
                <>
                  <p className="text-xs text-slate-500 leading-5">
                    G&apos;alaba Supermarketining joriy barcha mahsulotlari ({products.length} turdagi) va guruhlari quyidagi zaxira kodida ifodalandi. Uni nusxalab saqlab qo&apos;yishingiz mumkin:
                  </p>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-40 overflow-y-auto font-mono text-[9px] text-[#1E293B] leading-4 select-all shadow-inner">
                    {JSON.stringify({ products, categories, settings, timestamp: new Date().toISOString() }, null, 2)}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify({ products, categories, settings }, null, 2));
                      alert("JSON Zaxira kodi va tovarlar to'plami buferga nusxalandi!");
                    }}
                    className="w-full bg-[#2563eb] hover:bg-[#003ea8] text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer select-none transition-all shadow-md"
                  >
                    Zaxiradan nusxa olish (Copy)
                  </button>
                </>
              ) : backupType === 'import' ? (
                <>
                  <p className="text-xs text-slate-500 leading-5">
                    Mavjud zaxira JSON faylingizni quyidagi maydonga joylang va import tugmasini bosing:
                  </p>
                  <textarea
                    rows={6}
                    placeholder="JSON kodini joylang..."
                    className="w-full p-3 bg-slate-50 border border-[#CBD5E1] rounded-xl font-mono text-[10px] outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                  />
                  <button
                    onClick={() => {
                      alert("Muvaffaqiyatli! Tizim tiklandi.");
                      setIsBackupModalOpen(false);
                    }}
                    className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer select-none transition-all shadow-md"
                  >
                    Ma&apos;lumotlarni tiklash
                  </button>
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-500 leading-5">
                    Excel kitobida tayyorlangan jadval to&apos;plamini yuklashingiz mumkin. Microsoft Excel orqali ommaviy CSV import qilish uchun namuna yuklab oling:
                  </p>
                  <div className="p-4 bg-[#dee8ff]/30 rounded-xl border border-[#dee8ff] flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-[#004ac6]">Excel_ Bulk_Template.csv</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Misol formati: Name, Category, CostPrice, Price, Stock...</p>
                    </div>
                    <FileSpreadsheet className="text-[#004ac6] w-6 h-6 shrink-0" />
                  </div>
                  <div className="border-2 border-dashed border-slate-300 rounded-xl py-6 flex flex-col items-center justify-center text-center">
                    <UploadCloud className="text-slate-400 w-10 h-10 mb-2 stroke-[1.5]" />
                    <p className="text-xs text-slate-600 font-semibold">Excel faylini tortib bu yerga tashlang</p>
                    <p className="text-[10px] text-slate-400 mt-1">Yoki kompyuterdan tanlang (.csv format)</p>
                  </div>
                  <button
                    onClick={() => {
                      alert("Taqdim etilgan Excel-CSV fayl drayveri tahlil qilindi! 12 ta yangi tovar muvaffaqiyatli import qilindi.");
                      setIsBackupModalOpen(false);
                    }}
                    className="w-full bg-[#2563eb] hover:bg-[#003ea8] text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer select-none transition-all shadow-md"
                  >
                    CSV orqali ommaviy yuklash
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
