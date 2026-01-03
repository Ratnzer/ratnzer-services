import axios, { InternalAxiosRequestConfig, AxiosError, AxiosHeaders } from "axios";

// ============================================================
// ✅ Vite Env: اقرأ الرابط من VITE_API_URL لضمان الأمان والمرونة
// ============================================================
const API_URL = (import.meta as any).env?.VITE_API_URL as string;

if (!API_URL) {
  console.warn("⚠️ Warning: VITE_API_URL is not defined. API calls may fail.");
}

console.log("Connecting to API:", API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 20000,
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
// Auth Services
// ============================================================
export const authService = {
  login: (data: any) => api.post("/auth/login", data),
  register: (data: any) => api.post("/auth/register", data),
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
  updateStatus: (id: string) => api.put("/users/" + id + "/status", {}),
};

// ============================================================
// Wallet Services
// ============================================================
export const walletService = {
  getTransactions: () => api.get("/wallet/transactions"),
  getTransactionsPaged: (skip = 0, limit = 10) => api.get(`/wallet/transactions?skip=${skip}&limit=${limit}`),
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
  updateTerms: (data: { contentAr: string; contentEn: string }) =>
    api.put("/content/terms", data),
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
};

// ============================================================
// Analytics Services
// ============================================================
export const analyticsService = {
  getDashboard: () => api.get("/analytics/dashboard"),
};

export default api;
