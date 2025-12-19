const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { exec } = require('child_process'); // قد لا تحتاج لهذه الوحدة إذا لم تكن تستخدمها

dotenv.config();

// تأكد من أن هذا المسار صحيح
const prisma = require('./config/db'); 
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// مهم لبيئات الاستضافة
app.set('trust proxy', 1);

// الأمن والأداء
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  max: 500,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// ---------------------------------------------
// ✅ Health Check Route
// ---------------------------------------------
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// ---------------------------------------------
// Routes
// ---------------------------------------------
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/inventory', require('./routes/inventoryRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/content', require('./routes/contentRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// New Features Routes
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// ---------------------------------------------
// ✅ Root Route (لـ Health Check الافتراضي على '/')
// ---------------------------------------------
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Ratelozn Backend is running',
  });
});

// Errors
app.use(notFound);
app.use(errorHandler);

// ---------------------------------------------
// Server Startup Function (التعديل الرئيسي هنا)
// ---------------------------------------------
async function startServer() {
  // استخدام متغير البيئة PORT الذي توفره Railway، أو 5000 كافتراضي
  const PORT = process.env.PORT || 5000; 
  const HOST = '0.0.0.0';

  try {
    // 1. الاتصال بقاعدة البيانات أولاً والانتظار حتى ينجح
    await prisma.$connect();
    console.log('✅ Connected to database (Neon / PostgreSQL)');
    await prisma.$queryRaw`SELECT 1`; // اختبار الاتصال للتأكد

    // 2. بدء تشغيل السيرفر بعد نجاح الاتصال
    app.listen(PORT, HOST, () => {
      console.log(`Server running in ${process.env.NODE_ENV} mode on ${HOST}:${PORT}`);
      console.log('Ratelozn Backend (Prisma/Postgres) is Ready! 🚀');
    });

  } catch (error) {
    // 3. في حالة فشل الاتصال بقاعدة البيانات، قم بتسجيل الخطأ والخروج من العملية
    console.error('❌ FATAL ERROR: Database connection failed. Exiting process.');
    console.error(error.message);
    // الخروج برمز خطأ (1) سيجعل Railway تحاول إعادة التشغيل
    process.exit(1); 
  }
}

// ---------------------------------------------
// بدء العملية
// ---------------------------------------------
startServer();

module.exports = app;
