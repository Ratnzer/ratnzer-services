const crypto = require('crypto');

const getQiBaseUrl = () => {
  return process.env.QI_BASE_URL || 'https://uat-sandbox-3ds-api.qi.iq';
};

const qiFetchJson = async (path, payload) => {
  const base = getQiBaseUrl();
  const url = `${base.replace(/\/$/, '')}${path}`;

  const terminalId = String(process.env.QI_TERMINAL_ID || '').trim();
  const username = String(process.env.QI_USERNAME || '').trim();
  const password = String(process.env.QI_PASSWORD || '').trim();

  if (!terminalId) throw new Error('QI_TERMINAL_ID is missing');
  if (!username || !password) throw new Error('QI credentials (username/password) are missing');

  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Terminal-Id': terminalId,
      'Authorization': `Basic ${auth}`,
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
    const msg = data?.error?.description || data?.message || `Qi HTTP ${res.status}`;
    const err = new Error(msg);
    err.data = data;
    err.status = res.status;
    throw err;
  }

  return data;
};

const createQiPayment = async (payload) => {
  return qiFetchJson('/api/v1/payment', payload);
};

const verifyQiSignature = (payload, signature, publicKey) => {
  try {
    if (!signature || !publicKey) return false;

    // Data String Format: paymentId|amount.000|currency|creationDate|status
    const fields = [
      payload.paymentId || '-',
      payload.amount ? Number(payload.amount).toString() + '.000' : '-',
      payload.currency || '-',
      payload.creationDate || '-',
      payload.status || '-',
    ];

    const dataString = fields.join('|');
    const signatureBuffer = Buffer.from(signature, 'base64');
    const verifier = crypto.createVerify('sha256');
    verifier.update(dataString);
    verifier.end();

    return verifier.verify(publicKey, signatureBuffer);
  } catch (err) {
    console.error('[Qi] Signature verification error:', err);
    return false;
  }
};

module.exports = {
  getQiBaseUrl,
  createQiPayment,
  verifyQiSignature,
};
