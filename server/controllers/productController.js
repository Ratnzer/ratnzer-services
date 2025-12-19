const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { validationResult } = require('express-validator');

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Ensure every denomination has a numeric `price` field.
 * Accepts legacy fields: amount, value, cost, denomination.
 */
function normalizeDenominations(denoms) {
  if (!Array.isArray(denoms)) return denoms;
  return denoms.map((d) => {
    if (!d || typeof d !== 'object') return d;
    const price =
      toNumber(d.price) ??
      toNumber(d.amount) ??
      toNumber(d.value) ??
      toNumber(d.cost) ??
      toNumber(d.denomination);

    return {
      ...d,
      // Always store as `price` for consistency across the app
      price: price ?? 0,
    };
  });
}

function normalizeProductBody(body) {
  const safe = { ...(body || {}) };
  // Base price removed from DB
  if ('price' in safe) delete safe.price;

  if ('denominations' in safe) {
    safe.denominations = normalizeDenominations(safe.denominations);
  }
  return safe;
}

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Ensure legacy rows are served consistently (denominations[].price present)
  const normalized = products.map((p) => ({
    ...p,
    denominations: normalizeDenominations(p.denominations),
  }));

  res.json(normalized);
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  const data = normalizeProductBody(req.body);

  const product = await prisma.product.create({ data });
  res.status(201).json(product);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const existingProduct = await prisma.product.findUnique({ where: { id } });
  if (!existingProduct) {
    res.status(404);
    throw new Error('Product not found');
  }

  const data = normalizeProductBody(req.body);

  const updatedProduct = await prisma.product.update({
    where: { id },
    data,
  });

  res.json(updatedProduct);
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product removed' });
  } catch (error) {
    if (error.code === 'P2025') {
      res.status(404);
      throw new Error('Product not found');
    }
    throw error;
  }
});

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
