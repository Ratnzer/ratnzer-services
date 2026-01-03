const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');
const generateToken = require('../utils/generateToken');
const bcrypt = require('bcryptjs');
const { protect } = require('../middleware/authMiddleware');
const { generateShortId } = require('../utils/id');

// ============================================================
// Admin Setup (Server-side promotion) - Protected by secret key
// Usage:
//   POST /api/auth/setup-admin
//   Header: x-admin-setup-key: <ADMIN_SETUP_KEY>
//   Body: { "email": "admin@example.com" }
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
// - User must be logged in (Bearer token)
// - Send { adminPassword } in body
// - Password is read from env: ADMIN_PANEL_PASSWORD (fallback: ADMIN_SETUP_KEY)
// ============================================================
router.post('/admin/activate', protect, asyncHandler(async (req, res) => {
  const { adminPassword } = req.body;

  const secret =
    process.env.ADMIN_PANEL_PASSWORD ||
    process.env.ADMIN_SETUP_KEY;

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

  // Check if email already exists (only if provided)
  if (cleanEmail) {
    const emailExists = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (emailExists) {
      res.status(400);
      throw new Error('هذا البريد الإلكتروني مستخدم بالفعل');
    }
  }

  // Check if phone already exists (only if provided)
  if (cleanPhone) {
    const phoneExists = await prisma.user.findUnique({ where: { phone: cleanPhone } });
    if (phoneExists) {
      res.status(400);
      throw new Error('هذا رقم الهاتف مستخدم بالفعل');
    }
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Generate an 8-digit user id that doesn't collide with existing users
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
      balance: 0.0, // Default is usually handled by DB, but explicit here
      role: 'user',
      status: 'active'
    }
  });

  if (user) {
    res.status(201).json({
      id: user.id,       // ✅ إضافة id
      _id: user.id,      // للإبقاء على التوافق القديم إذا احتجته
      name: user.name,
      email: user.email,
      phone: user.phone,
      preferredCurrency: user.preferredCurrency || 'USD',
      balance: user.balance,
      role: user.role,
      token: generateToken(user.id),
    });
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
    // Allow login even if banned, so the frontend can show the ban screen 
    // while keeping the user logged in to see their ID/info.
    res.json({
      id: user.id,       // ✅ إضافة id
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      preferredCurrency: user.preferredCurrency || 'USD',
      balance: user.balance,
      role: user.role,
      token: generateToken(user.id),
    });
  } else {
    res.status(401);
    throw new Error('بيانات الدخول غير صحيحة');
  }
}));


// Get Profile
router.get('/profile', protect, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (user) {
    res.json({
      id: user.id,       // ✅ إضافة id
      _id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
      phone: user.phone,
      status: user.status,
      role: user.role,
      // ✅ Do NOT send password hash. Only send a boolean.
      hasPassword: !!user.password
    });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
}));

// ============================================================
// ✅ Change Password (Secure)
// PUT /api/auth/change-password
// Body: { currentPassword?: string, newPassword: string }
// - If user already has a password: currentPassword is required
// - If user has no password (edge case): set without currentPassword
// ============================================================
router.put('/change-password', protect, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword || typeof newPassword !== 'string') {
    return res.status(400).json({ message: 'newPassword مطلوب' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

  // If there is an existing password, verify it
  if (user.password && user.password.length > 0) {
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json({ message: 'يرجى إدخال كلمة المرور الحالية' });
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
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

// Update Profile (Name, Phone, Password)
router.put('/profile', protect, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id }
  });

  if (user) {
    const dataToUpdate = {
        name: req.body.name || user.name,
        email: req.body.email || user.email,
        phone: req.body.phone || user.phone,
        preferredCurrency: req.body.preferredCurrency || user.preferredCurrency,
    };

    // ❌ Do not allow changing password here (use /auth/change-password)
    if (req.body.password) {
      return res.status(400).json({ message: 'لتغيير كلمة المرور استخدم /auth/change-password' });
    }

    const updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: dataToUpdate
    });

    res.json({
      id: updatedUser.id,     // ✅ إضافة id
      _id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      preferredCurrency: updatedUser.preferredCurrency || 'USD',
      balance: updatedUser.balance,
      role: updatedUser.role,
      token: generateToken(updatedUser.id),
    });
  } else {
    res.status(404);
    throw new Error('المستخدم غير موجود');
  }
}));

// ============================================================
// ✅ Delete Account (Secure)
// POST /api/auth/delete-account
// Body: { password: string }
// ============================================================
router.post('/delete-account', protect, asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'كلمة المرور مطلوبة لتأكيد الحذف' });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ message: 'المستخدم غير موجود' });

  // Verify password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'كلمة المرور غير صحيحة' });
  }

  // Delete user (related data will be deleted automatically via Cascade Delete in Prisma schema)
  await prisma.user.delete({ where: { id: req.user.id } });

  res.json({ message: 'تم حذف الحساب وجميع البيانات المرتبطة به بنجاح' });
}));

module.exports = router;
