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

  const candidates = [
    denomination.amount,
    (denomination as any)?.quantity,
    (denomination as any)?.value,
    (denomination as any)?.denomination,
    denomination.price,
  ];

  for (const candidate of candidates) {
    const num = toPositiveNumber(candidate);
    if (num !== undefined) return num;
  }

  const labelNumber = toPositiveNumber(
    (denomination as any)?.label?.toString()?.match(/[0-9]+(?:\.[0-9]+)?/g)?.[0]
  );
  if (labelNumber !== undefined) return labelNumber;

  return 1;
};

