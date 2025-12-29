const prisma = require('../config/db');
const { getOrderStatus } = require('../utils/kd1sClient');
const { sendUserOrderNotification } = require('../controllers/notificationController');

const DEFAULT_INTERVAL_MS = 60_000;
const DEFAULT_BATCH_SIZE = 20;

let timer = null;
let isSyncing = false;

const isKd1sConfigured = () => Boolean(process.env.KD1S_API_KEY);

const findPendingProviderOrders = async (batchSize) => {
  return prisma.order.findMany({
    where: {
      providerOrderId: { not: null },
      status: { in: ['pending'] },
      providerName: { in: ['KD1S', 'kd1s'] },
    },
    orderBy: { createdAt: 'desc' },
    take: batchSize,
  });
};

const syncOnce = async () => {
  if (isSyncing) return;
  if (!isKd1sConfigured()) return;

  isSyncing = true;
  try {
    const batchSize = Number(process.env.KD1S_SYNC_BATCH_SIZE) || DEFAULT_BATCH_SIZE;
    const pendingOrders = await findPendingProviderOrders(batchSize);

    for (const order of pendingOrders) {
      try {
        const statusResult = await getOrderStatus(order.providerOrderId);
        const nextStatus = statusResult.normalizedStatus;

        if (!nextStatus || nextStatus === order.status) continue;

        const updated = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: nextStatus,
            rejectionReason:
              nextStatus === 'cancelled' && statusResult.providerStatus
                ? `KD1S: ${statusResult.providerStatus}`
                : undefined,
          },
        });

        try {
          await sendUserOrderNotification({
            orderId: updated.id,
            status: updated.status,
            userId: updated.userId,
          });
        } catch (err) {
          console.warn('Failed to notify user after KD1S status sync', err);
        }
      } catch (err) {
        console.warn('KD1S status check failed', order.id, err?.message || err);
      }
    }
  } finally {
    isSyncing = false;
  }
};

const startKd1sStatusSync = () => {
  const interval = Number(process.env.KD1S_SYNC_INTERVAL_MS) || DEFAULT_INTERVAL_MS;
  if (timer || interval <= 0) return;

  // Run immediately, then schedule
  syncOnce().catch((err) => console.warn('KD1S initial sync failed', err));
  timer = setInterval(() => {
    syncOnce().catch((err) => console.warn('KD1S periodic sync failed', err));
  }, interval);
};

module.exports = { startKd1sStatusSync, syncOnce };
