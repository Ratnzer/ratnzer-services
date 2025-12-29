const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { generateShortId } = require('../utils/id');
const {
  createPaytabsPayment,
  queryPaytabsPayment,
} = require('../utils/paytabs');
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

const parseApiConfig = (raw) => {
  try {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    return JSON.parse(String(raw));
  } catch (err) {
    console.warn('Failed to parse product apiConfig', err?.message || err);
    return null;
  }
};

const normalizeId = (val) => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val;
  return String(val);
};

// Compute trusted price from product + denomination list
const computePrice = (product, denominationKey, denominationObj, clientAmount) => {
  const base = Number(product?.price ?? 0);
  const dens = product?.denominations;

  // 1) Try to match denomination by id/value/amount/name/label/etc.
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

    // If wanted is a string like "10 IQD" or "$10", try extracting a number and match by amount/value
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

  // 2) Try denomination object direct values
  if (denominationObj) {
    const p = pickFromDen(denominationObj);
    if (p != null) return p;
  }

  // 3) Fallback: if clientAmount matches one of denominations, accept it (prevents "base price only" bug)
  const ca = Number(clientAmount);
  if (Array.isArray(dens) && Number.isFinite(ca) && ca > 0) {
    const foundByClient = dens.find((d) => {
      const cand = pickFromDen(d);
      return cand != null && Number(cand) === ca;
    });
    const pc = foundByClient ? pickFromDen(foundByClient) : null;
    if (pc != null) return pc;
  }


  // 3b) If denominations are missing/not an array but the client provided an amount with a selected denomination,
  // accept the clientAmount (prevents "base price only" for legacy product JSON).
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
  return `${base.replace(/\/$/, '')}/api/payments/paytabs/callback`;
};

const getReturnUrl = () => {
  if (process.env.APP_RETURN_URL) return process.env.APP_RETURN_URL;
  const base = process.env.APP_BASE_URL;
  if (!base) return undefined;
  return `${base.replace(/\/$/, '')}/api/payments/paytabs/return`;
};

const getFrontendReturnUrl = (params) => {
  // Capacitor default local origin (androidScheme: https)
  const qs = new URLSearchParams(params || {}).toString();
  return `https://localhost/?${qs}`;
};

const buildCustomerDetails = (user) => {
  const name = user?.name || 'Customer';
  const email = user?.email || `${user?.id || 'user'}@example.com`;
  const phone = user?.phone || '0000000000';

  // Minimal, safe defaults (PayTabs requires address fields)
  return {
    name,
    email,
    phone,
    street1: 'N/A',
    city: 'Baghdad',
    state: 'Baghdad',
    country: 'IQ',
    zip: '00000',
  };
};

const isApprovedFromQuery = (q) => {
  const status = String(q?.payment_result?.response_status ?? '').toUpperCase();
  // PayTabs commonly uses "A" for approved
  return status === 'A' || status === 'APPROVED' || status === 'SUCCESS';
};

const isDeclinedFromQuery = (q) => {
  const status = String(q?.payment_result?.response_status ?? '').toUpperCase();
  return status === 'D' || status === 'DECLINED' || status === 'FAILED' || status === 'E';
};

