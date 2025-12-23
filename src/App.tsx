import React, { useState, useEffect, useRef } from 'react';
import { View, Product, Category, AppTerms, Banner, UserProfile, Announcement, CartItem, Currency, Order, InventoryCode, Transaction } from './types';
import Home from './pages/Home';
import SearchPage from './pages/Search';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Admin from './pages/Admin';
import BottomNav from './components/BottomNav';
import TopHeader from './components/TopHeader';
import CheckoutModal from './components/CheckoutModal';
import ProductDetailsModal from './components/ProductDetailsModal'; // Imported here
import InvoiceModal from './components/InvoiceModal'; // Import InvoiceModal
import LoginModal from './components/LoginModal'; // Import LoginModal
import { ShoppingBag, ShoppingCart, Trash2, ArrowLeft, CheckCircle, Clock, X, CheckSquare, AlertTriangle, Receipt, Copy, ChevronDown, ChevronUp, ShieldAlert, Lock, Flag, Tags, User, CreditCard, Facebook, Instagram, Gamepad2, Smartphone, Gift, Globe, Tag, Box, Monitor, MessageCircle, Heart, Star, Coins } from 'lucide-react';
import { INITIAL_CURRENCIES, PRODUCTS as INITIAL_PRODUCTS, CATEGORIES as INITIAL_CATEGORIES, INITIAL_TERMS, INITIAL_BANNERS, MOCK_USERS, MOCK_ORDERS, MOCK_INVENTORY, TRANSACTIONS as INITIAL_TRANSACTIONS } from './constants';
import api, { productService, orderService, contentService, userService, walletService, inventoryService, authService, cartService, paymentService, pushService } from './services/api';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { PushNotificationSchema, PushNotifications } from '@capacitor/push-notifications';

// ============================================================
// ✅ Simple localStorage cache helpers (offline-first boot)
// ============================================================
const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const loadCache = <T,>(key: string, fallback: T): T =>
  safeJsonParse<T>(localStorage.getItem(key), fallback);

const saveCache = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore (quota / private mode)
  }
};

const removeCache = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {}
};

// ============================================================
// Category Icon Mapping (API returns icon as string id)
// ============================================================
const CATEGORY_ICON_MAP: Record<string, any> = {
  // Common/legacy ids
  gamepad: Gamepad2,
  gamepad2: Gamepad2,
  facebook: Facebook,
  instagram: Instagram,
  smartphone: Smartphone,
  gift: Gift,
  globe: Globe,
  tag: Tag,
  box: Box,
  monitor: Monitor,
  messagecircle: MessageCircle,
  heart: Heart,
  star: Star,
  coins: Coins,
};


// ============================================================
// ✅ Normalize Order objects coming from API (Prisma) to match frontend Order type
// (Fixes black screen when order.date / userName is missing)
// ============================================================
const normalizeOrderFromApi = (o: any): Order => {
  const toStr = (v: any) => (v === undefined || v === null ? "" : String(v));
  const toNullableStr = (v: any) =>
    v === undefined || v === null || v === "" ? null : String(v);
  const toOptionalStr = (v: any): string | undefined => {
    const s = toNullableStr(v);
    return s === null ? undefined : s;
  };

  const date =
    typeof o?.date === "string" && o.date
      ? o.date
      : o?.createdAt
      ? new Date(o.createdAt).toLocaleString("en-US")
      : new Date().toLocaleString("en-US");

  return ({
    id: toStr(o?.id),
    userId: toStr(o?.userId),
    userName: toStr(o?.userName),
    productName: toStr(o?.productName),
    productId: toStr(o?.productId),
    productCategory: toStr(o?.productCategory),
    regionName: toStr(o?.regionName),
    regionId: toNullableStr(o?.regionId),
    quantityLabel: toOptionalStr(o?.quantityLabel),
    denominationId: toNullableStr(o?.denominationId),
    customInputValue: toOptionalStr(o?.customInputValue),
    customInputLabel: toOptionalStr(o?.customInputLabel),
    amount: typeof o?.amount === "number" ? o.amount : Number(o?.amount ?? 0),
    status: ((o?.status as any) || "pending") as Order['status'],
    fulfillmentType: (o?.fulfillmentType as any) || "manual",
    deliveredCode: o?.deliveredCode ?? null,
    rejectionReason: toOptionalStr(o?.rejectionReason),
    date,
  } as any) as Order;
};

const normalizeOrdersFromApi = (data: any): Order[] =>
  Array.isArray(data) ? data.map(normalizeOrderFromApi) : [];
// ============================================================
// ✅ Error Boundary to prevent "black screen" crashes on fast navigation
// (shows a friendly fallback UI instead of a blank screen)
// ============================================================
class ErrorBoundary extends React.Component<
  { onReset?: () => void; children: React.ReactNode },
  { hasError: boolean; error?: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error('UI crashed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-white mb-2">حدث خطأ مؤقت</div>
          <div className="text-gray-400 mb-6">
            حاولت فتح الصفحة بسرعة قبل اكتمال تحميل البيانات. اضغط رجوع أو أعد المحاولة.
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                this.props.onReset?.();
              }}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white active:scale-95 transition-all"
            >
              العودة للرئيسية
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-lg bg-gray-700 text-white active:scale-95 transition-all"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as any;
  }
}

// ============================================================
// ✅ Normalize Transaction objects coming from API
// (Fixes black screen in Wallet due to missing Icon component or date format)
// ============================================================
const normalizeTransactionFromApi = (t: any): Transaction => {
  const toStr = (v: any) => (v === undefined || v === null ? "" : String(v));
  // Use undefined for optional strings to satisfy TS strict checks
  const toOptionalStr = (v: any) =>
    v === undefined || v === null || v === "" ? undefined : String(v);

  const date =
    typeof t?.date === "string" && t.date
      ? t.date
      : t?.createdAt
      ? new Date(t.createdAt).toLocaleString("en-US")
      : new Date().toLocaleString("en-US");

  // Determine Icon Component (Frontend expects a React Component, API sends JSON/String)
  let Icon = CreditCard; // Default for credit
  if (String(t?.type).toLowerCase() === 'debit') {
      Icon = ShoppingBag;
  }
  
  // If API sends specific icon name
  if (t?.icon && typeof t.icon === 'string') {
      const lower = t.icon.toLowerCase();
      if (lower.includes('gift')) Icon = Gift;
      else if (lower.includes('game')) Icon = Gamepad2;
      else if (lower.includes('card')) Icon = CreditCard;
  }

  return {
    id: toStr(t?.id),
    title: toStr(t?.title || t?.description || "عملية مالية"),
    amount: Number(t?.amount ?? 0),
    date: date,
    type: String(t?.type).toLowerCase() === 'debit' ? 'debit' : 'credit',
    status: (t?.status || 'completed') as Transaction['status'],
    userId: toOptionalStr(t?.userId),
    icon: Icon,
  };
};

const normalizeTransactionsFromApi = (data: any): Transaction[] =>
  Array.isArray(data) ? data.map(normalizeTransactionFromApi) : [];


const App: React.FC = () => {
  const hasToken = Boolean(localStorage.getItem('token'));
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [currencyCode, setCurrencyCode] = useState<string>(() => {
    return localStorage.getItem('currencyCode') || 'USD';
  });
  const [isSecurityBlocked, setIsSecurityBlocked] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    hasToken ? loadCache<UserProfile | null>('cache_user_v1', null) : null
  ); // Start as null (Guest)
  const [inAppNotification, setInAppNotification] = useState<{ title: string; body: string } | null>(null);
  const [actionToast, setActionToast] = useState<{ title: string; message?: string } | null>(null);
  const inAppNotifTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushInitRef = useRef(false);

  // --- Firebase FCM Token (for Push Notifications) ---
  const [fcmToken, setFcmToken] = useState<string>(() => localStorage.getItem('fcm_token') || '');

  // --- PayTabs Return Handling ---
  const [paytabsProcessing, setPaytabsProcessing] = useState<boolean>(false);
  const [paytabsProcessingText, setPaytabsProcessingText] = useState<string>('');

  const showInAppBanner = (title: string, body?: string) => {
    setInAppNotification({ title, body: body || '' });
    if (inAppNotifTimeout.current) clearTimeout(inAppNotifTimeout.current);
    inAppNotifTimeout.current = setTimeout(() => setInAppNotification(null), 4000);
  };

  const showActionToast = (title: string, message?: string, duration = 2000) => {
    setActionToast({ title, message });
    if (actionToastTimeout.current) clearTimeout(actionToastTimeout.current);
    actionToastTimeout.current = setTimeout(() => setActionToast(null), duration);
  };

  useEffect(() => {
    return () => {
      if (inAppNotifTimeout.current) clearTimeout(inAppNotifTimeout.current);
      if (actionToastTimeout.current) clearTimeout(actionToastTimeout.current);
    };
  }, []);

  const showLocalNotification = async (notification: PushNotificationSchema) => {
    if (typeof window === 'undefined') return;

    const title = notification?.title || 'إشعار جديد';
    const body =
      notification?.body ||
      (notification?.data && typeof notification.data === 'object'
        ? (notification.data as Record<string, any>).message
        : undefined) ||
      '';

    const display = () => {
      try {
        new Notification(title, { body });
        return true;
      } catch (err) {
        console.warn('Unable to display notification', err);
        return false;
      }
    };

    if (typeof Notification === 'undefined') {
      showInAppBanner(title, body);
      return;
    }

    if (Notification.permission === 'granted') {
      const displayed = display();
      if (!displayed) showInAppBanner(title, body);
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const displayed = display();
          if (!displayed) showInAppBanner(title, body);
        } else {
          showInAppBanner(title, body);
        }
      } catch (err) {
        console.warn('Notification permission failed', err);
        showInAppBanner(title, body);
      }
      return;
    }

    showInAppBanner(title, body);
  };


