const asyncHandler = require('express-async-handler');
const prisma = require('../config/db');

// @desc    Get Admin Dashboard Stats (KPIs & Charts)
// @route   GET /api/analytics/dashboard
// @access  Private/Admin
const getDashboardStats = asyncHandler(async (req, res) => {
  
  // 1. Calculate Total Revenue (Sum of completed orders)
  const revenueAgg = await prisma.order.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      status: 'completed',
    },
  });
  const totalRevenue = revenueAgg._sum.amount || 0;

  // 2. Counts
  const totalOrders = await prisma.order.count();
  const totalUsers = await prisma.user.count();
  const totalProducts = await prisma.product.count();

  // 3. Sales Chart Data (Last 7 Days)
  // We need to group orders by day. Prisma doesn't natively support Date grouping easily across all DBs
  // So we fetch last 7 days data and process in JS (efficient enough for dashboard).
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
      },
      status: 'completed',
    },
    select: {
      createdAt: true,
      amount: true,
    },
  });

  // Arabic Day Names Mapping
  const daysMap = ['الأحد', 'الأثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  
  // Initialize last 7 days structure
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = daysMap[d.getDay()];
      const dateString = d.toISOString().split('T')[0]; // YYYY-MM-DD
      
      chartData.push({
          date: dateString,
          day: dayName,
          value: 0
      });
  }

  // Aggregate values
  recentOrders.forEach(order => {
      const orderDate = order.createdAt.toISOString().split('T')[0];
      const dayEntry = chartData.find(d => d.date === orderDate);
      if (dayEntry) {
          dayEntry.value += order.amount;
      }
  });

  // 4. Category Distribution
  // Group products by category
  const products = await prisma.product.findMany({
      select: { category: true }
  });
  
  const categoryCount = {};
  products.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
  });

  const categoryDistribution = Object.keys(categoryCount).map(key => ({
      id: key,
      label: key, // In frontend map this to Arabic name
      count: categoryCount[key],
      percentage: Math.round((categoryCount[key] / totalProducts) * 100)
  }));

  res.json({
    kpi: {
      revenue: totalRevenue,
      orders: totalOrders,
      users: totalUsers,
      products: totalProducts
    },
    salesChart: chartData,
    categoryDist: categoryDistribution
  });
});

module.exports = { getDashboardStats };