// ------------------------------------------------------------
// Finalize payment (idempotent)
// ------------------------------------------------------------
const finalizePayment = async ({ paymentId, tranRef, queryResult }) => {
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

  // If query says declined -> mark failed
  if (queryResult && isDeclinedFromQuery(queryResult)) {
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'failed',
        transactionId: tranRef || payment.transactionId,
      },
    });
    return { ok: true, payment: updated, status: 'failed', type };
  }

  if (!queryResult || !isApprovedFromQuery(queryResult)) {
    // still pending / unknown
    return { ok: true, payment, status: 'pending', type };
  }

  const amountNumber = Number(payment.amount || 0);
  const userId = payment.userId;
  const apiDispatchQueue = [];

  const result = await prisma.$transaction(async (tx) => {
    // Re-fetch with lock-ish behavior inside transaction
    const freshPayment = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!freshPayment) throw new Error('Payment not found');
    if (String(freshPayment.status).toLowerCase() === 'succeeded') {
      return { payment: freshPayment, already: true };
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const metaInner = safeJsonParse(freshPayment.cardLast4, {});
    const innerType = metaInner?.type || 'unknown';

    // Mark payment succeeded first
    const updatedPayment = await tx.payment.update({
      where: { id: freshPayment.id },
      data: {
        status: 'succeeded',
        provider: 'paytabs',
        method: 'card',
        transactionId: tranRef || freshPayment.transactionId,
      },
    });

    // --- TOPUP ---
    if (innerType === 'topup') {
      await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: amountNumber } },
      });

      await tx.transaction.create({
        data: {
          id: generateShortId(),
          userId,
          title: 'شحن رصيد',
          amount: amountNumber,
          type: 'credit',
          status: 'completed',
          description: 'شحن عبر PayTabs (Visa/Mastercard)',
          paymentId: updatedPayment.id,
        },
      });

      return { payment: updatedPayment, type: innerType };
    }

    // --- ORDERS (single/cart) ---
    const items = Array.isArray(metaInner?.items)
      ? metaInner.items
      : metaInner?.orderPayload
      ? [metaInner.orderPayload]
      : [];

    const createdOrders = [];

    for (const it of items) {
      const productIdNorm = normalizeId(it?.productId);
      const priceNumber = Number(it?.amount ?? it?.price ?? 0);
      if (!Number.isFinite(priceNumber) || priceNumber <= 0) continue;

      let product = null;
      if (productIdNorm) {
        product = await tx.product.findUnique({ where: { id: productIdNorm } });
      }

      let deliveredCode = null;
      let status = 'pending';
      let fulfillmentType = 'manual';

      const apiConfig = parseApiConfig(product?.apiConfig);

      // infer fulfillment type if possible
      if (apiConfig?.type) {
        fulfillmentType = apiConfig.type;
      }

      let stockItemToUpdate = null;

      if (product && product.autoDeliverStock) {
        const regionIdNorm = normalizeId(it?.regionId);
        const denominationIdNorm = normalizeId(it?.denominationId);
        const stockItem = await tx.inventory.findFirst({
          where: {
            productId: productIdNorm || undefined,
            isUsed: false,
            AND: [
              { OR: [{ regionId: regionIdNorm }, { regionId: null }] },
              { OR: [{ denominationId: denominationIdNorm }, { denominationId: null }] },
            ],
          },
        });

        if (stockItem) {
          deliveredCode = stockItem.code;
          status = 'completed';
          fulfillmentType = 'stock';
          stockItemToUpdate = stockItem.id;
        }
      }

      const orderRef = generateShortId();
      const baseOrderData = {
        userId,
        userName: user.name,
        productName: it?.productName || product?.name || 'منتج',
        productId: productIdNorm || undefined,
        productCategory: it?.productCategory || product?.category || undefined,
        regionName: it?.regionName || undefined,
        regionId: normalizeId(it?.regionId),
        quantityLabel: it?.quantityLabel || undefined,
        denominationId: normalizeId(it?.denominationId),
        customInputValue: it?.customInputValue || undefined,
        customInputLabel: it?.customInputLabel || undefined,
        amount: priceNumber,
        status,
        fulfillmentType,
        deliveredCode,
        providerName: apiConfig?.providerName,
      };

      let order;
      try {
        order = await tx.order.create({ data: { id: orderRef, ...baseOrderData } });
      } catch (err) {
        const msg = String(err?.message || '');
      const idTypeProblem =
          msg.includes('Argument `id`') ||
          msg.includes('Argument id') ||
          msg.includes('Invalid value') ||
          msg.includes('Expected') ||
          msg.includes('Int') ||
          msg.includes('UUID') ||
          msg.includes('cuid') ||
          msg.includes('uuid');

        if (!idTypeProblem) throw err;

        order = await tx.order.create({ data: { id: String(orderRef), ...baseOrderData } });
      }

      if (stockItemToUpdate) {
        try {
          await tx.inventory.update({
            where: { id: stockItemToUpdate },
            data: {
              isUsed: true,
              usedByOrderId:
                typeof order.id === 'string' || typeof order.id === 'number'
                  ? order.id
                  : String(orderRef),
              dateUsed: new Date(),
            },
          });
        } catch {
          await tx.inventory.update({
            where: { id: stockItemToUpdate },
            data: { isUsed: true, dateUsed: new Date() },
          });
        }
      }

      await tx.transaction.create({
        data: {
          id: generateShortId(),
          userId,
          title: `شراء: ${baseOrderData.productName}`,
          amount: priceNumber,
          type: 'debit',
          status: 'completed',
          paymentId: updatedPayment.id,
        },
      });

      if (apiConfig?.type === 'api' && apiConfig?.serviceId && !deliveredCode) {
        const quantity = parseQuantity(
          it?.quantity ?? it?.selectedDenomination?.amount ?? it?.quantityLabel ?? 1
        );
        apiDispatchQueue.push({
          orderId: order.id,
          serviceId: apiConfig.serviceId,
          providerName: apiConfig.providerName || 'KD1S',
          link: it?.customInputValue || it?.regionName || baseOrderData.productName,
          quantity,
        });
      }

      createdOrders.push(order);
    }

    // Clear cart items if provided
    const cartItemIds = Array.isArray(metaInner?.cartItemIds) ? metaInner.cartItemIds : null;
    if (cartItemIds && cartItemIds.length > 0) {
      await tx.cartItem.deleteMany({
        where: { userId, id: { in: cartItemIds.map(String) } },
      });
    }

    return { payment: updatedPayment, type: innerType, createdOrders };
  });

  // Dispatch provider orders (KD1S) after payment success
  for (const job of apiDispatchQueue) {
    try {
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

  // Fire-and-forget admin push for any created orders (card purchases)
  if (Array.isArray(result.createdOrders) && result.createdOrders.length > 0) {
    // Fire notifications in the background so payment confirmation is immediate
    setImmediate(() => {
      Promise.all(
        result.createdOrders.map((order) =>
          notifyAdminsPush({
            order,
            extraData: { source: 'card-payment' },
          })
        )
      ).catch((err) => {
        console.warn('Failed to push admin notification for card order', err);
      });
    });
  }

  return { ok: true, payment: result.payment, status: 'succeeded', type, createdOrders: result.createdOrders };
};

// ------------------------------------------------------------
// @desc    Create PayTabs payment and return redirect URL
// @route   POST /api/payments/paytabs/create
// @access  Private
// ------------------------------------------------------------
const createPaytabs = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  const {
    type, // topup | single | cart
    amount,
    orderPayload,
    cartMode, // bulk | single
    cartItemId,
    returnView, // home | cart | wallet ... (frontend hint)
  } = req.body || {};

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const paytabsCurrency = process.env.PAYTABS_CURRENCY || 'IQD';
  const usdToIqdRate = Number(process.env.PAYTABS_USD_TO_IQD_RATE || 1320);
  const profileId = String(process.env.PAYTABS_PROFILE_ID || '').trim();
  if (!profileId) {
    res.status(500);
    throw new Error('PAYTABS_PROFILE_ID is missing');
  }

  let meta = { type, returnView };
  let cartAmount = 0;

  if (type === 'topup') {
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) {
      res.status(400);
      throw new Error('Invalid amount');
    }
    cartAmount = a;
    meta.amount = a;
  } else if (type === 'single') {
    const p = orderPayload || {};
    const productId = normalizeId(p.productId);
    if (!productId) {
      res.status(400);
      throw new Error('productId is required');
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const denomKey = p.denominationId != null ? String(p.denominationId) : null;
    const trusted = computePrice(product, denomKey, p?.selectedDenomination, p?.amount ?? p?.price);
    const price = Number(trusted);
    if (!Number.isFinite(price) || price <= 0) {
      res.status(400);
      throw new Error('Invalid product price');
    }

    cartAmount = price;
    meta.orderPayload = {
      ...p,
      productId,
      productName: p.productName || product.name,
      productCategory: p.productCategory || product.category,
      amount: price,
    };
  } else if (type === 'cart') {
    let items = [];
    if (cartMode === 'single') {
      if (!cartItemId) {
        res.status(400);
        throw new Error('cartItemId is required');
      }
      const ci = await prisma.cartItem.findFirst({
        where: { id: String(cartItemId), userId },
      });
      if (!ci) {
        res.status(404);
        throw new Error('Cart item not found');
      }
      items = [ci];
    } else {
      // bulk
      items = await prisma.cartItem.findMany({ where: { userId } });
      if (!items || items.length === 0) {
        res.status(400);
        throw new Error('Cart is empty');
      }
    }

    const mapped = items.map((i) => ({
      productId: i.productId,
      productName: i.name,
      productCategory: i.category,
      amount: Number(i.price || 0),
      price: Number(i.price || 0),
      fulfillmentType: i.apiConfig?.type || 'manual',
      regionName: i.selectedRegion?.name,
      regionId: i.selectedRegion?.id,
      denominationId: i.selectedDenomination?.id,
      quantityLabel: i.selectedDenomination?.label,
      quantity: Number(i.quantity) || null,
      customInputValue: i.customInputValue,
      customInputLabel: i.customInputLabel,
    }));

    cartAmount = mapped.reduce((s, x) => s + (Number(x.amount) || 0), 0);
    if (!Number.isFinite(cartAmount) || cartAmount <= 0) {
      res.status(400);
      throw new Error('Invalid cart amount');
    }

    meta.items = mapped;
    meta.cartItemIds = items.map((x) => x.id);
  } else {
    res.status(400);
    throw new Error('Invalid type');
  }

  // Create local payment record first
  const payment = await prisma.payment.create({
    data: {
      id: generateShortId(),
      userId,
      amount: Number(cartAmount),
      method: 'card',
      provider: 'paytabs',
      status: 'pending',
      // We store gateway meta as JSON string in cardLast4 (no schema change)
      cardLast4: JSON.stringify(meta),
    },
  });

  // Build PayTabs request
  const customer = buildCustomerDetails(user);
  const callback = getCallbackUrl();
  const ret = getReturnUrl();

  if (!callback || !ret) {
    // Mark failed & tell operator
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });
    res.status(500);
    throw new Error('APP_BASE_URL / APP_CALLBACK_URL / APP_RETURN_URL is missing');
  }

  const cartAmountNumber = Number(cartAmount);
  const paytabsAmountRaw =
    (paytabsCurrency || '').toUpperCase() === 'IQD'
      ? cartAmountNumber * usdToIqdRate
      : cartAmountNumber;
  const paytabsCartAmount = Number(paytabsAmountRaw.toFixed(2));

  if (!Number.isFinite(paytabsCartAmount) || paytabsCartAmount <= 0) {
    res.status(400);
    throw new Error('Invalid PayTabs amount');
  }

  const paytabsPayload = {
    profile_id: profileId,
    tran_type: 'sale',
    tran_class: 'ecom',
    cart_id: payment.id,
    cart_description: String(type || 'payment'),
    cart_currency: paytabsCurrency,
    cart_amount: paytabsCartAmount,
    callback: callback,
    return: ret,
    customer_details: customer,
    shipping_details: customer,
    hide_shipping: true,
  };

  try {
    const paytabsRes = await createPaytabsPayment(paytabsPayload);
    const redirectUrl = paytabsRes?.redirect_url;
    const tranRef = paytabsRes?.tran_ref;

    if (!redirectUrl || !tranRef) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed', transactionId: tranRef || null },
      });
      res.status(502);
      throw new Error('PayTabs did not return redirect_url');
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: { transactionId: tranRef },
    });

    res.json({
      paymentId: payment.id,
      tranRef,
      redirectUrl,
    });
  } catch (err) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });
    res.status(502);
    throw new Error(`PayTabs error: ${String(err?.message || err)}`);
  }
});

