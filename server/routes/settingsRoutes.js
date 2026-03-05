const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getSetting, updateSetting, getAboutUs, updateAboutUs } = require('../controllers/settingsController');

router.get('/about-us', getAboutUs);
router.put('/about-us', protect, admin, updateAboutUs);

router.get('/:key', getSetting);
router.post('/', protect, admin, updateSetting);

module.exports = router;