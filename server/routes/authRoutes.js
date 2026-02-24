const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/authMiddleware');
const { generateShortId } = require('../utils/id');
const admin = require('../config/firebase');

const extractSignInProvider = (decodedToken) => decodedToken?.firebase?.sign_in_provider || null;

const assertExpectedProvider = (decodedToken, expectedProvider) => {
  const provider = extractSignInProvider(decodedToken);
  if (provider !== expectedProvider) {
    const err = new Error(`رمز الدخول لا يطابق موفر ${expectedProvider}`);
    err.statusCode = 401;
    throw err;
  }
};

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

// ============================================================
// Admin Setup (Server-side promotion) - Protected by secret key
// ============================================================
router.post('/setup-admin', asyncHandler(async (req, res) => {
  const setupKey = req.headers['x-admin-setup-key'];
  const { email } = req.body;

  if (!process.env.ADMIN_SETUP_KEY) {
    res.status(500);
    throw new Error('ADMIN_SETUP_KEY غير مضبوط على السيرفر');
  }

  if (!setupKey || setupKey !== process.env.ADMIN_SETUP_KEY) {
    res.status(401);
    throw new Error('غير مصرح لك (مفتاح الإعداد غير صحيح)');
  }

  if (!email) {
    res.status(400);
    throw new Error('email مطلوب');
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }

  const updatedUser = await prisma.user.update({
    where: { email },
    data: { role: 'admin' },
  });

  res.json({
    message: 'تم تعيين المستخدم كمسؤول',
    email: updatedUser.email,
    role: updatedUser.role,
  });
}));

// ============================================================
// ✅ Activate Admin via password (Admin Panel)
// ============================================================
router.post('/admin/activate', protect, asyncHandler(async (req, res) => {
  const { adminPassword } = req.body;

  const secret = process.env.ADMIN_PANEL_PASSWORD || process.env.ADMIN_SETUP_KEY;

  if (!secret) {
    return res.status(500).json({ message: "Admin password is not configured on server" });
  }

  if (!adminPassword) {
    return res.status(400).json({ message: "adminPassword is required" });
  }

  if (adminPassword !== secret) {
    return res.status(401).json({ message: "Invalid admin password" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ message: "User not found" });

  if (user.role === "admin") {
    return res.json({ message: "Already admin", role: user.role });
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { role: "admin" },
    select: { id: true, role: true, name: true, email: true },
  });

  res.json({ message: "Admin activated", user: updated });
}));

// Google Auth
router.post('/google', asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400);
    throw new Error('idToken مطلوب');
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    res.status(error?.statusCode || 401);
    throw new Error(error?.message || 'فشل التحقق من رمز جوجل');
  }

  assertExpectedProvider(decodedToken, 'google.com');

  const { email, name } = decodedToken;
  const cleanEmail = email.toLowerCase();

  let user = await prisma.user.findUnique({ where: { email: cleanEmail } });

  if (!user) {
    let userId = generateShortId();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.user.findUnique({ where: { id: userId } });
      if (!exists) break;
      userId = generateShortId();
    }

    user = await prisma.user.create({
      data: {
        id: userId,
        name: name || email.split('@')[0],
        email: cleanEmail,
        password: '', 
        role: 'user',
        status: 'active',
        balance: 0.0
      }
    });
  }

  res.json(getSafeUserData(user));
}));

