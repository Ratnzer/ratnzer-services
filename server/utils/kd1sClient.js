const KD1S_API_URL = (process.env.KD1S_API_URL || 'https://kd1s.com/api/v2').replace(/\/$/, '');
const KD1S_API_KEY = process.env.KD1S_API_KEY;

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

  const res = await fetch(`${KD1S_API_URL}`, {
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

module.exports = {
  placeOrder,
  parseQuantity,
};
