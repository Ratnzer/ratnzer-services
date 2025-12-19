const express = require('express');
const router = express.Router();
const { processCardPayment } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/charge', protect, processCardPayment);

module.exports = router;