// Facebook Auth
router.post('/facebook', asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400);
    throw new Error('idToken مطلوب');
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    res.status(error?.statusCode || 401);
    throw new Error(error?.message || 'فشل التحقق من رمز فيسبوك');
  }

  assertExpectedProvider(decodedToken, 'facebook.com');

  const { email, name, uid } = decodedToken;
  const userEmail = email ? email.toLowerCase() : `${uid}@facebook.com`;

  let user = await prisma.user.findUnique({ where: { email: userEmail } });

  if (!user) {
    let userId = generateShortId();
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.user.findUnique({ where: { id: userId } });
      if (!exists) break;
      userId = generateShortId();
    }

    user = await prisma.user.create({
      data: {
        id: userId,
        name: name || userEmail.split('@')[0],
        email: userEmail,
        password: '', 
        role: 'user',
        status: 'active',
        balance: 0.0
      }
    });
  }

  res.json(getSafeUserData(user));
}));

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  const cleanEmail = (typeof email === 'string' && email.trim()) ? email.trim().toLowerCase() : null;
  const cleanPhone = (typeof phone === 'string' && phone.trim()) ? phone.trim() : null;

  if (!name || !String(name).trim()) {
    res.status(400);
    throw new Error('يرجى إدخال الاسم');
  }

  if (!password) {
    res.status(400);
    throw new Error('يرجى إدخال كلمة المرور');
  }

  if (!cleanEmail && !cleanPhone) {
    res.status(400);
    throw new Error('يرجى إدخال البريد الإلكتروني أو رقم الهاتف');
  }

  if (cleanEmail) {
    const emailExists = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (emailExists) {
      res.status(400);
      throw new Error('هذا البريد الإلكتروني مستخدم بالفعل');
    }
  }

  if (cleanPhone) {
    const phoneExists = await prisma.user.findUnique({ where: { phone: cleanPhone } });
    if (phoneExists) {
      res.status(400);
      throw new Error('هذا رقم الهاتف مستخدم بالفعل');
    }
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  let userId = generateShortId();
  for (let i = 0; i < 5; i++) {
    const exists = await prisma.user.findUnique({ where: { id: userId } });
    if (!exists) break;
    userId = generateShortId();
  }

  const user = await prisma.user.create({
    data: {
      id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password: hashedPassword,
      balance: 0.0,
      role: 'user',
      status: 'active'
    }
  });

  if (user) {
    res.status(201).json(getSafeUserData(user));
  } else {
    res.status(400);
    throw new Error('بيانات غير صحيحة');
  }
}));

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  const cleanEmail = (typeof email === 'string' && email.trim()) ? email.trim().toLowerCase() : null;
  const cleanPhone = (typeof phone === 'string' && phone.trim()) ? phone.trim() : null;

  if (!password) {
    res.status(400);
    throw new Error('يرجى إدخال كلمة المرور');
  }

  if (!cleanEmail && !cleanPhone) {
    res.status(400);
    throw new Error('يرجى إدخال البريد الإلكتروني أو رقم الهاتف');
  }

  const user = cleanEmail
    ? await prisma.user.findUnique({ where: { email: cleanEmail } })
    : await prisma.user.findUnique({ where: { phone: cleanPhone } });

  if (user && (await bcrypt.compare(password, user.password))) {
    res.json(getSafeUserData(user));
  } else {
    res.status(401);
    throw new Error('بيانات الدخول غير صحيحة');
  }
}));

// Get Profile
router.get('/profile', protect, asyncHandler(async (req, res) => {
  // Use data already attached by protect middleware
  if (req.user) {
    res.json({
      ...req.user,
      hasPassword: !!req.user.password || true // Handled by protect select if we want
    });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
}));

// Change Password
router.put('/change-password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

  if (user.password) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    }
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { id: req.user.id },
    data: { password: hashedPassword },
  });

  res.json({ message: 'تم تحديث كلمة المرور بنجاح ✅' });
}));

// Update Profile
router.put('/profile', protect, asyncHandler(async (req, res) => {
  const dataToUpdate = {
    name: req.body.name || undefined,
    email: req.body.email || undefined,
    phone: req.body.phone || undefined,
    preferredCurrency: req.body.preferredCurrency || undefined,
  };

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: dataToUpdate
  });

  res.json(getSafeUserData(updatedUser));
}));

// Delete Account
router.post('/delete-account', protect, asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'كلمة المرور مطلوبة لتأكيد الحذف' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
  }

  await prisma.user.delete({ where: { id: req.user.id } });
  res.json({ message: 'تم حذف الحساب بنجاح' });
}));

module.exports = router;