// ============================================================
// ✅ Firebase Push Notifications (FCM) - Android only
// - Saves token into localStorage (fcm_token) and registers device silently
// ============================================================
useEffect(() => {
  const initPushNotifications = async () => {
    try {
      if (Capacitor.getPlatform() !== 'android') return;
      if (pushInitRef.current) return;
      pushInitRef.current = true;

      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') return;

      await PushNotifications.register();
      PushNotifications.addListener('registration', async (token) => {
        try {
          const value = String(token?.value || '');
          if (!value) return;

          localStorage.setItem('fcm_token', value);
          setFcmToken(value);

          try {
            await pushService.registerDevice({
              token: value,
              platform: 'android',
              userId: currentUser?.id,
            });
          } catch (regErr) {
            console.warn('Failed to register device token', regErr);
          }
        } catch {}
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('Push registration error:', err);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Notification received:', notification);
        void showLocalNotification(notification);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Notification action:', action);
      });
    } catch (e) {
      console.warn('Failed to init push notifications', e);
    }
  };

  void initPushNotifications();
}, [currentUser?.id]);

// Register device when token already available (e.g., after login)
useEffect(() => {
  const syncToken = async () => {
    if (!fcmToken) return;
    if (Capacitor.getPlatform() !== 'android') return;
    try {
      await pushService.registerDevice({
        token: fcmToken,
        platform: 'android',
        userId: currentUser?.id,
      });
    } catch (err) {
      console.warn('Failed to sync device token', err);
    }
  };
  void syncToken();
}, [fcmToken, currentUser?.id]);

