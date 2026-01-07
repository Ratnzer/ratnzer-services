const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { upsertToken, getTokensForUsers, readTokens } = require('../utils/tokenStore');
const { generateShortId } = require('../utils/id');

// ===== FCM HTTP v1 helpers (Service Account) =====
const FCM_OAUTH_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const FCM_V1_ENDPOINT = 'https://fcm.googleapis.com/v1';

let cachedAccessToken = null;
let cachedExpiry = 0;

const base64Url = (str) =>
  Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const loadServiceAccount = () => {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (!raw) return null;
  try {
    const jsonStr = process.env.FIREBASE_SERVICE_ACCOUNT
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT', err);
    return null;
  }
};

const getAccessToken = async (serviceAccount) => {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccessToken && cachedExpiry - 60 > now) {
    return cachedAccessToken;
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    scope: FCM_OAUTH_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const sign = require('crypto').createSign('RSA-SHA256');
  const jwtUnsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  sign.update(jwtUnsigned);
  sign.end();
  const signature = sign.sign(serviceAccount.private_key, 'base64');
  const jwt = `${jwtUnsigned}.${signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    throw new Error(`OAuth token request failed ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  cachedAccessToken = json.access_token;
  cachedExpiry = now + (json.expires_in || 3600);
  return cachedAccessToken;
};

