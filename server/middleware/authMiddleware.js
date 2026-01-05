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

      // Security Check: Block all requests for banned users EXCEPT for the profile request
      // This allows the frontend to load the user status and show the ban screen,
      // but prevents any other actions (orders, payments, etc.)
      if (req.user && req.user.status === 'banned' && req.user.role !== 'admin') {
        const isProfileRequest = req.originalUrl.includes('/auth/profile') && req.method === 'GET';

        if (!isProfileRequest) {
          // Preserve the 403 status and flag the error so the catch block doesn't
          // overwrite it with a 401, which would hide the ban status from the client.
          const banError = new Error('تم حظر حسابك. لا يمكنك إجراء هذه العملية.');
          banError.isBanError = true;
          res.status(403);
          throw banError;
        }
      }

      next();
    } catch (error) {
      // If it's the ban error, keep the 403 so the frontend can show the ban screen
      if (error.isBanError) {
        res.status(403);
        throw error;
      }
      
      // Handle JWT errors (invalid signature, expired, etc.)
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
