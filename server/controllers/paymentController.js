const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { generateShortId } = require('../utils/id');
const {
  createQiPayment,
  verifyQiSignature,
} = require('../utils/qi');
const { notifyAdminsPush } = require('./notificationController');
const { placeOrder: placeKd1sOrder, parseQuantity } = require('../utils/kd1sClient');

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
const safeJsonParse = (raw, fallback) => {
  try {
    if (!raw) return fallback;
    if (typeof raw === 'object') return raw;
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
};

const parseJsonField = (raw, fallback = null) => {
  try {
    if (raw === undefined || raw === null) return fallback;
    if (typeof raw === 'object') return raw;
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
};

const resolveCustomInputConfig = (product, regionId) => {
  const regions = parseJsonField(product?.regions, null);
  const region = Array.isArray(regions)
    ? regions.find((r) => String(r?.id || '') === String(regionId || ''))
    : null;

  if (region?.customInput) return region.customInput;

  const productCustomInput = parseJsonField(product?.customInput, null);
  return productCustomInput || null;
};

const normalizeId = (val) => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val;
  return String(val);
};

const computePrice = (product, denominationKey, denominationObj, clientAmount) => {
  const base = Number(product?.price ?? 0);
  const dens = product?.denominations;

  const wanted =
    denominationKey ??
    denominationObj?.id ??
    denominationObj?.denominationId ??
    denominationObj?.value ??
    denominationObj?.amount ??
    denominationObj?.name ??
    denominationObj?.label ??
    denominationObj?.denomination ??
    null;

  const pickFromDen = (d) => {
    const candidate =
      d?.price ??
      d?.amount ??
      d?.value ??
      d?.cost ??
      d?.denomination ??
      null;
    const p = Number(candidate);
    return Number.isFinite(p) && p > 0 ? p : null;
  };

  if (Array.isArray(dens) && wanted != null) {
    const found = dens.find((d) => {
      const key =
        d?.id ??
        d?.denominationId ??
        d?.value ??
        d?.amount ??
        d?.name ??
        d?.label ??
        d?.denomination ??
        null;
      return key != null && String(key) === String(wanted);
    });
    const p = found ? pickFromDen(found) : null;
    if (p != null) return p;

    const num = Number(String(wanted).replace(/[^0-9.]/g, ''));
    if (Number.isFinite(num) && num > 0) {
      const foundByNumber = dens.find((d) => {
        const cand = pickFromDen(d);
        return cand != null && Number(cand) === num;
      });
      const pn = foundByNumber ? pickFromDen(foundByNumber) : null;
      if (pn != null) return pn;
    }
  }

  if (denominationObj) {
    const p = pickFromDen(denominationObj);
    if (p != null) return p;
  }

  const ca = Number(clientAmount);
  if (Array.isArray(dens) && Number.isFinite(ca) && ca > 0) {
    const foundByClient = dens.find((d) => {
      const cand = pickFromDen(d);
      return cand != null && Number(cand) === ca;
    });
    const pc = foundByClient ? pickFromDen(foundByClient) : null;
    if (pc != null) return pc;
  }

  if (!Array.isArray(dens)) {
    const ca2 = Number(clientAmount);
    if (Number.isFinite(ca2) && ca2 > 0 && wanted != null) {
      return ca2;
    }
  }

  return base;
};

const getCallbackUrl = () => {
  if (process.env.APP_CALLBACK_URL) return process.env.APP_CALLBACK_URL;
  const base = process.env.APP_BASE_URL;
  if (!base) return undefined;
  return `${base.replace(/\/$/, '')}/api/payments/qi/callback`;
};

const getReturnUrl = () => {
  const base = 'https://www.ratnzer.com';
  const cleanBase = base.replace(/\/$/, '');
  return `${cleanBase}/api/payments/qi/return`;
};

const getFrontendReturnUrl = (params, type, isApp = false) => {
  const base = 'https://www.ratnzer.com';
  const cleanBase = base.replace(/\/$/, '');
  const qs = new URLSearchParams(params || {}).toString();

  if (isApp) {
    return `https://localhost/?${qs}&qi_return_view=${type}`;
  }

  const isWallet = type === 'topup' || type === 'wallet';
  const isService = type === 'single' || type === 'cart' || type === 'service';

  if (isWallet) {
    return `${cleanBase}/wallet?${qs}`;
  } else if (isService) {
    return `${cleanBase}/profile?${qs}`;
  }

  return `${cleanBase}/?${qs}`;
};

// ------------------------------------------------------------
// Finalize payment (idempotent)
// ------------------------------------------------------------
const finalizePayment = async ({ paymentId, qiPaymentId, qiStatus }) => {
  const payment = await prisma.payment.findUnique({
    where: { id: String(paymentId) },
  });
  if (!payment) return { ok: false, message: 'Payment not found' };

  if (String(payment.status).toLowerCase() === 'succeeded') {
    return { ok: true, payment, already: true };
  }
  if (String(payment.status).toLowerCase() === 'failed') {
    return { ok: true, payment, already: true };
  }

  const meta = safeJsonParse(payment.cardLast4, {});
  const type = meta?.type || 'unknown';

  if (qiStatus === 'FAILED' || qiStatus === 'AUTHENTICATION_FAILED') {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        transactionId: qiPaymentId || payment.transactionId,
      },
    });
    return { ok: true, payment: updated, status: 'failed', type };
  }

  if (qiStatus !== 'SUCCESS') {
    return { ok: true, payment, status: 'pending', type };
  }

  const amountNumber = Number(payment.amount || 0);
  const userId = payment.userId;
  const apiDispatchQueue = [];

  const result = await prisma.$transaction(async (tx) => {
    const freshPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!freshPayment) throw new Error('Payment not found');
    if (String(freshPayment.status).toLowerCase() === 'succeeded') {
      return { payment: freshPayment, already: true };
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const metaInner = safeJsonParse(freshPayment.cardLast4, {});
    const innerType = metaInner?.type || 'unknown';

    const updatedPayment = await tx.payment.update({
      where: { id: freshPayment.id },
      data: {
        status: 'succeeded',
        provider: 'qi',
        method: 'card',
        transactionId: qiPaymentId || freshPayment.transactionId,
      },
    });

    if (innerType === 'topup') {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amountNumber } },
      });

      await tx.transaction.create({
        data: {
          id: generateShortId(),
          userId,
          title: 'شحن رصيد عبر بوابة Qi',
          amount: amountNumber,
          type: 'credit',
          status: 'completed',
          description: 'شحن عبر Qi Card (Visa/Mastercard)',
          paymentId: updatedPayment.id,
        },
      });

      return { payment: updatedPayment, type: innerType };
    }

    const items = innerType === 'single' ? [metaInner.orderPayload] : (metaInner.items || []);
    const createdOrders = [];

    for (const item of items) {
      const orderId = generateShortId();
      const order = await tx.order.create({
        data: {
          id: orderId,
          userId,
          productId: item.productId,
          productName: item.productName,
          productCategory: item.productCategory,
          amount: item.amount,
          status: 'processing',
          fulfillmentType: item.fulfillmentType || 'manual',
          regionName: item.regionName,
          denominationLabel: item.quantityLabel,
          customInputValue: item.customInputValue,
          customInputLabel: item.customInputLabel,
          paymentId: updatedPayment.id,
        },
      });

      if (item.fulfillmentType === 'api') {
        apiDispatchQueue.push({
          orderId,
          serviceId: item.apiConfig?.serviceId,
          link: item.customInputValue,
          quantity: item.quantity || 1,
          providerName: item.apiConfig?.providerName || 'KD1S',
        });
      }

      createdOrders.push(order);
    }

    const cartItemIds = Array.isArray(metaInner?.cartItemIds) ? metaInner.cartItemIds : null;
    if (cartItemIds && cartItemIds.length > 0) {
      await tx.cartItem.deleteMany({
        where: { userId, id: { in: cartItemIds.map(String) } },
      });
    }

    return { payment: updatedPayment, type: innerType, createdOrders };
  });

  for (let i = 0; i < apiDispatchQueue.length; i++) {
    const job = apiDispatchQueue[i];
    try {
      if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));
      const providerOrder = await placeKd1sOrder({
        serviceId: job.serviceId,
        link: job.link,
        quantity: job.quantity,
      });

      await prisma.order.update({
        where: { id: job.orderId },
        data: {
          providerOrderId: providerOrder.orderId,
          providerName: job.providerName,
          fulfillmentType: 'api',
          status: 'pending',
        },
      });
    } catch (err) {
      await prisma.order.update({
        where: { id: job.orderId },
        data: {
          status: 'cancelled',
          rejectionReason: `KD1S: ${err?.message || err}`,
        },
      });
    }
  }

  if (Array.isArray(result.createdOrders) && result.createdOrders.length > 0) {
    setImmediate(() => {
      Promise.all(
        result.createdOrders.map((order) =>
          notifyAdminsPush({
            order,
            extraData: { source: 'qi-payment' },
          })
        )
      ).catch((err) => console.warn('Failed to push admin notification', err));
    });
  }

  return { ok: true, payment: result.payment, status: 'succeeded', type, createdOrders: result.createdOrders };
};

