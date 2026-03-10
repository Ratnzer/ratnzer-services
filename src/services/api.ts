import axios, { InternalAxiosRequestConfig, AxiosError, AxiosHeaders } from "axios";
import { getApiUrl } from "../config/environment";

// ============================================================
// ✅ API URL: يتم تحديده ديناميكياً حسب البيئة (Sandbox/Mainnet)
// ============================================================
const API_URL = getApiUrl("");

if (!API_URL) {
  console.warn("⚠️ تحذير: لم يتم تحديد API_URL. قد تفشل استدعاءات API.");
}

console.log("🔌 الاتصال بـ API:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000, // يمكن تغييره من environment config
});

// ============================================================
// Inject Token Automatically
// ============================================================
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token) {
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      config.headers.Authorization = "Bearer " + token;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ============================================================
// Handle API Responses and Errors
// ============================================================
api.interceptors.response.use(
  (response) => {
    // ✅ استجابة ناجحة
    return response;
  },
  (error: AxiosError) => {
    // ❌ معالجة الأخطاء
    let errorMessage = 'حدث خطأ في الاتصال بالسيرفر';
    let statusCode = error.response?.status || 0;

    // معالجة الأخطاء المختلفة
    if (!error.response) {
      // خطأ في الشبكة (لا توجد استجابة من الخادم)
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'انقطع الاتصال بالسيرفر. يرجى التحقق من اتصالك بالإنترنت';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'خطأ في الاتصال بالشبكة. تأكد من اتصالك بالإنترنت';
      } else {
        errorMessage = 'فشل الاتصال بالسيرفر';
      }
    } else if (statusCode === 400) {
      // طلب غير صحيح
      errorMessage = (error.response.data as any)?.message || 'بيانات غير صحيحة';
    } else if (statusCode === 401) {
      // غير مصرح
      // تحقق من محاولة تفعيل المسؤول
      const isAdminActivation = error.config?.url?.includes('/auth/admin/activate');
      
      if (!isAdminActivation) {
        errorMessage = 'جلستك انتهت. يرجى تسجيل الدخول مرة أخرى';
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else {
        // أرجع رسالة الخطأ المحددة من الخادم لتسجيل دخول المسؤول
        errorMessage = (error.response?.data as any)?.message || 'كلمة مرور المسؤول غير صحيحة';
      }
    } else if (statusCode === 403) {
      // محظور
      errorMessage = 'ليس لديك صلاحية للقيام بهذا الإجراء';
    } else if (statusCode === 404) {
      // غير موجود
      errorMessage = 'المورد المطلوب غير موجود';
    } else if (statusCode === 409) {
      // تضارب
      errorMessage = (error.response.data as any)?.message || 'تضارب في البيانات';
    } else if (statusCode === 500) {
      // خطأ في الخادم
      errorMessage = (error.response.data as any)?.message || 'حدث خطأ في السيرفر';
    } else if (statusCode === 503) {
      // الخدمة غير متاحة
      errorMessage = 'الخدمة غير متاحة حالياً. يرجى المحاولة لاحقاً';
    } else if (statusCode >= 400 && statusCode < 500) {
      // أخطاء 4xx أخرى
      errorMessage = (error.response.data as any)?.message || `خطأ في الطلب (${statusCode})`;
    } else if (statusCode >= 500) {
      // أخطاء 5xx أخرى
      errorMessage = (error.response.data as any)?.message || `خطأ في السيرفر (${statusCode})`;
    }

    // إضافة رسالة الخطأ إلى كائن الخطأ
    const enhancedError = new Error(errorMessage) as any;
    enhancedError.statusCode = statusCode;
    enhancedError.originalError = error;
    enhancedError.response = error.response;

    // طباعة تفاصيل الخطأ في وضع التطوير
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ API Error:', {
        message: errorMessage,
        statusCode,
        url: error.config?.url,
        method: error.config?.method,
      });
    }

    return Promise.reject(enhancedError);
  }
);