const sendFcmPush = async (tokens, { title, body, data }) => {
  if (!tokens.length) return { sent: 0, attempts: 0, errors: [], reason: 'no-tokens' };

  const serviceAccount = loadServiceAccount();
  if (!serviceAccount?.private_key || !serviceAccount?.client_email) {
    return { sent: 0, attempts: 0, errors: ['missing service account'], reason: 'missing-service-account' };
  }

  const projectId = process.env.FCM_PROJECT_ID || serviceAccount.project_id;
  if (!projectId) {
    return { sent: 0, attempts: 0, errors: ['missing project_id'], reason: 'missing-project' };
  }

  let accessToken;
  try {
    accessToken = await getAccessToken(serviceAccount);
  } catch (err) {
    return { sent: 0, attempts: 0, errors: [err.message], reason: 'oauth-failed' };
  }

  const errors = [];
  let sent = 0;
  let attempts = 0;

  for (const token of tokens) {
    attempts += 1;
    const res = await fetch(`${FCM_V1_ENDPOINT}/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title, body },
          data: data || {},
          android: { priority: 'HIGH' },
        },
      }),
    });

    if (!res.ok) {
      errors.push(`FCM ${res.status}: ${await res.text()}`);
      continue;
    }

    sent += 1;
  }

  return { sent, attempts, errors };
};

// @desc    Get user notifications (supports pagination)
// @route   GET /api/notifications
// @access  Private
const getMyNotifications = asyncHandler(async (req, res) => {
  const skip = parseInt(req.query.skip, 10) || 0;
  const limit = parseInt(req.query.limit, 10) || 10;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notification.count({
      where: { userId: req.user.id },
    }),
  ]);

  res.json({
    items,
    total,
    hasMore: (skip + items.length) < total,
  });
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

const buildOrderPushPayload = (order, overrides = {}) => {
  if (!order) return overrides;

  const statusLabelMap = {
    pending: 'قيد المعالجة',
    completed: 'تم التنفيذ',
    cancelled: 'تم الإلغاء',
  };

  const qty =
    order.quantityLabel ||
    (order.denominationId ? `الفئة: ${order.denominationId}` : null);

  const title =
    overrides.title ||
    (order.status === 'completed'
      ? `تم تنفيذ طلب ${order.productName}`
      : order.status === 'cancelled'
      ? `تم إلغاء طلب ${order.productName}`
      : `طلب جديد: ${order.productName}`);

  const body =
    overrides.body ||
    [
      statusLabelMap[order.status] || order.status || 'قيد المعالجة',
      `الكمية: ${qty || '1'}`,
      `السعر: ${order.amount}`,
      order.userName ? `العميل: ${order.userName}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

  const data = {
    orderId: order.id,
    productName: order.productName,
    amount: String(order.amount),
    status: order.status,
    quantity: qty || '',
    fulfillmentType: order.fulfillmentType || '',
    regionName: order.regionName || '',
    ...overrides.data,
  };

  return { title, body, data };
};

// Helper Function: Send Notification (Internal Use)
const sendNotification = async (userId, title, message, type = 'info') => {
    try {
        const now = new Date();
        const dateStr = now.toLocaleString('ar-EG', { 
            hour: '2-digit', 
            minute: '2-digit', 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });

        await prisma.notification.create({
            data: { 
                id: generateShortId(), 
                userId, 
                title, 
                message, 
                type,
                date: dateStr
            }
        });
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

// Helper used by other controllers (e.g., payments) to notify admins about orders
const notifyAdminsPush = async ({ order, title, message, extraData } = {}) => {
  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  const adminIds = admins.map((a) => a.id);

  if (adminIds.length === 0) {
    return { success: false, reason: 'no-admin-users', adminIds: [] };
  }

  const pushPayload = buildOrderPushPayload(order, {
    title: title || undefined,
    body: message || undefined,
    data: { type: 'admin-order' },
  });

  await Promise.all(
    adminIds.map((adminId) =>
      sendNotification(
        adminId,
        pushPayload.title || 'طلب جديد',
        pushPayload.body || (order?.id ? `تم إنشاء طلب جديد رقم ${order.id}` : 'تم إنشاء طلب جديد'),
        'order'
      )
    )
  );

  const tokens = await getTokensForUsers(adminIds);
  const push = await sendFcmPush(
    tokens.map((t) => t.token),
    pushPayload
  );

  return {
    success: true,
    adminIds,
    tokens: tokens.map((t) => t.token),
    push,
  };
};

// @desc    Notify admins about a new order (stores in DB + exposes tokens for FCM)
// @route   POST /api/notifications/notify-admin-order
// @access  Private
const notifyAdminOrder = asyncHandler(async (req, res) => {
  const { orderId, title, message } = req.body || {};

  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
      })
    : null;

  const admins = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  const adminIds = admins.map((a) => a.id);

  if (adminIds.length === 0) {
    return res.status(200).json({ success: false, reason: 'no-admin-users' });
  }

  const { push, tokens } = await notifyAdminsPush({
    order,
    title,
    message,
  });
  res.json({
    success: true,
    notified: adminIds.length,
    tokens,
    push,
  });
});

// @desc    Broadcast announcement/push to all registered devices
// @route   POST /api/notifications/broadcast
// @access  Private (Admin)
const broadcastAnnouncement = asyncHandler(async (req, res) => {
  const { title, message } = req.body || {};

  if (!title || !message) {
    res.status(400);
    throw new Error('عنوان ورسالة الإشعار مطلوبة');
  }

  const tokens = await readTokens();
  const userIdsWithTokens = Array.from(new Set(tokens.map((t) => t.userId).filter(Boolean)));

  await Promise.all(
    userIdsWithTokens.map((userId) =>
      sendNotification(userId, title, message, 'info')
    )
  );

  const push = await sendFcmPush(
    tokens.map((t) => t.token),
    { title, body: message, data: { type: 'broadcast' } }
  );

  res.json({
    success: true,
    attempts: push.attempts,
    sent: push.sent,
    errors: push.errors,
    targetedUsers: userIdsWithTokens.length,
  });
});

const sendUserOrderNotification = async ({ orderId, status, userId, title, message }) => {
  let targetUserId = userId || null;
  if (!targetUserId && orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { userId: true },
    });
    targetUserId = order?.userId || null;
  }

  if (!targetUserId) {
    throw new Error('User not found for notification');
  }

  const order =
    orderId &&
    (await prisma.order.findUnique({
      where: { id: orderId },
    }));

  const pushPayload = buildOrderPushPayload(
    order ? { ...order, status: status || order.status } : null,
    {
      title: title || undefined,
      body: message || undefined,
      data: { orderId, status: status || order?.status || '', type: 'user-order' },
    }
  );

  await sendNotification(
    targetUserId,
    pushPayload.title || 'تحديث الطلب',
    pushPayload.body || (status ? `تم تحديث حالة الطلب إلى ${status}` : 'تم تحديث حالة الطلب'),
    'order'
  );

  const tokens = await getTokensForUsers([targetUserId]);
  const push = await sendFcmPush(
    tokens.map((t) => t.token),
    pushPayload
  );

  return { tokens: tokens.map((t) => t.token), push };
};

// @desc    Notify a user about order status update (stores in DB + exposes tokens for FCM)
// @route   POST /api/notifications/notify-user-order
// @access  Private
const notifyUserOrder = asyncHandler(async (req, res) => {
  const { orderId, status, userId, title, message } = req.body || {};

  const result = await sendUserOrderNotification({ orderId, status, userId, title, message });

  res.json({
    success: true,
    ...result,
  });
});

module.exports = { getMyNotifications, markAsRead, sendNotification, registerDevice, notifyAdminOrder, notifyAdminsPush, broadcastAnnouncement, notifyUserOrder, sendUserOrderNotification, sendFcmPush };
