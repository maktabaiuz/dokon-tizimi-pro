import React, { useState } from 'react';
import { Printer, Scan, Sliders, ChevronRight, Eye, Info, X } from 'lucide-react';
import { Product } from '../types';

interface BarkodViewProps {
  products: Product[];
}

export default function BarkodView({ products }: BarkodViewProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [printCount, setPrintCount] = useState<number>(12);

  // Find exact product details
  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Dummy barcode lines layout configuration
  // Varying line widths for high fidelity presentation
  const barcodePattern = [
    { w: '3px', m: '1px' }, { w: '1px', m: '2px' }, { w: '4px', m: '1px' },
    { w: '2px', m: '3px' }, { w: '1px', m: '1px' }, { w: '3px', m: '2px' },
    { w: '4px', m: '1px' }, { w: '1px', m: '2px' }, { w: '2px', m: '1px' },
    { w: '3px', m: '3px' }, { w: '2px', m: '1px' }, { w: '1px', m: '2px' },
    { w: '4px', m: '1px' }, { w: '3px', m: '2px' }, { w: '1px', m: '1px' },
    { w: '2px', m: '3px' }, { w: '4px', m: '1px' }, { w: '1px', m: '2px' }
  ];

  const handlePrint = () => {
    // Standard print action
    const confirmPrint = confirm(`${printCount} ta "${selectedProduct.name}" barkod yorliqlarini chop etish drayveriga jo'natishni xohlaysizmi?`);
    if (confirmPrint) {
      alert("Chop etish ishi muvaffaqiyatli jo'natildi! Printer lentasini sozlashingiz mumkin.");
    }
  };

  return (
    <div className="flex-1 p-6 flex flex-col lg:flex-row gap-6 bg-[#F9F9FF] overflow-y-auto custom-scrollbar select-none">
      
      {/* Sidebar: Selection and Controllers Pane (33%) */}
      <section className="w-full lg:w-[35%] space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-[#c3c6d7] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2 border-b border-dashed border-slate-200 pb-3">
            <Sliders className="text-[#2563eb] w-5 h-5" />
            Mahsulotni tanlang
          </h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#64748B] block">Mahsulot nomi</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-white border border-[#CBD5E1] rounded-xl p-3 text-xs font-semibold focus:ring-2 focus:ring-[#2563eb]/20 outline-none text-[#1E293B]"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#64748B] block">Narxi (Kassadagi UZS)</label>
              <input
                disabled
                type="text"
                value={`${selectedProduct?.price.toLocaleString()} UZS`}
                className="w-full bg-slate-50 border border-[#CBD5E1] rounded-xl p-3 text-xs font-bold font-mono text-[#2563eb] outline-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="text-xs font-bold text-[#64748B] block">Chop etish soni (Donasi)</label>
                <span className="text-xl font-black text-[#2563eb]" id="printCountLabel">
                  {printCount} <span className="text-xs font-semibold text-slate-400">ta</span>
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={48}
                value={printCount}
                onChange={(e) => setPrintCount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#2563eb]"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold font-mono">
                <span>1 TA</span>
                <span>24 TA</span>
                <span>48 TA</span>
              </div>
            </div>

            <button
              onClick={handlePrint}
              className="w-full mt-4 bg-[#2563eb] hover:bg-[#004ac6] border border-[#2563eb] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md active:scale-97 select-none cursor-pointer transition-all duration-150 text-xs text-center"
            >
              <Printer className="w-4 h-4" />
              Chop etish
            </button>
          </div>
        </div>

        {/* 60x30mm thermal sticker display layout preview (extremely matching layout) */}
        <div className="bg-white p-6 rounded-2xl border border-[#c3c6d7] shadow-sm space-y-4">
          <h3 className="text-base font-bold text-[#1E293B] flex items-center gap-2 border-b border-dashed border-slate-200 pb-3">
            <Eye className="text-[#2563eb] w-5 h-5" />
            Yorliq Qolipi (60x30mm thermal)
          </h3>

          <div className="aspect-[2/1] border-2 border-dashed border-[#c3c6d7] rounded-xl flex flex-col items-center justify-between p-4 bg-white text-black relative select-text shadow-inner">
            <div className="text-center w-full">
              <p className="font-extrabold text-[8px] uppercase tracking-wider text-slate-400 scale-95">Do&apos;kon Tizimi PRO</p>
              <p className="text-xs font-bold text-[#1E293B] truncate w-full px-2 leading-none mt-1">
                {selectedProduct?.name}
              </p>
            </div>

            {/* Simulated barcode graphic representation */}
            <div className="w-full flex justify-center py-2 h-14 overflow-hidden items-end">
              <div className="w-full flex items-end justify-center h-8 gap-[1px]">
                {barcodePattern.map((line, idx) => (
                  <div 
                    key={idx} 
                    className="bg-black shrink-0" 
                    style={{ 
                      width: line.w, 
                      marginRight: line.m, 
                      height: idx % 3 === 0 ? '100%' : '90%' 
                    }} 
                  />
                ))}
              </div>
            </div>

            <div className="text-center w-full">
              <p className="text-[9px] font-mono tracking-[0.2em] leading-none text-slate-500">{selectedProduct?.barcode}</p>
              <p className="text-sm font-black text-slate-900 leading-none mt-1.5">{selectedProduct?.price.toLocaleString()} UZS</p>
            </div>
          </div>
        </div>
      </section>

      {/* Sheet Printable Preview Pane (67%) */}
      <section className="flex-1 bg-slate-100 rounded-2xl border border-[#c3c6d7] p-6 flex flex-col items-center min-h-0 select-text overflow-y-auto custom-scrollbar">
        <div className="mb-4 text-center">
          <p className="text-xs font-bold text-slate-500">Chop etiladigan namuna varag&apos;i (A4 format)</p>
          <p className="text-[10px] text-slate-400 mt-1">Haqiqiy o&apos;lchamda 3 ustunli kassa varog&apos;i hosil qilinadi</p>
        </div>

        {/* Paper Container sheet */}
        <div className="bg-white border border-[#CBD5E1] shadow-2xl w-[100%] max-w-[595px] min-h-[500px] p-6 rounded-lg select-text overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: printCount }).map((_, idx) => (
              <div 
                key={idx} 
                className="border-2 border-slate-200 p-2.5 rounded flex flex-col items-center justify-between bg-white text-black text-center overflow-hidden h-[98px]"
              >
                <div className="w-[100%]">
                  <p className="text-[7px] uppercase font-extrabold text-[#64748B] tracking-wide leading-none">Do&apos;kon Tizimi PRO</p>
                  <p className="text-[10px] font-bold text-[#1E293B] truncate leading-none mt-1 w-full px-1">
                    {selectedProduct?.name}
                  </p>
                </div>

                {/* Micro barcode vector */}
                <div className="w-[100%] flex flex-col items-center py-1 overflow-hidden shrink-0 h-6 justify-center">
                  <div className="flex items-end justify-center h-5 w-[85%] gap-[0.5px]">
                    {barcodePattern.slice(0, 14).map((line, lIdx) => (
                      <div 
                        key={lIdx} 
                        className="bg-black shrink-0" 
                        style={{ 
                          width: line.w, 
                          height: '100%' 
                        }} 
                      />
                    ))}
                  </div>
                </div>

                <div className="w-[100%]">
                  <p className="text-[8px] font-mono leading-none text-slate-500">{selectedProduct?.barcode}</p>
                  <p className="text-[11px] font-black leading-none mt-1 text-slate-900">
                    {selectedProduct?.price.toLocaleString()} UZS
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
