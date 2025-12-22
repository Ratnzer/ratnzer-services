const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { upsertToken, getTokensForUsers } = require('../utils/tokenStore');

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

// @desc    Register device token for FCM
// @route   POST /api/notifications/register-device
// @access  Public (optionally uses auth to bind user)
const registerDevice = asyncHandler(async (req, res) => {
  const { token, platform = 'android', userId } = req.body || {};
  if (!token || typeof token !== 'string') {
    res.status(400);
    throw new Error('FCM token is required');
  }

  const resolvedUserId = userId || req.user?.id || null;
  await upsertToken({ token, platform, userId: resolvedUserId });
  res.json({ success: true });
});

// @desc    Notify admins about a new order (stores in DB + exposes tokens for FCM)
// @route   POST /api/notifications/notify-admin-order
// @access  Private
const notifyAdminOrder = asyncHandler(async (req, res) => {
  const { orderId, title, message } = req.body || {};

  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  const adminIds = admins.map((a) => a.id);

  if (adminIds.length === 0) {
    return res.status(200).json({ success: false, reason: 'no-admin-users' });
  }

  await Promise.all(
    adminIds.map((adminId) =>
      sendNotification(
        adminId,
        title || 'طلب جديد',
        message || (orderId ? `تم إنشاء طلب جديد رقم ${orderId}` : 'تم إنشاء طلب جديد'),
        'info'
      )
    )
  );

  const tokens = await getTokensForUsers(adminIds);
  res.json({
    success: true,
    notified: adminIds.length,
    tokens: tokens.map((t) => t.token),
  });
});

// @desc    Notify a user about order status update (stores in DB + exposes tokens for FCM)
// @route   POST /api/notifications/notify-user-order
// @access  Private
const notifyUserOrder = asyncHandler(async (req, res) => {
  const { orderId, status, userId, title, message } = req.body || {};

  let targetUserId = userId || null;
  if (!targetUserId && orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });
    targetUserId = order?.userId || null;
  }

  if (!targetUserId) {
    res.status(400);
    throw new Error('User not found for notification');
  }

  await sendNotification(
    targetUserId,
    title || 'تحديث الطلب',
    message || (status ? `تم تحديث حالة الطلب إلى ${status}` : 'تم تحديث حالة الطلب'),
    'info'
  );

  const tokens = await getTokensForUsers([targetUserId]);
  res.json({
    success: true,
    tokens: tokens.map((t) => t.token),
  });
});

module.exports = { getMyNotifications, markAsRead, sendNotification, registerDevice, notifyAdminOrder, notifyUserOrder };
