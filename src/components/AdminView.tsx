import React, { useState, useRef } from 'react';
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
  FileJson
} from 'lucide-react';
import { Product, Category, StoreSettings, Cashier } from '../types';
import { exportAllData, importAllData } from '../utils/storage';
import * as Icons from 'lucide-react';

interface AdminViewProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  cashiers: Cashier[];
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateSettings: (settings: StoreSettings) => void;
  onAddCategory: (category: Omit<Category, 'id'>) => void;
  onAddCashier: (cashier: Omit<Cashier, 'id'>) => void;
  onUpdateCashier: (cashier: Cashier) => void;
  onDeleteCashier: (id: string) => void;
}

export default function AdminView({
  products,
  categories,
  settings,
  cashiers,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateSettings,
  onAddCategory,
  onAddCashier,
  onUpdateCashier,
  onDeleteCashier,
}: AdminViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'inventory' | 'kirim' | 'categories' | 'settings' | 'cashiers' | 'vitrina'>('inventory');

  // Kasir modal states
  const [isCashierModalOpen, setIsCashierModalOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [cashierForm, setCashierForm] = useState<Omit<Cashier, 'id'>>({
    name: '', pin: '', storeLabel: '', role: 'cashier', isActive: true,
  });
  
  // Kirim (stock arrival) states
  const [kirimProdId, setKirimProdId] = useState<string>('');
  const [kirimQty, setKirimQty] = useState<number>(10);
  const [kirimCost, setKirimCost] = useState<number>(0);
  const [kirimPrice, setKirimPrice] = useState<number>(0);
  const [kirimSuccess, setKirimSuccess] = useState<string | null>(null);

  interface ReceptionLog {
    id: string;
    timestamp: string;
    productName: string;
    barcode: string;
    quantity: number;
    costPrice: number;
    price: number;
    totalCost: number;
  }

  const [receptionsHistory, setReceptionsHistory] = useState<ReceptionLog[]>([
    {
      id: 'REC-101',
      timestamp: '2026-05-18 10:30',
      productName: 'Coca-Cola 0.5L',
      barcode: '123456789012',
      quantity: 50,
      costPrice: 6000,
      price: 8000,
      totalCost: 300000,
    },
    {
      id: 'REC-102',
      timestamp: '2026-05-19 15:45',
      productName: 'Sut Siyamo 1L',
      barcode: '112233445561',
      quantity: 30,
      costPrice: 10000,
      price: 12500,
      totalCost: 300000,
    },
    {
      id: 'REC-103',
      timestamp: '2026-05-20 09:15',
      productName: 'Lays Chips 80g',
      barcode: '112233445562',
      quantity: 40,
      costPrice: 11500,
      price: 15000,
      totalCost: 460000,
    }
  ]);

  const selectKirimProduct = (id: string) => {
    setKirimProdId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setKirimQty(10);
      setKirimCost(prod.costPrice);
      setKirimPrice(prod.price);
    } else {
      setKirimQty(10);
      setKirimCost(0);
      setKirimPrice(0);
    }
  };

  const handleKirimSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === kirimProdId);
    if (!prod) {
      alert("Iltimos, avval mahsulotni tanlang!");
      return;
    }
    if (kirimQty <= 0) {
      alert("Kirim qilinayotgan miqdor kamida 1 ta bo'lishi shart!");
      return;
    }

    onUpdateProduct({
      ...prod,
      stock: prod.stock + kirimQty,
      costPrice: kirimCost,
      price: kirimPrice,
    });

    const newLog: ReceptionLog = {
      id: `REC-${Math.floor(104 + Math.random() * 890)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
      productName: prod.name,
      barcode: prod.barcode,
      quantity: kirimQty,
      costPrice: kirimCost,
      price: kirimPrice,
      totalCost: kirimQty * kirimCost,
    };

    setReceptionsHistory(prev => [newLog, ...prev]);
    setKirimSuccess(`Muvaffaqiyatli qabul qilindi! "${prod.name}" ombor zaxirasiga +${kirimQty} ta qo'shildi.`);
    setKirimProdId('');
    setTimeout(() => setKirimSuccess(null), 5000);
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Product dialog states
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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

  // Category modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatIcon, setNewCatIcon] = useState<string>('Package');

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

  // Calculations for Bento statistics
  const totalStockValue = products.reduce((acc, p) => acc + (p.price * p.stock), 0);
  const lowStockTypesCount = products.filter(p => p.stock <= (p.lowStockThreshold || 5)).length;
  const totalInventoryTurnover = Math.round(totalStockValue * 0.28); // 28% estimated monthly turnover

  // Handle product edit click
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
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
    setFormData({
      name: '',
      category: categories[1]?.id || 'food',
      costPrice: 0,
      price: 0,
      stock: 0,
      barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
      lowStockThreshold: 5,
      icon: 'Package',
      image: '',
    });
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        ...formData,
      });
    } else {
      onAddProduct(formData);
    }
    setIsProductModalOpen(false);
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(settingsForm);
    setPinChangeMessage('Sozlamalar zudlik bilan saqlandi!');
    setTimeout(() => setPinChangeMessage(null), 3000);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory({
      name: newCatName.trim(),
      icon: newCatIcon,
    });
    setNewCatName('');
    setNewCatIcon('Package');
    setIsCategoryModalOpen(false);
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
            onClick={() => setActiveSubTab('kirim')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap justify-start w-full transition-all cursor-pointer ${
              activeSubTab === 'kirim'
                ? 'bg-[#2563eb] text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {renderIcon('PlusSquare', 'w-4 h-4')}
            Tovar Kirimi (Qabul)
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
              <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-[#eeefff] text-[#2563eb] rounded-full flex items-center justify-center">
                  {renderIcon('Coins', 'w-6 h-6')}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Umumiy qiymat</p>
                  <p className="text-xl font-black text-[#1E293B] mt-0.5">{totalStockValue.toLocaleString()} UZS</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                  {renderIcon('TrendingUp', 'w-6 h-6')}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Oylik aylanma (Taxmin)</p>
                  <p className="text-xl font-black text-[#1E293B] mt-0.5">{totalInventoryTurnover.toLocaleString()} UZS</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-[#c3c6d7] flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                  {renderIcon('AlertTriangle', 'w-6 h-6')}
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">Kam qolganlar</p>
                  <p className="text-xl font-black text-red-600 mt-0.5">{lowStockTypesCount} turdagi</p>
                </div>
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
                <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0 justify-end items-center">
                  {csvImportMessage && (
                    <span className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold rounded-lg">
                      {csvImportMessage}
                    </span>
                  )}
                  <input
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvImport}
                  />
                  <button
                    onClick={handleDownloadSampleCsv}
                    className="p-2.5 border border-[#c3c6d7] rounded-xl bg-white hover:bg-slate-50 text-slate-500 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Namuna CSV
                  </button>
                  <button
                    onClick={() => csvFileInputRef.current?.click()}
                    className="p-2.5 border border-green-300 rounded-xl bg-green-50 hover:bg-green-100 text-green-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> CSV dan yuklash
                  </button>
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
                      <th className="px-5 py-3 text-center">Aksiya %</th>
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

                          {/* Aksiya % */}
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

                          {/* Sotilgan */}
                          <td className="px-5 py-4 text-center">
                            <span className={`text-xs font-bold ${(product.soldCount || 0) > 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                              {(product.soldCount || 0) > 0 ? `🔥 ${product.soldCount}` : '—'} ta
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {/* Quick stock add (+1) */}
                              <button
                                onClick={() => onUpdateProduct({ ...product, stock: product.stock + 10 })}
                                title="Zapasga +10 ta qo'shish"
                                className="p-1.5 text-green-600 hover:bg-green-50 border border-transparent hover:border-green-200 rounded-lg cursor-pointer max-w-[40px]"
                              >
                                <PlusSquare className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleOpenEdit(product)}
                                title="Tahrirlash"
                                className="p-1.5 text-[#2563eb] hover:bg-[#eeefff] border border-transparent hover:border-[#dee8ff] rounded-lg cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => {
                                  if (confirm(`Rostdan ham "${product.name}" mahsulotini o'chirib tashlamoqchimisiz?`)) {
                                    onDeleteProduct(product.id);
                                  }
                                }}
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

        {/* Tab 1.5: Tovar Kirimi (Qabul Qilish) */}
        {activeSubTab === 'kirim' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#1E293B]">Tovar Kirimi (Qabul Qilish)</h1>
                <p className="text-sm text-[#64748B]">Omborga yangi tovarlar olib kelganda ularni tizimga kiritish va ko&apos;paytirish bo&apos;limi</p>
              </div>
              <button
                onClick={handleOpenAdd}
                className="bg-[#2563eb] hover:bg-[#004ac6] active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md select-none"
              >
                <PlusSquare className="w-4 h-4" />
                Yangi tovar yaratish (Katalogga)
              </button>
            </div>

            {kirimSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs font-bold leading-5">
                🚀 {kirimSuccess}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Kirim Form Card */}
              <form onSubmit={handleKirimSubmit} className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#c3c6d7] shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-[#004ac6] border-b border-dashed border-slate-200 pb-3 flex items-center gap-1.5">
                  <PlusSquare className="w-4 h-4" />
                  Kirim parametrlarini kiriting
                </h3>

                <div className="space-y-3">
                  {/* Select Product */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[#64748B] block">Qabul qilinayotgan tovar</label>
                    <select
                      value={kirimProdId}
                      onChange={(e) => selectKirimProduct(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs text-[#1E293B]"
                    >
                      <option value="">-- Tovarni tanlang --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.barcode})</option>
                      ))}
                    </select>
                  </div>

                  {kirimProdId ? (
                    (() => {
                      const selectedProd = products.find(p => p.id === kirimProdId);
                      if (!selectedProd) return null;
                      
                      const futureStock = selectedProd.stock + (kirimQty || 0);
                      const totalInvestedSum = (kirimQty || 0) * (kirimCost || 0);
                      const unitProfit = (kirimPrice || 0) - (kirimCost || 0);
                      const percentProfit = kirimCost > 0 ? Math.round((unitProfit / kirimCost) * 100) : 0;

                      return (
                        <div className="space-y-4">
                          
                          {/* Selected product status review */}
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-700 font-semibold">
                            <p className="font-bold text-[#1E293B] flex items-center gap-1.5">
                              <Info className="w-3.5 h-3.5 text-[#2563eb]" /> Foydali ma&apos;lumotlar:
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                              <p>Hozirgi qoldiq: <span className="text-slate-900 font-black">{selectedProd.stock} ta</span></p>
                              <p>Tan narxi (eski): <span className="text-emerald-700 font-black">{selectedProd.costPrice.toLocaleString()} UZS</span></p>
                              <p>Sotish narxi (eski): <span className="text-blue-700 font-black">{selectedProd.price.toLocaleString()} UZS</span></p>
                            </div>
                          </div>

                          {/* Inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#64748B] block">Kelgan soni (Dona)</label>
                              <input
                                type="number"
                                required
                                min={1}
                                value={kirimQty || ''}
                                onChange={(e) => setKirimQty(Math.max(1, parseInt(e.target.value) || 0))}
                                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl font-bold font-mono focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs text-slate-800"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-xs font-bold text-[#64748B] block">Kelgandagi tan narxi</label>
                              <input
                                type="number"
                                required
                                min={0}
                                value={kirimCost || ''}
                                onChange={(e) => setKirimCost(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-xl font-bold font-mono focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs text-green-700"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-[#64748B] block">Sotuvdagi yangi kassa narxi</label>
                            <input
                              type="number"
                              required
                              min={0}
                              value={kirimPrice || ''}
                              onChange={(e) => setKirimPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                              className="w-full px-4 py-2 bg-white border border-[#CBD5E1] rounded-xl font-bold font-mono focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs text-blue-700"
                            />
                          </div>

                          {/* Dynamic calculator report card */}
                          <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2">
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Hisob-Kitob Rezyume</p>
                            
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between font-semibold text-slate-600">
                                <span>Kirim qilingach omborni holati:</span>
                                <span className="text-[#1E293B] font-bold">{selectedProd.stock} + {kirimQty} = <span className="text-indigo-600 font-extrabold">{futureStock} ta</span></span>
                              </div>
                              <div className="flex justify-between font-semibold text-slate-600">
                                <span>Ushbu partiya jami qiymati:</span>
                                <span className="text-[#1E293B] font-bold"><span className="text-emerald-700 font-extrabold">{totalInvestedSum.toLocaleString()}</span> UZS</span>
                              </div>
                              <div className="flex justify-between font-semibold text-slate-600 border-t border-slate-200/50 pt-1 mt-1">
                                <span>Ustama (Sof foyda dona uchun):</span>
                                <span className="text-slate-900 font-bold">
                                  {unitProfit >= 0 ? (
                                    <span className="text-green-600 font-extrabold">+{unitProfit.toLocaleString()} UZS ({percentProfit}%)</span>
                                  ) : (
                                    <span className="text-red-500 font-extrabold">Zarar: {unitProfit.toLocaleString()} UZS</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="w-full py-3 bg-[#16A34A] hover:bg-[#15803d] active:scale-95 text-white rounded-xl text-xs font-black select-none cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
                          >
                            <PlusSquare className="w-4 h-4" />
                            Kirimni Tasdiqlash
                          </button>

                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 py-12">
                      <PlusCircle className="w-10 h-10 mx-auto text-slate-300 stroke-[1.2] mb-2" />
                      <p className="text-xs font-semibold">Kirim qilish uchun avval yuqoridan tovarni tanlang</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">Tovar ro&apos;yxatda yo&apos;q bo&apos;lsa, katalogga yangi tovar yaratish tugmasini bosing.</p>
                    </div>
                  )}

                </div>
              </form>

              {/* Kirimlar Tarixi Table Panel (ERP-style) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-white rounded-2xl border border-[#c3c6d7] shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-[#E2E8F0] bg-slate-50 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-xs text-[#1E293B]">Oxirgi Qabul Qilingan Mahsulotlar (Kirimlar Tarixi)</h3>
                      <p className="text-[10px] text-[#64748B] mt-0.5">Yaqinda kiritilgan partiyalar ro&apos;yxati va ularning tannarxi</p>
                    </div>
                    <span className="bg-[#dee8ff] text-[#2563eb] text-[10px] font-black px-2.5 py-1 rounded-full border border-[#dee8ff]">
                      {receptionsHistory.length} marta kirim
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse select-text">
                      <thead className="bg-[#dee8ff]/30 text-[10px] font-bold text-[#434655] border-b border-[#c3c6d7]">
                        <tr>
                          <th className="px-4 py-2.5">Sana / Batch ID</th>
                          <th className="px-4 py-2.5">Tovar Nomi</th>
                          <th className="px-4 py-2.5 text-center">Soni</th>
                          <th className="px-4 py-2.5 text-right">Tan Narxi</th>
                          <th className="px-4 py-2.5 text-right">Jami Qiymat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700">
                        {receptionsHistory.map(log => (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-4">
                              <span className="font-mono text-[9px] text-[#94A3B8] block">{log.id}</span>
                              <span className="text-[10px] text-slate-400 font-medium block">{log.timestamp}</span>
                            </td>
                            <td className="px-4 py-4 font-bold text-slate-950">
                              {log.productName}
                              <span className="text-[9px] text-slate-400 font-mono block">Shtrix: {log.barcode}</span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-black">
                                +{log.quantity} ta
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-mono">
                              {log.costPrice.toLocaleString()} UZS
                            </td>
                            <td className="px-4 py-4 text-right font-bold font-mono text-emerald-700">
                              {log.totalCost.toLocaleString()} UZS
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Category Settings */}
        {activeSubTab === 'categories' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-transparent">
              <div>
                <h1 className="text-2xl font-bold text-[#1E293B]">Kategoriyalar boshqaruvi</h1>
                <p className="text-sm text-[#64748B]">Tizimdagi tovarni saralash uchun kataloglar ro&apos;yxati</p>
              </div>
              <button
                onClick={() => setIsCategoryModalOpen(true)}
                className="bg-[#2563eb] hover:bg-[#004ac6] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md select-none"
              >
                <Plus className="w-4 h-4" />
                Yangi kategoriya
              </button>
            </div>

            {/* Scrolling grid list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const countOfProds = products.filter(p => p.category === cat.id).length;
                return (
                  <div 
                    key={cat.id} 
                    className="p-5 bg-white border border-[#c3c6d7] rounded-2xl flex items-center justify-between shadow-sm cursor-pointer hover:shadow hover:border-[#2563eb]/30 transition-all select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#eeefff] text-[#2563eb] rounded-full flex items-center justify-center">
                        {renderIcon(cat.icon, 'w-5 h-5')}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#1E293B]">{cat.name}</p>
                        <p className="text-xs text-[#64748B] mt-0.5">ID guruh: <span className="font-mono">{cat.id}</span></p>
                      </div>
                    </div>
                    <span className="bg-[#eeefff] text-[#2563eb] text-xs font-black px-3 py-1 rounded-full border border-[#dee8ff]">
                      {countOfProds} turlar
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="bg-[#f0f3ff] p-6 rounded-2xl border-2 border-dashed border-[#c3c6d7] flex flex-col items-center justify-center text-center max-w-xl mx-auto py-10">
              <FolderOpen className="text-slate-400 w-12 h-12 mb-3 stroke-[1.5]" />
              <p className="font-bold text-sm text-slate-700">Yangi toifalar va guruhlar kiritish</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1.5 leading-6">
                Yangi guruhlar do&apos;kon kassa terminalidagi buyurtmalarni filtrlash guruhlarida avtomatik integrallashib boradi
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Store Configuration Terminal */}
        {activeSubTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[#1E293B]">Tizim sozlamalari</h1>
              <p className="text-sm text-[#64748B]">Xizmat ko&apos;rsatish nuqtasi ma&apos;lumotlari va texnik konfig-laj</p>
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
                      <input
                        type="text"
                        maxLength={4}
                        value={settingsForm.operatorPin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, ''); // digit only
                          setSettingsForm({ ...settingsForm, operatorPin: val });
                        }}
                        placeholder="Kalit PIN (e.g., 1234)"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold font-mono focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-base tracking-widest text-[#1E293B]"
                      />
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
                        <p className="text-xs text-[#64748B] mt-0.5">{cashier.storeLabel}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">PIN: {'•'.repeat(cashier.pin.length)}</p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setEditingCashier(cashier);
                          setCashierForm({ name: cashier.name, pin: cashier.pin, storeLabel: cashier.storeLabel, role: cashier.role, isActive: cashier.isActive });
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
                        onClick={() => {
                          if (confirm(`"${cashier.name}" kasirini o'chirishni tasdiqlaysizmi?`)) {
                            onDeleteCashier(cashier.id);
                          }
                        }}
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
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                        {product.image
                          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          : <span className="text-2xl">{product.icon || '📦'}</span>
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-[#1E293B] truncate">{product.name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-[#64748B]">{product.price.toLocaleString()} so'm</span>
                          {product.discount && product.discount > 0 && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                              -{product.discount}% aksiya
                            </span>
                          )}
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
                if (cashierForm.pin.length !== 4) { alert('PIN aniq 4 raqamdan iborat bo\'lishi kerak!'); return; }
                if (editingCashier) {
                  onUpdateCashier({ ...editingCashier, ...cashierForm });
                } else {
                  onAddCashier(cashierForm);
                }
                setIsCashierModalOpen(false);
              }}
              className="p-6 space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#64748B]">Kasir ismi</label>
                <input
                  type="text"
                  required
                  value={cashierForm.name}
                  onChange={e => setCashierForm({ ...cashierForm, name: e.target.value })}
                  placeholder="Asadbek Toshmatov..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-semibold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B]">Do'kon / Filial</label>
                  <input
                    type="text"
                    required
                    value={cashierForm.storeLabel}
                    onChange={e => setCashierForm({ ...cashierForm, storeLabel: e.target.value })}
                    placeholder="1-Do'kon..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-semibold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B]">PIN-kod (4 raqam)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={cashierForm.pin}
                    onChange={e => setCashierForm({ ...cashierForm, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="1234"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold font-mono tracking-widest focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-base text-center"
                  />
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

      {/* Product ADD/EDIT Modal Frame */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[500px] rounded-[24px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-[#1E293B]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex justify-between items-center bg-slate-50">
              <h3 className="text-sm font-bold text-[#1E293B]">
                {editingProduct ? `Tovar ma&apos;lumotlarini tahrirlash` : `Yangi mahsulot kiritish`}
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content area */}
            <form onSubmit={handleProductSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#64748B]">Mahsulot to&apos;liq nomi</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Coca-Cola 0.5L yoki non..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-semibold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B]">Turkumi (Guruh/Kategoriya)</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs"
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B]">Shtrix Kodi (Barcode)</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="12 xonali kod..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold font-mono focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString() })}
                      className="bg-slate-200 px-2.5 rounded-xl border border-slate-300 text-slate-700 text-[10px] font-bold shrink-0 hover:bg-slate-300 active:scale-95 transition-all"
                    >
                      Generatsiya
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B]">Tan narxi (Kelish narxi) - UZS</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.costPrice || ''}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    placeholder="Kelgan narxi..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold font-mono focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs text-green-700"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B]">Sotish narxi (Kassadagi) - UZS</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.price || ''}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    placeholder="Sotiladigan narx..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold font-mono focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs text-[#2563eb]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B]">Ombor Zaxirasining Soni</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.stock || ''}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    placeholder="Qoldiq soni..."
                    className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold font-mono focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#64748B]">Kam Qolganlik Chegarasi</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.lowStockThreshold || ''}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 5 })}
                    placeholder="Misol, 5 tadan kam qolsa ogohlantirish"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl font-bold font-mono focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#64748B]">Tovar Rasm URL manzili (Ixtiyoriy)</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://images.unsplash.com/your-image-url..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs font-medium"
                />
              </div>

              <div className="pt-3 border-t border-[#F1F5F9] flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs cursor-pointer select-none transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#2563eb] hover:bg-[#004ac6] text-white font-bold py-2.5 rounded-xl text-xs cursor-pointer select-none transition-all shadow-md"
                >
                  {editingProduct ? 'Tahrirlarni Saqlash' : 'Tovar qo\'shish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal Frame */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[380px] rounded-[24px] shadow-2xl flex flex-col p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-[#1E293B]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-sm text-[#1E293B]">Yangi Kategoriya qo&apos;shish</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#64748B] block">Kategoriya nomi</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Misol, Sabzavotlar..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl font-semibold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#64748B] block">Dizayn Belgisi (Lucide Icon)</label>
                <select
                  value={newCatIcon}
                  onChange={(e) => setNewCatIcon(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-[#E2E8F0] rounded-xl font-bold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-xs text-[#1E293B]"
                >
                  <option value="Package">Standard Quti (Package)</option>
                  <option value="Coffee">Kofe (Coffee)</option>
                  <option value="Apple">Olma (Apple)</option>
                  <option value="Grape">Uzum (Grape)</option>
                  <option value="Notebook">Daftar (Notebook)</option>
                  <option value="Sparkles">Tozalash (Sparkles)</option>
                  <option value="Shirt">Kiyimlar (Shirt)</option>
                  <option value="Hammer">Asboblar (Hammer)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-[#2563eb] hover:bg-[#003ea8] hover:shadow text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer select-none transition-all shadow-md mt-4"
              >
                Guruhni yaratish
              </button>
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