// ============================================================
// Auth Services
// ============================================================
export const authService = {
  login: (data: any) => api.post("/auth/login", data),
  register: (data: any) => api.post("/auth/register", data),
  googleLogin: (idToken: string) => api.post("/auth/google", { idToken }),
  facebookLogin: (idToken: string) => api.post("/auth/facebook", { idToken }),
  piLogin: (piData: any) => api.post("/auth/pi", piData),
  getProfile: () => api.get("/auth/profile"),
  updateProfile: (data: any) => api.put("/auth/profile", data),
  // ✅ Change/Set password (server-side)
  changePassword: (data: any) => api.put("/auth/change-password", data),
  // ✅ Delete account (server-side)
  deleteAccount: (data: any) => api.post("/auth/delete-account", data),
};

// ============================================================
// Product Services
// ============================================================
export const productService = {
  getAll: () => api.get("/products"),
  create: (data: any) => api.post("/products", data),
  update: (id: string, data: any) => api.put("/products/" + id, data),
  delete: (id: string) => api.delete("/products/" + id),
  updateOrder: (products: any[]) => api.put("/products/order", { products }),
};

// ============================================================
// Order Services
// ============================================================
export const orderService = {
  getAll: (params?: { q?: string }) => api.get("/orders", { params }),
  getAllPaged: (skip = 0, limit = 10, q?: string) =>
    api.get(`/orders?skip=${skip}&limit=${limit}${q ? `&q=${encodeURIComponent(q)}` : ""}`),
  getMyOrders: () => api.get("/orders/myorders"),
  getMyOrdersPaged: (skip = 0, limit = 10) => api.get(`/orders/myorders?skip=${skip}&limit=${limit}`),
  create: (data: any) => api.post("/orders", data),
  // ✅ مهم: encodeURIComponent حتى لو كان الـ id يحتوي رموز مثل # أو مسافات
  updateStatus: (id: string, data: any) =>
    api.put("/orders/" + encodeURIComponent(id) + "/status", data),
};

// ============================================================
// Inventory Services
// ============================================================
export const inventoryService = {
  getAll: () => api.get("/inventory"),
  add: (data: any) => api.post("/inventory", data),
  delete: (id: string) => api.delete("/inventory/" + id),
};

// ============================================================
// User Services
// ============================================================
export const userService = {
  getAll: (params?: { q?: string; email?: string; id?: string }) => api.get("/users", { params }),
  search: (q: string) => api.get("/users", { params: { q } }),
  updateBalance: (id: string, amount: number, type: "add" | "deduct") =>
    api.put("/users/" + id + "/balance", { amount, type }),
  updateStatus: (id: string, data: any = {}) => api.put("/users/" + id + "/status", data),
};

// ============================================================
// Wallet Services
// ============================================================
export const walletService = {
  getTransactions: () => api.get("/wallet/transactions"),
  getTransactionsPaged: (skip = 0, limit = 10) => api.get(`/wallet/transactions?skip=${skip}&limit=${limit}`),
};

// ============================================================
// Wallet Topup Services (Asiacell)
// ============================================================
export const walletTopupService = {
  createRequest: (data: any) => api.post("/wallet-topup/request", data),
  getMyRequests: (skip = 0, limit = 10) => api.get(`/wallet-topup/my-requests?skip=${skip}&limit=${limit}`),
  getPendingRequests: (skip = 0, limit = 20, status = 'pending') => api.get(`/wallet-topup/requests?skip=${skip}&limit=${limit}&status=${status}`),
  approveRequest: (requestId: string, amount: number) => api.post(`/wallet-topup/${requestId}/approve`, { amount }),
  rejectRequest: (requestId: string, reason: string) => api.post(`/wallet-topup/${requestId}/reject`, { reason }),
};

// ============================================================
// Payment Services
// ============================================================
export const paymentService = {
  charge: (data: any) => api.post("/payments/charge", data),
  // ✅ PayTabs
  paytabsCreate: (data: any) => api.post('/payments/paytabs/create', data),
  paytabsStatus: (paymentId: string) => api.get('/payments/paytabs/status/' + encodeURIComponent(paymentId)),
};

