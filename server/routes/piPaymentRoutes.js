const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');

/**
 * @desc    إنشاء سجل دفع Pi جديد (Server-side)
 * @route   POST /api/pi-payments/create
 * @access  Private
 */
router.post('/create', protect, asyncHandler(async (req, res) => {
  const { payment } = req.body;

  if (!payment) {
    res.status(400);
    throw new Error('بيانات الدفع مطلوبة');
  }

  // في Pi SDK، يتم إرسال معرف الدفع (paymentId) بعد أن ينشئه الـ SDK
  // ولكن هنا يمكننا تسجيل المحاولة في قاعدة البيانات إذا أردنا تتبعها
  console.log(`[Pi Payment] Creating record for user ${req.user.id}, amount: ${payment.amount}`);
  
  res.status(200).json({ message: 'تم استلام طلب الدفع بنجاح' });
}));

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

  console.log(`[Pi Payment] Approving payment: ${paymentId}`);
  
  // هنا يجب إرسال طلب لـ Pi API للتحقق من الدفعة (اختياري في مرحلة الـ Sandbox)
  // ولكن لإكمال العملية في المتصفح، يجب أن نرد بـ 200 OK
  res.status(200).json({ message: 'تمت الموافقة على الدفعة من السيرفر' });
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

  console.log(`[Pi Payment] Completing payment: ${paymentId}, TXID: ${txid}`);

  try {
    // تحديث رصيد المستخدم في قاعدة البيانات
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        balance: {
          increment: parseFloat(amountUSD)
        }
      }
    });

    // تسجيل المعاملة في سجل المحفظة
    await prisma.transaction.create({
      data: {
        userId: req.user.id,
        amount: parseFloat(amountUSD),
        type: 'deposit',
        status: 'completed',
        title: 'شحن رصيد عبر Pi Network',
        description: `رقم المعاملة: ${txid}`,
      }
    });

    res.status(200).json({
      message: 'تم شحن الرصيد بنجاح',
      balance: updatedUser.balance
    });
  } catch (error) {
    console.error('Error completing Pi payment:', error);
    res.status(500);
    throw new Error('فشل تحديث الرصيد في قاعدة البيانات');
  }
}));

module.exports = router;
