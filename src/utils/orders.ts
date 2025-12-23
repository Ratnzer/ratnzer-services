import { Order } from "../types";

// Helpers to coerce API values safely
const toStr = (v: any) => (v === undefined || v === null ? "" : String(v));
const toNullableStr = (v: any) =>
  v === undefined || v === null || v === "" ? null : String(v);
const toOptionalStr = (v: any): string | undefined => {
  const s = toNullableStr(v);
  return s === null ? undefined : s;
};

/**
 * Normalize a single order record coming from the API to match the UI's expectations.
 */
export const normalizeOrderFromApi = (o: any): Order => {
  const date =
    typeof o?.date === "string" && o.date
      ? o.date
      : o?.createdAt
      ? new Date(o.createdAt).toLocaleString("en-US")
      : new Date().toLocaleString("en-US");

  return {
    id: toStr(o?.id),
    userId: toStr(o?.userId),
    userName: toStr(o?.userName),
    productName: toStr(o?.productName),
    productId: toStr(o?.productId),
    productCategory: toStr(o?.productCategory),
    regionName: toStr(o?.regionName),
    regionId: toNullableStr(o?.regionId),
    quantityLabel: toOptionalStr(o?.quantityLabel),
    denominationId: toNullableStr(o?.denominationId),
    customInputValue: toOptionalStr(o?.customInputValue),
    customInputLabel: toOptionalStr(o?.customInputLabel),
    amount: typeof o?.amount === "number" ? o.amount : Number(o?.amount ?? 0),
    status: ((o?.status as any) || "pending") as Order["status"],
    fulfillmentType: (o?.fulfillmentType as any) || "manual",
    deliveredCode: o?.deliveredCode ?? null,
    rejectionReason: toOptionalStr(o?.rejectionReason),
    date,
  } as Order;
};

export const normalizeOrdersFromApi = (data: any): Order[] =>
  Array.isArray(data) ? data.map(normalizeOrderFromApi) : [];

/**
 * Extract a normalized order list and "has more" flag from a paged API response.
 */
export const extractOrdersFromResponse = (
  data: any,
  pageSize = 10
): { items: Order[]; hasMore: boolean } => {
  const rawItems = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];
  const hasMore =
    typeof data?.hasMore === "boolean"
      ? data.hasMore
      : rawItems.length === pageSize;

  return {
    items: normalizeOrdersFromApi(rawItems),
    hasMore,
  };
};
