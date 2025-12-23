const express = require('express');
const router = express.Router();
const {
  getMyNotifications,
  markAsRead,
  registerDevice,
  notifyAdminOrder,
  broadcastAnnouncement,
  notifyUserOrder,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register-device', registerDevice);
router.post('/notify-admin-order', protect, notifyAdminOrder);
router.post('/broadcast', protect, broadcastAnnouncement);
router.post('/notify-user-order', protect, notifyUserOrder);
router.get('/', protect, getMyNotifications);
router.put('/:id/read', protect, markAsRead);

module.exports = router;
