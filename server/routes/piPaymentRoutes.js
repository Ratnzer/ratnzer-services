const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const axios = require('axios');
const { generateShortId } = require('../utils/id');
const { sendNotification, notifyAdminsPush } = require('../controllers/notificationController');
const { parseQuantity } = require('../utils/kd1sClient');

// Helpers for order creation (copied from orderController to avoid circular dependency or missing exports)
const parseJsonField = (raw, fallback = null) => {
  try {
    if (raw === undefined || raw === null) return fallback;
    if (typeof raw === 'object') return raw;
    return JSON.parse(String(raw));
  } catch {
    return fallback;
  }
};

const resolveCustomInputConfig = (product, regionId) => {
  const regions = parseJsonField(product?.regions, null);
  const region = Array.isArray(regions)
    ? regions.find((r) => String(r?.id || '') === String(regionId || ''))
    : null;

  if (region?.customInput) return region.customInput;

  const productCustomInput = parseJsonField(product?.customInput, null);
  return productCustomInput || null;
};

const parseApiConfig = (raw) => {
  try {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    return JSON.parse(String(raw));
  } catch (e) {
    console.warn('Failed to parse apiConfig', e?.message || e);
    return null;
  }
};

const normalizeId = (val) => {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return val;
  return String(val);
};

// Pi Network API Key (تم تزويده من المستخدم)
const PI_API_KEY = '38xubrn3ffjlva7azqmzg29q6s7xynoug8ix0rt2am2ewmnlgjfoqodrzm0kqzr5';
const PI_API_URL = 'https://api.minepi.com';

/**
 * @desc    الموافقة على الدفع (Approve)
 * @route   POST /api/pi-payments/approve
 * @access  Private
 */
router.post('/approve', protect, asyncHandler(async (req, res) => {
  const { paymentId } = req.body;

  if (!paymentId) {
    res.status(400);
    throw new Error('paymentId مطلوب');
  }

  console.log(`[Pi Payment] Attempting to approve payment: ${paymentId}`);
  
  try {
    // إرسال طلب لـ Pi API للموافقة على الدفعة (Server-to-Server)
    const response = await axios.post(`${PI_API_URL}/v2/payments/${paymentId}/approve`, {}, {
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // إضافة مهلة زمنية
    });

    console.log(`[Pi Payment] Approved successfully: ${paymentId}`);
    res.status(200).json({ message: 'تمت الموافقة على الدفعة من السيرفر بنجاح', data: response.data });
  } catch (error) {
    console.error('❌ خطأ في الموافقة على دفعة Pi:', error.response?.data || error.message);
    
    // معالجة الأخطاء المختلفة
    let errorMessage = 'فشل التواصل مع خوادم Pi للموافقة';
    let statusCode = 500;
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'انقطع الاتصال بخوادم Pi Network. يرجى المحاولة لاحقاً';
      statusCode = 503;
    } else if (error.response?.status === 401) {
      errorMessage = 'خطأ في المصادقة مع Pi Network';
      statusCode = 401;
    } else if (error.response?.status === 400) {
      errorMessage = error.response?.data?.message || 'بيانات الموافقة غير صحيحة';
      statusCode = 400;
    } else if (error.response?.status === 404) {
      errorMessage = 'معرف الدفع غير موجود';
      statusCode = 404;
    }
    
    res.status(statusCode);
    throw new Error(errorMessage);
  }
}));

/**
 * @desc    إكمال الدفع وإضافة الرصيد (Complete)
 * @route   POST /api/pi-payments/complete
 * @access  Private
 */
