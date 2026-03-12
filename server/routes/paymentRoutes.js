const express = require('express');
const router = express.Router();
const {
  createQi,
  qiCallback,
  qiReturn,
  qiStatus,
  processCardPayment,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// ✅ Qi Payment flow (Replaces PayTabs)
router.post('/qi/create', protect, createQi);
router.post('/qi/callback', qiCallback);
router.all('/qi/return', qiReturn);
router.get('/qi/status/:paymentId', protect, qiStatus);

// Backward compatibility (optional: if you want to keep old routes pointing to new ones)
router.post('/paytabs/create', protect, createQi);
router.post('/paytabs/callback', qiCallback);
router.all('/paytabs/return', qiReturn);
router.get('/paytabs/status/:paymentId', protect, qiStatus);

// Legacy simulation
router.post('/charge', protect, processCardPayment);

module.exports = router;
