import React, { useState, useRef, useEffect } from 'react';
import { X, Send, ImagePlus, Bot, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { Product, StoreSettings } from '../types';

interface AIChatProps {
  products: Product[];
  settings: StoreSettings;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  imageUrl?: string;
}

const SYSTEM_PROMPT = `Siz O'zbekiston do'koni uchun universal AI yordamchisiz. Quyidagi sohalarda yordam bera olasiz:

1. MAHSULOTLAR: Narxlar, ombor qoldig'i, mahsulot ma'lumotlari
2. SOTUV HISOBI: Kunlik/haftalik/oylik sotuv statistikasi
3. FOYDA HISOBLASH: Tan narxi va sotish narxi orasidagi foyda, ustama foiz
   - Misol: Tan narxi 5000 so'm, sotish narxi 8000 so'm => foyda = 3000 so'm (60%)
4. KATEGORIYALAR: Tovar guruhlari, eng ko'p sotiladigan kategoriyalar
5. OMBOR BOSHQARUVI: Kam qolgan tovarlar, zaxira hisobi
6. MOLIYAVIY TAHLIL: Daromad, xarajat, sof foyda hisoblash
7. SAVDO MASLAHAT: Qaysi tovarni ko'proq sotish, narx strategiyasi
8. STATISTIKA: Savdo tendensiyalari, o'sish ko'rsatkichlari

Barcha savollarga O'zbekcha, aniq va foydali javob bering. Markdown formatlashdan foydalaning (ro'yxatlar, **qalin**, sarlavhalar). Agar foyda yoki statistika so'ralsa, hisob-kitobni batafsil ko'rsating.`;


export default function AIChat({ products, settings }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(',')[1];
      setImage({ base64, mimeType: file.type || 'image/jpeg', previewUrl: result });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const buildSystemContext = () => {
    const productList = products
      .slice(0, 20)
      .map(p => `${p.name}: ${p.price.toLocaleString()} so'm, ombor: ${p.stock} ta`)
      .join('\n');
    return `${SYSTEM_PROMPT}\n\nDo'kon: ${settings.storeName}\nMahsulotlar:\n${productList}`;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text && !image) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text || "Bu mahsulot nima? Narx taklif qil",
      imageUrl: image?.previewUrl,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const currentImage = image;
    setImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

      const contents = currentImage
        ? {
            parts: [
              { inlineData: { mimeType: currentImage.mimeType, data: currentImage.base64 } },
              { text: text || "Bu mahsulot nima? Narx taklif qil" },
            ],
          }
        : text;

      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        config: { systemInstruction: buildSystemContext() },
        contents,
      });

      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', text: result.text ?? "Javob olishda xatolik." },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'ai', text: "Xatolik yuz berdi. API kalitini tekshiring." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Float tugma */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#2563eb] text-white shadow-2xl flex items-center justify-center text-2xl hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
          title="AI Yordamchi"
        >
          💬
        </button>
      )}

      {/* Chat paneli */}
      {isOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-[360px] rounded-[20px] bg-white shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
          style={{ height: '70vh', maxHeight: '600px' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2563eb] to-[#1d4ed8] px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <div>
                <p className="text-sm font-black text-white">AI Yordamchi 🤖</p>
                <p className="text-[10px] text-blue-200">Gemini 2.0 Flash</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Xabarlar */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 text-xs mt-8 space-y-2">
                <p className="text-3xl">🤖</p>
                <p className="font-medium">Salom! Mahsulot, narx yoki sotuv haqida savol bering.</p>
                <p className="text-[10px] text-slate-300">Rasm ham yuborishingiz mumkin</p>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${
                    msg.role === 'user'
                      ? 'bg-[#2563eb] text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="yuklangan"
                      className="rounded-lg mb-2 max-h-32 w-full object-cover"
                    />
                  )}
                  {msg.role === 'ai' ? (
                    <div className="leading-relaxed [&_strong]:font-bold [&_strong]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-0.5 [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-semibold [&_code]:bg-slate-200 [&_code]:px-1 [&_code]:rounded [&_code]:text-[10px] [&_code]:font-mono">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Yuklanish animatsiyasi */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-3">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Rasm preview */}
          {image && (
            <div className="px-3 pb-1 shrink-0">
              <div className="relative inline-block">
                <img src={image.previewUrl} alt="preview" className="h-14 w-14 object-cover rounded-lg border border-slate-200" />
                <button
                  onClick={() => setImage(null)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>
          )}

          {/* Input qatori */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-100 shrink-0">
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer shrink-0"
                title="Rasm yuklash"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Savol bering..."
                rows={1}
                className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2563eb] focus:bg-white transition-all"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={handleSend}
                disabled={loading || (!input.trim() && !image)}
                className="p-2 rounded-xl bg-[#2563eb] text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all cursor-pointer shrink-0"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
