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

  // Normalize Arabic-Indic digits to Western to ensure parseFloat works reliably
  const normalizedDigits = label.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

  // Capture the first numeric chunk, allowing thousand separators or decimals
  const match = normalizedDigits.match(/(\d{1,3}(?:[.,\s]\d{3})+|\d+(?:[.,]\d+)?)/);
  if (!match) return null;

  const rawNumber = match[1].replace(/\s+/g, '');

  const hasComma = rawNumber.includes(',');
  const hasDot = rawNumber.includes('.');

  // Decide how to interpret separators:
  // - If both . and , exist, assume the last separator is the decimal symbol, others are thousands
  // - If only one type exists, treat it as a thousands separator when grouped by 3 digits; otherwise as decimal
  let normalized = rawNumber;
  if (hasComma && hasDot) {
    const lastDot = rawNumber.lastIndexOf('.');
    const lastComma = rawNumber.lastIndexOf(',');
    const decimalSep = lastDot > lastComma ? '.' : ',';
    const decimalIdx = decimalSep === '.' ? lastDot : lastComma;
    normalized = rawNumber.replace(/[.,]/g, (sep, idx) => (idx === decimalIdx ? '.' : ''));
  } else if (/^\d{1,3}([.,]\d{3})+(?:[.,]\d+)?$/.test(rawNumber)) {
    normalized = rawNumber.replace(/[.,]/g, '');
  } else if (hasComma || hasDot) {
    normalized = rawNumber.replace(',', '.');
  }

  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
};