// Clear in-app notification timeout on unmount
useEffect(() => {
  return () => {
    if (inAppNotifTimeout.current) clearTimeout(inAppNotifTimeout.current);
    if (actionToastTimeout.current) clearTimeout(actionToastTimeout.current);
  };
}, []);
  
  // --- Global App State (Lifted for Admin Control) ---
  const [products, setProducts] = useState<Product[]>(() => loadCache<Product[]>('cache_products_v1', INITIAL_PRODUCTS));
  const [categories, setCategories] = useState<Category[]>(() => loadCache<Category[]>('cache_categories_v1', INITIAL_CATEGORIES));
  const [terms, setTerms] = useState<AppTerms>(() => loadCache<AppTerms>('cache_terms_v1', INITIAL_TERMS)); // Updated type
  const [banners, setBanners] = useState<Banner[]>(() => loadCache<Banner[]>('cache_banners_v1', INITIAL_BANNERS));
  const [users, setUsers] = useState<UserProfile[]>(MOCK_USERS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => loadCache<Announcement[]>('cache_announcements_v1', []));
  const [currencies, setCurrencies] = useState<Currency[]>(() => loadCache<Currency[]>('cache_currencies_v1', INITIAL_CURRENCIES));
  const [orders, setOrders] = useState<Order[]>(() => (hasToken ? loadCache<Order[]>('cache_orders_v1', MOCK_ORDERS) : MOCK_ORDERS));

  const [myOrdersPage, setMyOrdersPage] = useState<Order[]>([]);
  const [myOrdersSkip, setMyOrdersSkip] = useState<number>(0);
  const [myOrdersHasMore, setMyOrdersHasMore] = useState<boolean>(true);
  const [myOrdersLoadingMore, setMyOrdersLoadingMore] = useState<boolean>(false);
  const [myOrdersRefreshing, setMyOrdersRefreshing] = useState<boolean>(false);
  const myOrdersSentinelRef = useRef<HTMLDivElement | null>(null);

  const [inventory, setInventory] = useState<InventoryCode[]>(MOCK_INVENTORY);
  const [transactions, setTransactions] = useState<Transaction[]>(() => (hasToken ? loadCache<Transaction[]>('cache_transactions_v1', INITIAL_TRANSACTIONS) : INITIAL_TRANSACTIONS)); // NEW: Transactions State
  const [rateAppLink, setRateAppLink] = useState<string>(''); // New State for Rate Link
  
  // --- Cart State ---
  const [cartItems, setCartItems] = useState<CartItem[]>(() => (hasToken ? loadCache<CartItem[]>('cache_cart_v1', []) : []));

  const [cartVisibleCount, setCartVisibleCount] = useState<number>(10);
  const [activeCheckoutItem, setActiveCheckoutItem] = useState<CartItem | null>(null);
  const [isBulkCheckout, setIsBulkCheckout] = useState(false); // NEW: State for bulk checkout

  // --- Product Modal State (Global) ---
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // --- Invoice Modal State ---
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);

  // --- Auth State ---
  const [showLoginModal, setShowLoginModal] = useState(false);

  // --- Admin Auth State ---
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('ratelozn_admin_auth') === 'true';
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  // --- Initial Data Load from API ---
  useEffect(() => {
    const fetchInitialData = async () => {
      // Products
      try {
        const res = await productService.getAll();
        if (res && res.data) {
          setProducts(res.data);
        }
      } catch (error) {
        console.error('Failed to load products from API, using local initial products instead', error);
      }

      // Banners
      try {
        const res = await contentService.getBanners();
        if (res && res.data) {
          setBanners(res.data);
        }
      } catch (error) {
        console.error('Failed to load banners from API, using local initial banners instead', error);
      }

      // Categories
      try {
        const res = await contentService.getCategories();
        if (res && res.data) {
          setCategories(res.data.map((c: any) => ({
            ...c,
            icon: typeof c.icon === 'string'
              ? (CATEGORY_ICON_MAP[c.icon.toLowerCase()] || Tags)
              : c.icon,
          })));
        }
      } catch (error) {
        console.error('Failed to load categories from API, using local initial categories instead', error);
      }

      // Announcements
      try {
        const res = await contentService.getAnnouncements();
        if (res && res.data) {
          setAnnouncements(res.data);
        }
      } catch (error) {
        console.error('Failed to load announcements from API', error);
      }


      // Terms (Terms & Conditions)
      try {
        const res = await contentService.getTerms();
        if (res && res.data) {
          const data: any = res.data;
          setTerms((prev) => ({
            ...prev,
            contentAr: typeof data.contentAr === 'string' ? data.contentAr : prev.contentAr,
            contentEn: typeof data.contentEn === 'string' ? data.contentEn : prev.contentEn,
          }));
        }
      } catch (error) {
        console.error('Failed to load terms from API, using local initial terms instead', error);
      }

      // Wallet Transactions (requires auth)
      try {
        const res = await walletService.getTransactions();
        if (res && res.data) {
          setTransactions(normalizeTransactionsFromApi(res.data));
        }
      } catch (error) {
        console.warn('Could not load wallet transactions from API (maybe user not logged in)', error);
      }

      // Orders (requires auth)
      // FIX: If admin is logged in (persisted in localStorage/state), fetch ALL orders.
      try {
        const res = isAdminLoggedIn 
            ? await orderService.getAll() 
            : await orderService.getMyOrders();
            
        if (res && res.data) {
          setOrders(normalizeOrdersFromApi(res.data));
        }
      } catch (error) {
        console.warn('Could not load orders from API (maybe user not logged in)', error);
      }

      // Users (Admin)
      if (isAdminLoggedIn) {
        try {
            const res = await userService.getAll();
            if (res && res.data) {
            setUsers(res.data);
            }
        } catch (error) {
            console.warn('Could not load users from API (admin only endpoint)', error);
        }
      }

      // Inventory (Admin)
      if (isAdminLoggedIn) {
        try {
            const res = await inventoryService.getAll();
            if (res && res.data) {
            setInventory(res.data);
            }
        } catch (error) {
            console.warn('Could not load inventory from API (admin only endpoint)', error);
        }
      }
    };

    fetchInitialData();
  }, [isAdminLoggedIn]); // Added isAdminLoggedIn as dependency to refetch correct data on login/init

  // ============================================================
  // ✅ Persist caches (so app opens instantly next time)
  // ============================================================
  useEffect(() => { saveCache('cache_products_v1', products); }, [products]);
  useEffect(() => { saveCache('cache_categories_v1', categories); }, [categories]);
  useEffect(() => { saveCache('cache_banners_v1', banners); }, [banners]);
  useEffect(() => { saveCache('cache_announcements_v1', announcements); }, [announcements]);
  useEffect(() => { saveCache('cache_terms_v1', terms); }, [terms]);
  useEffect(() => { saveCache('cache_currencies_v1', currencies); }, [currencies]);

  // User-related caches (only meaningful when token exists)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      removeCache('cache_user_v1');
      removeCache('cache_cart_v1');
      removeCache('cache_orders_v1');
      removeCache('cache_transactions_v1');
      return;
    }
    saveCache('cache_user_v1', currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    saveCache('cache_cart_v1', cartItems);
  }, [cartItems]);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    saveCache('cache_orders_v1', orders);
  }, [orders]);

  useEffect(() => {
    if (!localStorage.getItem('token')) return;
    saveCache('cache_transactions_v1', transactions);
  }, [transactions]);

  // --- Load Profile if token exists on first mount ---
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await authService.getProfile();
        if (res && res.data) {
          setCurrentUser(res.data);
        if ((res.data as any)?.preferredCurrency) {
          const pc = (res.data as any).preferredCurrency;
          setCurrencyCode(pc);
          localStorage.setItem('currencyCode', String(pc));
        }
          
        }
      } catch (error: any) {
        const status = error?.response?.status;

        // ✅ Only logout if the server explicitly says the token is invalid/expired
        if (status === 401 || status === 403) {
          console.warn('Token invalid/expired -> logging out', error);
          localStorage.removeItem('token');
          setCurrentUser(null);
          return;
        }

        // ✅ Offline / server unreachable: keep token & keep cached user so the app opens normally
        console.warn('Failed to load profile from API (keeping session for offline mode)', error);
      }
    };

    initAuth();
  }, []);

  // --- Sync Cart from Server on User Login ---
  useEffect(() => {
    const load = async () => {
      if (!currentUser) {
        setCartItems([]);
        return;
      }

      try {
        const res = await cartService.getMyCart();
        const items = Array.isArray(res?.data) ? (res.data as CartItem[]) : [];
        setCartItems(items);
      } catch (error) {
        console.warn('Could not load cart from API', error);
        setCartItems([]);
      }
    };

    void load();
  }, [currentUser]);

  // ============================================================
  // ✅ Refresh helpers (Server as source of truth)
  // - Used for automatic updates when opening Wallet/Orders/Cart
  // - Also keeps top header balance synced periodically
  // ============================================================
  const refreshProfileFromServer = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await authService.getProfile();
      if (res && res.data) {
        setCurrentUser(res.data);
        if ((res.data as any)?.preferredCurrency) {
          const pc = (res.data as any).preferredCurrency;
          setCurrencyCode(pc);
          localStorage.setItem('currencyCode', String(pc));
        }
      }
    } catch (error: any) {
      // If token expired/invalid -> logout safely
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('token');
        setCurrentUser(null);
        return;
      }
      console.warn('Failed to refresh profile from API', error);
    }
  };

  const refreshTransactionsFromServer = async () => {
    try {
      const res = await walletService.getTransactions();
      if (res && res.data) {
        setTransactions(normalizeTransactionsFromApi(res.data));
      }
    } catch (error) {
      console.warn('Failed to refresh wallet transactions from API', error);
    }
  };

  const refreshOrdersFromServer = async () => {
    try {
      const res = isAdminLoggedIn ? await orderService.getAll() : await orderService.getMyOrders();
      if (res && res.data) {
        setOrders(normalizeOrdersFromApi(res.data));
      }
    } catch (error) {
      console.warn('Failed to refresh orders from API', error);
    }
  };

  // ====== Paged loading for "My Orders" view ======
  const loadMyOrdersPage = async (mode: 'replace' | 'append' = 'replace') => {
    if (!currentUser) {
      setMyOrdersPage([]);
      setMyOrdersSkip(0);
      setMyOrdersHasMore(false);
      return;
    }
    if (myOrdersLoadingMore && mode === 'append') return;

    const nextSkip = mode === 'append' ? myOrdersSkip : 0;
    if (mode === 'replace') {
      setMyOrdersRefreshing(true);
      setMyOrdersHasMore(true);
    } else {
      setMyOrdersLoadingMore(true);
    }

    try {
      const res = await orderService.getMyOrdersPaged(nextSkip, 10);
      const data: any = res?.data;

      // Expect {items, hasMore} for paged, but be defensive
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      const hasMore = typeof data?.hasMore === 'boolean' ? data.hasMore : false;

      if (mode === 'replace') setMyOrdersPage(normalizeOrdersFromApi(items));
      else setMyOrdersPage(prev => [...prev, ...normalizeOrdersFromApi(items)]);

      setMyOrdersSkip(nextSkip + items.length);
      setMyOrdersHasMore(hasMore);
    } catch (error) {
      console.warn('Failed to load my orders page', error);
      if (mode === 'replace') {
        setMyOrdersPage([]);
        setMyOrdersSkip(0);
        setMyOrdersHasMore(false);
      }
    } finally {
      setMyOrdersRefreshing(false);
      setMyOrdersLoadingMore(false);
    }
  };

  // load first page when entering ORDERS view
  useEffect(() => {
    if (currentView === View.ORDERS) {
      loadMyOrdersPage('replace');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, currentUser?.id]);

  // infinite scroll sentinel for ORDERS view
  useEffect(() => {
    if (currentView !== View.ORDERS) return;
    const el = myOrdersSentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && myOrdersHasMore && !myOrdersLoadingMore && !myOrdersRefreshing) {
        loadMyOrdersPage('append');
      }
    });

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView, myOrdersHasMore, myOrdersLoadingMore, myOrdersRefreshing, myOrdersSkip]);

  // ============================================================
  // ✅ Refresh Home data from Server (Products/Banners/Categories/Announcements/Terms)
  // - Called automatically when entering Home view
  // ============================================================
  const refreshHomeFromServer = async () => {
    // Products
    try {
      const res = await productService.getAll();
      if (res && res.data) {
        setProducts(res.data);
      }
    } catch (error) {
      console.warn('Failed to refresh products from API', error);
    }

    // Banners
    try {
      const res = await contentService.getBanners();
      if (res && res.data) {
        setBanners(res.data);
      }
    } catch (error) {
      console.warn('Failed to refresh banners from API', error);
    }

    // Categories
    try {
      const res = await contentService.getCategories();
      if (res && res.data) {
        setCategories(res.data.map((c: any) => ({
          ...c,
          icon: typeof c.icon === 'string'
            ? (CATEGORY_ICON_MAP[c.icon.toLowerCase()] || Tags)
            : c.icon,
        })));
      }
    } catch (error) {
      console.warn('Failed to refresh categories from API', error);
    }

    // Announcements
    try {
      const res = await contentService.getAnnouncements();
      if (res && res.data) {
        setAnnouncements(res.data);
      }
    } catch (error) {
      console.warn('Failed to refresh announcements from API', error);
    }

    // Terms (Terms & Conditions)
    try {
      const res = await contentService.getTerms();
      if (res && res.data) {
        const data: any = res.data;
        setTerms((prev) => ({
          ...prev,
          contentAr: typeof data.contentAr === 'string' ? data.contentAr : prev.contentAr,
          contentEn: typeof data.contentEn === 'string' ? data.contentEn : prev.contentEn,
        }));
      }
    } catch (error) {
      console.warn('Failed to refresh terms from API', error);
    }
  };

  const refreshCartFromServer = async () => {
    if (!currentUser) return;
    try {
      const res = await cartService.getMyCart();
      const items = Array.isArray(res?.data) ? (res.data as CartItem[]) : [];
      setCartItems(items);
    } catch (error) {
      console.warn('Failed to refresh cart from API', error);
    }
  };

  // ============================================================
  // ✅ Auto refresh when entering pages
  // - Wallet: profile + transactions
  // - Orders: orders
  // - Cart: cart items
  // ============================================================
  useEffect(() => {
    if (!currentUser) return;

    if (currentView === View.WALLET) {
      void refreshProfileFromServer();
      void refreshTransactionsFromServer();
    }

    if (currentView === View.ORDERS) {
      void refreshOrdersFromServer();
    }

    if (currentView === View.CART) {
      void refreshCartFromServer();
    }
  }, [currentView, currentUser?.id, isAdminLoggedIn]);

  // ============================================================
  // ✅ Auto refresh when entering Home (doesn't require auth)
  // ============================================================
  useEffect(() => {
    if (currentView === View.HOME) {
      void refreshHomeFromServer();
    }
  }, [currentView]);


  // ============================================================
  // ✅ Keep top header balance synced (polling)
  // - This helps when balance changes from another device/admin
  // ============================================================
  useEffect(() => {
    if (!currentUser) return;

    const id = window.setInterval(() => {
      void refreshProfileFromServer();
    }, 25000);

    return () => window.clearInterval(id);
  }, [currentUser?.id]);

  // --- Security Check Effect ---
  useEffect(() => {
    const checkSecurity = async () => {
      if (Capacitor.getPlatform() === 'android') {
        try {
          // Check for App Cloning / Parallel Space
          // Standard path: /data/user/0/com.ratelozn.services/files
          // Cloned paths often contain: '999', 'parallel', 'virtual', 'dual', '10', '11' (multi-user)
          
          const uriResult = await Filesystem.getUri({
            directory: Directory.Data,
            path: '',
          });
          
          const path = uriResult.uri;
          
          // List of suspicious keywords in path
          const suspiciousIndicators = ['999', 'parallel', 'virtual', 'dual', 'clone', 'lbe', 'exposed', 'space'];
          
          // Check if path indicates a non-owner user (User 0 is owner)
          // Dual apps usually run as user 999 or 10+
          const isStandardUser = (
            path.includes('/user/0/') ||
            path.includes('/user_de/0/') ||
            path.includes('/data/data/com.ratelozn.services') ||
            path.includes('/data/user/0/')
          );
          const hasSuspiciousKeywords = suspiciousIndicators.some(keyword => path.toLowerCase().includes(keyword));

                    // If we can reliably detect a non-owner Android user profile (e.g., user/10, user/999), block.
          const isNonOwnerUser = /\/user\/(?!0\/)\d+\//.test(path) || /\/user_de\/(?!0\/)\d+\//.test(path);

          // NOTE: We intentionally do NOT block just because the path isn't in our "standard" list,
          // because some devices return variants like /user_de/0/ which are normal.
          if (hasSuspiciousKeywords || isNonOwnerUser) {
             setIsSecurityBlocked(true);
             setSecurityMessage('تم اكتشاف تشغيل التطبيق في بيئة غير آمنة (ناسخ تطبيقات أو مساحة مزدوجة). يرجى تشغيل التطبيق من الواجهة الرئيسية للهاتف لضمان حماية بياناتك المالية.');
          }

        } catch (error) {
          // If we can't access filesystem, it might be restricted, which is also suspicious
          console.error("Security Check Failed:", error);
        }
      }
    };

    checkSecurity();
  }, []);

  const balanceUSD = currentUser ? currentUser.balance : 0.00;

  // --- Login Logic (إصلاح: الاعتماد على الباك إند / التوكن) ---
  const handleLogin = async (_data: { name?: string; email?: string; phone?: string; password?: string; isRegister: boolean }) => {
    try {
      // بعد نجاح register/login في LoginModal والتوكن تخزن، نجلب البروفايل من الباك إند
      const res = await authService.getProfile();
      if (res && res.data) {
        setCurrentUser(res.data);
        if ((res.data as any)?.preferredCurrency) {
          const pc = (res.data as any).preferredCurrency;
          setCurrencyCode(pc);
          localStorage.setItem('currencyCode', String(pc));
        }
      }
    } catch (error) {
      console.error('Failed to load user profile after login', error);
    } finally {
      setShowLoginModal(false);
    }
  };


  // ============================================================
  // ✅ Currency change: update UI + persist to server for logged-in user
  // ============================================================
  const handleCurrencyChange = async (code: string) => {
    // Update UI immediately
    setCurrencyCode(code);
    localStorage.setItem('currencyCode', String(code));

    // Persist only if logged in
    if (!currentUser) return;

    try {
      const res = await authService.updateProfile({ preferredCurrency: code });
      if (res && res.data) {
        setCurrentUser(res.data);
      } else {
        // Fallback: update locally if server does not return full user
        setCurrentUser((prev: any) => (prev ? { ...prev, preferredCurrency: code } : prev));
      }
    } catch (error) {
      console.warn('Failed to persist currency to server', error);
      // Keep local selection even if server fails
      setCurrentUser((prev: any) => (prev ? { ...prev, preferredCurrency: code } : prev));
    }
  };

  const handleSetView = (view: View) => {
    if (window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(5);
    }

    // Guest Guard for Restricted Views
    if (!currentUser && [View.WALLET, View.ORDERS, View.PROFILE, View.CART].includes(view)) {
        setShowLoginModal(true);
        return;
    }

    setCurrentView(view);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
  };

  const formatPrice = (amountInUSD: number): string => {
    const fallback = { code: 'USD', symbol: '$', rate: 1 };

    const currency =
      (Array.isArray(currencies) && currencies.length > 0
        ? (currencies.find(c => c.code === currencyCode) || currencies[0])
        : fallback);

    const rate = typeof (currency as any)?.rate === 'number' ? (currency as any).rate : 1;
    const symbol = (currency as any)?.symbol || '$';

    const convertedAmount = amountInUSD * rate;
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${symbol} ${formatter.format(convertedAmount)}`;
  };

  // --- Admin Login Logic ---
  const handleAdminLogin = async () => {
      try {
          // لازم المستخدم يكون مسجّل دخول (token موجود) حتى السيرفر يرفع الصلاحية
          const token = localStorage.getItem('token');
          if (!token) {
              setAdminLoginError('سجّل دخولك كمستخدم أولاً ثم حاول مرة أخرى');
              setShowLoginModal(true);
              return;
          }

          await api.post('/auth/admin/activate', { adminPassword: adminPasswordInput });

          setIsAdminLoggedIn(true);
          localStorage.setItem('ratelozn_admin_auth', 'true');
          setAdminLoginError('');
          setAdminPasswordInput('');
          
          // Note: Data fetching (orders, users, inventory) is now automatically triggered
          // by the useEffect hook that watches `isAdminLoggedIn`. 
          // This ensures consistent state and avoids race conditions.

      } catch (error: any) {
          const msg =
            error?.response?.data?.message ||
            error?.response?.data?.error ||
            'فشل تفعيل صلاحية المسؤول';
          setAdminLoginError(msg);
      }
  };

  const handleAdminLogout = () => {
      setIsAdminLoggedIn(false);
      localStorage.removeItem('ratelozn_admin_auth');
      setCurrentView(View.HOME);
      // The useEffect will fire due to isAdminLoggedIn change, 
      // automatically reverting to fetching only "my orders".
  };

  // --- User Logout Logic ---
  const handleUserLogout = () => {
      setCurrentUser(null);
      // Ensure admin session is also cleared for security
      if (isAdminLoggedIn) {
          setIsAdminLoggedIn(false);
          localStorage.removeItem('ratelozn_admin_auth');
      }
      setCurrentView(View.HOME);
      localStorage.removeItem('token');
      // Clear orders immediately to avoid showing stale data before effect runs
      setOrders([]);
      // Clear cart
      setCartItems([]);
  };
  
  // --- Update User Profile Logic ---
  const handleUpdateProfile = (updatedUser: UserProfile) => {
      // Update global user list
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      // Update current logged in user
      setCurrentUser(updatedUser);
  };

  // --- Purchase Logic ---
  const getApiErrorMessage = (error: any): string => {
    return (
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'فشل إنشاء الطلب'
    );
  };

  const createOrderOnServer = async (payload: any) => {
    try {
      const res = await orderService.create(payload);
      return { ok: true as const, order: res?.data };
    } catch (error: any) {
      return { ok: false as const, message: getApiErrorMessage(error) };
    }
  };

  const syncAfterOrder = async () => {
    // Refresh user balance + orders + transactions from server (best effort)
    try {
      const profileRes = await authService.getProfile();
      if (profileRes && profileRes.data) setCurrentUser(profileRes.data);
    } catch (e) {}

    try {
      const txRes = await walletService.getTransactions();
      if (txRes && txRes.data) setTransactions(normalizeTransactionsFromApi(txRes.data));
    } catch (e) {}

    try {
      // FIX: If admin, fetch ALL orders to keep the admin view updated. 
      // Otherwise fetch MY orders.
      const ordersRes = isAdminLoggedIn 
        ? await orderService.getAll() 
        : await orderService.getMyOrders();

      if (ordersRes && ordersRes.data) setOrders(normalizeOrdersFromApi(ordersRes.data));
    } catch (e) {}
  };

  // ============================================================
  // ✅ PayTabs helpers
  // ============================================================
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const startPaytabsRedirect = async (payload: any) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    try {
      setPaytabsProcessing(true);
      setPaytabsProcessingText('جاري إنشاء عملية الدفع...');

      const res = await paymentService.paytabsCreate(payload);
      const redirectUrl = res?.data?.redirectUrl;

      if (!redirectUrl) {
        throw new Error('No redirectUrl');
      }

      // Navigate to PayTabs inside the same WebView
      window.location.assign(redirectUrl);
    } catch (error: any) {
      setPaytabsProcessing(false);
      setPaytabsProcessingText('');
      alert(getApiErrorMessage(error) || 'فشل إنشاء عملية الدفع');
    }
  };

  // Handle return from PayTabs (https://localhost/?pt_payment_id=...)
  const paytabsHandledRef = useRef(false);
  useEffect(() => {
    if (paytabsHandledRef.current) return;

    const params = new URLSearchParams(window.location.search || '');
    const paymentId = params.get('pt_payment_id') || params.get('paymentId') || params.get('cart_id');
    if (!paymentId) return;

    paytabsHandledRef.current = true;
    const returnViewParam = (params.get('pt_return_view') || 'home').toLowerCase();

    // Clean URL (remove params to avoid repeating)
    window.history.replaceState({}, document.title, window.location.pathname);

    // Navigate to the view we came from (best effort)
    if (returnViewParam === 'wallet') setCurrentView(View.WALLET);
    else if (returnViewParam === 'cart') setCurrentView(View.CART);
    else if (returnViewParam === 'orders') setCurrentView(View.ORDERS);
    else setCurrentView(View.HOME);

    // If user isn't logged in, we can't confirm status.
    if (!localStorage.getItem('token')) return;

    void (async () => {
      try {
        setPaytabsProcessing(true);
        setPaytabsProcessingText('جاري تأكيد عملية الدفع...');

        let last = null as any;
        for (let i = 0; i < 6; i++) {
          const r = await paymentService.paytabsStatus(paymentId);
          last = r?.data;
          const st = String(last?.status || '').toLowerCase();
          if (st && st !== 'pending') break;
          await sleep(1500);
        }

        const st = String(last?.status || '').toLowerCase();

        await syncAfterOrder();
        await refreshCartFromServer();

        if (st === 'succeeded') {
          const rv = String(last?.returnView || returnViewParam || 'home').toLowerCase();
          if (String(last?.type) === 'topup') {
            alert('تم شحن الرصيد بنجاح ✅');
            setCurrentView(View.WALLET);
          } else {
            showActionToast('تمت عملية الشراء', 'تمت عملية الشراء بنجاح يمكنك مراجعة طلبك داخل قائمة طلباتي');
            if (rv === 'cart') setCurrentView(View.CART);
            else if (rv === 'wallet') setCurrentView(View.WALLET);
            else if (rv === 'orders') setCurrentView(View.ORDERS);
            else setCurrentView(View.HOME);
          }
        } else if (st === 'failed') {
          alert('فشلت عملية الدفع ❌');
        } else {
          alert('لم يتم تأكيد الدفع بعد. حاول مرة أخرى بعد قليل.');
        }
      } catch (e: any) {
        console.warn('PayTabs status check failed', e);
      } finally {
        setPaytabsProcessing(false);
        setPaytabsProcessingText('');
      }
    })();
  }, [currentUser?.id]);

  const handlePurchase = (
      itemName: string, 
      price: number, 
      fulfillmentType: 'manual' | 'api' = 'manual',
      regionName?: string,
      quantityLabel?: string,
      category?: string,
      productId?: string, 
      regionId?: string, 
      denominationId?: string,
      customInputValue?: string,
      customInputLabel?: string,
      paymentMethod: 'wallet' | 'card' = 'wallet',
      selectedRegionObj?: any,
      selectedDenominationObj?: any
  ) => {
      if (!currentUser) {
          setShowLoginModal(true);
          return;
      }

      void (async () => {
        const payload = {
          productId,
          productName: itemName,
          productCategory: category,
          // ✅ server accepts "amount" (frontend) OR "price" (legacy)
          amount: price,
          price: price,
          fulfillmentType,
          regionName,
          regionId,
          denominationId,
          selectedRegion: selectedRegionObj,
          selectedDenomination: selectedDenominationObj,
          quantityLabel,
          customInputValue,
          customInputLabel,
          paymentMethod,
        };

        // ✅ Card payment via PayTabs
        if (paymentMethod === 'card') {
          await startPaytabsRedirect({
            type: 'single',
            orderPayload: payload,
            returnView: currentView,
          });
          return;
        }

        const result = await createOrderOnServer(payload);

        if (!result.ok) {
          alert(result.message);
          return;
        }

        if (result.order) {
            // Optimistic update first (ensure valid date to prevent crash)
            const newOrder = normalizeOrderFromApi(result.order);
            setOrders(prev => [newOrder, ...prev]);
            try {
              await pushService.notifyAdminOrder({ orderId: newOrder.id });
            } catch (notifyErr) {
              console.warn('Failed to notify admin about new order', notifyErr);
            }
        }

        // ✅ Show success immediately, then refresh data in background to avoid user-visible delay
        showActionToast('تمت عملية الشراء', 'تمت عملية الشراء بنجاح يمكنك مراجعة طلبك داخل قائمة طلباتي');
        void syncAfterOrder();
      })();
  };


  // --- Server Side Add Balance ---
  const handleAddBalance = async (amount: number, paymentMethod: string, paymentDetails?: any): Promise<boolean> => {
      if (!currentUser) {
          setShowLoginModal(true);
          return false;
      }
      
      try {
          // ✅ Card top-up via PayTabs
          if (paymentMethod === 'card') {
              await startPaytabsRedirect({
                type: 'topup',
                amount,
                returnView: View.WALLET,
              });
              return true;
          }

          // 1. Send deposit request to server
          await api.post('/wallet/deposit', {
              amount,
              paymentMethod,
              paymentDetails
          });

          // 2. Sync Profile (to get new balance)
          const profileRes = await authService.getProfile();
          if (profileRes && profileRes.data) {
              setCurrentUser(profileRes.data);
              // Also update admin view of users if needed
              setUsers(prev => prev.map(u => u.id === profileRes.data.id ? profileRes.data : u));
          }

          // 3. Sync Transactions (to see the new deposit record)
          const txRes = await walletService.getTransactions();
          if (txRes && txRes.data) {
              setTransactions(normalizeTransactionsFromApi(txRes.data));
          }

          return true;

      } catch (error: any) {
          console.error("Deposit Failed:", error);
          const msg = error?.response?.data?.message || "فشل عملية الشحن، يرجى المحاولة لاحقاً";
          alert(msg);
          return false;
      }
  };

  // --- Cart Logic ---
  const addToCart = async (item: CartItem): Promise<boolean> => {
    if (!currentUser) {
        setShowLoginModal(true);
        return false;
    }

    try {
      const payload = {
        productId: item.productId,
        quantity: item.quantity || 1,
        // snapshots/options
        apiConfig: item.apiConfig,
        selectedRegion: item.selectedRegion,
        selectedDenomination: item.selectedDenomination,
        denominationId: item.selectedDenomination?.id,
        regionId: item.selectedRegion?.id,
        customInputValue: item.customInputValue,
        customInputLabel: item.customInputLabel,
      };

      const res = await cartService.add(payload);
      const created = res?.data as CartItem;
      setCartItems(prev => [created, ...prev]);
      showActionToast('تمت الإضافة', 'تمت الإضافة إلى السلة بنجاح');
      return true;
    } catch (error) {
      console.error('Add to cart failed', error);
      alert('حدث خطأ أثناء إضافة العنصر للسلة');
      return false;
    }
  };

  const removeFromCart = (itemId: string) => {
    void (async () => {
      try {
        await cartService.remove(itemId);
        setCartItems(prev => prev.filter(item => item.id !== itemId));
      } catch (error) {
        console.error('Remove from cart failed', error);
        alert('حدث خطأ أثناء إزالة العنصر من السلة');
      }
    })();
  };

  const handleBuyItem = (item: CartItem) => {
      if (!currentUser) {
          setShowLoginModal(true);
          return;
      }
      setActiveCheckoutItem(item);
  };

  const handleBuyAll = () => {
      if (!currentUser) {
          setShowLoginModal(true);
          return;
      }
      if (cartItems.length === 0) return;
      setIsBulkCheckout(true);
  };
  const handleCheckoutSuccess = async (method: 'wallet' | 'card') => {
      if (!currentUser) {
          setShowLoginModal(true);
          return;
      }

      // ✅ Card payment via PayTabs (one payment for cart)
      if (method === 'card') {
          if (isBulkCheckout) {
              await startPaytabsRedirect({
                type: 'cart',
                cartMode: 'bulk',
                returnView: View.CART,
              });
              return;
          }
          if (activeCheckoutItem) {
              await startPaytabsRedirect({
                type: 'cart',
                cartMode: 'single',
                cartItemId: activeCheckoutItem.id,
                returnView: View.CART,
              });
              return;
          }
      }

      if (isBulkCheckout) {
          // Process all items in cart (sequential to stop on first failure)
          for (const item of cartItems) {
              const payload = {
                productId: item.productId,
                productName: item.name,
                productCategory: item.category,
                amount: item.price,
                price: item.price,
                fulfillmentType: item.apiConfig?.type || 'manual',
                regionName: item.selectedRegion?.name,
                regionId: item.selectedRegion?.id,
                denominationId: item.selectedDenomination?.id,
                quantityLabel: item.selectedDenomination?.label,
                customInputValue: item.customInputValue,
                customInputLabel: item.customInputLabel,
                paymentMethod: method,
              };

              const result = await createOrderOnServer(payload);
              if (!result.ok) {
                  alert(result.message);
                  return;
              }
              if (result.order) {
                try {
                  await pushService.notifyAdminOrder({ orderId: String(result.order.id || '') });
                } catch (notifyErr) {
                  console.warn('Failed to notify admin about bulk order item', notifyErr);
                }
              }
          }

          await syncAfterOrder();

          // Clear cart on server
          try {
            await cartService.clear();
          } catch (e) {
            console.warn('Failed to clear cart on server', e);
          }

          showActionToast('تمت عملية الشراء', 'تمت عملية الشراء بنجاح يمكنك مراجعة طلبك داخل قائمة طلباتي');
          setCartItems([]);
          setIsBulkCheckout(false);
      } else if (activeCheckoutItem) {
          const payload = {
            productId: activeCheckoutItem.productId,
            productName: activeCheckoutItem.name,
            productCategory: activeCheckoutItem.category,
            amount: activeCheckoutItem.price,
            price: activeCheckoutItem.price,
            fulfillmentType: activeCheckoutItem.apiConfig?.type || 'manual',
            regionName: activeCheckoutItem.selectedRegion?.name,
            regionId: activeCheckoutItem.selectedRegion?.id,
            denominationId: activeCheckoutItem.selectedDenomination?.id,
            quantityLabel: activeCheckoutItem.selectedDenomination?.label,
            customInputValue: activeCheckoutItem.customInputValue,
            customInputLabel: activeCheckoutItem.customInputLabel,
            paymentMethod: method,
          };

          const result = await createOrderOnServer(payload);
          if (!result.ok) {
              alert(result.message);
              return;
          }
          if (result.order) {
            try {
              await pushService.notifyAdminOrder({ orderId: String(result.order.id || '') });
            } catch (notifyErr) {
              console.warn('Failed to notify admin about cart order', notifyErr);
            }
          }

          await syncAfterOrder();
          showActionToast('تمت عملية الشراء', 'تمت عملية الشراء بنجاح يمكنك مراجعة طلبك داخل قائمة طلباتي');
          // Remove from cart (which triggers server delete)
          removeFromCart(activeCheckoutItem.id);
          setActiveCheckoutItem(null);
      }
  };



  const cartTotal = cartItems.reduce((sum, item) => sum + item.price, 0);

  // Reset cart paging when entering cart view or when cart changes
  useEffect(() => {
    if (currentView === View.CART) setCartVisibleCount(10);
  }, [currentView]);

  useEffect(() => {
    if (currentView === View.CART) setCartVisibleCount(10);
  }, [cartItems.length]);

  const renderView = () => {
    switch (currentView) {
      case View.HOME:
        return (
          <Home 
            setView={handleSetView} 
            formatPrice={formatPrice} 
            products={products} 
            categories={categories} 
            banners={banners}
            announcements={announcements.filter(a => a.isActive)}
            addToCart={addToCart}
            userBalance={balanceUSD}
            onPurchase={handlePurchase}
            onProductSelect={handleProductSelect}
          />
        );
      case View.SEARCH:
        return (
            <SearchPage 
                setView={handleSetView} 
                formatPrice={formatPrice} 
                products={products}
                categories={categories} 
                addToCart={addToCart}
                userBalance={balanceUSD}
                onPurchase={handlePurchase}
                onProductSelect={handleProductSelect}
            />
        );
      case View.WALLET:
        return (
            <Wallet 
                setView={handleSetView} 
                formatPrice={formatPrice} 
                balance={balanceUSD} 
                onAddBalance={handleAddBalance} 
                transactions={transactions.filter(t => !currentUser || !t.userId || t.userId === currentUser.id)}
                onRefreshTransactions={refreshTransactionsFromServer}
            />
        );
      case View.PROFILE:
        return (
          <Profile 
            setView={handleSetView} 
            currentCurrency={currencyCode} 
            onCurrencyChange={handleCurrencyChange}
            terms={terms} 
            user={currentUser || undefined}
            currencies={currencies}
            rateAppLink={rateAppLink} // Pass link
            onLogout={handleUserLogout} // Pass Logout Handler
            onUpdateUser={handleUpdateProfile} // Pass Profile Update Handler
          />
        );
      case View.ADMIN:
        if (!isAdminLoggedIn) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-[#13141f] p-6 z-[200] relative">
                     <div className="w-20 h-20 bg-[#242636] rounded-full flex items-center justify-center mb-6 shadow-lg border border-gray-700">
                        <Lock size={32} className="text-yellow-400" />
                     </div>
                     <h2 className="text-2xl font-bold text-white mb-2">منطقة المسؤولين</h2>
                     <p className="text-gray-400 text-sm mb-8">يرجى إدخال رمز الدخول للمتابعة</p>
                     
                     <div className="w-full max-w-xs space-y-4">
                        <input 
                            type="password" 
                            value={adminPasswordInput}
                            onChange={(e) => setAdminPasswordInput(e.target.value)}
                            placeholder="رمز الدخول"
                            className="w-full bg-[#1e1f2b] border border-gray-700 rounded-xl p-4 text-white text-center text-lg outline-none focus:border-yellow-400 transition-colors"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                        />
                        
                        {adminLoginError && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg text-center font-bold">
                                {adminLoginError}
                            </div>
                        )}
                        
                        <button 
                            onClick={handleAdminLogin}
                            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg shadow-yellow-400/20 transition-all active:scale-95"
                        >
                            دخول
                        </button>
                        
                        <button 
                            onClick={() => setCurrentView(View.HOME)}
                            className="w-full text-gray-500 text-sm py-2 hover:text-white transition-colors"
                        >
                            العودة للرئيسية
                        </button>
                     </div>
                </div>
            );
        }

        return (
          <Admin 
            setView={handleSetView}
            products={products}
            setProducts={setProducts}
            categories={categories}
            setCategories={setCategories}
            terms={terms}
            setTerms={setTerms}
            banners={banners}
            setBanners={setBanners}
            users={users}
            setUsers={setUsers}
            announcements={announcements}
            setAnnouncements={setAnnouncements}
            currencies={currencies}
            setCurrencies={setCurrencies}
            orders={orders}
            setOrders={setOrders}
            inventory={inventory}
            setInventory={setInventory}
            rateAppLink={rateAppLink} // Pass link
            setRateAppLink={setRateAppLink} // Pass setter
            transactions={transactions} // Pass transactions
            setTransactions={setTransactions} // Pass setter for logs
            onLogout={handleAdminLogout} // Pass logout handler
          />
        );
      case View.NOTIFICATIONS:
        return <Notifications setView={handleSetView} formatPrice={formatPrice} announcements={announcements} />;
      case View.CART:
        return (
          <div className="pt-4">
             {/* Header */}
             <div className="px-4 mb-4">
                <h1 className="text-xl font-bold text-white text-right">سلة المشتريات</h1>
             </div>

             {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-16 text-center px-6 animate-fadeIn">
                    <div className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center mb-4 relative shadow-lg shadow-yellow-400/20">
                        <ShoppingCart size={48} className="text-black" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-bold mb-2 text-white">قائمة مشترياتك فارغة</h2>
                    <p className="text-gray-400 text-sm mb-8">لم تقم باضافه شيئ الى السلة</p>
                    <button onClick={() => handleSetView(View.HOME)} className="bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold text-sm shadow-lg hover:bg-yellow-500 transition-colors active:scale-95 transform">
                        تصفح المنتجات
                    </button>
                </div>
             ) : (
                <div className="px-4 space-y-4 animate-slide-up">
                    
                    {/* Summary (Moved to Top) */}
                    <div className="bg-[#242636] p-4 rounded-2xl border border-gray-700 shadow-lg mb-2">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-400 text-sm">عدد العناصر</span>
                            <span className="text-white font-bold">{cartItems.length}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-400 text-sm">الإجمالي الكلي</span>
                            <span className="text-yellow-400 font-black text-xl dir-ltr">{formatPrice(cartTotal)}</span>
                        </div>
                        {/* Buy All Button */}
                        <button 
                            onClick={handleBuyAll}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <CheckCircle size={20} />
                            شراء الكل ({formatPrice(cartTotal)})
                        </button>
                    </div>

                    {/* Cart Items List */}
                    <div className="space-y-3">
                        {cartItems.slice(0, cartVisibleCount).map((item) => (
                            <div key={item.id} className="bg-[#242636] p-3 rounded-xl border border-gray-700 shadow-sm relative overflow-hidden group">
                                <div className="flex items-start gap-3">
                                    {/* Image */}
                                    <div className={`w-20 h-24 rounded-lg bg-gradient-to-br ${item.imageColor} flex-shrink-0 relative overflow-hidden flex items-center justify-center`}>
                                        {item.imageUrl ? (
                                             <img 
                                               src={item.imageUrl} 
                                               alt={item.name} 
                                               className="w-full h-full object-cover opacity-90"
                                               referrerPolicy="no-referrer"
                                               onError={(e) => {
                                                  const target = e.target as HTMLImageElement;
                                                  target.style.display = 'none';
                                                  target.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                                                  const span = document.createElement('span');
                                                  span.className = 'text-white text-[10px] font-bold';
                                                  span.innerText = item.name.slice(0, 5);
                                                  target.parentElement!.appendChild(span);
                                               }}
                                             />
                                        ) : (
                                             <span className="text-white text-[10px] font-bold">{item.name.slice(0,5)}
</span>
                                        )}
                                    </div>
                                    
                                    {/* Info */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-sm font-bold text-white line-clamp-1">{item.name}</h3>
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {item.selectedRegion && (
                                                <span className="text-[10px] bg-[#13141f] text-gray-300 px-1.5 py-0.5 rounded border border-gray-700 flex items-center gap-1">
                                                    {item.selectedRegion.flag} {item.selectedRegion.name}
                                                </span>
                                            )}
                                            {item.selectedDenomination && (
                                                <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-400/30">
                                                    {item.selectedDenomination.label}
                                                </span>
                                            )}
                                        </div>

                                        {/* Show Custom Input in Cart */}
                                        {item.customInputValue && (
                                            <div className="mb-2 text-[10px] bg-[#13141f] border border-gray-700 rounded px-2 py-1 text-gray-400 flex items-center gap-1">
                                                <User size={10} className="text-gray-500" />
                                                <span className="font-bold">{item.customInputLabel}:</span>
                                                <span className="text-white">{item.customInputValue}</span>
                                            </div>
                                        )}
                                        
                                        <p className="text-lg font-black text-yellow-400 dir-ltr font-mono leading-none mb-3">{formatPrice(item.price)}</p>
                                    </div>
                                </div>

                                {/* Actions Row */}
                                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-700/50">
                                    <button 
                                        onClick={() => handleBuyItem(item)}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg text-xs shadow-md shadow-emerald-500/10 flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                                    >
                                        <CheckCircle size={14} />
                                        شراء الآن
                                    </button>
                                    <button 
                                        onClick={() => removeFromCart(item.id)}
                                        className="px-3 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center active:scale-95"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {cartItems.length > cartVisibleCount && (
                          <div className="flex justify-center pt-3">
                            <button
                              onClick={() => setCartVisibleCount(c => Math.min(c + 10, cartItems.length))}
                              className="px-4 py-2 rounded-xl bg-[#242636] border border-gray-700 text-gray-200 text-sm font-bold hover:bg-[#2f3245] transition-colors"
                            >
                              عرض المزيد
                            </button>
                          </div>
                        )}
                    </div>
                </div>
             )}

             {/* Checkout Modal for Cart */}
             <CheckoutModal 
                isOpen={!!activeCheckoutItem || isBulkCheckout}
                onClose={() => { setActiveCheckoutItem(null); setIsBulkCheckout(false); }}
                itemName={isBulkCheckout ? `شراء الكل (${cartItems.length} منتجات)` : activeCheckoutItem?.name || ''}
                price={isBulkCheckout ? cartTotal : activeCheckoutItem?.price || 0}
                userBalance={balanceUSD}
                onSuccess={handleCheckoutSuccess}
                formatPrice={formatPrice}
                onRequireLogin={() => setShowLoginModal(true)}
             />
          </div>
        );
      case View.ORDERS:
        return (
          <div className="min-h-screen pb-24 bg-[#13141f] pt-4">
               {/* Header */}
               <div className="px-4 mb-4 flex items-center justify-between">
                  <button onClick={() => handleSetView(View.HOME)}><ArrowLeft className="text-white" /></button>
                  <h1 className="text-xl font-bold text-white">طلباتي</h1>
                  <button onClick={() => loadMyOrdersPage('replace')} className="text-xs bg-[#242636] text-gray-200 px-3 py-2 rounded-lg border border-gray-700" disabled={myOrdersRefreshing}>{myOrdersRefreshing ? "جاري التحديث..." : "تحديث"}</button>
               </div>

               {(myOrdersRefreshing ? false : myOrdersPage.length === 0) ? (
                  <div className="flex flex-col items-center justify-center pt-16 text-center px-6 animate-fadeIn">
                     <div className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center mb-4 text-black shadow-lg shadow-yellow-400/20">
                        <ShoppingBag size={48} strokeWidth={1.5} />
                     </div>
                     <h2 className="text-xl font-bold mb-2 text-white">لا توجد طلبات</h2>
                     <p className="text-gray-500 text-sm">لم تقم بأي عملية شراء حتى الآن</p>
                     <button onClick={() => handleSetView(View.HOME)} className="mt-6 bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform">
                     تصفح المنتجات
                     </button>
                  </div>
               ) : (
                   <div className="px-4 space-y-3 animate-slide-up">
                       {myOrdersPage.map(order => {
                           const isPending = order.status === 'pending';
                           const isCompleted = order.status === 'completed';
                           const isCancelled = order.status === 'cancelled';
                           
                           return (
                             <div 
                                key={order.id} 
                                className={`rounded-2xl border flex flex-col gap-2 shadow-sm relative overflow-hidden transition-all ${
                                    isPending 
                                    ? 'bg-[#242636] p-4 border-gray-700' 
                                    : 'bg-[#242636]/80 p-3 border-gray-800 hover:bg-[#242636]'
                                }`}
                             >
                                {/* Header Row: Icon | Name | Price */}
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className={`rounded-full flex items-center justify-center border flex-shrink-0 ${
                                            isPending ? 'w-10 h-10 bg-yellow-500/10 border-yellow-500 text-yellow-500' : 
                                            isCompleted ? 'w-8 h-8 bg-green-500/10 border-green-500 text-green-500' : 
                                            'w-8 h-8 bg-red-500/10 border-red-500 text-red-500'
                                        }`}>
                                            {isCompleted ? <CheckCircle size={isPending ? 20 : 16} /> : isPending ? <Clock size={isPending ? 20 : 16} /> : <X size={isPending ? 20 : 16} />}
                                        </div>
                                        <div>
                                            <h4 className={`font-bold text-white ${isPending ? 'text-sm' : 'text-xs'}`}>{order.productName}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-gray-500 dir-ltr font-mono select-all">{order.id}</span>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(String(order.id || ''));
                                                        }}
                                                        className="text-gray-600 hover:text-white p-0.5"
                                                    >
                                                        <Copy size={10} />
                                                    </button>
                                                </div>
                                                <span className="text-[10px] text-gray-600">•</span>
                                                <span className="text-[10px] text-gray-500">{(typeof (order as any)?.date === 'string' && (order as any).date)
  ? (((order as any).date as string).split(',')[0] || (order as any).date)
  : ((order as any)?.createdAt
      ? (() => { try { return new Date((order as any).createdAt).toLocaleDateString('en-US'); } catch { return '—'; } })()
      : '—')}</span>
                                            </div>

                                            {/* Region and Quantity Badges */}
                                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                {order.regionName && (
                                                    <span className="text-[9px] bg-[#13141f] text-gray-300 px-1.5 py-0.5 rounded border border-gray-600 flex items-center gap-1">
                                                        <Flag size={8} /> {order.regionName}
                                                    </span>
                                                )}
                                                {order.quantityLabel && (
                                                    <span className="text-[9px] bg-yellow-400/5 text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-400/20 flex items-center gap-1">
                                                        <Tags size={8} /> {order.quantityLabel}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {/* Custom Input Value Display */}
                                            {order.customInputValue && (
                                                <div className="mt-1.5 bg-[#13141f] rounded px-2 py-1 border border-gray-700 w-fit">
                                                    <span className="text-[9px] text-gray-400 font-bold">{order.customInputLabel || 'معلومات إضافية'}: </span>
                                                    <span className="text-[9px] text-white select-all">{order.customInputValue}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end">
                                        <span className={`font-black dir-ltr text-yellow-400 ${isPending ? 'text-sm' : 'text-xs'}`}>
                                            {formatPrice(order.amount)}
                                        </span>
                                        <span className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded ${
                                            isCompleted ? 'text-green-500 bg-green-500/10' : 
                                            isPending ? 'text-yellow-500 bg-yellow-500/10' : 
                                            'text-red-500 bg-red-500/10'
                                        }`}>
                                            {isCompleted ? 'مكتمل' : isPending ? 'قيد الانتظار' : 'ملغي'}
                                        </span>
                                    </div>
                                </div>
                                
                                {/* Detail Sections for Compact Cards */}
                                
                                {/* If Completed: Compact Code Display */}
                                {isCompleted && order.deliveredCode && (
                                    <div className="mt-1 bg-[#13141f] rounded-lg border border-dashed border-gray-700 flex items-center justify-between p-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className="text-[9px] text-gray-500 font-bold whitespace-nowrap">الكود:</span>
                                            <p className="text-white font-mono text-[10px] truncate dir-ltr select-all">{order.deliveredCode}</p>
                                        </div>
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(order.deliveredCode || '')}
                                            className="text-gray-500 hover:text-white transition-colors p-1"
                                        >
                                            <Copy size={12} />
                                        </button>
                                    </div>
                                )}

                                {/* If Cancelled: Compact Reason */}
                                {isCancelled && order.rejectionReason && (
                                    <div className="mt-1 bg-red-500/5 rounded-lg border border-red-500/20 p-2 flex gap-2 items-start">
                                        <AlertTriangle size={12} className="text-red-500 flex-shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-red-300 leading-tight">{order.rejectionReason}</p>
                                    </div>
                                )}

                                {/* Actions Footer */}
                                {isCompleted && (
                                    <div className="flex justify-end mt-1 pt-2 border-t border-gray-700/30">
                                        <button 
                                            onClick={() => setSelectedInvoiceOrder(order)}
                                            className="text-[10px] flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Receipt size={12} />
                                            <span>عرض الفاتورة</span>
                                        </button>
                                    </div>
                                )}
                             </div>
                           );
                       })}
                   
                       <div ref={myOrdersSentinelRef} style={{ height: 1 }} />
                       {myOrdersLoadingMore && (
                         <div className="text-center text-gray-400 text-sm py-4">جاري تحميل المزيد...</div>
                       )}
                       {!myOrdersHasMore && myOrdersPage.length > 0 && (
                         <div className="text-center text-gray-500 text-sm py-4">تم عرض كل الطلبات</div>
                       )}
