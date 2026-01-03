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

      // We no longer block requests with 403 here, because we want the user 
      // to stay logged in and see the ban screen in the frontend.
      // The frontend will use the 'status' field from the user profile to show the overlay.
      next();
    } catch (error) {
      // If it's the ban error, re-throw it to be handled by the main Express error handler
      if ((error as any).isBanError) {
        throw error;
      }
      
      // Handle JWT errors (invalid signature, expired, etc.)
      console.error(error);
      res.status(401);
      throw new Error('غير مصرح لك، الرمز غير صالح');
    }
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
