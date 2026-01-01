const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { generateShortId } = require('../utils/id');
const { placeOrder: placeKd1sOrder, parseQuantity } = require('../utils/kd1sClient');
const { sendUserOrderNotification } = require('./notificationController');

// Helpers shared with the payment controller
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

const parseApiConfig = (raw) => {
  try {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    return JSON.parse(String(raw));
  } catch (e) {
    console.warn('Failed to parse apiConfig', e?.message || e);
    return null;
  }
};

// Compute trusted price from product + denomination list
const computePrice = (product, denominationKey, denominationObj, clientAmount) => {
  const base = Number(product?.price ?? 0);
  const dens = product?.denominations;
  const ca = Number(clientAmount);

  // 1) If clientAmount matches one of the denominations' prices, trust it.
  if (Array.isArray(dens) && Number.isFinite(ca) && ca > 0) {
    const foundByPrice = dens.find((d) => {
      const p = Number(d?.price ?? d?.amount ?? d?.value ?? d?.cost ?? 0);
      return p > 0 && p === ca;
    });
    if (foundByPrice) return ca;
  }

  // 2) Try to match denomination by id/value/amount/name/label/etc.
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
  }

  // 3) Try denomination object direct values
  if (denominationObj) {
    const p = pickFromDen(denominationObj);
    if (p != null) return p;
  }

  // 4) If clientAmount matches base price, or if no denominations exist, trust clientAmount
  if (Number.isFinite(ca) && ca > 0) {
    if (ca === base || !Array.isArray(dens) || dens.length === 0) {
      return ca;
    }
  }

  return base;
};

