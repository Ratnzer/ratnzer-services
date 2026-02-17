const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { generateShortId } = require('../utils/id');
const { sendNotification, sendFcmPush } = require('./notificationController');
const { getTokensForUsers } = require('../utils/tokenStore');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const { q, email, id } = req.query || {};
  const query = (q || email || id || '').toString().trim();

  const where = query
    ? {
        OR: [
          { id: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
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
  
  // Ensure balance update + transaction log are atomic
  const result = await prisma.$transaction(async (tx) => {
    // Re-fetch user inside transaction to get latest balance
    const currentUser = await tx.user.findUnique({ where: { id } });
    if (!currentUser) throw new Error('User not found');

    // In deduct mode, never deduct more than available.
    const actualAmount = isAdd ? numAmount : Math.min(numAmount, Number(currentUser.balance || 0));

    const updated = await tx.user.update({
      where: { id },
      data: { 
        balance: isAdd 
          ? { increment: actualAmount } 
          : { decrement: actualAmount } 
      },
      select: { id: true, balance: true, name: true },
    });

    // Log into wallet transactions so it appears in the user's Wallet history
    await tx.transaction.create({
      data: {
        id: generateShortId(),
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

  // Send Notification & FCM Push
  const title = isAdd ? 'تم إضافة رصيد لمحفظتك' : 'تم خصم رصيد من محفظتك';
  const message = isAdd 
    ? `تم إضافة ${numAmount} رصيد إلى حسابك بنجاح.` 
    : `تم خصم ${numAmount} رصيد من حسابك.`;
  
  await sendNotification(id, title, message, isAdd ? 'wallet_credit' : 'wallet_debit');
  
  const tokens = await getTokensForUsers([id]);
  if (tokens.length > 0) {
    await sendFcmPush(tokens.map(t => t.token), {
      title,
      body: message,
      data: { type: 'wallet_update', amount: String(numAmount), action: type }
    });
  }

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

  // Send Notification & FCM Push
  const isBanned = newStatus === 'banned';
  const title = isBanned ? 'تم حظر حسابك' : 'تم إلغاء حظر حسابك';
  const message = isBanned 
    ? 'عذراً، لقد تم حظر حسابك من قبل الإدارة. يرجى التواصل مع الدعم الفني للمزيد من التفاصيل.' 
    : 'تم إلغاء حظر حسابك بنجاح، يمكنك الآن استخدام التطبيق بشكل طبيعي.';
  
  await sendNotification(id, title, message, 'account');
  
  const tokens = await getTokensForUsers([id]);
  if (tokens.length > 0) {
    await sendFcmPush(tokens.map(t => t.token), {
      title,
      body: message,
      data: { type: 'account_status', status: newStatus }
    });
  }

  res.json(updatedUser);
});

module.exports = { getUsers, updateUserBalance, updateUserStatus };
