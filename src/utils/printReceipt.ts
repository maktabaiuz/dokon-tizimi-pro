import { Sale, StoreSettings } from '../types';

export function printReceipt(sale: Sale, settings: StoreSettings, cashierName: string): void {
  const paperWidth = settings.paperSize === 'A4' ? '210mm' : settings.paperSize;
  const fontSize = settings.paperSize === 'A4' ? '12px' : '9px';

  const rows = sale.items.map(item => `
    <tr>
      <td colspan="2" style="padding:2px 0;font-weight:600;">${item.name}</td>
    </tr>
    <tr>
      <td style="padding:1px 0;color:#555;">${item.quantity} x ${item.price.toLocaleString('uz-UZ')}</td>
      <td style="text-align:right;font-weight:700;">${(item.quantity * item.price).toLocaleString('uz-UZ')} UZS</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Chek ${sale.id}</title>
  <style>
    @page { margin: 0; size: ${settings.paperSize === 'A4' ? 'A4' : paperWidth + ' auto'}; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: ${fontSize};
      width: ${paperWidth};
      padding: 4mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .line { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { vertical-align: top; }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:1.3em;margin-bottom:2px;">${settings.storeName}</div>
  ${settings.address ? `<div class="center">${settings.address}</div>` : ''}
  ${settings.phone ? `<div class="center">Tel: ${settings.phone}</div>` : ''}
  ${settings.inn ? `<div class="center">INN: ${settings.inn}</div>` : ''}
  <div class="line"></div>
  <div>Sana: ${sale.timestamp}</div>
  <div>Kassir: ${cashierName}</div>
  <div>Chek: ${sale.id}</div>
  <div class="line"></div>
  <table>${rows}</table>
  <div class="line"></div>
  <table>
    <tr>
      <td class="bold" style="font-size:1.1em;">JAMI:</td>
      <td class="right bold" style="font-size:1.1em;">${sale.totalAmount.toLocaleString('uz-UZ')} UZS</td>
    </tr>
    <tr>
      <td>To'lov usuli:</td>
      <td class="right">${sale.paymentMethod}</td>
    </tr>
    ${sale.customerName && sale.customerName !== 'Oddiy mijoz'
      ? `<tr><td>Mijoz:</td><td class="right">${sale.customerName}</td></tr>`
      : ''}
  </table>
  <div class="line"></div>
  <div class="center" style="margin-top:4px;">Xaridingiz uchun tashakkur!</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=420,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => {
    win.print();
    setTimeout(() => win.close(), 500);
  };
}
