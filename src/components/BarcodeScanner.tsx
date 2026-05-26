import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

interface Props {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const ELEMENT_ID = 'bs__video_region';

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const [error, setError] = useState('');
  const onScanRef  = useRef(onScan);
  const onCloseRef = useRef(onClose);
  onScanRef.current  = onScan;
  onCloseRef.current = onClose;

  const qrRef      = useRef<Html5Qrcode | null>(null);
  const doneRef    = useRef(false); // bir marta skanerlash uchun
  const startedRef = useRef(false); // StrictMode double-invoke himoyasi

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const tid = setTimeout(async () => {
      const el = document.getElementById(ELEMENT_ID);
      if (!el) { setError('Element topilmadi'); return; }

      const qr = new Html5Qrcode(ELEMENT_ID);
      qrRef.current = qr;

      const onDecode = (text: string) => {
        if (doneRef.current) return;
        doneRef.current = true;
        qr.stop()
          .finally(() => onScanRef.current(text))
          .catch(() => onScanRef.current(text));
      };

      const config = { fps: 15, qrbox: { width: 280, height: 150 } };

      // Avval orqa kamera (mobil), xato bo'lsa old kamera (Mac/PC)
      try {
        await qr.start({ facingMode: 'environment' }, config, onDecode, () => {});
      } catch {
        try {
          await qr.start({ facingMode: 'user' }, config, onDecode, () => {});
        } catch (e2: unknown) {
          const msg = e2 instanceof Error ? e2.message : String(e2);
          if (/permission|notallowed/i.test(msg))
            setError('Kameraga ruxsat berilmagan. Brauzer manzil satridagi 🔒 belgini bosib ruxsat bering.');
          else if (/notfound|devices/i.test(msg))
            setError('Qurilmada kamera topilmadi.');
          else
            setError('Kamera ocholmadi. Sahifani yangilab qayta urining.');
        }
      }
    }, 100);

    return () => {
      clearTimeout(tid);
      qrRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.80)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '16px',
    }}>
      <div style={{
        background: 'white', borderRadius: '20px',
        padding: '20px', width: '100%', maxWidth: '360px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
      }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
          <span style={{ fontSize:'15px', fontWeight:700, color:'#1E293B' }}>
            Barkod skanerlang
          </span>
          <button onClick={() => onCloseRef.current()} style={{
            background:'#F1F5F9', border:'none', borderRadius:'8px',
            padding:'6px 10px', cursor:'pointer',
            display:'flex', alignItems:'center',
          }}>
            <X style={{ width:'15px', height:'15px', color:'#64748B' }} />
          </button>
        </div>

        {/* Kamera oynasi */}
        <div id={ELEMENT_ID} style={{
          width:'100%', minHeight:'220px',
          borderRadius:'12px', overflow:'hidden',
          border:'2px solid #2563EB', background:'#0f172a',
        }} />

        <p style={{ marginTop:'10px', textAlign:'center', fontSize:'12px', color:'#64748B' }}>
          Barkodni kamera oldiga tuting
        </p>

        {error && (
          <div style={{
            marginTop:'10px', padding:'10px 14px',
            background:'#FEF2F2', border:'1px solid #FECACA',
            borderRadius:'10px', color:'#DC2626',
            fontSize:'12px', textAlign:'center', lineHeight:1.6,
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
