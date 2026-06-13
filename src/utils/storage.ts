import { Product, Category, Sale, Debt, StoreSettings, Cashier, Store, Expense } from '../types';

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

// ── Multi-store support ──────────────────────────────────────────────────────

export function loadStores(): Store[] | null {
  try { const d = localStorage.getItem('pos_stores'); return d ? JSON.parse(d) : null; }
  catch { return null; }
}
export function saveStores(data: Store[]) {
  localStorage.setItem('pos_stores', JSON.stringify(data));
}

export function loadActiveStoreId(): string | null {
  return localStorage.getItem('pos_active_store');
}
export function saveActiveStoreId(id: string) {
  localStorage.setItem('pos_active_store', id);
}

export function loadStoreData<T>(storeId: string, key: string): T | null {
  try {
    const storeKey = `pos_${storeId}_${key}`;
    const d = localStorage.getItem(storeKey);
    if (d) return JSON.parse(d) as T;
    // Migration: store1 falls back to old flat keys
    if (storeId === 'store1') {
      const legacy = localStorage.getItem(`pos_${key}`);
      if (legacy) {
        localStorage.setItem(storeKey, legacy);
        return JSON.parse(legacy) as T;
      }
    }
    return null;
  } catch { return null; }
}

export function saveStoreData<T>(storeId: string, key: string, data: T) {
  localStorage.setItem(`pos_${storeId}_${key}`, JSON.stringify(data));
}

export function loadExpenses(storeId: string): Expense[] | null {
  try {
    const d = localStorage.getItem(`pos_${storeId}_expenses`);
    return d ? JSON.parse(d) : null;
  } catch { return null; }
}
export function saveExpenses(storeId: string, data: Expense[]) {
  localStorage.setItem(`pos_${storeId}_expenses`, JSON.stringify(data));
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
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;

    const isValidJson = (raw: unknown, expectArray: boolean): boolean => {
      if (typeof raw !== 'string') return false;
      try {
        const parsed = JSON.parse(raw);
        return expectArray
          ? Array.isArray(parsed)
          : typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null;
      } catch { return false; }
    };

    if (data.products   !== undefined && !isValidJson(data.products, true))   return false;
    if (data.categories !== undefined && !isValidJson(data.categories, true))  return false;
    if (data.sales      !== undefined && !isValidJson(data.sales, true))       return false;
    if (data.debts      !== undefined && !isValidJson(data.debts, true))       return false;
    if (data.settings   !== undefined && !isValidJson(data.settings, false))   return false;

    if (data.products)   localStorage.setItem(KEYS.products, data.products);
    if (data.categories) localStorage.setItem(KEYS.categories, data.categories);
    if (data.sales)      localStorage.setItem(KEYS.sales, data.sales);
    if (data.debts)      localStorage.setItem(KEYS.debts, data.debts);
    if (data.settings)   localStorage.setItem(KEYS.settings, data.settings);
    return true;
  } catch { return false; }
}
