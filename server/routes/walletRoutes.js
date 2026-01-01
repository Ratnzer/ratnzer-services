const express = require('express');
const router = express.Router();
const { getTransactions, depositFunds } = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

router.get('/transactions', protect, getTransactions);
router.post('/deposit', protect, depositFunds);

module.exports = router;