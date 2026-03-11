const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { generateShortId } = require('../utils/id');
const { sendNotification, sendFcmPush } = require('./notificationController');
const { getTokensForUsers } = require('../utils/tokenStore');
const axios = require('axios');

// Pi Ads Configuration
const PI_API_KEY = process.env.PI_API_KEY;
const PI_API_URL = process.env.PI_API_URL || 'https://api.minepi.com';

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

  const MIN_DEPOSIT = 1.0;
  if (numAmount < MIN_DEPOSIT) {
    res.status(400);
    throw new Error(`الحد الأدنى للشحن هو ${MIN_DEPOSIT}$`);
  }

  // تحديد عنوان العملية بناءً على طريقة الدفع
  const isPiAds = paymentMethod === 'pi_ads';
  const txTitle = isPiAds ? 'مكافأة مشاهدة إعلان Pi Ads' : 'شحن رصيد';

  // --- التحقق الأمني من إعلانات Pi Ads ---
  if (isPiAds) {
    // 1. التحقق من أن المبلغ لا يتجاوز 1.0 دولار
    if (numAmount > 1.0) {
      res.status(400);
      throw new Error('لا يمكن إضافة أكثر من 1.0 دولار لكل إعلان');
    }

    // 2. التحقق من وجود adId (يجب إرساله من الفرونت إند في الحقل paymentDetails.adId)
    const adId = paymentDetails?.adId;
    if (!adId) {
      res.status(400);
      throw new Error('معرف الإعلان (adId) مطلوب للتحقق');
    }

    // 3. التحقق من صحة adId عبر Pi Ads API
    if (PI_API_KEY) {
      try {
        const adResponse = await axios.get(`${PI_API_URL}/v2/ads_network/status/${adId}`, {
          headers: {
            'Authorization': `Key ${PI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        // التحقق من أن حالة الإعلان "granted"
        if (adResponse.data.mediator_ack_status !== 'granted') {
          res.status(400);
          throw new Error('لم يتم تأكيد مشاهدة الإعلان بنجاح من Pi Network');
        }

        // 4. التحقق من عدم تكرار استخدام نفس الـ adId (إجراء أمني إضافي)
        const existingAdTx = await prisma.transaction.findFirst({
          where: { paymentId: adId }
        });
        if (existingAdTx) {
          res.status(400);
          throw new Error('لقد حصلت بالفعل على مكافأة مقابل هذا الإعلان');
        }
      } catch (error) {
        console.error('❌ فشل التحقق من إعلان Pi في السيرفر:', error.response?.data || error.message);
        res.status(error.response?.status || 400);
        throw new Error(error.response?.data?.message || 'فشل التحقق من صحة الإعلان');
      }
    } else {
      console.warn('⚠️ تنبيه أمني: لم يتم التحقق من adId لأن PI_API_KEY غير مضبوط');
      // في حالة عدم وجود المفتاح، نكتفي بالحد الأقصى للمبلغ (1.0) كحماية أساسية
    }
  }

  // Build a helpful description but keep it short and safe
  let desc = description || txTitle;
  if (paymentMethod && !isPiAds) {
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
        title: txTitle,
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
        title: txTitle,
        amount: numAmount,
        type: 'credit',
        status: 'completed',
        description: desc,
        paymentId: isPiAds ? paymentDetails?.adId : undefined, // تخزين adId لمنع التكرار
      },
    });

    return { user, transaction };
  });

  // Send Notification & FCM Push
  const notifTitle = isPiAds ? 'مكافأة Pi Ads' : 'تم شحن رصيدك بنجاح';
  const title = notifTitle;
  const message = isPiAds
    ? `تهانياً! تم إضافة ${numAmount}$ لرصيدك كمكافأة على مشاهدة إعلان Pi Ads.`
    : `تم إضافة ${numAmount} رصيد إلى حسابك. رصيدك الحالي هو ${result.user.balance}.`;
  
  await sendNotification(userId, title, message, 'wallet_credit');
  
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
