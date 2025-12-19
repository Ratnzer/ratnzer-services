const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
      
      // Prisma: findUnique
      req.user = await prisma.user.findUnique({
        where: { id: decoded.id },
      });
      
      // Remove password from object (optional in raw object, but good practice)
      if(req.user) delete req.user.password;

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