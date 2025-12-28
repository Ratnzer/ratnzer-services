// server/utils/paytabs.js
// Minimal PayTabs helper (Node 18+ fetch)

const REGION_DOMAINS = {
  // Common PayTabs regions
  ARE: 'secure.paytabs.com',
  SAU: 'secure.paytabs.sa',
  EGY: 'secure-egypt.paytabs.com',
  OMN: 'secure-oman.paytabs.com',
  JOR: 'secure-jordan.paytabs.com',
  IRQ: 'secure-iraq.paytabs.com',
  BHR: 'secure-bahrain.paytabs.com',
  KWT: 'secure-kuwait.paytabs.com',
  QAT: 'secure-qatar.paytabs.com',
};

const getPaytabsBaseUrl = () => {
  const region = String(process.env.PAYTABS_REGION || '').toUpperCase().trim();
  const domain = REGION_DOMAINS[region] || REGION_DOMAINS.ARE;
  return `https://${domain}`;
};

const paytabsFetchJson = async (path, payload) => {
  const base = getPaytabsBaseUrl();
  const url = `${base}${path}`;

  const serverKey = String(process.env.PAYTABS_SERVER_KEY || '').trim();
  if (!serverKey) throw new Error('PAYTABS_SERVER_KEY is missing');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      authorization: serverKey,
    },
    body: JSON.stringify(payload || {}),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `PayTabs HTTP ${res.status}`;
    const err = new Error(msg);
    err.data = data;
    err.status = res.status;
    throw err;
  }

  return data;
};

const createPaytabsPayment = async (payload) => {
  return paytabsFetchJson('/payment/request', payload);
};

const queryPaytabsPayment = async (payload) => {
  return paytabsFetchJson('/payment/query', payload);
};

module.exports = {
  getPaytabsBaseUrl,
  createPaytabsPayment,
  queryPaytabsPayment,
};