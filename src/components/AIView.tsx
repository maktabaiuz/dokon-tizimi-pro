import React, { useState, useRef, useEffect } from 'react';
import { Send, ImagePlus, X, Sparkles, Loader2, Bot, User, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Product, StoreSettings, Sale } from '../types';

interface AIViewProps {
  products: Product[];
  settings: StoreSettings;
  sales: Sale[];
}

interface Message {
  id: string;
  role: 'user' | 'ai' | 'error';
  text: string;
  imageUrl?: string;
}

const SUGGESTED = [
  { icon: '📦', text: "Omborda kam qolgan mahsulotlar qaysilar?" },
  { icon: '💰', text: "Bugun nechta sotuv amalga oshirildi?" },
  { icon: '📊', text: "Eng qimmat mahsulotlar ro'yxatini ber" },
  { icon: '🛒', text: "Do'kon uchun sotuv maslahati ber" },
];

export default function AIView({ products, settings, sales }: AIViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setImage({
        base64: dataUrl.split(',')[1],
        mimeType: file.type || 'image/jpeg',
        previewUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const buildSystemContext = () => {
    const today = new Date().toISOString().substring(0, 10);
    const todaySales = sales.filter(s => s.timestamp.startsWith(today));
    const todayTotal = todaySales.reduce((a, s) => a + s.totalAmount, 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= (p.lowStockThreshold || 5));
    const productList = products
      .slice(0, 30)
      .map(p => `${p.name}: ${p.price.toLocaleString()} so'm, ombor: ${p.stock} ta`)
      .join('\n');

    return `Sen "Do'kon Tizimi PRO" ning AI yordamchisisisan.
Quyidagi qoidalar MUTLAQ va o'zgarmasdir:

=== ROL ===
Sen tajribali, professional kosmetolog va kosmetika
mutaxassisisan. Kosmetika, parfyumeriya, go'zallik
mahsulotlari haqida chuqur bilimga egasan.
Har qanday mahsulotni tarkibi, ishlatilishi,
foyda va zararlari, mos teri turi, alternativlari
haqida aniq va ishonchli ma'lumot bera olasan.
Shuningdek do'kon hisoboti, sotuv tahlili va
mahsulot narxlari haqida ham yordam berasan.
Javoblar: qisqa, soda, o'zbekcha, professional.

=== RUXSAT ETILGAN MAVZULAR ===
✅ Kosmetika va go'zallik mahsulotlari
✅ Mahsulot tarkibi va ishlatilishi
✅ Teri parvarishi tavsiyalari
✅ Narx tahlili va tavsiyalar
✅ Do'kon sotuvlari va hisoboti
✅ Mahsulot zaxirasi va ombor
✅ Mijozlarga tavsiya berish

=== QATIY TAQIQLAR ===
❌ 18+ va jinsiy mavzular
❌ Diniy bahslar va mavzular
❌ Siyosiy fikrlar va munozaralar
❌ Shaxsiy hayot va munosabatlar
❌ Do'kon bilan bog'liq bo'lmagan mavzular

=== TAQIQLANGAN SAVOL KELSA ===
Shu javobni ber (hazil ohangida, muloyim):
"Voy, bu savolni menga emas, boshqalarga bering 😄
Men kosmetika va do'kon ishlarida mutaxassisman —
keling, o'sha haqda gaplashaylik, undan ko'ra
ko'proq foyda olasiz! 💄"

=== USLUB ===
— Har doim o'zbekcha
— Qisqa va aniq (3-5 jumla)
— Professional lekin samimiy ohang
— Kerak bo'lsa emoji ishlatsa bo'ladi (kam)
— Hech qachon "Men AI man" dema,
  o'zingni mutaxassis sifatida ko'rsat

=== DO'KON MA'LUMOTLARI ===
Do'kon: ${settings.storeName}
Bugungi sotuv: ${todaySales.length} ta chek, jami: ${todayTotal.toLocaleString()} so'm
Kam qolgan mahsulotlar: ${lowStock.length} ta

Mahsulotlar ro'yxati:
${productList}`;
  };

  const sendMessage = async (text: string, img?: typeof image) => {
    if (!text.trim() && !img) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text || "Bu mahsulot nima? Narx taklif qil",
      imageUrl: img?.previewUrl,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setImage(null);
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      // Rasm + matn yoki faqat matn
      const contents = img
        ? [
            { inlineData: { mimeType: img.mimeType, data: img.base64 } },
            { text: text || "Bu mahsulot nima? Narx taklif qil" },
          ]
        : text;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: { systemInstruction: buildSystemContext() },
      });

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          text: result.text ?? "Javob olishda xatolik yuz berdi.",
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'error',
          text: msg,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendMessage(input.trim(), image ?? undefined);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F9F9FF] min-h-0">

      {/* Sarlavha */}
      <div className="shrink-0 bg-white border-b border-[#E2E8F0] px-6 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-black text-[#1E293B]">AI Yordamchi</h1>
          <p className="text-[10px] text-slate-400 font-medium">Gemini 2.0 Flash · {settings.storeName}</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="ml-auto text-[10px] text-slate-400 hover:text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-all cursor-pointer"
          >
            Tozalash
          </button>
        )}
      </div>

      {/* Xabarlar */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

          {/* Bo'sh holat */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center pt-8 pb-4 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#7c3aed] flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-black text-[#1E293B]">Salom! Men AI Yordamchiman 👋</h2>
                <p className="text-sm text-slate-500 mt-1.5 max-w-sm">
                  Do'koningiz haqida savol bering — mahsulotlar, narxlar, sotuv va boshqalar. Rasm ham yuborishingiz mumkin.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                {SUGGESTED.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.text)}
                    className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 text-left hover:border-[#2563eb]/40 hover:bg-[#f0f5ff] active:scale-95 transition-all cursor-pointer group"
                  >
                    <span className="text-lg">{s.icon}</span>
                    <p className="text-xs font-medium text-slate-600 mt-1.5 leading-snug group-hover:text-[#2563eb]">{s.text}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Xabarlar ro'yxati */}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {msg.role !== 'error' && (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-[#2563eb]'
                    : 'bg-gradient-to-br from-[#2563eb] to-[#7c3aed]'
                }`}>
                  {msg.role === 'user'
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-white" />
                  }
                </div>
              )}

              {/* Bubble */}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#2563eb] text-white rounded-tr-sm'
                  : msg.role === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-2 max-w-full w-full'
                  : 'bg-white border border-[#E2E8F0] text-[#1E293B] rounded-tl-sm shadow-sm'
              }`}>
                {msg.role === 'error' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />}
                {msg.imageUrl && (
                  <img
                    src={msg.imageUrl}
                    alt="yuklangan"
                    className="rounded-xl mb-3 max-h-52 w-full object-cover"
                  />
                )}
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
              </div>
            </div>
          ))}

          {/* Yuklanish animatsiyasi */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2563eb] to-[#7c3aed] flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-sm">
                <div className="flex gap-1.5 items-center h-4">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input qatori */}
      <div className="shrink-0 bg-white border-t border-[#E2E8F0] px-4 py-3">
        <div className="max-w-3xl mx-auto">

          {/* Rasm preview */}
          {image && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative inline-block">
                <img src={image.previewUrl} alt="preview" className="h-16 w-16 object-cover rounded-xl border border-slate-200" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-slate-500">Rasm tayyor — savol yozing yoki shu holatda yuboring</p>
            </div>
          )}

          <div className="flex items-end gap-2 bg-[#F9F9FF] border border-[#E2E8F0] rounded-2xl px-3 py-2 focus-within:border-[#2563eb]/50 focus-within:bg-white transition-all">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Rasm yuklash tugmasi */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-1.5 rounded-xl transition-all cursor-pointer shrink-0 mb-0.5 ${
                image ? 'text-[#2563eb] bg-blue-50' : 'text-slate-400 hover:text-[#2563eb] hover:bg-blue-50'
              }`}
              title="Rasm yuklash"
            >
              <ImagePlus className="w-5 h-5" />
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={image ? "Rasm haqida savol bering yoki Enter bosing..." : "Savol bering... (Enter = yuborish, Shift+Enter = yangi qator)"}
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-[#1E293B] placeholder-slate-400 focus:outline-none py-1"
              style={{ maxHeight: '120px' }}
            />

            <button
              onClick={handleSend}
              disabled={loading || (!input.trim() && !image)}
              className="p-2 rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer shrink-0 mb-0.5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center mt-1.5">
            Gemini 2.0 Flash · Do'kon ma'lumotlari avtomatik uzatiladi
          </p>
        </div>
      </div>
    </div>
  );
}
