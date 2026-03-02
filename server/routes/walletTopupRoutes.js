const express = require('express');
const router = express.Router();
const {
  createTopupRequest,
  getPendingRequests,
  approveTopupRequest,
  rejectTopupRequest,
  getMyTopupRequests,
} = require('../controllers/walletTopupController');
const { protect, admin } = require('../middleware/authMiddleware');

// User routes
router.post('/request', protect, createTopupRequest);
router.get('/my-requests', protect, getMyTopupRequests);

// Admin routes
router.get('/requests', protect, admin, getPendingRequests);
router.post('/:requestId/approve', protect, admin, approveTopupRequest);
router.post('/:requestId/reject', protect, admin, rejectTopupRequest);

module.exports = router;
