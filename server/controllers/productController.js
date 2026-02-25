const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { validationResult } = require('express-validator');
const { generateShortId } = require('../utils/id');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  let products = await prisma.product.findMany({
    orderBy: [
      { createdAt: 'desc' }
    ],
  });

  // Process products to extract order from 'tag' field if present
  products = products.map(p => {
    if (p.tag && p.tag.startsWith('order:')) {
      const orderVal = parseInt(p.tag.replace('order:', ''), 10);
      return { ...p, sortOrder: isNaN(orderVal) ? 0 : orderVal };
    }
    return { ...p, sortOrder: p.sortOrder || 0 };
  });

  // Sort manually in memory
  products.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  res.json(products);
});

// @desc    Update products order
// @route   PUT /api/products/order
// @access  Private/Admin
const updateProductsOrder = asyncHandler(async (req, res) => {
  const { products } = req.body; // Array of {id, sortOrder}

  if (!Array.isArray(products)) {
    res.status(400);
    throw new Error('Invalid products data');
  }

  const updates = products.map((p) => {
    // We use 'tag' as a fallback storage for sortOrder if the database schema 
    // hasn't been migrated yet to include sortOrder field.
    // We store it as a string "order:X"
    return prisma.product.update({
      where: { id: p.id },
      data: { 
        tag: `order:${p.sortOrder}`
      },
    });
  });

  await prisma.$transaction(updates);
  res.json({ message: 'Products order updated successfully' });
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = asyncHandler(async (req, res) => {
  // 1. Check Validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400);
    throw new Error(errors.array()[0].msg);
  }

  // 2. Create
  // السعر صار اختياري: إذا لم يُرسل من الفرونت نضعه 0 حتى لا يفشل Prisma (schema يتطلب price)
  const safeBody = {
    ...req.body,
    id:
      req.body?.id && /^\d{8}$/.test(String(req.body.id))
        ? String(req.body.id)
        : generateShortId(),
    price: (req.body && req.body.price !== undefined && req.body.price !== null && req.body.price !== '')
      ? Number(req.body.price)
      : 0,
    sortOrder: req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : 0,
  };

  const product = await prisma.product.create({
    data: safeBody,
  });

  res.status(201).json(product);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if product exists first (Prisma throws P2025 if not found on update, but explicit check is safer)
  const existingProduct = await prisma.product.findUnique({ where: { id } });
  if (!existingProduct) {
    res.status(404);
    throw new Error('Product not found');
  }

  const data = { ...req.body };
  if (data.sortOrder !== undefined) data.sortOrder = Number(data.sortOrder);
  if (data.price !== undefined) data.price = Number(data.price);

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
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404);
      throw new Error('Product not found');
    }

    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { productId: id } }),
      prisma.product.delete({ where: { id } }),
    ]);
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
  updateProductsOrder,
};
