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

// Helper: normalize IDs to String or null (schema expects String/Nullable)
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
    // ✅ accept both "price" (old) and "amount" (new from frontend)
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

  // 3. Auto-Delivery Logic (Check Inventory)
  let deliveredCode = null;
  let status = 'pending';
  let fulfillmentType = 'manual';

  const apiConfig = parseApiConfig(product?.apiConfig);

  if (apiConfig?.type) {
    fulfillmentType = apiConfig.type;
  }

  let stockItemToUpdate = null;

  if (product && product.autoDeliverStock) {
    // Find matching code logic
    const stockItem = await prisma.inventory.findFirst({
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

  // 4. Transaction
  let result = await prisma.$transaction(async (tx) => {
    // Deduct Balance
    await tx.user.update({
      where: { id: userId },
      data: { balance: { decrement: priceNumber } },
    });

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
      amount: priceNumber,
      status,
      fulfillmentType,
      deliveredCode,
      providerName: apiConfig?.providerName,
    };

    // Some schemas use Int/uuid auto IDs. Try with a readable id first, then fallback if it errors.
    let order;
    try {
      order = await tx.order.create({
        data: { id: orderRef, ...baseOrderData },
      });
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

      // Fallback to numeric short id to avoid auto-generated long IDs
      order = await tx.order.create({
        data: { id: String(orderRef), ...baseOrderData },
      });
    }

    // Update Inventory (if auto-delivered)
    if (stockItemToUpdate) {
      const usedByOrderIdValue =
        typeof order.id === 'string' || typeof order.id === 'number'
          ? order.id
          : String(orderRef);

      try {
        await tx.inventory.update({
          where: { id: stockItemToUpdate },
          data: {
            isUsed: true,
            usedByOrderId: usedByOrderIdValue,
            dateUsed: new Date(),
          },
        });
      } catch (err) {
        const msg = String(err?.message || '');
        const usedByTypeProblem =
          msg.includes('usedByOrderId') ||
          msg.includes('Expected') ||
          msg.includes('Int') ||
          msg.includes('Invalid value');

        if (!usedByTypeProblem) throw err;

        // Fallback: mark as used without linking order id (prevents 500 if schema type differs)
        await tx.inventory.update({
          where: { id: stockItemToUpdate },
          data: {
            isUsed: true,
            dateUsed: new Date(),
          },
        });
      }
    }

    // Log Transaction
    await tx.transaction.create({
      data: {
        id: generateShortId(),
        userId,
        title: `شراء: ${productName}`,
        amount: priceNumber,
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
          status: result.status === 'pending' ? 'pending' : result.status,
        },
      });
    } catch (err) {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: priceNumber } },
        });

        await tx.transaction.create({
          data: {
            id: generateShortId(),
            userId,
            title: `استرداد: ${productName}`,
            amount: priceNumber,
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

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
// @desc    Get logged in user orders (supports pagination)
// @route   GET /api/orders/myorders?skip=0&limit=10
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.user?._id;

  const limitRaw = req.query?.limit;
  const skipRaw = req.query?.skip;

  // Backwards compatible: if no pagination params, return full array (old behavior)
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


// @desc    Get all orders (Admin)
// @route   GET /api/orders
// @access  Private/Admin
// @desc    Get all orders (admin) (supports pagination)
// @route   GET /api/orders?skip=0&limit=10
// @access  Private/Admin
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


// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, deliveredCode, rejectionReason } = req.body;

  const order = await prisma.order.findUnique({ where: { id } });

  if (order) {
    const updateData = { status };

    if (status === 'completed') {
      updateData.deliveredCode = deliveredCode;
      updateData.fulfillmentType = 'manual';
    }

    if (status === 'cancelled') {
      updateData.rejectionReason = rejectionReason;
      // Refund logic
      await prisma.$transaction(async (tx) => {
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
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    // Notify the user about the new status so their orders list reflects provider updates
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
