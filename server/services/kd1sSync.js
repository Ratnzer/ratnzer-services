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
      status: { in: ['pending', 'processing', 'inprogress', 'in_progress'] },
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
        const providerStatus = statusResult.providerStatus;

        // تحديث الحالة إذا تغيرت أو إذا كانت الحالة من المزود هي "processing" ونحن لا نزال في "pending"
        const isStatusChanged = nextStatus && nextStatus !== order.status;
        const isProviderProcessing = providerStatus && 
          ['processing', 'inprogress', 'in_progress', 'pending'].includes(String(providerStatus).toLowerCase()) && 
          order.status === 'pending';

        if (!isStatusChanged && !isProviderProcessing) continue;

        // إذا كان المزود بدأ المعالجة، نحدث الحالة إلى 'processing' (إذا كانت مدعومة) أو نبقيها 'pending'
        // لكن الأهم هو تحديث الحالات النهائية (completed, cancelled)
        if (!nextStatus) continue;

        const updated = await prisma.$transaction(async (tx) => {
          // If the status is changing to cancelled, we MUST refund the user
          if (nextStatus === 'cancelled') {
            // Re-fetch the latest order state inside transaction
            const currentOrder = await tx.order.findUnique({ where: { id: order.id } });
            
            // Only refund if it's not already cancelled (safety check)
            if (currentOrder && currentOrder.status !== 'cancelled') {
              // 1. Refund Balance
              await tx.user.update({
                where: { id: order.userId },
                data: { balance: { increment: Number(order.amount) } },
              });

              // 2. Create Refund Transaction Log
              await tx.transaction.create({
                data: {
                  id: require('../utils/id').generateShortId(),
                  userId: order.userId,
                  title: `استرداد تلقائي: ${order.productName}`,
                  amount: Number(order.amount),
                  type: 'credit',
                  status: 'completed',
                },
              });
            }
          }

          // Update the order status
          return await tx.order.update({
            where: { id: order.id },
            data: {
              status: nextStatus,
              rejectionReason:
                nextStatus === 'cancelled' && statusResult.providerStatus
                  ? `KD1S: ${statusResult.providerStatus}`
                  : undefined,
            },
          });
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
