export const extractNumericQuantity = (label?: string, fallback = 1): number => {
  if (!label) return fallback;

  const match = label.match(/[\d.,]+/);
  if (match) {
    const normalized = match[0].replace(/,/g, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return fallback;
};
