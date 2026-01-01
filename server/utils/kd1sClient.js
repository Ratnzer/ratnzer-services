const KD1S_API_URL = (process.env.KD1S_API_URL || 'https://kd1s.com/api/v2').replace(/\/$/, '');
const KD1S_API_KEY = process.env.KD1S_API_KEY;

let cachedFetch = null;

const getFetch = async () => {
  if (cachedFetch) return cachedFetch;
  if (typeof fetch === 'function') {
    cachedFetch = fetch;
    return cachedFetch;
  }

  // Support older Node runtimes that do not ship a global fetch (e.g., Node 16)
  const { default: nodeFetch } = await import('node-fetch');
  cachedFetch = nodeFetch;
  return cachedFetch;
};

const ensureConfigured = () => {
  if (!KD1S_API_KEY) {
    throw new Error('KD1S_API_KEY is not configured');
  }
};

const parseQuantity = (val) => {
  if (val == null) return 1;
  if (typeof val === 'number' && Number.isFinite(val) && val > 0) return Math.round(val);
  const n = Number(String(val).replace(/[^0-9.]/g, ''));
  if (Number.isFinite(n) && n > 0) return Math.max(1, Math.round(n));
  return 1;
};

const normalizeProviderStatus = (status) => {
  if (!status) return null;
  const value = String(status).toLowerCase();

  if (
    ['completed', 'complete', 'success', 'finished', 'done', 'delivered'].some((k) =>
      value.includes(k)
    )
  ) {
    return 'completed';
  }

  if (['cancelled', 'canceled', 'failed', 'error', 'rejected', 'refunded'].some((k) => value.includes(k))) {
    return 'cancelled';
  }

  return null;
};

const placeOrder = async ({ serviceId, link, quantity }) => {
  ensureConfigured();

  if (!serviceId) {
    throw new Error('serviceId is required for KD1S order');
  }

  const payload = new URLSearchParams({
    key: KD1S_API_KEY,
    action: 'add',
    service: String(serviceId),
    link: link || 'N/A',
    quantity: String(parseQuantity(quantity)),
  });

  const fetchFn = await getFetch();

  const res = await fetchFn(`${KD1S_API_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    const text = await res.text().catch(() => '');
    throw new Error(`KD1S invalid JSON response: ${text || err.message}`);
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(`KD1S request failed: ${msg}`);
  }

  if (data?.error) {
    throw new Error(`KD1S error: ${data.error}`);
  }

  if (!data?.order) {
    throw new Error('KD1S did not return order id');
  }

  return { orderId: String(data.order), raw: data };
};

const getOrderStatus = async (orderId) => {
  ensureConfigured();

  if (!orderId) {
    throw new Error('orderId is required for KD1S status check');
  }

  const payload = new URLSearchParams({
    key: KD1S_API_KEY,
    action: 'status',
    order: String(orderId),
  });

  const fetchFn = await getFetch();

  const res = await fetchFn(`${KD1S_API_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (err) {
    const text = await res.text().catch(() => '');
    throw new Error(`KD1S invalid JSON response: ${text || err.message}`);
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `HTTP ${res.status}`;
    throw new Error(`KD1S status failed: ${msg}`);
  }

  if (data?.error) {
    throw new Error(`KD1S error: ${data.error}`);
  }

  const rawStatus = data?.status || data?.order_status || null;
  const normalizedStatus = normalizeProviderStatus(rawStatus);

  return {
    raw: data,
    normalizedStatus,
    providerStatus: rawStatus,
  };
};

module.exports = {
  placeOrder,
  parseQuantity,
  getOrderStatus,
  normalizeProviderStatus,
};