// ------------------------------------------------------------
// @desc    Create Qi payment and return redirect URL
// @route   POST /api/payments/qi/create
// ------------------------------------------------------------
const createQi = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const { type, amount, orderPayload, cartMode, cartItemId, returnView, is_app } = req.body || {};

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  let meta = { type, returnView, is_app };
  let cartAmount = 0;

  if (type === 'topup') {
    cartAmount = Number(amount);
    meta.amount = cartAmount;
  } else if (type === 'single') {
    const p = orderPayload || {};
    const product = await prisma.product.findUnique({ where: { id: normalizeId(p.productId) } });
    const price = computePrice(product, p.denominationId, p.selectedDenomination, p.amount || p.price);
    cartAmount = price;
    meta.orderPayload = { ...p, amount: price };
  } else if (type === 'cart') {
    let items = cartMode === 'single' 
      ? await prisma.cartItem.findMany({ where: { id: String(cartItemId), userId } })
      : await prisma.cartItem.findMany({ where: { userId } });
    
    const mapped = items.map(i => ({
      productId: i.productId,
      productName: i.name,
      productCategory: i.category,
      amount: Number(i.price || 0),
      fulfillmentType: i.apiConfig?.type || 'manual',
      customInputValue: i.customInputValue,
      quantity: i.quantity || 1
    }));
    cartAmount = mapped.reduce((s, x) => s + x.amount, 0);
    meta.items = mapped;
    meta.cartItemIds = items.map(x => x.id);
  }

  const payment = await prisma.payment.create({
    data: {
      id: generateShortId(),
      userId,
      amount: cartAmount,
      currency: 'IQD',
      status: 'pending',
      provider: 'qi',
      method: 'card',
      cardLast4: JSON.stringify(meta),
    },
  });

  try {
    const qiRes = await createQiPayment({
      requestId: payment.id,
      amount: cartAmount,
      currency: 'IQD',
      finishPaymentUrl: getReturnUrl(),
      notificationUrl: getCallbackUrl(),
    });

    if (qiRes?.formUrl) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { transactionId: qiRes.paymentId },
      });
      res.json({ success: true, redirect_url: qiRes.formUrl, paymentId: payment.id });
    } else {
      throw new Error('Qi failed to return formUrl');
    }
  } catch (err) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed', failureReason: err.message },
    });
    throw err;
  }
});

