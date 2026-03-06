const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');
const { generateShortId } = require('../utils/id');
const { sendNotification } = require('../controllers/notificationController');

// Pi Network API Key (تم تزويده من المستخدم)
const PI_API_KEY = '38xubrn3ffjlva7azqmzg29q6s7xynoug8ix0rt2am2ewmnlgjfoqodrzm0kqzr5';
const PI_API_URL = 'https://api.minepi.com';

/**
 * @desc    الموافقة على الدفع (Approve)
 * @route   POST /api/pi-payments/approve
 * @access  Private
 */
router.post('/approve', protect, asyncHandler(async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    res.status(400);
    throw new Error('paymentId مطلوب');
  }

  console.log(`[Pi Payment] Attempting to approve payment: ${paymentId}`);
  
  try {
    // إرسال طلب لـ Pi API للموافقة على الدفعة (Server-to-Server)
    const response = await axios.post(`${PI_API_URL}/v2/payments/${paymentId}/approve`, {}, {
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // إضافة مهلة زمنية
    });

    console.log(`[Pi Payment] Approved successfully: ${paymentId}`);
    res.status(200).json({ message: 'تمت الموافقة على الدفعة من السيرفر بنجاح', data: response.data });
  } catch (error) {
    console.error('❌ خطأ في الموافقة على دفعة Pi:', error.response?.data || error.message);
    
    // معالجة الأخطاء المختلفة
    let errorMessage = 'فشل التواصل مع خوادم Pi للموافقة';
    let statusCode = 500;
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'انقطع الاتصال بخوادم Pi Network. يرجى المحاولة لاحقاً';
      statusCode = 503;
    } else if (error.response?.status === 401) {
      errorMessage = 'خطأ في المصادقة مع Pi Network';
      statusCode = 401;
    } else if (error.response?.status === 400) {
      errorMessage = error.response?.data?.message || 'بيانات الموافقة غير صحيحة';
      statusCode = 400;
    } else if (error.response?.status === 404) {
      errorMessage = 'معرف الدفع غير موجود';
      statusCode = 404;
    }
    
    res.status(statusCode);
    throw new Error(errorMessage);
  }
}));

/**
 * @desc    إكمال الدفع وإضافة الرصيد (Complete)
 * @route   POST /api/pi-payments/complete
 * @access  Private
 */
router.post('/complete', protect, asyncHandler(async (req, res) => {
  const { paymentId, txid, amountUSD } = req.body;

  if (!paymentId || !txid || !amountUSD) {
    res.status(400);
    throw new Error('بيانات الإكمال غير مكتملة');
  }

  console.log(`[Pi Payment] Attempting to complete payment: ${paymentId}, TXID: ${txid}`);

  try {
    // 1. إرسال طلب لـ Pi API لإكمال الدفعة نهائياً (Server-to-Server)
    const response = await axios.post(`${PI_API_URL}/v2/payments/${paymentId}/complete`, { txid }, {
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // إضافة مهلة زمنية
    });

    console.log(`[Pi Payment] Completed successfully: ${paymentId}`);

    // 2. تحديث رصيد المستخدم في قاعدة البيانات
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        balance: {
          increment: parseFloat(amountUSD)
        }
      }
    });

    // 3. تسجيل المعاملة في سجل المحفظة
    const transactionId = generateShortId();
    await prisma.transaction.create({
      data: {
        id: transactionId,
        userId: req.user.id,
        amount: parseFloat(amountUSD),
        type: 'deposit',
        status: 'completed',
        title: 'شحن رصيد عبر Pi Network',
        description: `رقم المعاملة: ${txid}`,
        paymentId: paymentId
      }
    });

    // 4. إرسال إشعار للمستخدم
    await sendNotification(
      req.user.id,
      'تم شحن الرصيد بنجاح ✅',
      `تم شحن رصيدك بمبلغ ${amountUSD} عبر Pi Network | طريقة الدفع: Pi Network`,
      'wallet_credit'
    );

    res.status(200).json({
      message: 'تم شحن الرصيد بنجاح وتم تأكيد العملية في شبكة Pi',
      balance: updatedUser.balance,
      piPayment: response.data
    });
  } catch (error) {
    console.error('❌ خطأ في إكمال دفعة Pi:', error.response?.data || error.message);
    
    // معالجة الأخطاء المختلفة
    let errorMessage = 'فشل تأكيد الدفع في شبكة Pi، يرجى التواصل مع الدعم';
    let statusCode = 500;
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'انقطع الاتصال بخوادم Pi Network. يرجى المحاولة لاحقاً';
      statusCode = 503;
    } else if (error.response?.status === 401) {
      errorMessage = 'خطأ في المصادقة مع Pi Network. يرجى التحقق من مفتاح API';
      statusCode = 401;
    } else if (error.response?.status === 400) {
      errorMessage = error.response?.data?.message || 'بيانات الدفع غير صحيحة';
      statusCode = 400;
    } else if (error.response?.status === 404) {
      errorMessage = 'معرف الدفع غير موجود في نظام Pi';
      statusCode = 404;
    }
    
    res.status(statusCode);
    throw new Error(errorMessage);
  }
}));

module.exports = router;
