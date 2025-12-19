const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private/Admin
const getInventory = asyncHandler(async (req, res) => {
  const inventory = await prisma.inventory.findMany({
    orderBy: { createdAt: 'desc' },
    // Include product details if needed for admin display
    include: {
      product: {
        select: { name: true }
      }
    }
  });
  res.json(inventory);
});

// @desc    Add items to inventory (Bulk)
// @route   POST /api/inventory
// @access  Private/Admin
const addInventory = asyncHandler(async (req, res) => {
  const { items } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('Please provide an array of inventory items');
  }

  // Validate items structure roughly
  const validItems = items.every(item => item.productId && item.code);
  if (!validItems) {
    res.status(400);
    throw new Error('Each item must have productId and code');
  }

  // Use createMany for bulk insertion (Performance)
  const result = await prisma.inventory.createMany({
    data: items,
    skipDuplicates: true // Skip if code collision occurs (though ID is unique)
  });

  res.status(201).json({
    count: result.count,
    message: `Successfully added ${result.count} codes to inventory`
  });
});

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private/Admin
const deleteInventoryItem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.inventory.delete({ where: { id } });
    res.json({ message: 'Inventory item removed' });
  } catch (error) {
    res.status(404);
    throw new Error('Item not found');
  }
});

module.exports = {
  getInventory,
  addInventory,
  deleteInventoryItem
};