// ------------------------------------------------------------
// @desc    Qi Webhook Callback
// @route   POST /api/payments/qi/callback
// ------------------------------------------------------------
const qiCallback = asyncHandler(async (req, res) => {
  const signature = req.headers['x-signature'];
  const publicKey = process.env.QI_PUBLIC_KEY;
  const payload = req.body;

  const isValid = verifyQiSignature(payload, signature, publicKey);
  if (!isValid) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }

  const { requestId, paymentId, status } = payload;
  await finalizePayment({ paymentId: requestId, qiPaymentId: paymentId, qiStatus: status });
  res.json({ success: true });
});

// ------------------------------------------------------------
// @desc    Qi Return Redirect
// @route   ALL /api/payments/qi/return
// ------------------------------------------------------------
const qiReturn = asyncHandler(async (req, res) => {
  const { requestId, paymentId, status } = req.query;
  const payment = await prisma.payment.findUnique({ where: { id: String(requestId) } });
  
  const meta = safeJsonParse(payment?.cardLast4, {});
  const isApp = meta?.is_app === true || meta?.is_app === 'true';
  
  await finalizePayment({ paymentId: requestId, qiPaymentId: paymentId, qiStatus: status });

  const frontendUrl = getFrontendReturnUrl({ qi_payment_id: requestId, status }, meta?.type, isApp);
  res.redirect(frontendUrl);
});

const qiStatus = asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({ where: { id: req.params.paymentId } });
  res.json({ success: true, status: payment?.status, paymentId: payment?.id });
});

module.exports = {
  createQi,
  qiCallback,
  qiReturn,
  qiStatus,
  processCardPayment: async (req, res) => res.json({ success: true }) // Mock
};
