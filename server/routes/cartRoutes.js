const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/authMiddleware');
const {
  getMyCart,
  addToCart,
  removeFromCart,
  clearCart,
} = require('../controllers/cartController');

// GET /api/cart -> list
// POST /api/cart -> add
// DELETE /api/cart -> clear
router.route('/').get(protect, getMyCart).post(protect, addToCart).delete(protect, clearCart);

// DELETE /api/cart/:id -> remove single
router.route('/:id').delete(protect, removeFromCart);

module.exports = router;
