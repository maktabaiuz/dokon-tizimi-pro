export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number; // Tan narxi
  price: number;     // Sotish narxi
  stock: number;     // Soni
  image?: string;    // Rasm URL
  icon?: string;     // Fallback Lucide icon name
  barcode: string;   // Shtrix kod
  lowStockThreshold?: number; // Kam qolgan ogohlantirish soni
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
}

export interface Debt {
  id: string;
  customerName: string;
  details: string; // e.g., "4-uy" or "Haydovchi"
  amount: number;
  date: string;
  phone: string;
  paidAmount: number;
}

export interface Sale {
  id: string;
  timestamp: string; // e.g. "2026-05-20 14:22"
  cashier: string;
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  paymentMethod: 'Naqd' | 'Karta' | 'Nasiya';
  customerName: string;
  totalAmount: number;
}

export interface ActiveShift {
  startTime: string;
  cashier: string;
  initialCash: number;
  currentCash: number;
  terminal: number;
  salesCount: number;
  isClosed: boolean;
}

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  inn: string;
  paperSize: '58mm' | '80mm' | 'A4';
  operatorPin: string;
}
