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
      
      // Prisma: findUnique with select for better performance
      // We fetch only the necessary fields used across the application
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
          // We exclude password field for security and performance
        }
      });

      if (!req.user) {
        res.status(401);
        throw new Error('المستخدم غير موجود');
      }

      // Security Check: Block all requests for banned users EXCEPT for the profile request
      // This allows the frontend to load the user status and show the ban screen,
      // but prevents any other actions (orders, payments, etc.)
      if (req.user.status === 'banned' && req.user.role !== 'admin') {
        const isProfileRequest = req.originalUrl.includes('/auth/profile') && req.method === 'GET';
        
        if (!isProfileRequest) {
          res.status(403);
          throw new Error('تم حظر حسابك. لا يمكنك إجراء هذه العملية.');
        }
      }

      next();
    } catch (error) {
      // If it's the ban error, re-throw it to be handled by the main Express error handler
      if (res.statusCode === 403) {
        throw error;
      }
      
      // Handle JWT errors (invalid signature, expired, etc.)
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
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401);
    throw new Error('غير مصرح لك كمسؤول');
  }
};

module.exports = { protect, admin };
