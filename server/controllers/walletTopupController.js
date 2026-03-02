const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { generateShortId } = require('../utils/id');
const { sendNotification, sendFcmPush } = require('./notificationController');
const { getTokensForUsers } = require('../utils/tokenStore');

// @desc    Create a wallet topup request via Asiacell
// @route   POST /api/wallet-topup/request
// @access  Private (User)
const createTopupRequest = asyncHandler(async (req, res) => {
  const { cardNumber } = req.body;
  const userId = req.user.id;

  // Validate card number (8-18 digits)
  if (!cardNumber || typeof cardNumber !== 'string') {
    res.status(400);
    throw new Error('رقم الكارت مطلوب');
  }

  const cleanCardNumber = cardNumber.replace(/\D/g, '');
  if (cleanCardNumber.length < 8 || cleanCardNumber.length > 18) {
    res.status(400);
    throw new Error('رقم الكارت يجب أن يكون بين 8 و 18 رقم');
  }

  // Prevent duplicate requests in last 10 seconds
  const tenSecondsAgo = new Date(Date.now() - 10 * 1000);
  const existingRequest = await prisma.walletTopupRequest.findFirst({
    where: {
      userId,
      cardNumber: cleanCardNumber,
      status: 'pending',
      createdAt: { gte: tenSecondsAgo },
    },
  });

  if (existingRequest) {
    res.status(400);
    throw new Error('هناك طلب معلق بنفس رقم الكارت، يرجى الانتظار');
  }

  const request = await prisma.walletTopupRequest.create({
    data: {
      id: generateShortId(),
      userId,
      cardNumber: cleanCardNumber,
      status: 'pending',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  // Notify admins about new topup request
  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  const adminIds = admins.map((a) => a.id);

  if (adminIds.length > 0) {
    const title = 'طلب شحن محفظة جديد';
    const message = `المستخدم ${request.user.name} طلب شحن محفظة برقم كارت أسياسيل`;

    await Promise.all(
      adminIds.map((adminId) =>
        sendNotification(adminId, title, message, 'wallet_pending')
      )
    );

    const tokens = await getTokensForUsers(adminIds);
    if (tokens.length > 0) {
      await sendFcmPush(tokens.map((t) => t.token), {
        title,
        body: message,
        data: { type: 'wallet_topup_request', userId, requestId: request.id },
      });
    }
  }

  res.status(201).json({
    message: 'تم إرسال طلب الشحن بنجاح',
    request,
  });
});

// @desc    Get all pending wallet topup requests (Admin only)
// @route   GET /api/wallet-topup/requests
// @access  Private (Admin)
const getPendingRequests = asyncHandler(async (req, res) => {
  const skip = parseInt(req.query.skip, 10) || 0;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const status = req.query.status || 'pending'; // pending, approved, rejected

  const [items, total] = await Promise.all([
    prisma.walletTopupRequest.findMany({
      where: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            balance: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.walletTopupRequest.count({ where: { status } }),
  ]);

  res.json({
    items,
    total,
    hasMore: skip + items.length < total,
  });
});

// @desc    Approve wallet topup request and add balance
// @route   POST /api/wallet-topup/:requestId/approve
// @access  Private (Admin)
const approveTopupRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { amount } = req.body;

  if (!amount || typeof amount !== 'number' || amount <= 0) {
    res.status(400);
    throw new Error('المبلغ المراد شحنه غير صحيح');
  }

  const MIN_TOPUP = 0.5;
  if (amount < MIN_TOPUP) {
    res.status(400);
    throw new Error(`الحد الأدنى للشحن هو ${MIN_TOPUP}$`);
  }

  const topupRequest = await prisma.walletTopupRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });

  if (!topupRequest) {
    res.status(404);
    throw new Error('طلب الشحن غير موجود');
  }

  if (topupRequest.status !== 'pending') {
    res.status(400);
    throw new Error('هذا الطلب تم معالجته بالفعل');
  }

  // Use transaction to ensure atomicity
  const result = await prisma.$transaction(async (tx) => {
    // Update user balance
    const updatedUser = await tx.user.update({
      where: { id: topupRequest.userId },
      data: { balance: { increment: amount } },
    });

    // Update topup request status
    const updatedRequest = await tx.walletTopupRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        amount,
      },
    });

    // Create transaction record
    const transaction = await tx.transaction.create({
      data: {
        id: generateShortId(),
        userId: topupRequest.userId,
        title: 'شحن رصيد عبر أسياسيل',
        amount,
        type: 'credit',
        status: 'completed',
        description: `شحن عبر أسياسيل | رقم الكارت: ${topupRequest.cardNumber.slice(-4)}`,
      },
    });

    return { updatedUser, updatedRequest, transaction };
  });

  // Send notification to user
  const title = 'تم قبول طلب شحن المحفظة';
  const message = `تم إضافة ${amount}$ إلى محفظتك. رصيدك الحالي: ${result.updatedUser.balance}$`;

  await sendNotification(topupRequest.userId, title, message, 'wallet_credit');

  const userTokens = await getTokensForUsers([topupRequest.userId]);
  if (userTokens.length > 0) {
    await sendFcmPush(userTokens.map((t) => t.token), {
      title,
      body: message,
      data: { type: 'wallet_topup_approved', amount: String(amount) },
    });
  }

  res.json({
    message: 'تم قبول الطلب وإضافة الرصيد بنجاح',
    request: result.updatedRequest,
    newBalance: result.updatedUser.balance,
  });
});

// @desc    Reject wallet topup request
// @route   POST /api/wallet-topup/:requestId/reject
// @access  Private (Admin)
const rejectTopupRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { reason } = req.body;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    res.status(400);
    throw new Error('يجب تحديد سبب الرفض');
  }

  const topupRequest = await prisma.walletTopupRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });

  if (!topupRequest) {
    res.status(404);
    throw new Error('طلب الشحن غير موجود');
  }

  if (topupRequest.status !== 'pending') {
    res.status(400);
    throw new Error('هذا الطلب تم معالجته بالفعل');
  }

  const updatedRequest = await prisma.walletTopupRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      rejectionReason: reason,
    },
  });

  // Send notification to user
  const title = 'تم رفض طلب شحن المحفظة';
  const message = `تم رفض طلبك للشحن. السبب: ${reason}`;

  await sendNotification(topupRequest.userId, title, message, 'wallet_debit');

  const userTokens = await getTokensForUsers([topupRequest.userId]);
  if (userTokens.length > 0) {
    await sendFcmPush(userTokens.map((t) => t.token), {
      title,
      body: message,
      data: { type: 'wallet_topup_rejected', reason },
    });
  }

  res.json({
    message: 'تم رفض الطلب بنجاح',
    request: updatedRequest,
  });
});

// @desc    Get user's topup requests history
// @route   GET /api/wallet-topup/my-requests
// @access  Private (User)
const getMyTopupRequests = asyncHandler(async (req, res) => {
  const skip = parseInt(req.query.skip, 10) || 0;
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);

  const [items, total] = await Promise.all([
    prisma.walletTopupRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.walletTopupRequest.count({ where: { userId: req.user.id } }),
  ]);

  res.json({
    items,
    total,
    hasMore: skip + items.length < total,
  });
});

module.exports = {
  createTopupRequest,
  getPendingRequests,
  approveTopupRequest,
  rejectTopupRequest,
  getMyTopupRequests,
};
