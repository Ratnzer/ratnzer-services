const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

// Validation Rules
const productValidation = [
  body('name').notEmpty().withMessage('Product name is required'),
  body('category').notEmpty().withMessage('Category is required'),
];

router.route('/')
  .get(getProducts)
  .post(protect, admin, productValidation, createProduct);

router.route('/:id')
  .put(protect, admin, updateProduct) // Optional validation for update
  .delete(protect, admin, deleteProduct);

module.exports = router;
