import { Product, Category, Sale, Debt, StoreSettings, Cashier } from '../types';

const KEYS = {
  products: 'pos_products',
  categories: 'pos_categories',
  sales: 'pos_sales',
  debts: 'pos_debts',
  settings: 'pos_settings',
  cashiers: 'pos_cashiers',
};

export function loadProducts(): Product[] | null {
  try { const d = localStorage.getItem(KEYS.products); return d ? JSON.parse(d) : null; }
  catch { return null; }
}
export function saveProducts(data: Product[]) {
  localStorage.setItem(KEYS.products, JSON.stringify(data));
}

export function loadCategories(): Category[] | null {
  try { const d = localStorage.getItem(KEYS.categories); return d ? JSON.parse(d) : null; }
  catch { return null; }
}
export function saveCategories(data: Category[]) {
  localStorage.setItem(KEYS.categories, JSON.stringify(data));
}

export function loadSales(): Sale[] | null {
  try { const d = localStorage.getItem(KEYS.sales); return d ? JSON.parse(d) : null; }
  catch { return null; }
}
export function saveSales(data: Sale[]) {
  localStorage.setItem(KEYS.sales, JSON.stringify(data));
}

export function loadDebts(): Debt[] | null {
  try { const d = localStorage.getItem(KEYS.debts); return d ? JSON.parse(d) : null; }
  catch { return null; }
}
export function saveDebts(data: Debt[]) {
  localStorage.setItem(KEYS.debts, JSON.stringify(data));
}

export function loadSettings(): StoreSettings | null {
  try { const d = localStorage.getItem(KEYS.settings); return d ? JSON.parse(d) : null; }
  catch { return null; }
}
export function saveSettings(data: StoreSettings) {
  localStorage.setItem(KEYS.settings, JSON.stringify(data));
}

export function loadCashiers(): Cashier[] | null {
  try { const d = localStorage.getItem(KEYS.cashiers); return d ? JSON.parse(d) : null; }
  catch { return null; }
}
export function saveCashiers(data: Cashier[]) {
  localStorage.setItem(KEYS.cashiers, JSON.stringify(data));
}

export function exportAllData(): string {
  return JSON.stringify({
    products: localStorage.getItem(KEYS.products),
    categories: localStorage.getItem(KEYS.categories),
    sales: localStorage.getItem(KEYS.sales),
    debts: localStorage.getItem(KEYS.debts),
    settings: localStorage.getItem(KEYS.settings),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function importAllData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data.products) localStorage.setItem(KEYS.products, data.products);
    if (data.categories) localStorage.setItem(KEYS.categories, data.categories);
    if (data.sales) localStorage.setItem(KEYS.sales, data.sales);
    if (data.debts) localStorage.setItem(KEYS.debts, data.debts);
    if (data.settings) localStorage.setItem(KEYS.settings, data.settings);
    return true;
  } catch { return false; }
}