// ------------------------------------------------------------
// @desc    PayTabs callback (server-to-server)
// @route   POST /api/payments/paytabs/callback
// @access  Public
// ------------------------------------------------------------
const paytabsCallback = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const query = req.query || {};

  const tranRef = body.tran_ref || body.tranRef || query.tran_ref || query.tranRef || null;
  const cartId = body.cart_id || body.cartId || query.cart_id || query.cartId || null;

  if (!tranRef && !cartId) {
    return res.status(200).json({ ok: true });
  }

  // Prefer cart id if present
  const paymentId = cartId || undefined;

  // Query PayTabs to verify
  try {
    const q = await queryPaytabsPayment({
      profile_id: process.env.PAYTABS_PROFILE_ID,
      tran_ref: tranRef,
    });

    const resolvedPaymentId = paymentId || q?.cart_id || q?.cartId;

    if (!resolvedPaymentId) {
      return res.status(200).json({ ok: true });
    }

    await finalizePayment({ paymentId: resolvedPaymentId, tranRef, queryResult: q });
    return res.status(200).json({ ok: true });
  } catch (e) {
    // Always 200 to avoid gateway retries storm, but log server-side
    console.error('PayTabs callback error:', e?.message || e);
    return res.status(200).json({ ok: true });
  }
});

