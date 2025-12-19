const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// @desc    Process Card Payment (Simulation)
// @route   POST /api/payments/charge
// @access  Private
const processCardPayment = asyncHandler(async (req, res) => {
  const { amount, cardLast4, cardHolder } = req.body;
  const userId = req.user.id;

  // 1. Here you would integrate with Stripe/PayPal API
  // For now, we mimic a successful response
  const isSuccess = true; 
  const providerTxId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  // 2. Log the Payment Attempt
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: parseFloat(amount),
      method: 'visa', // or mastercard, dynamic based on input
      provider: 'stripe_mock',
      transactionId: providerTxId,
      status: isSuccess ? 'succeeded' : 'failed',
      cardLast4: cardLast4 || '0000'
    }
  });

  if (isSuccess) {
    // 3. If "Top Up", add to wallet automatically
    // Using transaction for data integrity
    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: userId },
            data: { balance: { increment: parseFloat(amount) } }
        });

        await tx.transaction.create({
            data: {
                userId,
                type: 'deposit',
                amount: parseFloat(amount),
                description: `شحن محفظة عبر بطاقة (..${cardLast4 || 'XXXX'})`,
                status: 'completed',
                paymentId: payment.id
            }
        });
    });

    res.json({
      success: true,
      message: 'تمت عملية الدفع بنجاح',
      transactionId: providerTxId
    });
  } else {
    res.status(400);
    throw new Error('فشلت عملية الدفع');
  }
});

module.exports = { processCardPayment };