const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const { getSetting, updateSetting } = require('../controllers/settingsController');

router.get('/:key', getSetting);
router.post('/', protect, admin, updateSetting);

module.exports = router;