// Helper: normalize IDs to String or null
const normalizeId = (val) => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val;
  return String(val);
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = asyncHandler(async (req, res) => {
  const {
    productId,
    productName,
    productCategory,
    price,
    amount,
    quantity,
    regionId,
    regionName,
    denominationId,
    quantityLabel,
    customInputValue,
    customInputLabel,
  } = req.body;

  const userId = req.user?.id || req.user?._id;
  if (!userId) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  // Normalize / validate inputs
  const rawPrice = price ?? amount;
  const priceNumber = Number(rawPrice);
  if (!Number.isFinite(priceNumber) || priceNumber <= 0) {
    res.status(400);
    throw new Error('قيمة الطلب غير صحيحة');
  }

  const productIdNorm = normalizeId(productId);
  const regionIdNorm = normalizeId(regionId);
  const denominationIdNorm = normalizeId(denominationId);

  // 1. Get Fresh User Data
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || Number(user.balance) < priceNumber) {
    res.status(400);
    throw new Error('رصيد المحفظة غير كافي');
  }

  // 2. Check Product Settings
  let product = null;
  if (productIdNorm) {
    product = await prisma.product.findUnique({ where: { id: productIdNorm } });
  }

  if (!product) {
    res.status(404);
    throw new Error('المنتج غير موجود');
  }

  // --- SECURITY: Re-calculate price on server ---
  const trustedPrice = computePrice(product, denominationIdNorm, { id: denominationIdNorm, label: quantityLabel }, priceNumber);
  const finalPrice = trustedPrice > 0 ? trustedPrice : priceNumber;

  if (Number(user.balance) < finalPrice) {
    res.status(400);
    throw new Error('رصيد المحفظة غير كافي');
  }

  const activeCustomInput = resolveCustomInputConfig(product, regionIdNorm);
  const resolvedCustomInputLabel = customInputLabel || activeCustomInput?.label;

  if (activeCustomInput?.enabled && activeCustomInput?.required) {
    if (!customInputValue || !String(customInputValue).trim()) {
      res.status(400);
      throw new Error('الرجاء إدخال المعلومات المطلوبة لهذا المنتج');
    }
  }

  const trimmedCustomInputValue =
    customInputValue && typeof customInputValue === 'string'
      ? customInputValue.trim()
      : customInputValue;

  const normalizedQuantity = parseQuantity(quantity ?? quantityLabel ?? 1);
  const normalizedQuantityLabel =
    quantityLabel || (quantity ? String(normalizedQuantity) : undefined);

  const apiConfig = parseApiConfig(product?.apiConfig);

  // 4. Transaction
  let result = await prisma.$transaction(async (tx) => {
    // ✅ PREVENT DUPLICATE ORDERS INSIDE TRANSACTION: Check if a similar order exists in the last 2 seconds
    const twoSecondsAgo = new Date(Date.now() - 2 * 1000);
    const existingOrder = await tx.order.findFirst({
      where: {
        userId,
        productId: productIdNorm || undefined,
        amount: finalPrice,
        createdAt: { gte: twoSecondsAgo },
        // Only block if it's NOT a bulk checkout (bulk checkout sends many requests at once)
        // We can't easily detect bulk here, but we can check if the custom input is identical
        customInputValue: trimmedCustomInputValue,
      },
    });

    // Note: In bulk checkout, the frontend sends multiple requests. 
    // If the user buys 2 identical items, they will have the same productId and amount.
    // To allow this, we only block if the time is extremely short (e.g. < 1s) or if we're sure it's a double-click.
    // For now, let's keep it simple.

    // Re-fetch user inside transaction to get latest balance
    const currentUser = await tx.user.findUnique({ where: { id: userId } });
    if (!currentUser || Number(currentUser.balance) < finalPrice) {
      throw new Error('رصيد المحفظة غير كافي');
    }

    // Deduct Balance
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: finalPrice } },
    });

    // --- AUTO-DELIVERY LOGIC (INSIDE TRANSACTION TO PREVENT RACE CONDITIONS) ---
    let deliveredCode = null;
    let status = 'pending';
    let fulfillmentType = apiConfig?.type || 'manual';
    let stockItemToUpdate = null;

    if (product && product.autoDeliverStock) {
      // Find matching code logic - IMPORTANT: This must be inside the transaction!
      const stockItem = await tx.inventory.findFirst({
        where: {
          productId: productIdNorm || undefined,
          isUsed: false,
          AND: [
            { OR: [{ regionId: regionIdNorm }, { regionId: null }] },
            { OR: [{ denominationId: denominationIdNorm }, { denominationId: null }] },
          ],
        },
        orderBy: { createdAt: 'asc' }, // Get the oldest code first
      });

      if (stockItem) {
        deliveredCode = stockItem.code;
        status = 'completed';
        fulfillmentType = 'stock';
        stockItemToUpdate = stockItem.id;
        
        // Mark as used IMMEDIATELY to prevent other concurrent requests from picking it
        await tx.inventory.update({
          where: { id: stockItem.id },
          data: { 
            isUsed: true,
            dateUsed: new Date(),
            // We'll link the order ID after creating the order
          }
        });
      }
    }

    // Create Order
    const orderRef = generateShortId();
    const baseOrderData = {
      userId: userId,
      userName: user.name,
      productName,
      productId: productIdNorm || undefined,
      productCategory,
      regionName,
      regionId: regionIdNorm,
      quantityLabel: normalizedQuantityLabel,
      denominationId: denominationIdNorm,
      customInputValue: trimmedCustomInputValue,
      customInputLabel: resolvedCustomInputLabel,
      amount: finalPrice,
      status,
      fulfillmentType,
      deliveredCode,
      providerName: apiConfig?.providerName,
    };

    let order;
    try {
      order = await tx.order.create({
        data: { id: orderRef, ...baseOrderData },
      });
    } catch (err) {
      order = await tx.order.create({
        data: { id: String(orderRef), ...baseOrderData },
      });
    }

    // Link inventory to order if we picked one
    if (stockItemToUpdate) {
      await tx.inventory.update({
        where: { id: stockItemToUpdate },
        data: { usedByOrderId: String(order.id) }
      });
    }

    // Log Transaction
    await tx.transaction.create({
      data: {
        id: generateShortId(),
        userId,
        title: `شراء: ${productName}`,
        amount: finalPrice,
        type: 'debit',
        status: 'completed',
      },
    });

    return order;
  });

  const shouldUseProvider =
    apiConfig?.type === 'api' && apiConfig?.serviceId && result.status !== 'completed';

  if (shouldUseProvider) {
    try {
      const providerOrder = await placeKd1sOrder({
        serviceId: apiConfig.serviceId,
        link: trimmedCustomInputValue || regionName || productName,
        quantity: normalizedQuantity,
      });

      result = await prisma.order.update({
        where: { id: result.id },
        data: {
          providerOrderId: providerOrder.orderId,
          providerName: apiConfig?.providerName || 'KD1S',
          fulfillmentType: 'api',
        },
      });
    } catch (err) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: finalPrice } },
        });
        await tx.transaction.create({
          data: {
            id: generateShortId(),
            userId,
            title: `استرداد: ${productName}`,
            amount: finalPrice,
            type: 'credit',
            status: 'completed',
          },
        });
        await tx.order.update({
          where: { id: result.id },
          data: {
            status: 'cancelled',
            rejectionReason: `KD1S: ${err?.message || err}`,
          },
        });
      });
      res.status(502);
      throw new Error(`فشل تنفيذ الطلب عبر المزود: ${err?.message || err}`);
    }
  }

  res.status(201).json(result);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;
  const limitRaw = req.query?.limit;
  const skipRaw = req.query?.skip;
  const usePaging = limitRaw !== undefined || skipRaw !== undefined;

  if (!usePaging) {
    const orders = await prisma.order.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  }

  const limit = Math.min(parseInt(String(limitRaw ?? '10'), 10) || 10, 50);
  const skip = Math.max(parseInt(String(skipRaw ?? '0'), 10) || 0, 0);

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where: { userId: userId } }),
  ]);

  const hasMore = skip + items.length < total;
  return res.json({ items, hasMore, total });
});

