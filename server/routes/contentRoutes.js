const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');

const {
  getBanners,
  createBanner,
  deleteBanner,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getCategories,
  createCategory,
  deleteCategory,
  updateCategory,
  getTerms,
  updateTerms,
  getPrivacy,
  updatePrivacy,
} = require('../controllers/contentController');

// Banners
router.route('/banners')
  .get(getBanners)
  .post(protect, admin, createBanner);
router.delete('/banners/:id', protect, admin, deleteBanner);

// Announcements
router.route('/announcements')
  .get(getAnnouncements)
  .post(protect, admin, createAnnouncement);
router.delete('/announcements/:id', protect, admin, deleteAnnouncement);

// Categories
router.route('/categories')
  .get(getCategories)
  .post(protect, admin, createCategory);

router.route('/categories/:id')
  .put(protect, admin, updateCategory)
  .delete(protect, admin, deleteCategory);

// Terms & Conditions
router.route('/terms')
  .get(getTerms)
  .put(protect, admin, updateTerms);

// Privacy Policy
router.route('/privacy')
  .get(getPrivacy)
  .put(protect, admin, updatePrivacy);

module.exports = router;
