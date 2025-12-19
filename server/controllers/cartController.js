const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// Helper: compute trusted price from product + denomination
const computePrice = (product, denominationId, denominationObj) => {
  const densAll = product?.denominations;
  const base = Array.isArray(densAll)
    ? Math.min(...densAll.map((d) => Number(d?.price ?? d?.amount ?? d?.value ?? d?.cost ?? d?.denomination)).filter((n) => Number.isFinite(n) && n >= 0), Infinity)
    : 0;
  const safeBase = Number.isFinite(base) && base !== Infinity ? base : 0;

  // No denomination requested
  if (!denominationId && !denominationObj) return safeBase;

  const dens = product?.denominations;
  const wanted = denominationId ?? denominationObj?.id ?? denominationObj?.value ?? denominationObj?.name ?? null;

  // Try to find denomination in stored list (supports different shapes: id/value/name/amount)
  if (Array.isArray(dens) && wanted != null) {
    const found = dens.find((d) => {
      const key = d?.id ?? d?.value ?? d?.amount ?? d?.name ?? null;
      return key != null && String(key) === String(wanted);
    });

    if (found) {
      const p = Number(found.price ?? found.amount ?? found.value ?? found.cost ?? found.denomination);
      if (Number.isFinite(p) && p >= 0) return p;
    }
  }

  // Fallback: trust the denomination object price if provided (still validated)
  if (denominationObj && denominationObj.price != null) {
    const p = Number(denominationObj.price);
    if (Number.isFinite(p) && p >= 0) return p;
  }

  return safeBase;
};

// Helper: pick region/denomination objects from product lists when possible
const pickFromListById = (list, id) => {
  if (!id || !Array.isArray(list)) return null;
  return list.find((x) => String(x?.id) === String(id)) || null;
};

// @desc    Get my cart items
// @route   GET /api/cart
// @access  Private
const getMyCart = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  const items = await prisma.cartItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      productId: true,
      name: true,
      category: true,
      price: true,
      imageUrl: true,
      imageColor: true,
      quantity: true,
      apiConfig: true,
      selectedRegion: true,
      selectedDenomination: true,
      customInputValue: true,
      customInputLabel: true,
    },
  });

  res.json(items);
});

// @desc    Add item to my cart
// @route   POST /api/cart
// @access  Private
const addToCart = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  const {
    productId,
    quantity,
    // optional "snapshot" fields from frontend (we still prefer DB values)
    customInputValue,
    customInputLabel,
    apiConfig,
    selectedRegion,
    selectedDenomination,
    denominationId,
    regionId,
  } = req.body || {};

  if (!productId) {
    res.status(400);
    throw new Error('productId is required');
  }

  const product = await prisma.product.findUnique({ where: { id: String(productId) } });
  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Denomination/Region: prefer ids when provided
  const denomObj =
    selectedDenomination && selectedDenomination.id
      ? selectedDenomination
      : pickFromListById(product.denominations, denominationId || selectedDenomination?.id);

  const regionObj =
    selectedRegion && selectedRegion.id
      ? selectedRegion
      : pickFromListById(product.regions, regionId || selectedRegion?.id);

  const trustedPrice = computePrice(product, denomObj?.id || denominationId, denomObj);
  if (!Number.isFinite(trustedPrice) || trustedPrice < 0) {
    res.status(400);
    throw new Error('Invalid product price');
  }

  const qty = Number.isFinite(Number(quantity)) ? Math.max(1, Math.min(100, Number(quantity))) : 1;

  const created = await prisma.cartItem.create({
    data: {
      userId,
      productId: product.id,
      name: product.name,
      category: product.category,
      price: trustedPrice,
      imageUrl: product.imageUrl || null,
      imageColor: product.imageColor || 'from-gray-700 to-gray-900',
      quantity: qty,
      // snapshots (JSON)
      apiConfig: apiConfig ?? product.apiConfig ?? null,
      selectedRegion: regionObj ?? null,
      selectedDenomination: denomObj ?? null,
      customInputValue: customInputValue ?? null,
      customInputLabel: customInputLabel ?? null,
    },
    select: {
      id: true,
      productId: true,
      name: true,
      category: true,
      price: true,
      imageUrl: true,
      imageColor: true,
      quantity: true,
      apiConfig: true,
      selectedRegion: true,
      selectedDenomination: true,
      customInputValue: true,
      customInputLabel: true,
    },
  });

  res.status(201).json(created);
});

// @desc    Remove item from my cart
// @route   DELETE /api/cart/:id
// @access  Private
const removeFromCart = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  const id = String(req.params.id || '');
  if (!id) {
    res.status(400);
    throw new Error('id is required');
  }

  const result = await prisma.cartItem.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) {
    res.status(404);
    throw new Error('Cart item not found');
  }

  res.json({ message: 'Removed', id });
});

// @desc    Clear my cart
// @route   DELETE /api/cart
// @access  Private
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401);
    throw new Error('Unauthorized');
  }

  await prisma.cartItem.deleteMany({ where: { userId } });
  res.json({ message: 'Cleared' });
});

module.exports = {
  getMyCart,
  addToCart,
  removeFromCart,
  clearCart,
};