// ============================================================
// Pi Payment Services
// ============================================================
export const piPaymentService = {
  create: (data: any) => api.post("/pi-payments/create", data),
  approve: (paymentId: string) => api.post("/pi-payments/approve", { paymentId }),
  complete: (data: { paymentId: string; txid: string; amountUSD: number; [key: string]: any }) => api.post("/pi-payments/complete", data),
};

// ============================================================
// Cart Services (Server-side Cart)
// ============================================================
export const cartService = {
  getMyCart: () => api.get("/cart"),
  getMyCartPaged: (skip = 0, limit = 10) => api.get(`/cart?skip=${skip}&limit=${limit}`),
  add: (data: any) => api.post("/cart", data),
  remove: (id: string) => api.delete("/cart/" + id),
  clear: () => api.delete("/cart"),
};


// ============================================================
// Settings Services (Admin-configurable app settings)
// ============================================================
export const settingsService = {
  get: (key: string) => api.get('/settings/' + encodeURIComponent(key)),
  set: (key: string, value: any) => api.post('/settings', { key, value }),
  getAboutUs: () => api.get('/settings/about-us'),
  updateAboutUs: (data: any) => api.put('/settings/about-us', data),
};

// ============================================================
// Content Services
// ============================================================
export const contentService = {
  getBanners: () => api.get("/content/banners"),
  createBanner: (data: any) => api.post("/content/banners", data),
  deleteBanner: (id: number) => api.delete("/content/banners/" + id),

  getAnnouncements: () => api.get("/content/announcements"),
  getAnnouncementsPaged: (skip = 0, limit = 10) => api.get(`/content/announcements?skip=${skip}&limit=${limit}`),
  createAnnouncement: (data: any) => api.post("/content/announcements", data),
  deleteAnnouncement: (id: string) => api.delete("/content/announcements/" + id),

  getCategories: () => api.get("/content/categories"),
  createCategory: (data: any) => api.post("/content/categories", data),
  deleteCategory: (id: string) => api.delete("/content/categories/" + id),
  updateCategory: (id: string, data: { name: string; icon?: string }) => api.put("/content/categories/" + id, data),

  // ✅ Terms
  getTerms: () => api.get("/content/terms"),
  updateTerms: (data: { contentAr: string; contentEn: string; externalUrl?: string; useExternalUrl?: boolean }) =>
    api.put("/content/terms", data),

  // ✅ Privacy Policy
  getPrivacy: () => api.get("/content/privacy"),
  updatePrivacy: (data: { contentAr: string; contentEn: string; externalUrl?: string; useExternalUrl?: boolean }) =>
    api.put("/content/privacy", data),
};

// ============================================================
// Push Notification Services
// ============================================================
export const pushService = {
  registerDevice: (data: { token: string; platform?: string; userId?: string | number }) =>
    api.post("/notifications/register-device", data),
  notifyAdminOrder: (data: { orderId?: string }) =>
    api.post("/notifications/notify-admin-order", data),
  notifyUserOrderUpdate: (data: { orderId?: string; status?: string }) =>
    api.post("/notifications/notify-user-order", data),
  broadcastAnnouncement: (data: { title: string; message: string }) =>
    api.post("/notifications/broadcast", data),
  getMyNotifications: (skip = 0, limit = 10) =>
    api.get(`/notifications?skip=${skip}&limit=${limit}`),
};

// ============================================================
// Analytics Services
// ============================================================
export const analyticsService = {
  getDashboard: () => api.get("/analytics/dashboard"),
};

// ============================================================
// دالة مساعدة للتحقق من حالة الاتصال بـ API
// ============================================================
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health');
    return response.status === 200;
  } catch (error) {
    console.warn('⚠️ API Health Check Failed:', error);
    return false;
  }
};

// ============================================================
// تصدير API Instance
// ============================================================
export default api;
