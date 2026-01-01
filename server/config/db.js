// db.js

const { PrismaClient } = require('@prisma/client');

// ✅ رابط قاعدة البيانات الصحيح (Neon PostgreSQL)
// بدون psql
// بدون علامات اقتباس
// بدون channel_binding
const DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://neondb_owner:npg_7s4DtFNTkoLJ@ep-super-pine-a4jbxnal-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

// ✅ تهيئة PrismaClient مع تحديد الـ datasource
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

// ✅ تصدير prisma لباقي الملفات
module.exports = prisma;
