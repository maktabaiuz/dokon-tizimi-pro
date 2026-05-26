import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Product, Category, Sale, Debt, StoreSettings } from '../types';

// ── helpers ─────────────────────────────────────────────────────────────────

const storeCol = (storeId: string, sub: string) =>
  collection(db, 'stores', storeId, sub);

const storeDoc = (storeId: string, sub: string, id: string) =>
  doc(db, 'stores', storeId, sub, id);

// ── subscriptions (real-time) ────────────────────────────────────────────────

export function subscribeProducts(
  storeId: string,
  cb: (data: Product[]) => void,
): () => void {
  return onSnapshot(storeCol(storeId, 'products'), snap => {
    cb(snap.docs.map(d => ({ ...d.data() } as Product)));
  });
}

export function subscribeCategories(
  storeId: string,
  cb: (data: Category[]) => void,
): () => void {
  return onSnapshot(storeCol(storeId, 'categories'), snap => {
    cb(snap.docs.map(d => ({ ...d.data() } as Category)));
  });
}

export function subscribeSales(
  storeId: string,
  cb: (data: Sale[]) => void,
): () => void {
  return onSnapshot(storeCol(storeId, 'sales'), snap => {
    const sorted = snap.docs
      .map(d => ({ ...d.data() } as Sale))
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    cb(sorted);
  });
}

export function subscribeDebts(
  storeId: string,
  cb: (data: Debt[]) => void,
): () => void {
  return onSnapshot(storeCol(storeId, 'debts'), snap => {
    cb(snap.docs.map(d => ({ ...d.data() } as Debt)));
  });
}

export function subscribeSettings(
  storeId: string,
  cb: (data: StoreSettings) => void,
): () => void {
  return onSnapshot(storeDoc(storeId, 'settings', 'config'), snap => {
    if (snap.exists()) cb(snap.data() as StoreSettings);
  });
}

// ── write / delete ────────────────────────────────────────────────────────────

export function saveProduct(storeId: string, product: Product): void {
  setDoc(storeDoc(storeId, 'products', product.id), product);
}

export function deleteProduct(storeId: string, productId: string): void {
  deleteDoc(storeDoc(storeId, 'products', productId));
}

export function saveSettings(storeId: string, settings: StoreSettings): void {
  setDoc(storeDoc(storeId, 'settings', 'config'), settings);
}

export function saveSale(storeId: string, sale: Sale): void {
  setDoc(storeDoc(storeId, 'sales', sale.id), sale);
}

export function deleteSale(storeId: string, saleId: string): void {
  deleteDoc(storeDoc(storeId, 'sales', saleId));
}

export function saveDebt(storeId: string, debt: Debt): void {
  setDoc(storeDoc(storeId, 'debts', debt.id), debt);
}

export function deleteDebt(storeId: string, debtId: string): void {
  deleteDoc(storeDoc(storeId, 'debts', debtId));
}

export function saveCategory(storeId: string, category: Category): void {
  setDoc(storeDoc(storeId, 'categories', category.id), category);
}

export function deleteCategory(storeId: string, categoryId: string): void {
  deleteDoc(storeDoc(storeId, 'categories', categoryId));
}