router.post('/complete', protect, asyncHandler(async (req, res) => {
  const { 
    paymentId, txid, amountUSD,
    isDirectPurchase, productId, productName, productCategory,
    regionId, regionName, denominationId, quantityLabel,
    customInputValue, customInputLabel, quantity
  } = req.body;

  if (!paymentId || !txid || !amountUSD) {
    res.status(400);
    throw new Error('بيانات الإكمال غير مكتملة');
  }

  console.log(`[Pi Payment] Attempting to complete payment: ${paymentId}, TXID: ${txid}`);

  try {
    // 1. إرسال طلب لـ Pi API لإكمال الدفعة نهائياً (Server-to-Server)
    const response = await axios.post(`${PI_API_URL}/v2/payments/${paymentId}/complete`, { txid }, {
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // إضافة مهلة زمنية
    });

    console.log(`[Pi Payment] Completed successfully: ${paymentId}`);

    const finalPrice = parseFloat(amountUSD);
    let createdOrder = null;

    if (isDirectPurchase) {
      // --- DIRECT PURCHASE LOGIC ---
      const productIdNorm = normalizeId(productId);
      const regionIdNorm = normalizeId(regionId);
      const denominationIdNorm = normalizeId(denominationId);

      const product = await prisma.product.findUnique({ where: { id: productIdNorm } });
      if (!product) {
        throw new Error('المنتج غير موجود');
      }

      const activeCustomInput = resolveCustomInputConfig(product, regionIdNorm);
      const resolvedCustomInputLabel = customInputLabel || activeCustomInput?.label;
      const normalizedQuantity = parseQuantity(quantity ?? quantityLabel ?? 1);
      const normalizedQuantityLabel = quantityLabel || (quantity ? String(normalizedQuantity) : undefined);
      const apiConfig = parseApiConfig(product?.apiConfig);

      // Create Order & Transaction
      createdOrder = await prisma.$transaction(async (tx) => {
        const orderRef = generateShortId();
        
        // Check for auto-delivery
        let deliveredCode = null;
        let status = 'pending';
        let fulfillmentType = apiConfig?.type || 'manual';

        if (product.autoDeliverStock) {
          const stockItem = await tx.inventory.findFirst({
            where: {
              productId: productIdNorm,
              isUsed: false,
              AND: [
                { OR: [{ regionId: regionIdNorm }, { regionId: null }] },
                { OR: [{ denominationId: denominationIdNorm }, { denominationId: null }] },
              ],
            },
            orderBy: { createdAt: 'asc' },
          });

          if (stockItem) {
            deliveredCode = stockItem.code;
            status = 'completed';
            fulfillmentType = 'stock';
            await tx.inventory.update({
              where: { id: stockItem.id },
              data: { isUsed: true, dateUsed: new Date(), usedByOrderId: orderRef }
            });
          }
        }

        const order = await tx.order.create({
          data: {
            id: orderRef,
            userId: req.user.id,
            userName: req.user.name,
            productName: productName || product.name,
            productId: productIdNorm,
            productCategory: productCategory || product.category,
            regionName,
            regionId: regionIdNorm,
            quantityLabel: normalizedQuantityLabel,
            denominationId: denominationIdNorm,
            customInputValue,
            customInputLabel: resolvedCustomInputLabel,
            amount: finalPrice,
            status,
            fulfillmentType,
            deliveredCode,
            providerName: apiConfig?.providerName,
          }
        });

        await tx.transaction.create({
          data: {
            id: generateShortId(),
            userId: req.user.id,
            title: `شراء عبر Pi: ${productName || product.name}`,
            amount: finalPrice,
            type: 'debit',
            status: 'completed',
            description: `رقم معاملة Pi: ${txid}`,
            paymentId: paymentId
          }
        });

        return order;
      });

      // Notify Admins
      notifyAdminsPush({ order: createdOrder, extraData: { source: 'pi-direct' } }).catch(() => {});
      
      // Notify User
      await sendNotification(
        req.user.id,
        'تم استلام طلبك بنجاح ✅',
        `تم شراء ${productName} بمبلغ ${finalPrice} عبر Pi Network`,
        'order_pending'
      );

    } else {
      // --- WALLET TOPUP LOGIC ---
      await prisma.user.update({
        where: { id: req.user.id },
        data: { balance: { increment: finalPrice } }
      });

      await prisma.transaction.create({
        data: {
          id: generateShortId(),
          userId: req.user.id,
          amount: finalPrice,
          type: 'deposit',
          status: 'completed',
          title: 'شحن رصيد عبر شبكة Pi',
          description: `رقم المعاملة: ${txid}`,
          paymentId: paymentId
        }
      });

      await sendNotification(
        req.user.id,
        'تم شحن الرصيد بنجاح ✅',
        `تم شحن رصيدك بمبلغ ${finalPrice} عبر Pi Network`,
        'wallet_credit'
      );
    }

    res.status(200).json({
      message: isDirectPurchase ? 'تمت عملية الشراء بنجاح' : 'تم شحن الرصيد بنجاح',
      order: createdOrder,
      piPayment: response.data
    });
  } catch (error) {
    console.error('❌ خطأ في إكمال دفعة Pi:', error.response?.data || error.message);
    
    // معالجة الأخطاء المختلفة
    let errorMessage = 'فشل تأكيد الدفع في شبكة Pi، يرجى التواصل مع الدعم';
    let statusCode = 500;
    
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'انقطع الاتصال بخوادم Pi Network. يرجى المحاولة لاحقاً';
      statusCode = 503;
    } else if (error.response?.status === 401) {
      errorMessage = 'خطأ في المصادقة مع Pi Network. يرجى التحقق من مفتاح API';
      statusCode = 401;
    } else if (error.response?.status === 400) {
      errorMessage = error.response?.data?.message || 'بيانات الدفع غير صحيحة';
      statusCode = 400;
    } else if (error.response?.status === 404) {
      errorMessage = 'معرف الدفع غير موجود في نظام Pi';
      statusCode = 404;
    }
    
    res.status(statusCode);
    throw new Error(errorMessage);
  }
}));

module.exports = router;
