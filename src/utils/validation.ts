export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-()\+]/g, '');
  return /^998\d{9}$/.test(cleaned) || /^\d{9}$/.test(cleaned);
}

export function validatePrice(price: number): boolean {
  return price > 0;
}

export function validateName(name: string): boolean {
  return name.trim().length >= 2;
}
