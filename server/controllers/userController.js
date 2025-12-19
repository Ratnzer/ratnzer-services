const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const { q, email, id } = req.query || {};
  const query = (q || email || id || '').toString().trim();

  const where = query
    ? {
        OR: [
          { id: query },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      }
    : undefined;

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      balance: true,
      role: true,
      status: true,
      ip: true,
      createdAt: true,
    },
  });
  res.json(users);
});

// @desc    Update user balance
// @route   PUT /api/users/:id/balance
// @access  Private/Admin
const updateUserBalance = asyncHandler(async (req, res) => {
  const { amount, type } = req.body; // type: 'add' or 'deduct'
  const { id } = req.params;
  const numAmount = Number(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400);
    throw new Error('Invalid amount');
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const isAdd = type === 'add';
  // In deduct mode, never deduct more than available.
  const actualAmount = isAdd ? numAmount : Math.min(numAmount, Number(user.balance || 0));
  const newBalance = isAdd
    ? Number(user.balance || 0) + actualAmount
    : Math.max(0, Number(user.balance || 0) - actualAmount);

  // Ensure balance update + transaction log are atomic
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id },
      data: { balance: newBalance },
      select: { id: true, balance: true, name: true },
    });

    // Log into wallet transactions so it appears in the user's Wallet history
    await tx.transaction.create({
      data: {
        userId: id,
        title: isAdd ? 'إضافة رصيد من الإدارة' : 'خصم رصيد من الإدارة',
        amount: Number(actualAmount),
        type: isAdd ? 'credit' : 'debit',
        status: 'completed',
        description: `Admin: ${req.user?.id || 'unknown'}`,
      },
    });

    return updated;
  });

  res.json(result);
});

// @desc    Update user status (Ban/Unban)
// @route   PUT /api/users/:id/status
// @access  Private/Admin
const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const newStatus = user.status === 'active' ? 'banned' : 'active';

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status: newStatus },
    select: { id: true, status: true, name: true },
  });

  res.json(updatedUser);
});

module.exports = { getUsers, updateUserBalance, updateUserStatus };
