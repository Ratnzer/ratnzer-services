import type { Product, Denomination } from '../types';

const toNumber = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function denominationPrice(d: Partial<Denomination> | any): number {
  return (
    toNumber(d?.price) ??
    toNumber(d?.amount) ??
    toNumber(d?.value) ??
    toNumber(d?.cost) ??
    toNumber(d?.denomination) ??
    0
  ) as number;
}

export function getMinProductPrice(product: Product): number {
  const denoms: any[] | undefined = (product as any)?.denominations;
  if (Array.isArray(denoms) && denoms.length) {
    const nums = denoms
      .map(denominationPrice)
      .filter((n) => Number.isFinite(n) && n >= 0);
    if (nums.length) return Math.min(...nums);
  }
  // If no denominations, fall back to 0 (since base price removed)
  return 0;
}
