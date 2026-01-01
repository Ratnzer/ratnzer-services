const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// @desc    Get setting by key
// @route   GET /api/settings/:key
// @access  Public
const getSetting = asyncHandler(async (req, res) => {
  const setting = await prisma.setting.findUnique({
    where: { key: req.params.key },
  });
  res.json(setting ? setting.value : null);
});

// @desc    Create or Update setting
// @route   POST /api/settings
// @access  Private/Admin
const updateSetting = asyncHandler(async (req, res) => {
  const { key, value } = req.body;

  if (!key) {
    res.status(400);
    throw new Error('Key is required');
  }

  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });

  res.json(setting);
});

module.exports = { getSetting, updateSetting };