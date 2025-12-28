const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// Helper: Accept booleans passed as boolean/string/number
const coerceBool = (value, defaultValue = true) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return defaultValue;
};

// =========================
// Banners
// =========================
// GET /api/content/banners
const getBanners = asyncHandler(async (req, res) => {
  const banners = await prisma.banner.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(banners);
});

// POST /api/content/banners (admin)
const createBanner = asyncHandler(async (req, res) => {
  const banner = await prisma.banner.create({
    data: req.body,
  });
  res.status(201).json(banner);
});

// DELETE /api/content/banners/:id (admin)
const deleteBanner = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400);
    throw new Error('Invalid banner id');
  }

  await prisma.banner.delete({ where: { id } });
  res.json({ message: 'Banner deleted successfully' });
});

// =========================
// Announcements
// =========================
// GET /api/content/announcements
const getAnnouncements = asyncHandler(async (req, res) => {
  const limitRaw = req.query?.limit;
  const skipRaw = req.query?.skip;

  const usePaging = limitRaw !== undefined || skipRaw !== undefined;

  // Backwards compatible: if no params, return full array
  if (!usePaging) {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return res.json(announcements);
  }

  const limit = Math.min(parseInt(String(limitRaw ?? '10'), 10) || 10, 50);
  const skip = Math.max(parseInt(String(skipRaw ?? '0'), 10) || 0, 0);

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.announcement.count(),
  ]);

  const hasMore = skip + items.length < total;
  return res.json({ items, hasMore, total });
});


// POST /api/content/announcements (admin)
const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, message, type, isActive, date, showOnHome, showInNotifications } = req.body || {};

  if (!title || !message || !type) {
    res.status(400);
    throw new Error('title, message, and type are required');
  }

  const announcement = await prisma.announcement.create({
    data: {
      title,
      message,
      type,
      isActive: coerceBool(isActive, true),
      showOnHome: coerceBool(showOnHome, true),
      showInNotifications: coerceBool(showInNotifications, true),
      date: date || null,
    },
  });

  res.status(201).json(announcement);
});

// DELETE /api/content/announcements/:id (admin)
const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.announcement.delete({ where: { id } });
  res.json({ message: 'Announcement deleted successfully' });
});

// =========================
// Categories
// =========================
// GET /api/content/categories
const getCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(categories);
});

// POST /api/content/categories (admin)
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon } = req.body || {};

  if (!name) {
    res.status(400);
    throw new Error('name is required');
  }

  const category = await prisma.category.create({
    data: {
      name,
      icon: icon || null,
    },
  });

  res.status(201).json(category);
});

// DELETE /api/content/categories/:id (admin)
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.category.delete({ where: { id } });
  res.json({ message: 'Category deleted successfully' });
});

// PUT /api/content/categories/:id (admin)
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, icon } = req.body || {};

  if (!name) {
    res.status(400);
    throw new Error('name is required');
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      name,
      icon: typeof icon === 'string' ? icon : undefined,
    },
  });

  res.json(updated);
});

// =========================
// Terms & Conditions (Singleton)
// =========================
// GET /api/content/terms
const getTerms = asyncHandler(async (req, res) => {
  let terms = await prisma.appTerms.findUnique({ where: { id: 'singleton' } });

  // Ensure singleton exists so client always receives a consistent shape
  if (!terms) {
    terms = await prisma.appTerms.create({
      data: { id: 'singleton', contentAr: '', contentEn: '' },
    });
  }

  res.json(terms);
});

// PUT /api/content/terms (admin)
const updateTerms = asyncHandler(async (req, res) => {
  const { contentAr, contentEn } = req.body || {};

  const ar = typeof contentAr === 'string' ? contentAr : '';
  const en = typeof contentEn === 'string' ? contentEn : '';

  const terms = await prisma.appTerms.upsert({
    where: { id: 'singleton' },
    update: { contentAr: ar, contentEn: en },
    create: { id: 'singleton', contentAr: ar, contentEn: en },
  });

  res.json(terms);
});

module.exports = {
  getBanners,
  createBanner,
  deleteBanner,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  getCategories,
  createCategory,
  deleteCategory,
  updateCategory,
  getTerms,
  updateTerms,
};
