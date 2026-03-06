const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const generateToken = require('../utils/generateToken');
const { generateShortId } = require('../utils/id');

// Helper to return consistent user data
const getSafeUserData = (user) => {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    preferredCurrency: user.preferredCurrency || 'USD',
    balance: user.balance,
    role: user.role,
    status: user.status,
    token: generateToken(user.id),
  };
};

/**
 * مسار تسجيل الدخول عبر Pi Network
 * POST /auth/pi
 * 
 * متطلبات الجسم:
 * {
 *   username: string - اسم المستخدم من Pi Network
 *   uid: string - معرف المستخدم الفريد من Pi
 *   accessToken: string - رمز الوصول من Pi SDK
 * }
 */
router.post('/pi', asyncHandler(async (req, res) => {
  const { username, uid, accessToken } = req.body;

  // التحقق من المدخلات المطلوبة
  if (!username || !uid || !accessToken) {
    res.status(400);
    throw new Error('username و uid و accessToken مطلوبة');
  }

  // إنشاء بريد إلكتروني فريد بناءً على معرف Pi
  const piEmail = `${uid}@pi.network`;

  try {
    // البحث عن المستخدم بناءً على معرف Pi
    let user = await prisma.user.findUnique({
      where: { email: piEmail }
    });

    // إذا لم يكن المستخدم موجوداً، قم بإنشاء حساب جديد
    if (!user) {
      let userId = generateShortId();
      
      // التأكد من أن المعرف فريد
      for (let i = 0; i < 5; i++) {
        const exists = await prisma.user.findUnique({ where: { id: userId } });
        if (!exists) break;
        userId = generateShortId();
      }

      user = await prisma.user.create({
        data: {
          id: userId,
          name: username || `Pi User ${uid.substring(0, 8)}`,
          email: piEmail,
          phone: null,
          password: '', // لا يوجد كلمة مرور لحسابات Pi
          role: 'user',
          status: 'active',
          balance: 0.0,
          // يمكن إضافة حقول إضافية لتخزين بيانات Pi
          // piUid: uid,
          // piUsername: username,
        }
      });

      console.log(`✅ تم إنشاء مستخدم جديد من Pi Network: ${username}`);
    } else {
      console.log(`✅ تم تسجيل دخول مستخدم Pi موجود: ${username}`);
    }

    // إرجاع بيانات المستخدم مع الرمز
    res.json(getSafeUserData(user));
  } catch (error) {
    console.error('❌ خطأ في معالجة تسجيل دخول Pi:', error);
    res.status(500);
    throw new Error(error?.message || 'فشل تسجيل الدخول عبر Pi Network');
  }
}));

module.exports = router;
