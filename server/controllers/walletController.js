const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { generateShortId } = require('../utils/id');
const { sendNotification, sendFcmPush } = require('./notificationController');
const { getTokensForUsers } = require('../utils/tokenStore');

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
    // ✅ PREVENT DUPLICATE DEPOSITS INSIDE TRANSACTION: Check if a similar transaction exists in the last 5 seconds
    // Reduced to 5 seconds to be more user-friendly while still preventing rapid double-clicks
    const fiveSecondsAgo = new Date(Date.now() - 5 * 1000);
    const existingTx = await tx.transaction.findFirst({
      where: {
        userId,
        amount: numAmount,
        type: 'credit',
        title: 'شحن رصيد',
        createdAt: { gte: fiveSecondsAgo },
      },
    });

    if (existingTx) {
      throw new Error('هناك عملية شحن مماثلة قيد المعالجة، يرجى الانتظار قليلاً');
    }

    const user = await tx.user.update({
      where: { id: userId },
      data: { balance: { increment: numAmount } },
    });

    const transaction = await tx.transaction.create({
      data: {
        id: generateShortId(),
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

  // Send Notification & FCM Push
  const title = 'تم شحن رصيدك بنجاح';
  const message = `تم إضافة ${numAmount} رصيد إلى حسابك. رصيدك الحالي هو ${result.user.balance}.`;
  
  await sendNotification(userId, title, message, 'info');
  
  const tokens = await getTokensForUsers([userId]);
  if (tokens.length > 0) {
    await sendFcmPush(tokens.map(t => t.token), {
      title,
      body: message,
      data: { type: 'wallet_deposit', amount: String(numAmount) }
    });
  }

  res.json({
    message: 'تم إضافة الرصيد بنجاح',
    newBalance: result.user.balance,
    transactionId: result.transaction.id,
  });
});

module.exports = { getTransactions, depositFunds };
