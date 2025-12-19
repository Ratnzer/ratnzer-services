const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getUsers,
  updateUserBalance,
  updateUserStatus,
} = require('../controllers/userController');

router.get('/', protect, admin, getUsers);
router.put('/:id/balance', protect, admin, updateUserBalance);
router.put('/:id/status', protect, admin, updateUserStatus);

module.exports = router;