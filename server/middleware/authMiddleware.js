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
      
      // Prisma: findUnique
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });
      
      // Remove password from object (optional in raw object, but good practice)
      if(req.user) delete req.user.password;

      // Check if user is banned
      if (req.user && req.user.status === 'banned' && req.user.role !== 'admin') {
        res.status(403);
        throw new Error('تم حظر حسابك من قبل الإدارة. يرجى التواصل مع الدعم الفني.');
      }

      next();
    } catch (error) {
      console.error(error);
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
