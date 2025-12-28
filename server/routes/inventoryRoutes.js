const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getInventory,
  addInventory,
  deleteInventoryItem,
} = require('../controllers/inventoryController');

router.route('/')
  .get(protect, admin, getInventory)
  .post(protect, admin, addInventory);

router.route('/:id')
  .delete(protect, admin, deleteInventoryItem);

module.exports = router;