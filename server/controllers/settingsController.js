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

// @desc    Get About Us settings
// @route   GET /api/settings/about-us
// @access  Public
const getAboutUs = asyncHandler(async (req, res) => {
  const setting = await prisma.setting.findUnique({
    where: { key: 'aboutUs' },
  });
  
  const defaultAboutUs = {
    title: 'من نحن',
    description: '',
    address: '',
    imageUrl: '',
    socialLinks: {
      whatsapp: '',
      telegram: '',
      instagram: '',
      twitter: '',
      facebook: '',
      email: ''
    }
  };
  
  res.json(setting ? setting.value : defaultAboutUs);
});

// @desc    Update About Us settings
// @route   PUT /api/settings/about-us
// @access  Private/Admin
const updateAboutUs = asyncHandler(async (req, res) => {
  const { title, description, address, imageUrl, socialLinks } = req.body;

  const aboutUsData = {
    title: title || 'من نحن',
    description: description || '',
    address: address || '',
    imageUrl: imageUrl || '',
    socialLinks: socialLinks || {}
  };

  const setting = await prisma.setting.upsert({
    where: { key: 'aboutUs' },
    update: { value: aboutUsData },
    create: { key: 'aboutUs', value: aboutUsData },
  });

  res.json(setting);
});

module.exports = { getSetting, updateSetting, getAboutUs, updateAboutUs };