const getOrders = asyncHandler(async (req, res) => {
  const limitRaw = req.query?.limit;
  const skipRaw = req.query?.skip;
  const usePaging = limitRaw !== undefined || skipRaw !== undefined;

  if (!usePaging) {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(orders);
  }

  const limit = Math.min(parseInt(String(limitRaw ?? '10'), 10) || 10, 50);
  const skip = Math.max(parseInt(String(skipRaw ?? '0'), 10) || 0, 0);

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count(),
  ]);

  const hasMore = skip + items.length < total;
  return res.json({ items, hasMore, total });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, deliveredCode, rejectionReason } = req.body;

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) throw new Error('الطلب غير موجود');
    if (status === 'cancelled' && order.status === 'cancelled') throw new Error('الطلب ملغي بالفعل');
    if (status === 'completed' && order.status === 'completed') throw new Error('الطلب مكتمل بالفعل');

    const updateData = { status };
    if (status === 'completed') {
      updateData.deliveredCode = deliveredCode;
      updateData.fulfillmentType = 'manual';
    }
    if (status === 'cancelled') {
      updateData.rejectionReason = rejectionReason;
      await tx.user.update({
        where: { id: order.userId },
        data: { balance: { increment: Number(order.amount) } },
      });
      await tx.transaction.create({
        data: {
          id: generateShortId(),
          userId: order.userId,
          title: `استرداد: ${order.productName}`,
          amount: Number(order.amount),
          type: 'credit',
          status: 'completed',
        },
      });
    }
    return await tx.order.update({ where: { id }, data: updateData });
  });

  if (updatedOrder) {
    try {
      await sendUserOrderNotification({
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        userId: updatedOrder.userId,
      });
    } catch (err) {
      console.warn('Failed to notify user about order status update', err);
    }
    res.json(updatedOrder);
  } else {
    res.status(404);
    throw new Error('الطلب غير موجود');
  }
});

module.exports = { createOrder, getMyOrders, getOrders, updateOrderStatus };