</div>
               )}
          </div>
        );
      default:
        return (
          <Home 
            setView={handleSetView} 
            formatPrice={formatPrice} 
            products={products} 
            categories={categories} 
            banners={banners}
            announcements={announcements.filter(a => a.isActive)}
            addToCart={addToCart}
            userBalance={balanceUSD}
            onPurchase={handlePurchase}
            onProductSelect={handleProductSelect}
          />
        );
    }
  };

  // --- SECURITY BLOCK SCREEN ---
  if (isSecurityBlocked) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-[#13141f] text-center p-8 z-[9999] absolute inset-0">
              <div className="bg-red-500/10 p-6 rounded-full border border-red-500/30 mb-6 animate-pulse">
                  <ShieldAlert size={64} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-black text-white mb-4">تم اكتشاف تهديد أمني</h1>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs mb-8">
                  {securityMessage}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-600 bg-black/20 px-4 py-2 rounded-lg border border-gray-800">
                  <Lock size={12} />
                  <span>Ratluzen Security System v1.0</span>
              </div>
          </div>
      );
  }

  return (
    <div className="flex justify-center absolute inset-0 bg-[#000000] overflow-hidden">
      <div className="w-full h-full bg-[#13141f] text-white font-cairo sm:max-w-[430px] sm:h-[900px] sm:my-auto sm:rounded-[3rem] sm:border-[8px] sm:border-[#2d2d2d] shadow-2xl relative overflow-hidden ring-1 ring-white/10 flex flex-col">

        {/* PayTabs processing overlay */}
        {paytabsProcessing && (
          <div className="absolute inset-0 z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-[#1f212e] border border-gray-700 rounded-2xl p-6 w-[90%] max-w-xs text-center shadow-2xl">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-gray-200">{paytabsProcessingText || 'جاري المعالجة...'}</p>
            </div>
          </div>
        )}

        {/* Action success toast */}
        {actionToast && (
          <div className="absolute inset-x-0 top-6 flex justify-center z-[125] px-4 pointer-events-none">
            <div className="w-full max-w-sm bg-white/95 text-right text-gray-900 rounded-2xl shadow-[0_15px_40px_rgba(16,185,129,0.35)] border border-emerald-100 px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[13px] font-extrabold text-emerald-700">{actionToast.title}</span>
                <span className="text-xs text-emerald-600">{actionToast.message}</span>
              </div>
            </div>
          </div>
        )}

        {/* In-app notification banner (foreground FCM fallback) */}
        {inAppNotification && (
          <div className="absolute top-4 inset-x-0 flex justify-center z-[120] px-4">
            <div className="bg-[#1f212e]/95 border border-emerald-500/60 rounded-2xl shadow-2xl px-4 py-3 w-full max-w-md">
              <div className="text-sm font-semibold text-emerald-200 truncate">{inAppNotification.title}</div>
              <div className="text-xs text-gray-200 mt-1 line-clamp-2">{inAppNotification.body}</div>
            </div>
          </div>
        )}
        
        {/* Persistent Top Header (Hidden in Admin View) */}
        {currentView !== View.ADMIN && (
          <TopHeader 
            setView={handleSetView} 
            formattedBalance={formatPrice(balanceUSD)} 
            cartItemCount={cartItems.length}
            isLoggedIn={!!currentUser}
            onLoginClick={() => setShowLoginModal(true)}
          />
        )}

        {/* Scrollable Content Area */}
        <div 
          key={currentView} // Force scroll reset on view change
          className={`flex-1 overflow-y-auto no-scrollbar scroll-smooth ${currentView !== View.ADMIN ? 'pb-24 pt-14' : ''}`}
        >
          <ErrorBoundary onReset={() => setCurrentView(View.HOME)}>{renderView()}</ErrorBoundary>
        </div>

        {/* Persistent Bottom Nav (Hidden in Admin View) */}
        {currentView !== View.ADMIN && (
          <BottomNav currentView={currentView} setView={handleSetView} />
        )}
        
        {/* Global Product Details Modal - Rendered here to cover entire screen including header/footer */}
        {selectedProduct && (
            <ProductDetailsModal 
              product={selectedProduct} 
              isOpen={!!selectedProduct} 
              onClose={() => setSelectedProduct(null)} 
              formatPrice={formatPrice}
              addToCart={addToCart}
              userBalance={balanceUSD}
              onPurchase={handlePurchase}
              isLoggedIn={!!currentUser}
              onRequireAuth={() => setShowLoginModal(true)}
            />
        )}
        
        {/* Invoice Modal */}
        {selectedInvoiceOrder && (
            <InvoiceModal 
                order={selectedInvoiceOrder}
                isOpen={!!selectedInvoiceOrder}
                onClose={() => setSelectedInvoiceOrder(null)}
                formatPrice={formatPrice}
            />
        )}

        {/* Login Modal */}
        <LoginModal 
            isOpen={showLoginModal} 
            onClose={() => setShowLoginModal(false)}
            onLogin={handleLogin}
            terms={terms}
        />

        
        <div className="hidden sm:block absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-7 bg-[#2d2d2d] rounded-b-2xl z-[60]"></div>
      </div>
    </div>
  );
};

export default App;
