import { Denomination } from '../types';

/**
 * Extracts the numeric quantity from a denomination label (e.g., "10 قطع" -> 10).
 * Returns null when no numeric portion exists.
 */
export const getQuantityFromDenomination = (
  denomination?: Denomination | null
): number | null => {
  const label = denomination?.label;
  if (!label) return null;

  const match = label.match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return null;

  const value = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(value) ? value : null;
};