// ------------------------------------------------------------
// @desc    PayTabs return (user browser redirect)
// @route   ALL /api/payments/paytabs/return
// @access  Public
// ------------------------------------------------------------
const paytabsReturn = asyncHandler(async (req, res) => {
  const src = { ...(req.query || {}), ...(req.body || {}) };
  const tranRef = src.tran_ref || src.tranRef || null;
  const cartId = src.cart_id || src.cartId || null;

  let returnView = 'home';
  let paymentId = cartId;

  if (paymentId) {
    try {
      const p = await prisma.payment.findUnique({ where: { id: String(paymentId) } });
      const meta = safeJsonParse(p?.cardLast4, {});
      if (meta?.returnView) returnView = meta.returnView;
    } catch {}
  }

  const frontendUrl = getFrontendReturnUrl({
    pt_payment_id: paymentId || '',
    pt_tran_ref: tranRef || '',
    pt_return_view: returnView || 'home',
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="ar">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>العودة إلى التطبيق</title>
  <style>
    body{background:#0f111a;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .box{max-width:420px;padding:24px;border-radius:18px;background:#1b1e2b;border:1px solid rgba(255,255,255,.08);text-align:center}
    a{color:#facc15;text-decoration:none;font-weight:700}
  </style>
</head>
<body>
  <div class="box">
    <h2 style="margin:0 0 12px">جاري العودة للتطبيق…</h2>
    <p style="margin:0 0 16px;color:rgba(255,255,255,.7)">إذا لم يتم تحويلك تلقائيًا اضغط الرابط أدناه</p>
    <p style="margin:0"><a href="${frontendUrl}">العودة للتطبيق</a></p>
  </div>
  <script>setTimeout(function(){ window.location.replace(${JSON.stringify(frontendUrl)}); }, 50);</script>
</body>
</html>`);
});

// ------------------------------------------------------------
// @desc    PayTabs status (and fallback finalize)
// @route   GET /api/payments/paytabs/status/:paymentId
// @access  Private
// ------------------------------------------------------------
const paytabsStatus = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  const paymentId = String(req.params.paymentId || '');
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.userId !== userId) {
    res.status(404);
    throw new Error('Payment not found');
  }

  const meta = safeJsonParse(payment.cardLast4, {});
  const type = meta?.type || 'unknown';
  const returnView = meta?.returnView || 'home';

  let status = String(payment.status || 'pending').toLowerCase();
  let gatewayStatus = undefined;

  // If pending and we have tran ref, query gateway and finalize if approved
  if (status === 'pending' && payment.transactionId) {
    try {
      const q = await queryPaytabsPayment({
        profile_id: process.env.PAYTABS_PROFILE_ID,
        tran_ref: payment.transactionId,
      });
      gatewayStatus = q?.payment_result?.response_status;

      const fin = await finalizePayment({
        paymentId,
        tranRef: payment.transactionId,
        queryResult: q,
      });

      status = String(fin?.status || status).toLowerCase();
    } catch (e) {
      // ignore query failures
    }
  }

  res.json({
    paymentId,
    status,
    type,
    returnView,
    gatewayStatus,
  });
});

module.exports = {
  // Legacy / demo endpoint (kept so older frontend code doesn't break)
  processCardPayment: asyncHandler(async (req, res) => {
    const { amount } = req.body || {};
    const userId = req.user?.id;
    const num = Number(amount);
    if (!userId) {
      res.status(401);
      throw new Error('Unauthorized');
    }
    if (!Number.isFinite(num) || num <= 0) {
      res.status(400);
      throw new Error('المبلغ غير صالح');
    }

    // This endpoint is deprecated in the app UI, but we keep it working.
    const payment = await prisma.payment.create({
      data: {
        id: generateShortId(),
        userId,
        amount: num,
        method: 'card',
        provider: 'legacy_mock',
        status: 'succeeded',
        transactionId: `legacy_${Date.now()}`,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { balance: { increment: num } } });
      await tx.transaction.create({
        data: {
          id: generateShortId(),
          userId,
          title: 'شحن رصيد',
          amount: num,
          type: 'credit',
          status: 'completed',
          description: 'شحن (Legacy Mock)',
          paymentId: payment.id,
        },
      });
    });

    res.json({ success: true, message: 'تمت عملية الدفع بنجاح (Legacy)', paymentId: payment.id });
  }),
  createPaytabs,
  paytabsCallback,
  paytabsReturn,
  paytabsStatus,
};
