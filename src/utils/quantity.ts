import { Denomination } from '../types';

const toPositiveNumber = (value: any): number | undefined => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : undefined;
};

/**
 * Resolve the intended quantity for a denomination. Some providers send the
 * purchasable amount under different keys (amount, value, denomination, price),
 * or even only inside the label (e.g., "رصيد 50").
 */
export const resolveQuantity = (
  denomination?: Partial<Denomination> | null,
  override?: number
): number => {
  const overrideNum = toPositiveNumber(override);
  if (overrideNum !== undefined) return overrideNum;

  if (!denomination) return 1;

  const minCandidates = [
    (denomination as any)?.minQuantity,
    (denomination as any)?.min_quantity,
    (denomination as any)?.minimum,
    (denomination as any)?.min,
    (denomination as any)?.minQty,
    (denomination as any)?.minqty,
    (denomination as any)?.qtyMin,
    (denomination as any)?.quantityMin,
    (denomination as any)?.minimumQuantity,
    (denomination as any)?.minimum_quantity,
  ];

  const minQty = minCandidates
    .map(toPositiveNumber)
    .find((num) => num !== undefined);

  const candidates = [
    denomination.amount,
    (denomination as any)?.qty,
    (denomination as any)?.quantity,
    (denomination as any)?.value,
    (denomination as any)?.denomination,
    denomination.price,
  ];

  for (const candidate of candidates) {
    const num = toPositiveNumber(candidate);
    if (num !== undefined) {
      if (minQty !== undefined && num < minQty) return minQty;
      return num;
    }
  }

  const labelNumber = toPositiveNumber(
    (denomination as any)?.label?.toString()?.match(/[0-9]+(?:\.[0-9]+)?/g)?.[0]
  );
  if (labelNumber !== undefined) {
    if (minQty !== undefined && labelNumber < minQty) return minQty;
    return labelNumber;
  }

  if (minQty !== undefined) return minQty;

  return 1;
};

