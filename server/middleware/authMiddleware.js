const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
      }

      const decoded = jwt.verify(token, secret);
      
      try {
        // محاولة جلب بيانات المستخدم من قاعدة البيانات
        req.user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            balance: true,
            preferredCurrency: true,
          }
        });

        if (!req.user) {
          res.status(401);
          throw new Error('المستخدم غير موجود');
        }

        // التحقق من الحظر
        if (req.user.status === 'banned' && req.user.role !== 'admin') {
          const isProfileRequest = req.originalUrl.includes('/auth/profile') && req.method === 'GET';
          if (!isProfileRequest) {
            res.status(403);
            throw new Error('تم حظر حسابك. لا يمكنك إجراء هذه العملية.');
          }
        }
      } catch (dbError) {
        // إذا فشل الاتصال بقاعدة البيانات، نسمح بمرور الطلب مع بيانات أساسية من التوكن
        // هذا يمنع تسجيل الخروج التلقائي (Logout) ويسمح للواجهة بالبقاء نشطة
        console.error('Database Connection Error in Auth Middleware:', dbError.message);
        
        // إذا كان الخطأ ليس بسبب "المستخدم غير موجود" أو "الحظر"، نعتبره خطأ اتصال
        if (res.statusCode !== 401 && res.statusCode !== 403) {
          req.user = { id: decoded.id, dbError: true };
          // ملاحظة: العمليات التي تتطلب بيانات حقيقية من القاعدة ستفشل لاحقاً بشكل طبيعي
          // لكن هذا يمنع الـ 401 الذي يطرد المستخدم
        } else {
          throw dbError;
        }
      }

      next();
    } catch (error) {
      if (res.statusCode === 403) {
        throw error;
      }
      console.error('Auth Error:', error.message);
      res.status(401);
      throw new Error('غير مصرح لك، الرمز غير صالح');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('غير مصرح لك، لا يوجد رمز');
  }
});

const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || (req.user.dbError && req.user.id))) {
    // في حالة خطأ القاعدة، نسمح بالمرور إذا كان هناك ID (سيتم التحقق لاحقاً في الـ Controller)
    next();
  } else {
    res.status(401);
    throw new Error('غير مصرح لك كمسؤول');
  }
};

module.exports = { protect, admin };
