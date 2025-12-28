const express = require('express');
const router = express.Router();
const {
  // Legacy mock endpoint kept for backward compatibility
  processCardPayment,
  createPaytabs,
  paytabsCallback,
  paytabsReturn,
  paytabsStatus,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// ✅ PayTabs flow
router.post('/paytabs/create', protect, createPaytabs);
router.post('/paytabs/callback', paytabsCallback);
router.all('/paytabs/return', paytabsReturn);
router.get('/paytabs/status/:paymentId', protect, paytabsStatus);

// Legacy simulation (kept)
router.post('/charge', protect, processCardPayment);

module.exports = router;