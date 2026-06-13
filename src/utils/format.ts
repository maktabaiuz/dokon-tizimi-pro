export const fmtStore = (label: string): string =>
  /^\d+$/.test(label.trim()) ? `Do'kon ${label.trim()}` : label;
