const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getMyNotifications = asyncHandler(async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' }
  });
  res.json(notifications);
});

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Verify ownership
  const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.id }
  });

  if (!notification) {
      res.status(404);
      throw new Error('الإشعار غير موجود');
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });

  res.json(updated);
});

// Helper Function: Send Notification (Internal Use)
const sendNotification = async (userId, title, message, type = 'info') => {
    try {
        await prisma.notification.create({
            data: { userId, title, message, type }
        });
        // Future: Trigger Push Notification (FCM/OneSignal) here
        return true;
    } catch (error) {
        console.error('Error sending notification:', error);
        return false;
    }
};

module.exports = { getMyNotifications, markAsRead, sendNotification };