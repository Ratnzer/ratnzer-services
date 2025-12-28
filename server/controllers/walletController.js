const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// @desc    Get current user transaction history
// @route   GET /api/wallet/transactions
// @access  Private
// @desc    Get current user transaction history (supports pagination)
// @route   GET /api/wallet/transactions?skip=0&limit=10
// @access  Private
const getTransactions = asyncHandler(async (req, res) => {
  const limitRaw = req.query?.limit;
  const skipRaw = req.query?.skip;

  const usePaging = limitRaw !== undefined || skipRaw !== undefined;

  if (!usePaging) {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(transactions);
  }

  const limit = Math.min(parseInt(String(limitRaw ?? '10'), 10) || 10, 50);
  const skip = Math.max(parseInt(String(skipRaw ?? '0'), 10) || 0, 0);

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where: { userId: req.user.id } }),
  ]);

  const hasMore = skip + items.length < total;
  return res.json({ items, hasMore, total });
});


// @desc    Add funds to wallet (User top-up)
// @route   POST /api/wallet/deposit
// @access  Private
const depositFunds = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, paymentDetails, description } = req.body;
  const userId = req.user.id;

  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    res.status(400);
    throw new Error('المبلغ غير صالح');
  }

  // Build a helpful description but keep it short and safe
  let desc = description || 'شحن رصيد';
  if (paymentMethod) {
    desc += ` | method: ${String(paymentMethod)}`;
  }
  // If card details exist, store only non-sensitive summary (e.g., last4)
  const last4 = paymentDetails?.cardLast4 || paymentDetails?.last4;
  if (last4) {
    desc += ` | last4: ${String(last4)}`;
  }

  // Ensure both user balance and transaction log are updated atomically
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: numAmount } },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        title: 'شحن رصيد',
        amount: numAmount,
        type: 'credit',
        status: 'completed',
        description: desc,
      },
    });

    return { user, transaction };
  });

  res.json({
    message: 'تم إضافة الرصيد بنجاح',
    newBalance: result.user.balance,
    transactionId: result.transaction.id,
  });
});

module.exports = { getTransactions, depositFunds };
