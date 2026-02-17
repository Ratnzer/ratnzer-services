
import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, Plus, Trash2, Edit2, Save, X, 
  Package, Layers, FileText, ShoppingBag,
  TrendingUp, Users, Search, Image as ImageIcon,
  CheckCircle, BarChart3, Wallet, Activity,
  AlertTriangle, DollarSign, Server, Clock,
  Gamepad2, Smartphone, Monitor, Wifi, Zap, Gift, 
  Music, Video, Book, Car, Coffee, Shirt, Watch, 
  Globe, ShoppingBasket, Headphones, Camera,
  Briefcase, Plane, Megaphone, Ban, Unlock, User,
  Bell, Info, Star, ShoppingCart, ArrowUpRight, ArrowDownRight,
  PieChart, Calendar, Flag, Tags, CircleDollarSign, RefreshCw, ClipboardList, Send, Link, CheckSquare,
  MapPin, Mail, Phone, ShieldCheck, ArrowRight, Copy, PackageOpen, XCircle, Receipt, ToggleRight, ToggleLeft,
  // New Icons for Categories
  Facebook, Instagram, Twitter, Linkedin, Youtube, Twitch, 
  Code, Terminal, Database, Cloud, Bitcoin, Coins,
  Key, Lock, Wrench, Hammer, Settings, Heart, Flame, Sun, Moon, CloudRain,
  Truck, Anchor, Box, Crown, Diamond, Medal, Trophy,
  Cpu, HardDrive, Mouse, Keyboard, Laptop, Tablet,
  Router, Signal, Radio, Tv, Speaker, Mic,
  Ticket, Film, Clapperboard, Sparkles, Palette, Brush,
  Dumbbell, Bike, Pizza, Utensils, Bed, Home, Building,
  GraduationCap, School, BookOpen, Library,
  LayoutGrid, Check, Settings2, LogOut
} from 'lucide-react';
import { View, Product, Category, AppTerms, AppPrivacy, Banner, UserProfile, Announcement, Region, Denomination, Currency, Order, InventoryCode, CustomInputConfig, Transaction, AdminAnalytics } from '../types';
import { PREDEFINED_REGIONS, INITIAL_CURRENCIES } from '../constants';
import { contentService, productService, orderService, inventoryService, userService, settingsService, pushService, analyticsService } from '../services/api';
import InvoiceModal from '../components/InvoiceModal';
import { extractOrdersFromResponse } from '../utils/orders';
import { generateShortId } from '../utils/id';

interface Props {
  setView: (view: View) => void;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  terms: AppTerms;
  setTerms: React.Dispatch<React.SetStateAction<AppTerms>>;
  privacy: AppPrivacy;
  setPrivacy: React.Dispatch<React.SetStateAction<AppPrivacy>>;
  banners: Banner[];
  setBanners: React.Dispatch<React.SetStateAction<Banner[]>>;
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  announcements: Announcement[];
  setAnnouncements: React.Dispatch<React.SetStateAction<Announcement[]>>;
  announcementsHasMore: boolean;
  announcementsLoadingMore: boolean;
  onLoadMoreAnnouncements: () => void;
  currencies: Currency[];
  setCurrencies: React.Dispatch<React.SetStateAction<Currency[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  inventory: InventoryCode[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryCode[]>>;
  rateAppLink: string;
  setRateAppLink: React.Dispatch<React.SetStateAction<string>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  onLogout: () => void;
}

const AVAILABLE_ICONS = [
  // Basic
  { id: 'gamepad', icon: Gamepad2, label: 'ألعاب' },
  { id: 'shopping', icon: ShoppingBag, label: 'متجر' },
  { id: 'basket', icon: ShoppingBasket, label: 'سلة' },
  { id: 'gift', icon: Gift, label: 'هدايا' },
  { id: 'globe', icon: Globe, label: 'عالمي' },
  { id: 'sparkles', icon: Sparkles, label: 'نجوم' },
  
  // Tech & Telecom
  { id: 'phone', icon: Smartphone, label: 'هاتف' },
  { id: 'wifi', icon: Wifi, label: 'إنترنت' },
  { id: 'monitor', icon: Monitor, label: 'شاشة' },
  { id: 'laptop', icon: Laptop, label: 'لابتوب' },
  { id: 'tablet', icon: Tablet, label: 'تابلت' },
  { id: 'mouse', icon: Mouse, label: 'ماوس' },
  { id: 'keyboard', icon: Keyboard, label: 'كيبورد' },
  { id: 'cpu', icon: Cpu, label: 'معالج' },
  { id: 'router', icon: Router, label: 'راوتر' },
  { id: 'server', icon: Server, label: 'سيرفر' },
  
  // Social Media & Streaming
  { id: 'facebook', icon: Facebook, label: 'فيسبوك' },
  { id: 'instagram', icon: Instagram, label: 'انستقرام' },
  { id: 'twitter', icon: Twitter, label: 'تويتر' },
  { id: 'linkedin', icon: Linkedin, label: 'لينكد إن' },
  { id: 'youtube', icon: Youtube, label: 'يوتيوب' },
  { id: 'twitch', icon: Twitch, label: 'تويتش' },
  { id: 'video', icon: Video, label: 'فيديو' },
  { id: 'mic', icon: Mic, label: 'مايك' },
  { id: 'clapperboard', icon: Clapperboard, label: 'سينما' },
  
  // Lifestyle
  { id: 'music', icon: Music, label: 'موسيقى' },
  { id: 'coffee', icon: Coffee, label: 'قهوة' },
  { id: 'pizza', icon: Pizza, label: 'طعام' },
  { id: 'shirt', icon: Shirt, label: 'ملابس' },
  { id: 'car', icon: Car, label: 'سيارة' },
  { id: 'plane', icon: Plane, label: 'طيران' },
  { id: 'home', icon: Home, label: 'منزل' },
  { id: 'bed', icon: Bed, label: 'فندق' },
  { id: 'dumbbell', icon: Dumbbell, label: 'رياضة' },
  
  // Tools & Dev
  { id: 'code', icon: Code, label: 'كود' },
  { id: 'terminal', icon: Terminal, label: 'طرفية' },
  { id: 'database', icon: Database, label: 'بيانات' },
  { id: 'cloud', icon: Cloud, label: 'سحابة' },
  { id: 'wrench', icon: Wrench, label: 'أدوات' },
  { id: 'settings', icon: Settings, label: 'إعدادات' },
  { id: 'lock', icon: Lock, label: 'قفل' },
  { id: 'key', icon: Key, label: 'مفتاح' },
  
  // Finance
  { id: 'bitcoin', icon: Bitcoin, label: 'بيتكوين' },
  { id: 'wallet', icon: Wallet, label: 'محفظة' },
  { id: 'coins', icon: Coins, label: 'عملات' },
  { id: 'dollar', icon: DollarSign, label: 'دولار' },
  
  // Education & Misc
  { id: 'book', icon: Book, label: 'كتاب' },
  { id: 'school', icon: School, label: 'مدرسة' },
  { id: 'grad', icon: GraduationCap, label: 'تخرج' },
  { id: 'star', icon: Star, label: 'نجمة' },
  { id: 'heart', icon: Heart, label: 'قلب' },
  { id: 'flame', icon: Flame, label: 'نار' },
  { id: 'crown', icon: Crown, label: 'تاج' },
  { id: 'diamond', icon: Diamond, label: 'الماس' },
  { id: 'medal', icon: Medal, label: 'ميدالية' },
  { id: 'trophy', icon: Trophy, label: 'كأس' },
  { id: 'ticket', icon: Ticket, label: 'تذكرة' },
  { id: 'palette', icon: Palette, label: 'ألوان' },
];

const ADMIN_ORDERS_PAGE_SIZE = 10;

const Admin: React.FC<Props> = ({ 
  setView, 
  products, setProducts, 
  categories, setCategories,
  terms, setTerms,
  privacy, setPrivacy,
  banners, setBanners,
  users, setUsers,
  announcements, setAnnouncements,
  announcementsHasMore, announcementsLoadingMore, onLoadMoreAnnouncements,
  currencies, setCurrencies,
  orders, setOrders,
  inventory, setInventory,
  rateAppLink, setRateAppLink,
  transactions, setTransactions,
  onLogout
}) => {
  // ============================================================
  // ✅ Auto refresh admin data when opening Admin panel
  // ============================================================
  useEffect(() => {
  const refreshAdminData = async () => {
    try {
      const [p, c, u, i, a] = await Promise.all([
        productService.getAll(),
        contentService.getCategories(),
        userService.getAll(),
        inventoryService.getAll(),
        analyticsService.getDashboard(),
      ]);
      if (p?.data) setProducts(p.data);
      if (c?.data) setCategories(c.data);
      if (u?.data) setUsers(u.data);
      if (i?.data) setInventory(i.data);
      if (a?.data) setServerAnalytics(a.data);
    } catch (e) {
      console.warn('Failed to refresh admin data', e);
    }

    await loadAdminOrdersPage('replace');
  };
  refreshAdminData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

// ✅ Always provide a safe date string for orders coming from API (Prisma returns createdAt)
const getOrderDate = (o: any) => {
  const raw =
    typeof o?.date === "string" && o.date
      ? o.date
      : o?.createdAt
      ? new Date(o.createdAt).toLocaleString("en-US")
      : "";
  return raw || new Date().toLocaleString("en-US");
};

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'inventory' | 'products' | 'categories' | 'terms' | 'privacy' | 'users' | 'banners' | 'announcements' | 'currencies' | 'settings'>('dashboard');
  
  // Orders State
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [ordersHasMore, setOrdersHasMore] = useState(false);
  const [ordersRefreshing, setOrdersRefreshing] = useState(false);
  const [ordersLoadingMore, setOrdersLoadingMore] = useState(false);
  const [serverAnalytics, setServerAnalytics] = useState<any | null>(null);
  const [fulfillmentOrder, setFulfillmentOrder] = useState<Order | null>(null);
  const [fulfillmentCode, setFulfillmentCode] = useState('');
  
  // Invoice Viewer State
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  
  // Cancellation Modal State
  const [cancellationOrder, setCancellationOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Terms State
  const [termsLang, setTermsLang] = useState<'ar' | 'en'>('ar');
  const [isSavingTerms, setIsSavingTerms] = useState(false);

  // Privacy State
  const [privacyLang, setPrivacyLang] = useState<'ar' | 'en'>('ar');
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

  // Terms: Save to server
  const handleSaveTerms = async () => {
    if (isSavingTerms) return;

    const ar = (terms?.contentAr ?? '').trim();
    const en = (terms?.contentEn ?? '').trim();

    if (!ar && !en) {
      alert('يرجى كتابة الشروط قبل الحفظ');
      return;
    }

    setIsSavingTerms(true);
    try {
      const res = await contentService.updateTerms({
        contentAr: terms?.contentAr ?? '',
        contentEn: terms?.contentEn ?? '',
      });

      // Sync UI with server response if available
      if (res?.data) {
        setTerms({
          ...terms,
          contentAr: typeof res.data.contentAr === 'string' ? res.data.contentAr : (terms?.contentAr ?? ''),
          contentEn: typeof res.data.contentEn === 'string' ? res.data.contentEn : (terms?.contentEn ?? ''),
        });
      }

      alert('تم حفظ الشروط بنجاح ✅');
    } catch (err) {
      console.error('Save terms failed:', err);
      alert('فشل حفظ الشروط على السيرفر، حاول مرة أخرى');
    } finally {
      setIsSavingTerms(false);
    }
  };

  // Privacy: Save to server
  const handleSavePrivacy = async () => {
    if (isSavingPrivacy) return;

    const ar = (privacy?.contentAr ?? '').trim();
    const en = (privacy?.contentEn ?? '').trim();

    if (!ar && !en) {
      alert('يرجى كتابة سياسة الخصوصية قبل الحفظ');
      return;
    }

    setIsSavingPrivacy(true);
    try {
      const res = await contentService.updatePrivacy({
        contentAr: privacy?.contentAr ?? '',
        contentEn: privacy?.contentEn ?? '',
      });

      // Sync UI with server response if available
      if (res?.data) {
        setPrivacy({
          contentAr: typeof res.data.contentAr === 'string' ? res.data.contentAr : (privacy?.contentAr ?? ''),
          contentEn: typeof res.data.contentEn === 'string' ? res.data.contentEn : (privacy?.contentEn ?? ''),
        });
      }

      alert('تم حفظ سياسة الخصوصية بنجاح ✅');
    } catch (err) {
      console.error('Save privacy failed:', err);
      alert('فشل حفظ سياسة الخصوصية على السيرفر، حاول مرة أخرى');
    } finally {
      setIsSavingPrivacy(false);
    }
  };


  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [activeProductTab, setActiveProductTab] = useState<'basic' | 'details' | 'variants' | 'automation'>('basic');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Product Form State
  const [prodForm, setProdForm] = useState<Partial<Product>>({
    name: '', category: 'games', price: undefined, tag: '', imageColor: 'from-gray-700 to-gray-900', imageUrl: '', description: '',
    regions: [], denominations: [], apiConfig: { type: 'manual' }, autoDeliverStock: false,
    customInput: { enabled: false, label: '', placeholder: '', required: false }
  });
  
  // Temp State for adding denominations inside modal
  const [tempDenomLabel, setTempDenomLabel] = useState('');
  const [tempDenomPrice, setTempDenomPrice] = useState('');

  // Temp State for adding denominations PER REGION/TYPE
  const [tempRegionDenomLabel, setTempRegionDenomLabel] = useState('');
  const [tempRegionDenomPrice, setTempRegionDenomPrice] = useState('');

  // Temp State for adding CUSTOM REGIONS/TYPES inside modal
  const [tempRegionName, setTempRegionName] = useState('');
  const [tempRegionFlag, setTempRegionFlag] = useState('');

  // State for configuring region-specific custom input
  const [editingRegionCustomInput, setEditingRegionCustomInput] = useState<string | null>(null);

  // Category Modal State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState<{name: string, icon: any}>({ name: '', icon: Gamepad2 });

  // Banner Modal State
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null); 
  const [bannerForm, setBannerForm] = useState<Partial<Banner>>({ title: '', subtitle: '', desc: '', bg: 'from-blue-900 to-indigo-900', imageUrl: '' });

  // User Management State
  const [searchUserId, setSearchUserId] = useState('');
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [amountToAdd, setAmountToAdd] = useState('');

  // Announcement State
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceMsg, setAnnounceMsg] = useState('');
  const [announceType, setAnnounceType] = useState<'offer' | 'alert' | 'info' | 'ad'>('info');
  const [announceVisibility, setAnnounceVisibility] = useState<'notifications' | 'home' | 'both'>('both');

  // Inventory UI Helper State
  const [openInvDropdown, setOpenInvDropdown] = useState<'product' | 'region' | 'denom' | null>(null);

  // Inventory State
  const [invSelectedProduct, setInvSelectedProduct] = useState<string>('');
  const [invSelectedRegion, setInvSelectedRegion] = useState<string>('');
  const [invSelectedDenom, setInvSelectedDenom] = useState<string>('');
  const [invNewCodes, setInvNewCodes] = useState<string>('');

  // --- REAL-TIME ANALYTICS CALCULATION (Server-only) ---
  const analytics = useMemo<AdminAnalytics>(() => {
    if (serverAnalytics) {
      const kpi = serverAnalytics.kpi || {};
      const salesChartRaw = Array.isArray(serverAnalytics.salesChart) ? serverAnalytics.salesChart : [];
      const categoryDistRaw = Array.isArray(serverAnalytics.categoryDist) ? serverAnalytics.categoryDist : [];

      const salesChart = salesChartRaw.map((entry: any): { day: string; fullDate: string; value: number } => ({
        day: entry?.day || '',
        fullDate: entry?.date || entry?.day || '',
        value: typeof entry?.value === 'number' ? entry.value : Number(entry?.value ?? 0),
      }));
      const maxChartValue = Math.max(...salesChart.map((d: { value: number }) => d.value), 10);

      const categoryStats = categoryDistRaw.map((cat: any): { id?: string; name: string; icon?: any; count: number; percentage: number } => {
        const match = categories.find(c => c.id === cat.id);
        return {
          ...match,
          id: cat.id,
          name: match?.name || cat.label || cat.id || 'غير محدد',
          icon: match?.icon || Tags,
          count: typeof cat.count === 'number' ? cat.count : Number(cat.count ?? 0),
          percentage: typeof cat.percentage === 'number' ? cat.percentage : Number(cat.percentage ?? 0),
        };
      });

      return {
        totalRevenue: typeof kpi.revenue === 'number' ? kpi.revenue : Number(kpi.revenue ?? 0),
        totalOrders: typeof kpi.orders === 'number' ? kpi.orders : Number(kpi.orders ?? 0),
        totalUsers: typeof kpi.users === 'number' ? kpi.users : Number(kpi.users ?? 0),
        totalProducts: typeof kpi.products === 'number' ? kpi.products : Number(kpi.products ?? 0),
        activeUsers: typeof kpi.activeUsers === 'number' ? kpi.activeUsers : 0,
        salesChart,
        maxChartValue,
        categoryStats,
      };
    }

    // No local fallback: return empty/zeroed analytics
    const emptyCategoryStats = categories
      .filter(c => c.id !== 'all')
      .map(cat => ({ ...cat, count: 0, percentage: 0 }));

    return {
      totalRevenue: 0,
      totalOrders: 0,
      totalUsers: 0,
      totalProducts: 0,
      activeUsers: 0,
      salesChart: [],
      maxChartValue: 10,
      categoryStats: emptyCategoryStats,
    };
  }, [serverAnalytics, categories]);

  const recentOrders = orders.slice(0, 5).map(o => ({
      id: o.id,
      user: o.userName,
      item: o.productName,
      price: `$${o.amount}`,
      status: o.status,
      time: (getOrderDate(o).split(",")[1] || "") // Simple time extraction
  }));

  // Helper for admin pricing display (Default to USD for admin view)
  const adminFormatPrice = (price: number) => {
    return `$ ${price.toFixed(2)}`;
  };

  // --- Order Management Logic ---
  const filteredOrders = orders.filter(o => {
      // 1. Status Filter
      const matchesStatus = orderFilter === 'all' || o.status === orderFilter;

      // 2. Search Filter (ID or User Name)
      const query = (orderSearchQuery || '').toLowerCase();
      const matchesSearch =
        String(o.id || '').toLowerCase().includes(query) ||
        String(o.userName || '').toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
  });

  const loadAdminOrdersPage = async (mode: 'replace' | 'append' = 'replace') => {
    const search = orderSearchQuery.trim();
    const isSearching = !!search;
    const nextSkip = mode === 'append' ? orders.length : 0;
    const pageSize = ADMIN_ORDERS_PAGE_SIZE;

    // When searching, always replace results; no pagination append
    if (mode === 'append' && (ordersLoadingMore || isSearching)) return;

    if (mode === 'replace') {
      setOrdersRefreshing(true);
    } else {
      setOrdersLoadingMore(true);
    }

    try {
      let items: Order[] = [];
      let hasMore = false;

      if (isSearching) {
        // Use dedicated server-side search endpoint (unbounded) so any order ID returns even if not in first page
        const res = await orderService.getAll({ q: search });
        const normalized = extractOrdersFromResponse(res?.data, pageSize);
        items = normalized.items;
        hasMore = false;
      } else {
        const res = await orderService.getAllPaged(nextSkip, pageSize);
        const normalized = extractOrdersFromResponse(res?.data, pageSize);
        items = normalized.items;
        hasMore = normalized.hasMore;
      }

      if (mode === 'replace') {
        setOrders(items);
      } else {
        setOrders(prev => [...prev, ...items]);
      }

      setOrdersHasMore(isSearching ? false : hasMore);
    } catch (error) {
      console.warn('Failed to load admin orders page', error);
      if (mode === 'replace') {
        setOrders([]);
        setOrdersHasMore(false);
      }
    } finally {
      if (mode === 'replace') {
        setOrdersRefreshing(false);
      } else {
        setOrdersLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      setOrdersLoadingMore(false);
    }
  }, [activeTab, orderSearchQuery, orderFilter]);

  // Trigger server-side search whenever the search query changes (or resets)
  useEffect(() => {
    loadAdminOrdersPage('replace');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderSearchQuery]);


  const handleOpenFulfillment = (order: Order) => {
      setFulfillmentOrder(order);
      setFulfillmentCode('');
  };

  const handleCompleteOrder = async () => {
      if (!fulfillmentOrder || isCancelling) return;
      if (!fulfillmentCode.trim()) {
          alert('يرجى إدخال الكود أو رسالة التسليم');
          return;
      }

      // 1. Capture current state for potential rollback
      const targetOrderId = fulfillmentOrder.id;
      const targetCode = fulfillmentCode;

      // 2. Optimistic UI Update: Update UI immediately
      setOrders(prev => prev.map(o => 
          o.id === targetOrderId 
          ? { ...o, status: 'completed', deliveredCode: targetCode, fulfillmentType: 'manual' }
          : o
      ));
      
      // Close modal immediately for "Instant" feel
      setFulfillmentOrder(null);
      setFulfillmentCode('');

      // 3. Background Processing
      try {
          await orderService.updateStatus(targetOrderId, {
              status: 'completed',
              deliveredCode: targetCode
          });
          
          // Fire and forget notification
          pushService.notifyUserOrderUpdate({
              orderId: targetOrderId,
              status: 'completed',
          }).catch(e => console.warn('Notification failed', e));

      } catch (err) {
          console.error('Complete order failed:', err);
          // Rollback UI on failure
          setOrders(prev => prev.map(o => 
              o.id === targetOrderId ? { ...o, status: 'pending' } : o
          ));
          alert('فشل تنفيذ الطلب على السيرفر، تم التراجع عن التغيير.');
      }
  };

  const handleInitiateCancel = (order: Order) => {
      setCancellationOrder(order);
      setCancellationReason('');
  };

  const handleConfirmCancel = async () => {
      if (!cancellationOrder || isCancelling) return;

      // 1. Capture current state for potential rollback
      const targetOrder = { ...cancellationOrder };
      const targetReason = cancellationReason;

      // 2. Optimistic UI Update: Update everything immediately
      setOrders(prev => prev.map(o => 
         o.id === targetOrder.id ? { ...o, status: 'cancelled', rejectionReason: targetReason } : o 
      ));

      setUsers(prev => prev.map(u => {
          if (u.id === targetOrder.userId) {
              return { ...u, balance: u.balance + targetOrder.amount };
          }
          return u;
      }));

      const refundTx: Transaction = {
          id: generateShortId(),
          title: `استرداد: ${targetOrder.productName}`,
          date: new Date().toLocaleString('en-US'),
          amount: targetOrder.amount,
          type: 'credit',
          status: 'completed',
          icon: RefreshCw
      };
      setTransactions(prev => [refundTx, ...prev]);

      // Close modal immediately
      setCancellationOrder(null);
      setCancellationReason('');

      // 3. Background Processing
      try {
          await orderService.updateStatus(targetOrder.id, {
              status: 'cancelled',
              rejectionReason: targetReason
          });
          
          // Fire and forget notification
          pushService.notifyUserOrderUpdate({
              orderId: targetOrder.id,
              status: 'cancelled',
          }).catch(e => console.warn('Notification failed', e));

      } catch (err: any) {
          console.error('Cancel order failed:', err);
          // Rollback UI on failure
          setOrders(prev => prev.map(o => o.id === targetOrder.id ? { ...o, status: 'pending' } : o));
          setUsers(prev => prev.map(u => u.id === targetOrder.userId ? { ...u, balance: u.balance - targetOrder.amount } : u));
          setTransactions(prev => prev.filter(t => t.id !== refundTx.id));
          
          const errorMsg = err?.response?.data?.message || 'فشل إلغاء الطلب على السيرفر، تم التراجع عن التغييرات.';
          alert(errorMsg);
      }
  };


  // --- Product Logic ---
  const handleSaveProduct = async () => {
    if (!prodForm.name) return;

    // السعر الأساسي اختياري: إذا لم يتم إدخاله، نستخدم أقل سعر من الفئات (denominations) إن وُجدت، وإلا 0
    const formPrice = Number(prodForm.price);
    const hasValidFormPrice = Number.isFinite(formPrice) && formPrice >= 0;

    const collectRegionDenoms = (regions?: Region[]) => {
      if (!Array.isArray(regions) || regions.length === 0) return [] as Denomination[];
      return regions.flatMap(r => Array.isArray(r.denominations) ? r.denominations : []);
    };

    const globalDenomsForPrice = (prodForm.denominations && prodForm.denominations.length > 0)
      ? prodForm.denominations
      : (editingProduct?.denominations || []);

    const regionDenomsForPrice = collectRegionDenoms(
      (prodForm.regions && prodForm.regions.length > 0)
        ? (prodForm.regions as Region[])
        : (editingProduct?.regions || [])
    );

    const denomsForPrice = [...(globalDenomsForPrice || []), ...(regionDenomsForPrice || [])];

    const denomMin = Array.isArray(denomsForPrice) && denomsForPrice.length > 0
      ? denomsForPrice
          .map(d => Number((d as any)?.price))
          .filter(p => Number.isFinite(p) && p >= 0)
          .reduce((min, p) => Math.min(min, p), Number.POSITIVE_INFINITY)
      : Number.POSITIVE_INFINITY;

    const resolvedBasePrice = hasValidFormPrice
      ? formPrice
      : (Number.isFinite(denomMin) ? denomMin : 0);
    
    // Prepare the product object
    const productToSave: Product = editingProduct 
      ? ({ ...editingProduct, ...prodForm, price: hasValidFormPrice ? formPrice : resolvedBasePrice } as Product)
      : {
        id: generateShortId(),
        name: prodForm.name!,
        category: prodForm.category || 'games',
        price: resolvedBasePrice,
        imageColor: prodForm.imageColor || 'from-gray-700 to-gray-900',
        imageUrl: prodForm.imageUrl,
        tag: prodForm.tag,
        description: prodForm.description,
        regions: prodForm.regions || [],
        denominations: prodForm.denominations || [],
        apiConfig: prodForm.apiConfig,
        autoDeliverStock: prodForm.autoDeliverStock || false,
        customInput: prodForm.customInput
      };

// Persist to DB (Admin)
let finalProduct: Product = productToSave;
try {
  if (editingProduct) {
    const { id, ...payload } = productToSave as any;
    const res = await productService.update(editingProduct.id, payload);
    if (res?.data) {
      finalProduct = { ...productToSave, ...res.data, id: res.data.id || productToSave.id } as Product;
    }
  } else {
    const { id, ...payload } = productToSave as any;
    const res = await productService.create(payload);
    if (res?.data) {
      finalProduct = { ...productToSave, ...res.data, id: res.data.id || productToSave.id } as Product;
    }
  }
} catch (err) {
  console.error('Save product failed:', err);
  // Keep local behavior even if API fails
}

    // Save to State
    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === finalProduct.id ? finalProduct : p));
    } else {
      setProducts(prev => [...prev, finalProduct]);
    }

    // --- RETROACTIVE AUTO-DELIVERY LOGIC ---
    if (finalProduct.autoDeliverStock) {
        let tempInventory = [...inventory];
        let ordersUpdated = false;

        const updatedOrders = orders.map(order => {
            if (order.status === 'pending' && order.productName === finalProduct.name) {
                const regionObj = finalProduct.regions?.find(r => r.name === order.regionName);
                const regionId = regionObj?.id;
                // يدعم فئات خاصة لكل نوع (region) + الفئات العامة للمنتج
                const denomId = regionObj?.denominations?.find(d => d.label === order.quantityLabel)?.id
                  || finalProduct.denominations?.find(d => d.label === order.quantityLabel)?.id;

                const stockIndex = tempInventory.findIndex(item =>
                    item.productId === finalProduct.id &&
                    !item.isUsed &&
                    (item.regionId === regionId || (!item.regionId && !regionId) || (!item.regionId && regionId)) &&
                    (item.denominationId === denomId || (!item.denominationId && !denomId) || (!item.denominationId && denomId))
                );

                if (stockIndex !== -1) {
                    tempInventory[stockIndex] = { ...tempInventory[stockIndex], isUsed: true };
                    ordersUpdated = true;
                    return {
                        ...order,
                        status: 'completed' as const, 
                        deliveredCode: tempInventory[stockIndex].code,
                        fulfillmentType: 'stock' as const
                    };
                }
            }
            return order;
        });

        if (ordersUpdated) {
            setOrders(updatedOrders);
            setInventory(tempInventory);
            alert('تم تفعيل التسليم التلقائي وتنفيذ الطلبات المعلقة المتوفرة في المخزون! ✅');
        }
    }
    // --- END RETROACTIVE LOGIC ---

    setShowProductModal(false);
    setEditingProduct(null);
    setActiveProductTab('basic'); // Reset tab
    setProdForm({ 
        name: '', category: 'games', price: 0, tag: '', imageColor: 'from-gray-700 to-gray-900', imageUrl: '', description: '', 
        regions: [], denominations: [], apiConfig: { type: 'manual' }, autoDeliverStock: false,
        customInput: { enabled: false, label: '', placeholder: '', required: false }
    });
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await productService.delete(id);
    } catch (err) {
      console.error('Delete product failed:', err);
    }
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const toggleRegion = (region: Region) => {
      const currentRegions = prodForm.regions || [];
      const exists = currentRegions.find(r => r.id === region.id);
      if (exists) {
          setProdForm({ ...prodForm, regions: currentRegions.filter(r => r.id !== region.id) });
      } else {
          // CLONE the region object so we can modify it independently (e.g. customInput)
          setProdForm({ ...prodForm, regions: [...currentRegions, { ...region }] });
      }
  };

  const addCustomRegion = () => {
    if (!tempRegionName) return;
    const newRegion: Region = {
      id: generateShortId(),
      name: tempRegionName,
      flag: tempRegionFlag || '🌐' // Default icon
    };
    
    // Add to selected regions
    setProdForm({ ...prodForm, regions: [...(prodForm.regions || []), newRegion] });
    setTempRegionName('');
    setTempRegionFlag('');
  };

  const removeRegion = (id: string) => {
      setProdForm({ ...prodForm, regions: (prodForm.regions || []).filter(r => r.id !== id) });
  };

  const updateRegionCustomInput = (regionId: string, inputConfig: CustomInputConfig) => {
      setProdForm(prev => ({
          ...prev,
          regions: prev.regions?.map(r => 
              r.id === regionId ? { ...r, customInput: inputConfig } : r
          )
      }));
  };

  // --- Region-specific Denominations (per product type) ---
  const addRegionDenomination = (regionId: string) => {
      if (!tempRegionDenomLabel || !tempRegionDenomPrice) return;
      const p = parseFloat(tempRegionDenomPrice);
      if (!Number.isFinite(p) || p < 0) return;

      const newDenom: Denomination = {
          id: generateShortId(),
          label: tempRegionDenomLabel,
          price: p
      };

      setProdForm(prev => ({
          ...prev,
          regions: (prev.regions || []).map(r =>
              r.id === regionId
                ? { ...r, denominations: [...(r.denominations || []), newDenom] }
                : r
          )
      }));

      setTempRegionDenomLabel('');
      setTempRegionDenomPrice('');
  };

  // Region Availability Helper
  const updateRegionAvailability = (regionId: string, isAvailable: boolean) => {
    setProdForm(prev => ({
        ...prev,
        regions: prev.regions?.map(r => 
            r.id === regionId ? { ...r, isAvailable: isAvailable } : r
        )
    }));
  };

  // Denomination Availability Helper (Region Specific)
  const updateRegionDenominationAvailability = (regionId: string, denomId: string, isAvailable: boolean) => {
    setProdForm(prev => ({
        ...prev,
        regions: prev.regions?.map(r => 
            r.id === regionId ? { 
                ...r, 
                denominations: r.denominations?.map(d => 
                    d.id === denomId ? { ...d, isAvailable: isAvailable } : d
                )
            } : r
        )
    }));
  };

  const removeRegionDenomination = (regionId: string, denomId: string) => {
      setProdForm(prev => ({
          ...prev,
          regions: (prev.regions || []).map(r =>
              r.id === regionId
                ? { ...r, denominations: (r.denominations || []).filter(d => d.id !== denomId) }
                : r
          )
      }));
  };

  const addDenomination = () => {
      if (!tempDenomLabel || !tempDenomPrice) return;
      const newDenom: Denomination = {
          id: generateShortId(),
          label: tempDenomLabel,
          price: parseFloat(tempDenomPrice)
      };
      setProdForm({ ...prodForm, denominations: [...(prodForm.denominations || []), newDenom] });
      setTempDenomLabel('');
      setTempDenomPrice('');
  };

  const removeDenomination = (id: string) => {
      setProdForm({ ...prodForm, denominations: (prodForm.denominations || []).filter(d => d.id !== id) });
  };

  // --- Inventory Logic ---
  const handleAddInventory = async () => {
      if (!invSelectedProduct || !invNewCodes.trim()) {
          alert('يرجى اختيار المنتج وكتابة الأكواد');
          return;
      }

      const codesArray = invNewCodes.split('\n').filter(code => code.trim() !== '');
      const newEntries: InventoryCode[] = codesArray.map(code => ({
          id: generateShortId(),
          productId: invSelectedProduct,
          regionId: invSelectedRegion || undefined,
          denominationId: invSelectedDenom || undefined,
          code: code.trim(),
          isUsed: false,
          dateAdded: new Date().toLocaleDateString()
      }));

      // Persist to DB (Bulk)
      try {
          await inventoryService.add({
              items: codesArray.map(code => ({
                  productId: invSelectedProduct,
                  regionId: invSelectedRegion || null,
                  denominationId: invSelectedDenom || null,
                  code: code.trim(),
              }))
          });

          // Refresh from server to ensure we have real UUIDs + correct isUsed state
          try {
              const invRes = await inventoryService.getAll();
              const list = invRes?.data || [];
              setInventory(list.map((i: any) => ({
                  id: i.id,
                  productId: i.productId,
                  regionId: i.regionId || undefined,
                  denominationId: i.denominationId || undefined,
                  code: i.code,
                  isUsed: !!i.isUsed,
                  dateAdded: i.createdAt ? new Date(i.createdAt).toLocaleDateString() : new Date().toLocaleDateString()
              })));
          } catch (e) {
              // Fallback to local update if refresh fails
              setInventory(prev => [...prev, ...newEntries]);
          }
      } catch (err) {
          console.error('Add inventory failed:', err);
          // Fallback to local update if API fails
          setInventory(prev => [...prev, ...newEntries]);
      }

      setInvNewCodes('');
      alert(`تم إضافة ${newEntries.length} كود بنجاح`);
  };

  const handleDeleteInventory = async (id: string) => {
      try {
          await inventoryService.delete(id);
      } catch (err) {
          console.error('Delete inventory failed:', err);
      }
      setInventory(prev => prev.filter(i => i.id !== id));
  };

  const getFilteredInventory = () => {
      return inventory.filter(i => {
          // MODIFIED: If no product selected, return EVERYTHING
          if (!invSelectedProduct) return true;

          const matchProd = i.productId === invSelectedProduct;
          // Only filter by region/denom if selected, otherwise show all for product
          const matchRegion = !invSelectedRegion || i.regionId === invSelectedRegion;
          const matchDenom = !invSelectedDenom || i.denominationId === invSelectedDenom;
          return matchProd && matchRegion && matchDenom;
      });
  };

  // Helper for inventory
  const selectedProductObj = products.find(p => p.id === invSelectedProduct);

  // Denominations for inventory UI: supports per-region/type denominations
  const invSelectedRegionObj = selectedProductObj?.regions?.find(r => r.id === invSelectedRegion);
  const invDenomsForUI: Denomination[] = invSelectedRegion
    ? ((invSelectedRegionObj?.denominations && invSelectedRegionObj.denominations.length > 0)
        ? invSelectedRegionObj.denominations
        : (selectedProductObj?.denominations || []))
    : (selectedProductObj?.denominations || []);

  const productHasRegionOnlyDenoms = !!selectedProductObj
    && (selectedProductObj.denominations?.length ? false : true)
    && !!selectedProductObj.regions?.some(r => (r.denominations && r.denominations.length > 0));

  // --- Category Logic ---
  const handleSaveCategory = async () => {
    if (!catForm.name) return;

    // Convert selected icon component -> stored icon id (string) for DB
    const selectedIconId =
      AVAILABLE_ICONS.find(i => i.icon === catForm.icon)?.id || 'gamepad';

    if (editingCategory) {
      try {
        const res = await contentService.updateCategory(editingCategory.id, {
          name: catForm.name,
          icon: selectedIconId,
        });

        const updated = res?.data;
        const updatedIcon =
          AVAILABLE_ICONS.find(i => i.id === (updated?.icon || selectedIconId))?.icon || catForm.icon || Gamepad2;

        setCategories(prev =>
          prev.map(c =>
            c.id === editingCategory.id ? { ...(updated || c), name: catForm.name, icon: updatedIcon } : c
          )
        );
      } catch (err) {
        console.error('Update category failed:', err);
        alert('فشل تعديل الفئة على السيرفر');
      }
    } else {
      try {
        const res = await contentService.createCategory({
          name: catForm.name,
          icon: selectedIconId,
        });

        const created = res?.data;
        if (created) {
          const createdIcon =
            AVAILABLE_ICONS.find(i => i.id === created.icon)?.icon || catForm.icon || Gamepad2;

          // Keep UI format (icon component) while DB stores icon id
          setCategories(prev => [...prev, { ...created, icon: createdIcon }]);
        } else {
          // Fallback to old local behavior if API returned nothing
          const newCat: Category = {
            id: generateShortId(),
            name: catForm.name,
            icon: catForm.icon
          };
          setCategories(prev => [...prev, newCat]);
        }
      } catch (err) {
        console.error('Create category failed:', err);
        // Fallback to old local behavior if API failed
        const newCat: Category = {
          id: generateShortId(),
          name: catForm.name,
          icon: catForm.icon
        };
        setCategories(prev => [...prev, newCat]);
      }
    }

    setShowCategoryModal(false);
    setEditingCategory(null);
    setCatForm({ name: '', icon: Gamepad2 });
  };

  const handleDeleteCategory = async (id: string) => {
    if (id === 'all') {
        alert('لا يمكن حذف الفئة الرئيسية (الجميع)');
        return;
    }

    try {
      await contentService.deleteCategory(String(id));
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Delete category failed:', err);
      alert('فشل حذف الفئة على السيرفر');
    }
  };


  // --- Banner Logic ---
  const handleSaveBanner = async () => {
    if (!bannerForm.imageUrl && !bannerForm.title) {
        alert("يجب إضافة عنوان أو صورة على الأقل");
        return;
    }

    const payload = {
        title: bannerForm.title || '',
        subtitle: bannerForm.subtitle || '',
        desc: bannerForm.desc || '',
        bg: bannerForm.bg || 'from-blue-900 to-indigo-900',
        imageUrl: bannerForm.imageUrl,
        pattern: 'radial-gradient(circle, #ffffff 1px, transparent 1px)'
    };

    try {
        // No update endpoint currently -> Replace (delete then create) when editing
        if (editingBanner) {
            try { await contentService.deleteBanner(editingBanner.id); } catch (e) {}
        }

        const res = await contentService.createBanner(payload);
        const created = res?.data;

        if (created) {
            const createdBanner: Banner = {
                id: created.id,
                title: created.title || '',
                subtitle: created.subtitle || '',
                desc: created.desc || '',
                bg: created.bg || payload.bg,
                imageUrl: created.imageUrl,
                pattern: created.pattern || payload.pattern
            };
            setBanners(prev => [createdBanner, ...prev.filter(b => b.id !== (editingBanner ? editingBanner.id : createdBanner.id))]);
        } else {
            // Fallback to local behavior if API returned nothing
            const fallback: Banner = {
                id: Number(generateShortId()),
                title: payload.title,
                subtitle: payload.subtitle,
                desc: payload.desc,
                bg: payload.bg,
                imageUrl: payload.imageUrl,
                pattern: payload.pattern
            };
            setBanners(prev => [fallback, ...prev.filter(b => b.id !== (editingBanner ? editingBanner.id : fallback.id))]);
        }
    } catch (err) {
        console.error('Save banner failed:', err);
        // Fallback to local behavior if API failed
        if (editingBanner) {
            const updatedBanner: Banner = {
                ...editingBanner,
                title: payload.title,
                subtitle: payload.subtitle,
                desc: payload.desc,
                bg: payload.bg,
                imageUrl: payload.imageUrl,
                pattern: payload.pattern
            };
            setBanners(prev => [updatedBanner, ...prev.filter(b => b.id !== editingBanner.id)]);
        } else {
            const newBanner: Banner = {
                id: Number(generateShortId()),
                title: payload.title,
                subtitle: payload.subtitle,
                desc: payload.desc,
                bg: payload.bg,
                imageUrl: payload.imageUrl,
                pattern: payload.pattern
            };
            setBanners(prev => [newBanner, ...prev]);
        }
    }

    setShowBannerModal(false);
    setEditingBanner(null);
    setBannerForm({ title: '', subtitle: '', desc: '', bg: 'from-blue-900 to-indigo-900', imageUrl: '' });
  };

  const handleEditBanner = (banner: Banner) => {
      setEditingBanner(banner);
      setBannerForm({
          title: banner.title,
          subtitle: banner.subtitle,
          desc: banner.desc,
          bg: banner.bg,
          imageUrl: banner.imageUrl
      });
      setShowBannerModal(true);
  };

  const handleDeleteBanner = async (id: number) => {
      try {
          await contentService.deleteBanner(id);
      } catch (err) {
          console.error('Delete banner failed:', err);
      }
      setBanners(prev => prev.filter(b => b.id !== id));
  };

  // --- User Logic ---
  const handleSearchUser = async () => {
    const q = (searchUserId || '').trim();
    if (!q) return;

    try {
      const res = await userService.search(q);
      const list = Array.isArray(res?.data) ? res.data : [];
      if (list.length === 0) {
        setFoundUser(null);
        alert('لم يتم العثور على مستخدم بهذا البريد أو الـ ID');
        return;
      }

      // If multiple matches (email contains), pick the first and inform admin
      if (list.length > 1) {
        console.warn('Multiple users matched query:', q, list.length);
      }

      // keep global users in sync (optional)
      setUsers(prev => {
        const map = new Map(prev.map(u => [u.id, u]));
        for (const u of list) map.set(u.id, u);
        return Array.from(map.values());
      });

      setFoundUser(list[0]);
    } catch (e) {
      console.error('Search user failed:', e);
      alert('فشل البحث عن المستخدم من السيرفر');
    }
  };

  const handleClearSearch = () => {
      setFoundUser(null);
      setSearchUserId('');
      setAmountToAdd('');
  };
  const handleUpdateBalance = async (type: 'add' | 'deduct') => {
    if (!foundUser) return;
    const val = parseFloat(amountToAdd);
    if (isNaN(val) || val <= 0) return;

    // 1. Capture original balance for rollback
    const originalBal = foundUser.balance;
    const optimisticBal = type === 'add' ? originalBal + val : Math.max(0, originalBal - val);

    // 2. Update UI immediately
    setUsers(prev => prev.map(u => u.id === foundUser.id ? { ...u, balance: optimisticBal } : u));
    setFoundUser({ ...foundUser, balance: optimisticBal });
    setAmountToAdd('');

    // 3. Persist to server in background
    try {
      const res = await userService.updateBalance(foundUser.id, val, type);
      if (res?.data && typeof res.data.balance !== 'undefined') {
        const finalBal = Number(res.data.balance);
        // Sync with server's final calculation
        setUsers(prev => prev.map(u => u.id === foundUser.id ? { ...u, balance: finalBal } : u));
        setFoundUser(prev => prev && prev.id === foundUser.id ? { ...prev, balance: finalBal } : prev);
      }
    } catch (err) {
      console.error('Update balance failed:', err);
      // Rollback UI on failure
      setUsers(prev => prev.map(u => u.id === foundUser.id ? { ...u, balance: originalBal } : u));
      setFoundUser(prev => prev && prev.id === foundUser.id ? { ...prev, balance: originalBal } : prev);
      alert('فشل تحديث الرصيد على السيرفر، تم التراجع عن التغيير.');
    }
  };

  const handleBanUser = async () => {
      if (!foundUser) return;

      let newStatus: 'active' | 'banned' = foundUser.status === 'active' ? 'banned' : 'active';

      try {
          const res = await userService.updateStatus(foundUser.id);
          if (res?.data && res.data.status) {
              newStatus = res.data.status;
          }
      } catch (err) {
          console.error('Update user status failed:', err);
          // Keep local behavior even if API fails
      }

      setUsers(prev => prev.map(u => u.id === foundUser.id ? { ...u, status: newStatus } : u));
      setFoundUser({ ...foundUser, status: newStatus });
      alert(newStatus === 'banned' ? 'تم حظر المستخدم بنجاح' : 'تم رفع الحظر عن المستخدم');
  };

  // --- Announcement Logic ---
  const handleSendAnnouncement = async () => {
      if (!announceMsg || !announceTitle) {
        alert("يرجى تعبئة العنوان ونص الإشعار");
        return;
      }

      const isHome = announceVisibility === 'both' || announceVisibility === 'home';
      const isNotifs = announceVisibility === 'both' || announceVisibility === 'notifications';

      const payload = {
          title: announceTitle,
          message: announceMsg,
          type: announceType,
          date: new Date().toLocaleDateString(),
          isActive: true,
          showOnHome: isHome,
          showInNotifications: isNotifs,
      };

      try {
          // No update endpoint currently -> Replace (delete then create) when editing
          if (editingAnnouncement) {
              try { await contentService.deleteAnnouncement(editingAnnouncement.id); } catch (e) {}
          }

          const res = await contentService.createAnnouncement(payload);
          const created = res?.data;

          if (created) {
              const newAnn: Announcement = {
                  id: created.id,
                  title: created.title,
                  message: created.message,
                  type: created.type,
                  date: created.date || payload.date,
                  isActive: typeof created.isActive === 'boolean' ? created.isActive : true,
                  showOnHome: typeof (created as any).showOnHome === 'boolean' ? (created as any).showOnHome : payload.showOnHome,
                  showInNotifications: typeof (created as any).showInNotifications === 'boolean' ? (created as any).showInNotifications : payload.showInNotifications
              };

              if (editingAnnouncement) {
                  setAnnouncements(prev => [newAnn, ...prev.filter(a => a.id !== editingAnnouncement.id)]);
                  alert('تم تعديل الإشعار بنجاح');
              } else {
                  setAnnouncements(prev => [newAnn, ...prev]);
                  alert('تم إرسال الإشعار للجميع بنجاح');
              }
          } else {
              // Fallback: local behavior
              if (editingAnnouncement) {
                  setAnnouncements(prev => prev.map(a => a.id === editingAnnouncement.id ? {
                      ...a,
                      title: payload.title,
                      message: payload.message,
                      type: payload.type,
                      date: payload.date
                  } : a));
                  alert('تم تعديل الإشعار بنجاح');
              } else {
                  const localAnn: Announcement = {
                      id: generateShortId(),
                      title: payload.title,
                      message: payload.message,
                      type: payload.type,
                      date: payload.date,
                      isActive: true
                  };
                  setAnnouncements(prev => [localAnn, ...prev]);
                  alert('تم إرسال الإشعار للجميع بنجاح');
              }
          }
      } catch (err) {
          console.error('Send announcement failed:', err);
          // Fallback: local behavior
          if (editingAnnouncement) {
              setAnnouncements(prev => prev.map(a => a.id === editingAnnouncement.id ? {
                  ...a,
                  title: payload.title,
                  message: payload.message,
                  type: payload.type,
                  date: payload.date
              } : a));
              alert('تم تعديل الإشعار بنجاح');
          } else {
              const localAnn: Announcement = {
                  id: generateShortId(),
                  title: payload.title,
                  message: payload.message,
                  type: payload.type,
                  date: payload.date,
                  isActive: true
              };
              setAnnouncements(prev => [localAnn, ...prev]);
              alert('تم إرسال الإشعار للجميع بنجاح');
          }
      }

      try {
          await pushService.broadcastAnnouncement({
              title: payload.title,
              message: payload.message,
          });
      } catch (notifyErr) {
          console.warn('Failed to broadcast announcement push', notifyErr);
      }

      // Close Modal and Reset
      setShowAnnouncementModal(false);
      setEditingAnnouncement(null);
      setAnnounceMsg('');
      setAnnounceTitle('');
      setAnnounceType('info');
  };

  const handleEditAnnouncement = (ann: Announcement) => {
      setEditingAnnouncement(ann);
      setAnnounceTitle(ann.title);
      setAnnounceMsg(ann.message);
      setAnnounceType(ann.type as any);

      const onHome = ann.showOnHome !== false;
      const inNotifs = (ann as any).showInNotifications !== false; // backward compatible
      const vis = onHome && inNotifs ? 'both' : (onHome ? 'home' : 'notifications');
      setAnnounceVisibility(vis);

      setShowAnnouncementModal(true);
  };

  const handleDeleteAnnouncement = async (id: string) => {
      try {
          await contentService.deleteAnnouncement(id);
      } catch (err) {
          console.error('Delete announcement failed:', err);
      }
      setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  // --- Currency Logic ---
  const handleUpdateRate = (code: string, newRate: string) => {
      const rate = parseFloat(newRate);
      if (isNaN(rate) || rate <= 0) return;
      
      setCurrencies(prev => prev.map(c => 
          c.code === code ? { ...c, rate: rate } : c
      ));
  };

  const handleResetCurrencies = () => {
      if (confirm('هل أنت متأكد من استعادة الأسعار الافتراضية؟')) {
          setCurrencies(INITIAL_CURRENCIES);
      }
  };

  const loadCurrenciesFromServer = async () => {
      try {
          const res = await settingsService.get('currencies');
          const data = res?.data;
          if (Array.isArray(data)) {
              setCurrencies(data);
              return;
          }
      } catch (e) {
          console.warn('Failed to load currencies from API', e);
      }
      // Fallback: keep current
  };

  const saveCurrenciesToServer = async () => {
      try {
          await settingsService.set('currencies', currencies);
          alert('تم حفظ أسعار العملات على السيرفر ✅');
      } catch (e: any) {
          console.warn('Failed to save currencies to API', e);
          alert(e?.response?.data?.message || 'فشل حفظ أسعار العملات على السيرفر');
      }
  };

  // ============================================================
  // ✅ Load admin-managed general settings (Rate link) once
  // ============================================================
  useEffect(() => {
      (async () => {
          try {
              const res = await settingsService.get('rateAppLink');
              if (typeof res?.data === 'string') {
                  setRateAppLink(res.data);
              }
          } catch (e) {
              console.warn('Failed to load rateAppLink from API', e);
          }
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveRateAppLinkToServer = async () => {
      try {
          await settingsService.set('rateAppLink', rateAppLink || '');
          alert('تم حفظ رابط التقييم على السيرفر ✅');
      } catch (e: any) {
          console.warn('Failed to save rateAppLink to API', e);
          alert(e?.response?.data?.message || 'فشل حفظ رابط التقييم على السيرفر');
      }
  };





  return (
    <div className="min-h-screen bg-[#13141f] pb-24 text-white">
      {/* Header */}
      <div className="p-4 bg-[#1f212e] shadow-md flex items-center justify-between sticky top-0 z-40 border-b border-gray-800">
        <button onClick={() => setView(View.PROFILE)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-yellow-400">لوحة القيادة</span>
            <span className="text-xs bg-yellow-400 text-black px-2 py-0.5 rounded font-mono">PRO</span>
        </h1>
        <button onClick={onLogout} className="flex items-center gap-1 bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/20 text-xs font-bold hover:bg-red-500 hover:text-white transition-colors">
            <LogOut size={14} /> خروج
        </button>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto p-4 gap-2 no-scrollbar border-b border-gray-800 bg-[#13141f]">
        {[
          { id: 'dashboard', label: 'الرئيسية', icon: Activity },
          { id: 'orders', label: 'الطلبات', icon: ClipboardList },
          { id: 'inventory', label: 'المخزون', icon: PackageOpen },
          { id: 'products', label: 'المنتجات', icon: ShoppingBag },
          { id: 'users', label: 'المستخدمين', icon: Users },
          { id: 'categories', label: 'الفئات', icon: Layers },
          { id: 'announcements', label: 'الإشعارات', icon: Bell },
          { id: 'banners', label: 'البانرات', icon: ImageIcon },
          { id: 'currencies', label: 'العملات', icon: CircleDollarSign },
          { id: 'terms', label: 'الشروط', icon: FileText },
          { id: 'privacy', label: 'سياسة الخصوصية', icon: ShieldCheck },
          { id: 'settings', label: 'الإعدادات العامة', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' 
                : 'bg-[#242636] text-gray-400 hover:bg-[#2f3245]'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 animate-fadeIn">
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
            <div className="space-y-6">
                {/* 1. KPI Cards Row */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Revenue */}
                    <div className="bg-[#242636] p-4 rounded-2xl border border-gray-800 relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl -mr-5 -mt-5"></div>
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><DollarSign size={20} /></div>
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                                <TrendingUp size={10} /> Live
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs font-bold mb-1">إجمالي الأرباح</p>
                        <p className="text-2xl font-black text-white dir-ltr text-right group-hover:text-emerald-400 transition-colors">
                            {adminFormatPrice(analytics.totalRevenue)}
                        </p>
                    </div>

                    {/* Orders */}
                    <div className="bg-[#242636] p-4 rounded-2xl border border-gray-800 relative overflow-hidden group hover:border-yellow-500/50 transition-colors">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/5 rounded-full blur-2xl -mr-5 -mt-5"></div>
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><ShoppingCart size={20} /></div>
                            <span className="text-[10px] text-yellow-400 font-bold flex items-center gap-0.5 bg-yellow-500/10 px-1.5 py-0.5 rounded-md">
                                <TrendingUp size={10} /> Real-time
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs font-bold mb-1">الطلبات الكلية</p>
                        <p className="text-2xl font-black text-white dir-ltr text-right group-hover:text-yellow-400 transition-colors">
                            {analytics.totalOrders}
                        </p>
                    </div>

                    {/* Users */}
                    <div className="bg-[#242636] p-4 rounded-2xl border border-gray-800 relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full blur-2xl -mr-5 -mt-5"></div>
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Users size={20} /></div>
                             <span className="text-[10px] text-blue-400 font-bold flex items-center gap-0.5 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                                <Users size={10} /> {analytics.activeUsers} Active
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs font-bold mb-1">المستخدمين</p>
                        <p className="text-2xl font-black text-white dir-ltr text-right group-hover:text-blue-400 transition-colors">
                            {analytics.totalUsers}
                        </p>
                    </div>

                    {/* Products */}
                    <div className="bg-[#242636] p-4 rounded-2xl border border-gray-800 relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/5 rounded-full blur-2xl -mr-5 -mt-5"></div>
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Package size={20} /></div>
                            <span className="text-[10px] text-purple-400 font-bold flex items-center gap-0.5 bg-purple-500/10 px-1.5 py-0.5 rounded-md">
                                <Layers size={10} /> Stock
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs font-bold mb-1">المنتجات</p>
                        <p className="text-2xl font-black text-white dir-ltr text-right group-hover:text-purple-400 transition-colors">
                            {analytics.totalProducts}
                        </p>
                    </div>
                </div>

                {/* 2. Charts Section */}
                <div className="grid grid-cols-1 gap-4">
                    {/* Sales Chart - Dynamic */}
                    <div className="bg-[#242636] p-5 rounded-2xl border border-gray-800">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-bold text-white text-sm flex items-center gap-2"><BarChart3 size={18} className="text-yellow-400" /> تحليل المبيعات</h3>
                                <p className="text-[10px] text-gray-500 mt-0.5">آخر 7 أيام (بيانات حقيقية)</p>
                            </div>
                        </div>
                        <div className="flex items-end justify-between h-32 gap-3 pb-2 border-b border-gray-700/50">
                            {analytics.salesChart.map((data: { day: string; fullDate: string; value: number }, idx: number) => {
                                // Calculate height percentage relative to max value
                                const heightPercent = (data.value / analytics.maxChartValue) * 100;
                                // Minimum height 5% for visibility even if 0
                                const displayHeight = Math.max(heightPercent, 5); 

                                return (
                                    <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end flex-1 group relative">
                                        {/* Tooltip */}
                                        <div className="absolute -top-8 bg-white text-black text-[9px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                            {adminFormatPrice(data.value)}
                                        </div>
                                        
                                        <div className="w-full bg-[#1e1f2b] rounded-t-md relative h-full flex items-end overflow-hidden">
                                            <div 
                                                className={`w-full transition-all duration-500 rounded-t-md ${data.value > 0 ? 'bg-yellow-400/80 group-hover:bg-yellow-400' : 'bg-gray-700/30'}`} 
                                                style={{ height: `${displayHeight}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[8px] text-gray-500 font-bold">{data.day}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Category Distribution - Dynamic */}
                    <div className="bg-[#242636] p-5 rounded-2xl border border-gray-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2"><PieChart size={18} className="text-blue-400" /> توزيع المنتجات</h3>
                        </div>
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                            {analytics.categoryStats.length === 0 ? (
                                <p className="text-center text-gray-500 text-xs py-4">لا توجد منتجات مضافة بعد</p>
                            ) : (
                                analytics.categoryStats.map((cat: { icon?: any; name: string; count: number; percentage: number }, idx: number) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-xs font-bold">
                                            <span className="text-gray-300 flex items-center gap-2">
                                                <cat.icon size={12} className="text-gray-500" /> {cat.name}
                                                <span className="text-[9px] bg-gray-700 px-1 rounded text-gray-400 font-mono">({cat.count})</span>
                                            </span>
                                            <span className="text-white">{cat.percentage}%</span>
                                        </div>
                                        <div className="h-2 bg-[#1e1f2b] rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                                                style={{ width: `${cat.percentage}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Recent Orders Feed */}
                <div className="bg-[#242636] rounded-2xl border border-gray-800 overflow-hidden">
                    <div className="p-4 border-b border-gray-700/50 flex justify-between items-center bg-[#2a2d3e]">
                         <h3 className="font-bold text-white text-sm flex items-center gap-2"><Clock size={16} className="text-orange-400" /> أحدث العمليات</h3>
                         <button onClick={() => setActiveTab('orders')} className="text-[10px] text-blue-400 hover:text-white transition-colors">عرض الكل</button>
                    </div>
                    <div className="divide-y divide-gray-700/50">
                        {recentOrders.length === 0 ? (
                            <p className="text-center text-gray-500 text-xs py-4">لا توجد عمليات حديثة</p>
                        ) : (
                            recentOrders.map((order, idx) => (
                                <div key={idx} className="p-3 flex items-center justify-between hover:bg-[#2a2d3e] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full bg-[#1f212e] flex items-center justify-center border border-gray-700 ${
                                            order.status === 'completed' ? 'text-green-500 border-green-500/30' : 
                                            order.status === 'cancelled' ? 'text-red-500 border-red-500/30' : 'text-yellow-500 border-yellow-500/30'
                                        }`}>
                                            {order.status === 'completed' ? <CheckCircle size={14} /> : order.status === 'cancelled' ? <XCircle size={14} /> : <Clock size={14} />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-white line-clamp-1">{order.item}</p>
                                            <p className="text-[10px] text-gray-500">{order.user} • {order.time}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-white dir-ltr">{order.price}</p>
                                        <p className="text-[9px] text-gray-500 font-mono">{order.id}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
           <div className="space-y-6 animate-fadeIn">
              
              {/* Backdrop for Closing Dropdowns - WITH CORRECT Z-INDEX */}
              {openInvDropdown && (
                  <div className="fixed inset-0 z-[45] cursor-default" onClick={() => setOpenInvDropdown(null)}></div>
              )}

              {/* INCREASED Z-INDEX FOR CONTAINER WHEN OPEN */}
              <div className={`bg-[#242636] p-5 rounded-2xl border border-gray-700 shadow-lg relative ${openInvDropdown ? 'z-[50]' : 'z-20'}`}>
                  <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                     <PackageOpen size={24} className="text-yellow-400" /> إضافة مخزون (أكواد)
                  </h3>
                  
                  {/* Product Selection */}
                  <div className="mb-5 relative z-[50]">
                     <label className="text-xs text-gray-400 font-bold mb-2 block">اختر المنتج</label>
                     <div className="relative">
                        <button
                            type="button"
                            onClick={() => setOpenInvDropdown(openInvDropdown === 'product' ? null : 'product')}
                            className={`w-full bg-[#13141f] border rounded-xl p-4 text-white flex justify-between items-center transition-all duration-300 ${openInvDropdown === 'product' ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-gray-600 hover:border-gray-500'}`}
                        >
                            <span className="font-bold text-sm">{products.find(p => p.id === invSelectedProduct)?.name || '-- اختر المنتج --'}</span>
                            <ToggleLeft size={20} className={`text-gray-500 transition-transform duration-300 ${openInvDropdown === 'product' ? 'rotate-90 text-yellow-400' : 'rotate-270'}`} />
                        </button>
                        
                        {openInvDropdown === 'product' && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1f212e] border border-gray-700 rounded-xl shadow-2xl z-[60] max-h-80 overflow-hidden flex flex-col animate-fadeIn">
                                {/* Product Grid Selection */}
                                <div className="overflow-y-auto flex-1 p-2 grid grid-cols-2 gap-2">
                                    {products.map(p => (
                                        <button 
                                            key={p.id} 
                                            type="button"
                                            className={`
                                                flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all relative overflow-hidden h-24
                                                ${invSelectedProduct === p.id 
                                                    ? 'bg-yellow-400/10 border-yellow-400 text-yellow-400' 
                                                    : 'bg-[#13141f] border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'}
                                            `}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setInvSelectedProduct(p.id);
                                                setInvSelectedRegion('');
                                                setInvSelectedDenom('');
                                                setOpenInvDropdown(null);
                                            }}
                                        >
                                            {/* Background Gradient visual cue */}
                                            <div className={`absolute top-0 right-0 w-8 h-8 rounded-bl-full bg-gradient-to-br ${p.imageColor} opacity-50`}></div>
                                            
                                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.imageColor} flex items-center justify-center shadow-sm`}>
                                                {p.imageUrl ? (
                                                    <img src={p.imageUrl} className="w-full h-full object-cover rounded-lg" alt="" />
                                                ) : (
                                                    <span className="text-[10px] font-bold text-white">{p.name.slice(0,1)}</span>
                                                )}
                                            </div>
                                            <span className="text-xs font-bold text-center line-clamp-1 w-full">{p.name}</span>
                                            
                                            {invSelectedProduct === p.id && (
                                                <div className="absolute top-1 right-1 bg-yellow-400 rounded-full p-0.5">
                                                    <Check size={10} className="text-black" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>
                  </div>

                  {invSelectedProduct && (
                      <div className="flex flex-col gap-5 mb-5 relative z-[48]">
                          {(selectedProductObj?.regions?.length ?? 0) > 0 && (
                             <div className="flex-1 relative">
                                <label className="text-xs text-gray-400 font-bold mb-2 block">نوع المنتج</label>
                                <button
                                    type="button"
                                    onClick={() => setOpenInvDropdown(openInvDropdown === 'region' ? null : 'region')}
                                    className={`w-full bg-[#13141f] border rounded-xl p-4 text-white flex justify-between items-center transition-all duration-300 ${openInvDropdown === 'region' ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-gray-600 hover:border-gray-500'}`}
                                >
                                    <span className="font-bold text-sm">{selectedProductObj?.regions?.find(r => r.id === invSelectedRegion)?.name || '-- الكل --'}</span>
                                    <ToggleLeft size={20} className={`text-gray-500 transition-transform duration-300 ${openInvDropdown === 'region' ? 'rotate-90 text-yellow-400' : 'rotate-270'}`} />
                                </button>
                                
                                {openInvDropdown === 'region' && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1f212e] border border-gray-700 rounded-xl shadow-2xl z-[60] p-2 animate-fadeIn grid grid-cols-2 gap-2">
                                        <button 
                                            type="button"
                                            className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${!invSelectedRegion ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-[#13141f] text-gray-300 border-gray-700'}`}
                                            onClick={(e) => { e.stopPropagation(); setInvSelectedRegion(''); setInvSelectedDenom(''); setOpenInvDropdown(null); }}
                                        >
                                            -- الكل --
                                        </button>
                                        {selectedProductObj?.regions?.map(r => (
                                            <button 
                                                key={r.id}
                                                type="button"
                                                className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${invSelectedRegion === r.id ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-[#13141f] text-gray-300 border-gray-700'}`}
                                                onClick={(e) => { e.stopPropagation(); setInvSelectedRegion(r.id); setInvSelectedDenom(''); setOpenInvDropdown(null); }}
                                            >
                                                <span className="text-lg">{r.flag}</span>
                                                <span>{r.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                             </div>
                          )}

                          {invDenomsForUI.length > 0 ? (
                             <div className="flex-1 relative">
                                <label className="text-xs text-gray-400 font-bold mb-2 block">الكمية/الفئة</label>
                                <button
                                    type="button"
                                    onClick={() => setOpenInvDropdown(openInvDropdown === 'denom' ? null : 'denom')}
                                    className={`w-full bg-[#13141f] border rounded-xl p-4 text-white flex justify-between items-center transition-all duration-300 ${openInvDropdown === 'denom' ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-gray-600 hover:border-gray-500'}`}
                                >
                                    <span className="font-bold text-sm">{invDenomsForUI.find(d => d.id === invSelectedDenom)?.label || '-- الكل --'}</span>
                                    <ToggleLeft size={20} className={`text-gray-500 transition-transform duration-300 ${openInvDropdown === 'denom' ? 'rotate-90 text-yellow-400' : 'rotate-270'}`} />
                                </button>

                                {openInvDropdown === 'denom' && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1f212e] border border-gray-700 rounded-xl shadow-2xl z-[60] p-2 animate-fadeIn grid grid-cols-2 gap-2">
                                        <button 
                                            type="button"
                                            className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${!invSelectedDenom ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-[#13141f] text-gray-300 border-gray-700'}`}
                                            onClick={(e) => { e.stopPropagation(); setInvSelectedDenom(''); setOpenInvDropdown(null); }}
                                        >
                                            -- الكل --
                                        </button>
                                        {invDenomsForUI.map(d => (
                                            <button 
                                                key={d.id}
                                                type="button"
                                                className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 ${invSelectedDenom === d.id ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-[#13141f] text-gray-300 border-gray-700'}`}
                                                onClick={(e) => { e.stopPropagation(); setInvSelectedDenom(d.id); setOpenInvDropdown(null); }}
                                            >
                                                <span>{d.label}</span>
                                                <span className={`text-[10px] font-mono ${invSelectedDenom === d.id ? 'text-black/70' : 'text-yellow-400'}`}>${d.price}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                             </div>
                          ) : (productHasRegionOnlyDenoms && !invSelectedRegion ? (
                             <div className="flex-1">
                                <label className="text-xs text-gray-400 font-bold mb-2 block">الكمية/الفئة</label>
                                <div className="bg-[#13141f] border border-gray-700 rounded-xl p-4 text-[11px] text-gray-500">
                                    اختر نوع المنتج أولاً لعرض الكميات/الفئات الخاصة به.
                                </div>
                             </div>
                          ) : null)}
                      </div>
                  )}

                  <div className="mb-6">
                     <label className="text-xs text-gray-400 font-bold mb-2 block">الأكواد (كود واحد في كل سطر)</label>
                     <textarea 
                        className="w-full bg-[#13141f] border border-gray-600 rounded-xl p-4 text-white focus:border-yellow-400 outline-none min-h-[120px] font-mono text-sm transition-colors"
                        placeholder="AAAA-BBBB-CCCC-DDDD&#10;EEEE-FFFF-GGGG-HHHH"
                        value={invNewCodes}
                        onChange={(e) => setInvNewCodes(e.target.value)}
                     />
                  </div>

                  <button 
                     onClick={handleAddInventory} 
                     className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-colors active:scale-95 transform text-sm"
                  >
                      إضافة للمخزون
                  </button>
              </div>

              <div className="bg-[#242636] p-5 rounded-2xl border border-gray-700">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-white font-bold text-sm">الأكواد المتوفرة {invSelectedProduct && `(${getFilteredInventory().length})`}</h3>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                      {getFilteredInventory().length === 0 ? (
                          <p className="text-gray-500 text-center text-xs py-4">لا توجد أكواد مضافة لهذا الاختيار</p>
                      ) : (
                          getFilteredInventory().map(item => {
                              const prod = products.find(p => p.id === item.productId);
                              const reg = prod?.regions?.find(r => r.id === item.regionId);
                              const denom = reg?.denominations?.find(d => d.id === item.denominationId)
                                || prod?.denominations?.find(d => d.id === item.denominationId);

                              return (
                                  <div key={item.id} className="bg-[#13141f] p-3 rounded-lg border border-gray-700 flex justify-between items-center hover:border-gray-600 transition-colors group">
                                      <div className="flex-1 min-w-0">
                                          {/* Show Product Name clearly */}
                                          <div className="flex items-center gap-2 mb-2">
                                              <div className={`w-5 h-5 rounded bg-gradient-to-br ${prod?.imageColor} flex-shrink-0 flex items-center justify-center overflow-hidden`}>
                                                  {prod?.imageUrl && <img src={prod.imageUrl} className="w-full h-full object-cover" />}
                                              </div>
                                              <span className="text-xs font-bold text-white line-clamp-1">{prod?.name}</span>
                                          </div>

                                          <div className="flex items-center gap-2 mb-1.5">
                                              <p className="text-white font-mono text-xs font-bold select-all truncate bg-[#1e1f2b] px-2 py-1 rounded border border-gray-800 w-fit dir-ltr">{item.code}</p>
                                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${item.isUsed ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                                  {item.isUsed ? 'مستخدم' : 'متاح'}
                                              </span>
                                          </div>

                                          <div className="flex items-center gap-2 flex-wrap">
                                              {reg && (
                                                  <span className="flex items-center gap-1 text-[9px] text-gray-400 bg-[#242636] px-1.5 py-0.5 rounded border border-gray-700">
                                                      <span>{reg.flag}</span>
                                                      <span>{reg.name}</span>
                                                  </span>
                                              )}
                                              {denom && (
                                                  <span className="flex items-center gap-1 text-[9px] text-yellow-500/80 bg-[#242636] px-1.5 py-0.5 rounded border border-gray-700">
                                                      <Tags size={8} />
                                                      <span>{denom.label}</span>
                                                  </span>
                                              )}
                                              <span className="text-[9px] text-gray-600 font-mono flex items-center gap-1">
                                                  <Clock size={8} /> {item.dateAdded}
                                              </span>
                                          </div>
                                      </div>
                                      <button onClick={() => handleDeleteInventory(item.id)} className="text-red-500 hover:text-white hover:bg-red-500 p-2 rounded-lg transition-colors ml-2 flex-shrink-0 opacity-70 group-hover:opacity-100"><Trash2 size={14} /></button>
                                  </div>
                              );
                          })
                      )}
                  </div>
              </div>
           </div>
        )}

        {/* ... ORDERS, PRODUCTS, USERS, ETC ... */}
        {activeTab === 'orders' && (
           /* ... existing orders code ... */
           <div className="space-y-4">
              <div className="bg-[#242636] p-4 rounded-xl border border-gray-700 mb-4 flex gap-2">
                 <div className="relative flex-1">
                    <input 
                        type="text"
                        placeholder="بحث برقم الطلب (مثال: #9001)..."
                        className="w-full bg-[#13141f] border border-gray-600 rounded-xl py-2 pr-10 pl-4 text-white focus:border-yellow-400 outline-none text-sm"
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                    />
                    <Search className="absolute right-3 top-2.5 text-gray-500" size={18} />
                 </div>
                 {orderSearchQuery && (
                    <button onClick={() => setOrderSearchQuery('')} className="bg-gray-700 text-white p-2 rounded-xl">
                        <X size={20} />
                    </button>
                 )}
              </div>

              <div className="flex gap-2 mb-4 bg-[#242636] p-1 rounded-xl w-fit overflow-x-auto no-scrollbar">
                  <button onClick={() => setOrderFilter('all')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${orderFilter === 'all' ? 'bg-yellow-400 text-black' : 'text-gray-400'}`}>الكل</button>
                  <button onClick={() => setOrderFilter('pending')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${orderFilter === 'pending' ? 'bg-yellow-400 text-black' : 'text-gray-400'}`}>قيد الانتظار</button>
                  <button onClick={() => setOrderFilter('completed')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${orderFilter === 'completed' ? 'bg-yellow-400 text-black' : 'text-gray-400'}`}>مكتملة</button>
                  <button onClick={() => setOrderFilter('cancelled')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${orderFilter === 'cancelled' ? 'bg-yellow-400 text-black' : 'text-gray-400'}`}>ملغي</button>
              </div>

              <div className="space-y-3">
                  {ordersRefreshing ? (
                      <div className="text-center py-12 text-gray-500">
                          جاري تحميل الطلبات...
                      </div>
                  ) : filteredOrders.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                          {orderSearchQuery ? 'لا توجد طلبات تطابق بحثك' : 'لا توجد طلبات'}
                      </div>
                  ) : (
                      filteredOrders.map(order => (
                          <div key={order.id} className="bg-[#242636] p-4 rounded-xl border border-gray-700 shadow-sm flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${order.status === 'completed' ? 'bg-green-500/10 border-green-500 text-green-500' : order.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-500' : 'bg-red-500/10 border-red-500 text-red-500'}`}>
                                          {order.status === 'completed' ? <CheckCircle size={20} /> : order.status === 'pending' ? <Clock size={20} /> : <X size={20} />}
                                      </div>
                                      <div>
                                          <h4 className="text-sm font-bold text-white">{order.productName}</h4>
                                          <p className="text-xs text-gray-400 mb-1">{order.userName} • <span className="dir-ltr">{order.id}</span></p>
                                          
                                          {/* Region and Quantity Badges */}
                                          <div className="flex flex-wrap gap-1.5">
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
                                          
                                          {/* NEW: Display Custom Input Value */}
                                          {order.customInputValue && (
                                              <div className="mt-2 text-xs bg-[#13141f] border border-gray-600 rounded px-2 py-1.5 w-fit">
                                                  <span className="text-gray-400 font-bold">{order.customInputLabel || 'معلومات إضافية'}: </span>
                                                  <span className="text-yellow-400 font-mono select-all">{order.customInputValue}</span>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <span className="text-sm font-black text-yellow-400 dir-ltr">${order.amount}</span>
                                      <p className="text-[10px] text-gray-500 mt-1">{order.date}</p>
                                  </div>
                              </div>
                              
                              {order.status === 'completed' && (
                                  <div className="flex flex-wrap gap-2 mt-1">
                                      {order.fulfillmentType === 'stock' && (
                                          <span className="text-[9px] font-bold bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                                              <PackageOpen size={10} /> تسليم تلقائي عبر المخزون
                                          </span>
                                      )}
                                      {order.fulfillmentType === 'manual' && (
                                          <span className="text-[9px] font-bold bg-gray-500/10 text-gray-400 px-2 py-0.5 rounded border border-gray-500/20 flex items-center gap-1">
                                              <CheckSquare size={10} /> تسليم يدوي
                                          </span>
                                      )}
                                      {order.fulfillmentType === 'api' && (
                                          <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                                              <Server size={10} /> تسليم تلقائي عبر API
                                          </span>
                                      )}
                                  </div>
                              )}
                              
                              {order.status === 'pending' && (
                                  <div className="flex gap-2 pt-3 border-t border-gray-700/50 mt-1">
                                      <button 
                                        onClick={() => handleOpenFulfillment(order)}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                                      >
                                          <CheckSquare size={14} /> تنفيذ الطلب
                                      </button>
                                      <button 
                                        onClick={() => handleInitiateCancel(order)}
                                        className="px-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white py-2 rounded-lg text-xs font-bold transition-colors"
                                      >
                                          إلغاء
                                      </button>
                                  </div>
                              )}

                              {order.status === 'completed' && order.deliveredCode && (
                                  <div className="mt-3 bg-[#13141f] p-3 rounded-lg border border-dashed border-gray-700 relative group">
                                      <span className="text-[10px] text-gray-500 font-bold block mb-1">تفاصيل التنفيذ (الكود / الرسالة)</span>
                                      <p className="text-white font-mono text-xs break-all dir-ltr select-all">{order.deliveredCode}</p>
                                      <button 
                                          onClick={() => navigator.clipboard.writeText(order.deliveredCode || '')}
                                          className="absolute top-2 left-2 text-gray-500 hover:text-white"
                                          title="نسخ"
                                      >
                                          <Copy size={14} />
                                      </button>
                                  </div>
                              )}

                              {order.status === 'completed' && (
                                  <div className="flex justify-end mt-2 pt-2 border-t border-gray-700/30">
                                      <button 
                                          onClick={() => setSelectedInvoiceOrder(order)}
                                          className="flex items-center gap-1.5 text-gray-400 hover:text-yellow-400 transition-colors text-xs font-bold px-2 py-1 rounded-lg hover:bg-yellow-400/10"
                                      >
                                          <Receipt size={14} />
                                          عرض الفاتورة
                                      </button>
                                  </div>
                              )}

                              {order.status === 'cancelled' && order.rejectionReason && (
                                  <div className="mt-3 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                                      <span className="text-[10px] text-red-400 font-bold block mb-1 flex items-center gap-1">
                                          <AlertTriangle size={10} /> سبب الإلغاء
                                      </span>
                                      <p className="text-red-100 text-xs">{order.rejectionReason}</p>
                                  </div>
                              )} 
                          </div>
                      ))
                  )}
              </div>

              {ordersHasMore && (
                  <div className="flex justify-center pt-3">
                      <button
                          onClick={() => loadAdminOrdersPage('append')}
                          className="bg-yellow-400 text-black px-6 py-2 rounded-xl font-black hover:opacity-90 transition disabled:opacity-50"
                          disabled={ordersLoadingMore}
                      >
                          {ordersLoadingMore ? 'جاري التحميل...' : 'عرض المزيد'}
                      </button>
                  </div>
              )}
           </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-4">
             <button 
               onClick={() => { setEditingProduct(null); setProdForm({}); setShowProductModal(true); }}
               className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black p-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg hover:shadow-yellow-400/20 transition-all"
             >
               <Plus size={20} /> إضافة منتج جديد
             </button>
             <div className="space-y-3">
               {products.map(p => (
                 <div key={p.id} className="bg-[#242636] p-3 rounded-xl flex items-center gap-3 border border-gray-700 hover:border-gray-500 transition-colors relative">
                    <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${p.imageColor} flex-shrink-0 relative overflow-hidden`}>
                        {p.imageUrl && <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-sm text-white">{p.name}</h4>
                            <span className="text-xs font-mono font-bold text-yellow-400">${p.price}</span>
                        </div>
                        <p className="text-[10px] text-gray-400">{p.category}</p>
                        {p.customInput?.enabled && (
                            <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 inline-flex items-center gap-1 mt-1">
                                <User size={8} /> إدخال مخصص: {p.customInput.label}
                            </span>
                        )}
                    </div>
                    
                    {/* Always visible actions */}
                    <div className="flex flex-col gap-2 pl-2">
                      <button type="button" onClick={() => { setEditingProduct(p); setProdForm(p); setShowProductModal(true); }} className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors border border-blue-500/20">
                          <Edit2 size={16} />
                      </button>
                      <button type="button" onClick={() => handleDeleteProduct(p.id)} className="p-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500 hover:text-white transition-colors border border-red-500/20">
                          <Trash2 size={16} />
                      </button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* ... USERS TAB, ETC (No changes to other tabs) ... */}
        
        {/* USERS TAB */}
        {activeTab === 'users' && (
            <div className="space-y-6 animate-fadeIn">
              {!foundUser ? (
                  // ... search user view ...
                  <div className="bg-[#242636] p-8 rounded-2xl border border-gray-700 flex flex-col items-center justify-center text-center">
                      <div className="w-20 h-20 bg-[#13141f] rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-800">
                          <Search size={40} className="text-gray-600" />
                      </div>
                      <h2 className="text-xl font-bold mb-2 text-white">إدارة المستخدمين</h2>
                      <p className="text-gray-400 text-sm mb-6 max-w-xs">أدخل معرف المستخدم (ID) للوصول إلى ملفه الشخصي وإدارة الرصيد والحظر.</p>
                      
                      <div className="flex w-full max-w-md gap-3">
                          <input 
                              type="text" 
                              placeholder="أدخل ID المستخدم هنا..." 
                              className="flex-1 bg-[#13141f] border border-gray-600 rounded-xl p-4 text-center text-white focus:border-yellow-400 outline-none font-mono text-lg shadow-inner"
                              value={searchUserId}
                              onChange={(e) => setSearchUserId(e.target.value)}
                          />
                          <button onClick={handleSearchUser} className="bg-yellow-400 text-black font-bold px-6 rounded-xl hover:bg-yellow-500 shadow-lg shadow-yellow-400/20">بحث</button>
                      </div>
                      
                      <div className="mt-8 flex gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Users size={12} /> {users.length} مستخدم مسجل</span>
                          <span className="flex items-center gap-1"><Ban size={12} /> {users.filter(u => u.status === 'banned').length} محظور</span>
                      </div>
                  </div>
              ) : (
                  // ... user detail view ...
                  <div className="space-y-4">
                      {/* Top Bar */}
                      <div className="flex items-center justify-between">
                          <button onClick={handleClearSearch} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors bg-[#242636] px-4 py-2 rounded-lg border border-gray-700">
                              <ArrowRight size={18} />
                              <span className="font-bold text-sm">رجوع للبحث</span>
                          </button>
                          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">User Profile</span>
                      </div>

                      {/* 1. Main Profile Card */}
                      <div className="bg-[#242636] rounded-3xl border border-gray-700 overflow-hidden shadow-lg relative">
                           {/* Decorative Banner */}
                           <div className="h-32 w-full bg-gradient-to-br from-blue-900 via-indigo-900 to-[#242636] relative">
                                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                           </div>

                           <div className="px-6 pb-6 relative -mt-12 flex flex-col items-center">
                                {/* Large Avatar with Status Indicator */}
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-[#242636] p-1.5 shadow-xl">
                                        <div className="w-full h-full bg-[#13141f] rounded-full flex items-center justify-center overflow-hidden border border-gray-700">
                                            <User size={48} className="text-gray-500" />
                                        </div>
                                    </div>
                                    <div className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-[#242636] flex items-center justify-center ${foundUser.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}>
                                        {foundUser.status === 'active' ? <CheckCircle size={10} className="text-white" /> : <Ban size={10} className="text-white" />}
                                    </div>
                                </div>

                                {/* Name & ID */}
                                <div className="flex items-center gap-2 mt-3 mb-1">
                                    <h2 className="text-2xl font-black text-white">{foundUser.name}</h2>
                                    <button onClick={() => navigator.clipboard.writeText(foundUser.name)} className="text-gray-500 hover:text-white"><Copy size={16} /></button>
                                </div>
                                
                                <div className="flex items-center gap-2 bg-[#1f212e] px-3 py-1 rounded-full border border-gray-700 mb-6">
                                    <span className="text-gray-400 text-xs">ID:</span>
                                    <span className="text-yellow-400 font-mono font-bold text-sm tracking-widest select-all">{foundUser.id}</span>
                                    <Copy size={12} className="text-gray-600 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(foundUser.id)} />
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                                    {/* Email */}
                                    <div className="bg-[#1e1f2b] p-3 rounded-xl border border-gray-700/50 flex items-start gap-3 group relative hover:border-gray-500 transition-colors">
                                        <div className="bg-blue-500/10 p-2 rounded-lg text-blue-400"><Mail size={16} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-gray-500 font-bold mb-0.5">البريد الإلكتروني</p>
                                            <p className="text-xs text-white font-bold break-all dir-ltr text-left select-all leading-tight">
                                                {foundUser.email}
                                            </p>
                                        </div>
                                        <button onClick={() => navigator.clipboard.writeText(foundUser.email)} className="text-gray-600 hover:text-white p-1 absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy size={14} />
                                        </button>
                                    </div>

                                    {/* Phone */}
                                    <div className="bg-[#1e1f2b] p-3 rounded-xl border border-gray-700/50 flex items-start gap-3 group relative hover:border-gray-500 transition-colors">
                                        <div className="bg-purple-500/10 p-2 rounded-lg text-purple-400"><Phone size={16} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-gray-500 font-bold mb-0.5">رقم الهاتف</p>
                                            <p className="text-xs text-white font-bold dir-ltr text-right select-all">{foundUser.phone}</p>
                                        </div>
                                        <button onClick={() => navigator.clipboard.writeText(foundUser.phone)} className="text-gray-600 hover:text-white p-1 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy size={14} />
                                        </button>
                                    </div>

                                    {/* Joined Date */}
                                    <div className="bg-[#1e1f2b] p-3 rounded-xl border border-gray-700/50 flex items-start gap-3 group relative hover:border-gray-500 transition-colors">
                                        <div className="bg-orange-500/10 p-2 rounded-lg text-orange-400"><Calendar size={16} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-gray-500 font-bold mb-0.5">تاريخ الانضمام</p>
                                            <p className="text-xs text-white font-bold dir-ltr text-right select-all">
                                                {foundUser.createdAt ? new Date(foundUser.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : foundUser.joinedDate}
                                            </p>
                                        </div>
                                        <button onClick={() => navigator.clipboard.writeText(foundUser.createdAt ? new Date(foundUser.createdAt).toLocaleDateString('ar-EG') : foundUser.joinedDate)} className="text-gray-600 hover:text-white p-1 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy size={14} />
                                        </button>
                                    </div>

                                    {/* IP Address */}
                                    <div className="bg-[#1e1f2b] p-3 rounded-xl border border-gray-700/50 flex items-start gap-3 group relative hover:border-gray-500 transition-colors">
                                        <div className="bg-teal-500/10 p-2 rounded-lg text-teal-400"><MapPin size={16} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] text-gray-500 font-bold mb-0.5">العنوان IP</p>
                                            <p className="text-xs text-white font-bold dir-ltr text-left select-all">{foundUser.ip || 'Unknown'}</p>
                                        </div>
                                        <button onClick={() => navigator.clipboard.writeText(foundUser.ip || '')} className="text-gray-600 hover:text-white p-1 absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy size={14} />
                                        </button>
                                    </div>
                                </div>
                           </div>
                      </div>

                      {/* 2. Wallet & Actions Section */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Financial Panel */}
                          <div className="bg-gradient-to-br from-[#1e2029] to-[#13141f] p-6 rounded-3xl border border-gray-700 shadow-xl relative overflow-hidden group">
                               <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/10 transition-colors"></div>
                               
                               <div className="flex justify-between items-start mb-6 relative z-10">
                                   <div>
                                       <h3 className="text-gray-400 text-xs font-bold flex items-center gap-2 mb-1"><Wallet size={14} className="text-emerald-500"/> المحفظة الرقمية</h3>
                                       <p className="text-[10px] text-gray-600">الرصيد الحالي للمستخدم</p>
                                   </div>
                                   <div className="bg-[#242636] p-2 rounded-lg border border-gray-700 text-white">
                                       <DollarSign size={20} />
                                   </div>
                               </div>

                               <div className="text-center py-4 relative z-10">
                                   <span className="text-4xl font-black text-white dir-ltr font-mono tracking-tight">${foundUser.balance.toFixed(2)}</span>
                               </div>

                               <div className="mt-6 pt-6 border-t border-gray-800 relative z-10">
                                   <div className="relative mb-3">
                                        <input 
                                            type="number" 
                                            value={amountToAdd} 
                                            onChange={(e) => setAmountToAdd(e.target.value)} 
                                            placeholder="0.00" 
                                            className="w-full bg-[#000000]/30 border border-gray-700 rounded-xl p-3 text-center text-white font-bold focus:border-yellow-400 outline-none dir-ltr font-mono" 
                                        />
                                   </div>
                                   <div className="flex gap-2">
                                        <button onClick={() => handleUpdateBalance('add')} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/10 transition-all flex justify-center gap-1.5 items-center">
                                            <Plus size={16} /> إيداع
                                        </button>
                                        <button onClick={() => handleUpdateBalance('deduct')} className="flex-1 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-900/30 py-2.5 rounded-xl font-bold text-xs transition-all flex justify-center gap-1.5 items-center">
                                            <Trash2 size={16} /> خصم
                                        </button>
                                   </div>
                               </div>
                          </div>

                          {/* Account Security Panel */}
                          <div className="bg-[#242636] p-6 rounded-3xl border border-gray-700 flex flex-col justify-center items-center text-center">
                               <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${foundUser.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                   <ShieldCheck size={32} />
                               </div>
                               <h3 className="text-white font-bold text-white mb-1">حالة الحساب</h3>
                               <p className="text-xs text-gray-400 mb-6">يمكنك تقييد وصول المستخدم إلى التطبيق مؤقتاً أو نهائياً.</p>

                               <button 
                                  onClick={handleBanUser} 
                                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                                      foundUser.status === 'active' 
                                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20' 
                                      : 'bg-green-500 text-white hover:bg-green-600 shadow-green-500/20'
                                  }`}
                               >
                                  {foundUser.status === 'active' ? <><Ban size={20} /> حظر الحساب</> : <><Unlock size={20} /> رفع الحظر</>}
                               </button>
                          </div>
                      </div>
                  </div>
              )}
           </div>
        )}
        
        {/* CATEGORIES TAB, BANNERS TAB, ETC */}
        {activeTab === 'categories' && (
           <div className="space-y-4">
              <button 
                onClick={() => { setEditingCategory(null); setCatForm({ name: '', icon: Gamepad2 }); setShowCategoryModal(true); }}
                className="w-full bg-[#242636] hover:bg-[#2f3245] border border-gray-700 hover:border-yellow-400 text-white p-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all border-dashed"
              >
                <Plus size={20} className="text-yellow-400" /> إضافة فئة جديدة
              </button>
              {categories.map(c => (
                 <div key={c.id} className="bg-[#242636] p-4 rounded-xl flex items-center justify-between border border-gray-700 group">
                    <div className="flex items-center gap-3">
                       <span className="p-2 bg-[#13141f] rounded-lg text-gray-300 group-hover:text-yellow-400 transition-colors"><c.icon size={20} /></span>
                       <span className="font-bold text-sm">{c.name}</span>
                    </div>
                    {/* EDIT & DELETE ACTIONS */}
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => { setEditingCategory(c); setCatForm({ name: c.name, icon: c.icon }); setShowCategoryModal(true); }}
                            className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                         >
                             <Edit2 size={16} />
                         </button>
                         {c.id !== 'all' && (
                            <button 
                                onClick={() => handleDeleteCategory(c.id)}
                                className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                         )}
                    </div>
                 </div>
              ))}
           </div>
        )}

        {/* BANNERS TAB */}
        {activeTab === 'banners' && (
            <div className="space-y-6">
                <button 
                  onClick={() => { 
                      setEditingBanner(null); 
                      setBannerForm({ title: '', subtitle: '', desc: '', bg: 'from-blue-900 to-indigo-900', imageUrl: '' }); 
                      setShowBannerModal(true); 
                  }} 
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg"
                >
                    <Plus size={20} /> إضافة بانر إعلاني جديد
                </button>
                <div className="space-y-4">
                    {banners.map((banner, index) => (
                        <div key={index} className={`relative h-32 w-full rounded-xl overflow-hidden flex items-center justify-center bg-gradient-to-r ${banner.bg} border border-gray-700`}>
                            {banner.imageUrl && <img src={banner.imageUrl} alt={banner.title} className="absolute inset-0 w-full h-full object-cover z-0" />}
                            <div className="z-10 text-center relative">
                                {banner.imageUrl && (banner.title || banner.subtitle) && <div className="absolute inset-0 bg-black/40 -z-10 blur-xl"></div>}
                                {banner.title && <h3 className="text-xl font-black text-yellow-400 drop-shadow-md">{banner.title}</h3>}
                                {banner.subtitle && <p className="text-white text-sm font-bold drop-shadow-md">{banner.subtitle}</p>}
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="absolute top-2 left-2 flex gap-2 z-20">
                                <button onClick={() => handleEditBanner(banner)} className="bg-blue-600 text-white p-1.5 rounded-lg shadow-md hover:scale-105 transition-transform"><Edit2 size={14} /></button>
                                <button onClick={() => handleDeleteBanner(banner.id)} className="bg-red-600 text-white p-1.5 rounded-lg shadow-md hover:scale-105 transition-transform"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === 'announcements' && (
            <div className="space-y-4 animate-fadeIn">
                <button 
                  onClick={() => {
                      setEditingAnnouncement(null);
                      setAnnounceTitle('');
                      setAnnounceMsg('');
                      setAnnounceType('info');
                      setShowAnnouncementModal(true);
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg"
                >
                    <Plus size={20} /> إضافة إشعار جديد
                </button>

                <div className="space-y-3">
                    {announcements.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 border border-dashed border-gray-700 rounded-xl">
                            <Bell size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">لم يتم إرسال أي إشعارات بعد</p>
                        </div>
                    ) : (
                        announcements.map(ann => (
                            <div key={ann.id} className="bg-[#242636] p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors flex justify-between items-start group">
                                <div className="flex gap-3">
                                    <div className={`mt-1 p-2 rounded-lg h-fit ${
                                        ann.type === 'offer' ? 'bg-yellow-400/10 text-yellow-400' : 
                                        ann.type === 'alert' ? 'bg-red-500/10 text-red-500' : 
                                        ann.type === 'ad' ? 'bg-purple-500/10 text-purple-500' :
                                        'bg-blue-500/10 text-blue-500'
                                    }`}>
                                        {ann.type === 'offer' && <Gift size={18} />}
                                        {ann.type === 'alert' && <AlertTriangle size={18} />}
                                        {ann.type === 'info' && <Info size={18} />}
                                        {ann.type === 'ad' && <Megaphone size={18} />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">{ann.title}</h4>
                                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">{ann.message}</p>
                                        <span className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                                            <Clock size={10} /> {ann.date}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 pl-2">
                                    <button type="button" onClick={() => handleEditAnnouncement(ann)} className="text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 p-2 rounded-lg transition-colors border border-blue-500/20">
                                        <Edit2 size={16} />
                                    </button>
                                    <button type="button" onClick={() => handleDeleteAnnouncement(ann.id)} className="text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 p-2 rounded-lg transition-colors border border-red-500/20">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    {announcementsHasMore && (
                        <div className="flex justify-center pt-2">
                            <button
                              type="button"
                              onClick={onLoadMoreAnnouncements}
                              disabled={announcementsLoadingMore}
                              className="px-4 py-2 text-sm font-bold rounded-lg border border-gray-700 bg-[#1a1c2b] hover:border-yellow-400 hover:text-yellow-300 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                            >
                              {announcementsLoadingMore ? '...جاري التحميل' : 'عرض المزيد من الإشعارات'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* CURRENCIES TAB */}
        {activeTab === 'currencies' && (
            <div className="space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center bg-[#242636] p-4 rounded-xl border border-gray-700">
                    <h3 className="text-white font-bold">أسعار الصرف (مقابل 1 USD)</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={loadCurrenciesFromServer} className="text-[11px] px-3 py-1.5 rounded-lg bg-[#13141f] border border-gray-700 hover:border-yellow-400 transition-colors">تحديث</button>
                        <button onClick={saveCurrenciesToServer} className="text-[11px] px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 transition-colors">حفظ</button>
                        <button onClick={handleResetCurrencies} className="text-xs bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition-colors">استعادة الافتراضي</button>
                    </div>
                </div>
                
                <div className="bg-[#242636] rounded-xl border border-gray-700 overflow-hidden">
                    {currencies.map((currency) => (
                        <div key={currency.code} className="p-4 border-b border-gray-700/50 flex items-center justify-between last:border-0 hover:bg-[#2f3245] transition-colors">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{currency.flag}</span>
                                <div>
                                    <p className="text-sm font-bold text-white">{currency.name}</p>
                                    <p className="text-[10px] text-gray-500 dir-ltr">{currency.code}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-500 text-xs font-bold">=</span>
                                <input 
                                    type="number" 
                                    className="w-24 bg-[#13141f] border border-gray-600 rounded-lg py-1 px-2 text-center text-white text-sm font-bold focus:border-yellow-400 outline-none dir-ltr"
                                    value={currency.rate}
                                    onChange={(e) => handleUpdateRate(currency.code, e.target.value)}
                                    step="0.01"
                                />
                                <span className="text-[10px] text-yellow-400 font-bold w-8 text-center">{currency.symbol}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
            <div className="space-y-6 animate-fadeIn">
                <div className="bg-[#242636] p-5 rounded-2xl border border-gray-700">
                   <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Star className="text-yellow-400" size={20} /> رابط تقييم التطبيق</h3>
                   
                   <div className="space-y-2">
                       <label className="text-xs text-gray-400 font-bold mb-1 block">الرابط (Google Play / App Store)</label>
                       <input 
                         className="w-full bg-[#13141f] border border-gray-600 rounded-xl p-3 text-white focus:border-yellow-400 outline-none dir-ltr text-left transition-colors"
                         value={rateAppLink}
                         onChange={(e) => setRateAppLink(e.target.value)}
                         placeholder="https://play.google.com/store/apps/details?id=..."
                       />
                       <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                           <Info size={12}/>
                           سيتم توجيه المستخدم لهذا الرابط عند الضغط على زر "تقييم التطبيق" في القائمة الجانبية.
                       </p>
                       <div className="mt-3 flex justify-end">
                           <button
                             onClick={saveRateAppLinkToServer}
                             className="text-xs px-4 py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 transition-colors font-bold"
                           >
                             حفظ الرابط على السيرفر
                           </button>
                       </div>

                   </div>
                </div>
            </div>
        )}

        {activeTab === 'terms' && (
          <div className="space-y-6">
             <div className="bg-[#242636] p-5 rounded-2xl border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white flex items-center gap-2"><FileText size={20} className="text-yellow-400" /> تعديل الشروط والأحكام</h3>
                    
                    {/* Language Switcher */}
                    <div className="bg-[#13141f] p-1 rounded-lg flex gap-1">
                        <button 
                            onClick={() => setTermsLang('ar')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${termsLang === 'ar' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            العربية
                        </button>
                        <button 
                            onClick={() => setTermsLang('en')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${termsLang === 'en' ? 'bg-yellow-400 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            English
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold block text-right">
                        {termsLang === 'ar' ? 'نص الشروط (بالعربية)' : 'Terms Content (English)'}
                    </label>
                    
                    <textarea 
                        className={`w-full bg-[#13141f] p-4 rounded-xl text-sm text-gray-300 min-h-[400px] border border-gray-700 focus:border-yellow-400 outline-none leading-relaxed font-mono ${termsLang === 'ar' ? 'text-right' : 'text-left dir-ltr'}`}
                        value={termsLang === 'ar' ? terms.contentAr : terms.contentEn}
                        onChange={(e) => {
                            if (termsLang === 'ar') {
                                setTerms({ ...terms, contentAr: e.target.value });
                            } else {
                                setTerms({ ...terms, contentEn: e.target.value });
                            }
                        }}
                        spellCheck={false}
                    />
                </div>

                <button
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold mt-6 shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleSaveTerms}
                    disabled={isSavingTerms}
                >
                    {isSavingTerms ? (<><RefreshCw size={18} className="animate-spin" /> جارِ الحفظ...</>) : (<><Save size={18} /> حفظ التعديلات</>)}
                </button>
             </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
             <div className="bg-[#242636] p-5 rounded-2xl border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white flex items-center gap-2"><ShieldCheck size={20} className="text-blue-400" /> تعديل سياسة الخصوصية</h3>
                    
                    {/* Language Switcher */}
                    <div className="bg-[#13141f] p-1 rounded-lg flex gap-1">
                        <button 
                            onClick={() => setPrivacyLang('ar')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${privacyLang === 'ar' ? 'bg-blue-400 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            العربية
                        </button>
                        <button 
                            onClick={() => setPrivacyLang('en')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${privacyLang === 'en' ? 'bg-blue-400 text-black' : 'text-gray-400 hover:text-white'}`}
                        >
                            English
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-gray-400 font-bold block text-right">
                        {privacyLang === 'ar' ? 'نص سياسة الخصوصية (بالعربية)' : 'Privacy Policy Content (English)'}
                    </label>
                    
                    <textarea 
                        className={`w-full bg-[#13141f] p-4 rounded-xl text-sm text-gray-300 min-h-[400px] border border-gray-700 focus:border-blue-400 outline-none leading-relaxed font-mono ${privacyLang === 'ar' ? 'text-right' : 'text-left dir-ltr'}`}
                        value={privacyLang === 'ar' ? privacy.contentAr : privacy.contentEn}
                        onChange={(e) => {
                            if (privacyLang === 'ar') {
                                setPrivacy({ ...privacy, contentAr: e.target.value });
                            } else {
                                setPrivacy({ ...privacy, contentEn: e.target.value });
                            }
                        }}
                        spellCheck={false}
                    />
                </div>

                <button
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold mt-6 shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleSavePrivacy}
                    disabled={isSavingPrivacy}
                >
                    {isSavingPrivacy ? (<><RefreshCw size={18} className="animate-spin" /> جارِ الحفظ...</>) : (<><Save size={18} /> حفظ التعديلات</>)}
                </button>
             </div>
          </div>
        )}

      </div>

      {/* --- ADDED MISSING MODALS HERE --- */}

      {/* Fulfillment Modal */}
      {fulfillmentOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
           <div className="bg-[#1f212e] w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl">
               <h2 className="text-xl font-bold text-white mb-2">تنفيذ الطلب يدويًا</h2>
               <p className="text-gray-400 text-xs mb-4">
                   المنتج: <span className="text-white font-bold">{fulfillmentOrder.productName}</span>
               </p>
               
               <div className="mb-4">
                   <label className="text-xs text-gray-400 font-bold mb-2 block">كود الشحن / رسالة التسليم</label>
                   <textarea 
                       className="w-full bg-[#13141f] border border-gray-600 rounded-xl p-3 text-white focus:border-yellow-400 outline-none h-32 font-mono text-sm"
                       placeholder="XXXX-XXXX-XXXX-XXXX"
                       value={fulfillmentCode}
                       onChange={(e) => setFulfillmentCode(e.target.value)}
                   />
               </div>

               <div className="flex gap-3">
                   <button onClick={() => setFulfillmentOrder(null)} className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-bold">إلغاء</button>
                   <button 
    onClick={handleCompleteOrder} 
    disabled={isCancelling}
    className={`flex-[2] py-3 rounded-xl font-bold shadow-lg transition-all ${
        isCancelling 
        ? 'bg-emerald-800 text-emerald-400 cursor-not-allowed' 
        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
    }`}
>
    {isCancelling ? 'جاري التنفيذ...' : 'تأكيد وإرسال'}
</button>
               </div>
           </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellationOrder && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-[#1f212e] w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl">
                  <h2 className="text-xl font-bold text-white mb-2 text-red-500 flex items-center gap-2">
                      <AlertTriangle size={24} /> إلغاء الطلب
                  </h2>
                  <p className="text-gray-400 text-xs mb-4">
                      أنت على وشك إلغاء الطلب: <span className="text-white font-bold">{cancellationOrder.id}</span>
                  </p>
                  
                  <div className="mb-4">
                      <label className="text-xs text-gray-400 font-bold mb-2 block">سبب الرفض (يظهر للمستخدم)</label>
                      <textarea 
                          className="w-full bg-[#13141f] border border-gray-600 rounded-xl p-3 text-white focus:border-red-500 outline-none h-24 text-sm"
                          placeholder="مثال: البيانات غير صحيحة، نفذت الكمية..."
                          value={cancellationReason}
                          onChange={(e) => setCancellationReason(e.target.value)}
                      />
                  </div>

                  <div className="flex gap-3">
                      <button 
                        onClick={() => setCancellationOrder(null)} 
                        disabled={isCancelling}
                        className={`flex-1 py-3 rounded-xl font-bold ${isCancelling ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-700 text-white'}`}
                      >
                        تراجع
                      </button>
                      <button 
                        onClick={handleConfirmCancel} 
                        disabled={isCancelling}
                        className={`flex-[2] py-3 rounded-xl font-bold shadow-lg transition-all ${
                            isCancelling 
                            ? 'bg-red-900 text-red-400 cursor-not-allowed' 
                            : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                        }`}
                      >
                        {isCancelling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
             <div className="bg-[#1f212e] w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl">
                 <h2 className="text-xl font-bold text-white mb-4">{editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</h2>
                 
                 <div className="space-y-4">
                     <div>
                         <label className="text-xs text-gray-400 font-bold mb-1.5 block">اسم الفئة</label>
                         <input 
                             className="w-full bg-[#13141f] border border-gray-600 rounded-xl p-3 text-white focus:border-yellow-400 outline-none" 
                             value={catForm.name} 
                             onChange={e => setCatForm({...catForm, name: e.target.value})} 
                         />
                     </div>

                     <div>
                         <label className="text-xs text-gray-400 font-bold mb-1.5 block">الأيقونة</label>
                         <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar bg-[#13141f] p-2 rounded-xl border border-gray-700">
                             {AVAILABLE_ICONS.map(item => (
                                 <button
                                     key={item.id}
                                     onClick={() => setCatForm({...catForm, icon: item.icon})}
                                     className={`p-2 rounded-lg flex items-center justify-center transition-all ${catForm.icon === item.icon ? 'bg-yellow-400 text-black shadow-lg' : 'text-gray-400 hover:bg-[#242636] hover:text-white'}`}
                                     title={item.label}
                                 >
                                     <item.icon size={18} />
                                 </button>
                             ))}
                         </div>
                     </div>

                     <button onClick={handleSaveCategory} className="w-full bg-yellow-400 text-black font-bold py-3.5 rounded-xl mt-2">
                         {editingCategory ? 'حفظ التغييرات' : 'إضافة الفئة'}
                     </button>
                     <button onClick={() => setShowCategoryModal(false)} className="w-full bg-gray-700 text-white font-bold py-3.5 rounded-xl">إلغاء</button>
                 </div>
             </div>
          </div>
      )}

      {showAnnouncementModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
              <div className="bg-[#1f212e] w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                          <Megaphone size={20} className="text-yellow-400" />
                          {editingAnnouncement ? 'تعديل الإشعار' : 'إشعار جديد'}
                      </h2>
                      <button onClick={() => setShowAnnouncementModal(false)} className="bg-[#242636] p-2 rounded-full text-gray-400 hover:text-white border border-gray-700"><X size={18}/></button>
                  </div>

                  <div className="space-y-4">
                      {/* Type Selector */}
                      <div>
                          <label className="text-xs text-gray-400 font-bold mb-2 block">نوع الإشعار</label>
                          <div className="flex gap-2">
                              {[
                                  { id: 'info', label: 'معلومة', icon: Info, color: 'bg-blue-500' },
                                  { id: 'offer', label: 'عرض', icon: Gift, color: 'bg-yellow-400' },
                                  { id: 'alert', label: 'تنبيه', icon: AlertTriangle, color: 'bg-red-500' },
                                  { id: 'ad', label: 'إعلان', icon: Megaphone, color: 'bg-purple-500' },
                              ].map(type => (
                                  <button
                                      key={type.id}
                                      onClick={() => setAnnounceType(type.id as any)}
                                      className={`flex-1 flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all border ${
                                          announceType === type.id 
                                          ? `border-${type.color.replace('bg-', '')} bg-[#13141f] shadow-inner` 
                                          : 'border-transparent bg-[#242636] hover:bg-[#2f3245]'
                                      }`}
                                  >
                                      <type.icon size={16} className={announceType === type.id ? 'text-white' : 'text-gray-400'} />
                                      <span className={`text-[9px] font-bold ${announceType === type.id ? 'text-white' : 'text-gray-500'}`}>{type.label}</span>
                                  </button>
                              ))}
                          </div>
                      </div>


                      {/* Visibility Selector */}
                      <div>
                          <label className="text-xs text-gray-400 font-bold mb-2 block">مكان ظهور الإشعار</label>
                          <div className="grid grid-cols-3 gap-2">
                              <button
                                  type="button"
                                  onClick={() => setAnnounceVisibility('notifications')}
                                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                      announceVisibility === 'notifications'
                                          ? 'bg-yellow-400 text-black border-yellow-400'
                                          : 'bg-[#13141f] text-gray-300 border-gray-700 hover:bg-[#242636]'
                                  }`}
                              >
                                  داخل الإشعارات
                              </button>
                              <button
                                  type="button"
                                  onClick={() => setAnnounceVisibility('home')}
                                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                      announceVisibility === 'home'
                                          ? 'bg-yellow-400 text-black border-yellow-400'
                                          : 'bg-[#13141f] text-gray-300 border-gray-700 hover:bg-[#242636]'
                                  }`}
                              >
                                  في الواجهة
                              </button>
                              <button
                                  type="button"
                                  onClick={() => setAnnounceVisibility('both')}
                                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                                      announceVisibility === 'both'
                                          ? 'bg-yellow-400 text-black border-yellow-400'
                                          : 'bg-[#13141f] text-gray-300 border-gray-700 hover:bg-[#242636]'
                                  }`}
                              >
                                  الاثنين
                              </button>
                          </div>
                      </div>


                      <div>
                          <label className="text-xs text-gray-400 font-bold mb-1.5 block">العنوان</label>
                          <input 
                              className="w-full bg-[#13141f] border border-gray-600 rounded-xl p-3 text-white focus:border-yellow-400 outline-none transition-colors" 
                              placeholder="مثال: خصم خاص" 
                              value={announceTitle} 
                              onChange={e => setAnnounceTitle(e.target.value)} 
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 font-bold mb-1.5 block">الرسالة</label>
                          <textarea 
                              className="w-full bg-[#13141f] border border-gray-600 rounded-xl p-3 text-white focus:border-yellow-400 outline-none min-h-[80px] resize-none transition-colors text-sm" 
                              placeholder="تفاصيل الإشعار..." 
                              value={announceMsg} 
                              onChange={e => setAnnounceMsg(e.target.value)} 
                          />
                      </div>

                      <button onClick={handleSendAnnouncement} className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3.5 rounded-xl shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 transition-all active:scale-95 mt-2">
                          {editingAnnouncement ? <Save size={18} /> : <Send size={18} />}
                          {editingAnnouncement ? 'حفظ التعديلات' : 'إرسال'}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Banner Modal */}
      {showBannerModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="bg-[#1f212e] w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4">{editingBanner ? 'تعديل البانر' : 'إضافة بانر جديد'}</h2>
                <div className="mb-4">
                  <label className="text-xs text-gray-400 font-bold mb-1 block">رابط الصورة (URL) - اختياري</label>
                  <input className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white focus:border-yellow-400 outline-none text-left dir-ltr" placeholder="https://example.com/banner.jpg" value={bannerForm.imageUrl || ''} onChange={e => setBannerForm({...bannerForm, imageUrl: e.target.value})} />
                  <p className="text-[10px] text-gray-500 mt-1">إذا وضعت صورة، ستظهر بدلاً من الخلفية الملونة.</p>
                </div>
                <div className="border-t border-gray-700/50 my-4"></div>
                <input className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white mb-3 focus:border-yellow-400 outline-none" placeholder="العنوان الرئيسي (اختياري مع الصورة)" value={bannerForm.title} onChange={e => setBannerForm({...bannerForm, title: e.target.value})} />
                <input className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white mb-3 focus:border-yellow-400 outline-none" placeholder="العنوان الفرعي" value={bannerForm.subtitle} onChange={e => setBannerForm({...bannerForm, subtitle: e.target.value})} />
                <input className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white mb-3 focus:border-yellow-400 outline-none" placeholder="الوصف" value={bannerForm.desc} onChange={e => setBannerForm({...bannerForm, desc: e.target.value})} />
                <div className="flex gap-2 mt-4">
                    <button onClick={() => setShowBannerModal(false)} className="flex-1 bg-gray-700 text-white py-3 rounded-xl font-bold">إلغاء</button>
                    <button onClick={handleSaveBanner} className="flex-1 bg-yellow-400 text-black py-3 rounded-xl font-bold">حفظ</button>
                </div>
            </div>
          </div>
      )}

      {/* --- REFACTORED PRODUCT MODAL --- */}
      {showProductModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
           <div className="bg-[#1f212e] w-full max-w-lg rounded-2xl border border-gray-700 max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              
              {/* Modal Header */}
              <div className="flex justify-between items-center p-5 border-b border-gray-800 bg-[#242636]">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {editingProduct ? <Edit2 size={20} className="text-yellow-400" /> : <Plus size={20} className="text-yellow-400" />}
                    {editingProduct ? 'تعديل منتج' : 'إضافة منتج جديد'}
                 </h2>
                 <button onClick={() => setShowProductModal(false)} className="bg-[#1f212e] p-2 rounded-full text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors"><X size={20}/></button>
              </div>

              {/* Tabs */}
              <div className="flex bg-[#13141f] border-b border-gray-800 p-2 gap-1 overflow-x-auto no-scrollbar">
                  {[
                      { id: 'basic', label: 'الأساسية', icon: FileText },
                      { id: 'details', label: 'التفاصيل', icon: ImageIcon },
                      { id: 'variants', label: 'الخيارات', icon: Layers },
                      { id: 'automation', label: 'الأتمتة', icon: Zap }
                  ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveProductTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                            activeProductTab === tab.id 
                            ? 'bg-yellow-400 text-black shadow-md' 
                            : 'text-gray-400 hover:bg-[#242636] hover:text-gray-200'
                        }`}
                      >
                          <tab.icon size={14} />
                          {tab.label}
                      </button>
                  ))}
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#1f212e]">
                 
                 {/* TAB 1: BASIC INFO */}
                 {activeProductTab === 'basic' && (
                     <div className="space-y-4 animate-fadeIn">
                        <div>
                            <label className="text-xs text-gray-400 mb-1.5 block font-bold">اسم المنتج</label>
                            <input className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white focus:border-yellow-400 outline-none transition-colors" placeholder="مثال: شحن شدات ببجي" value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} />
                        </div>
                        
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-400 mb-1.5 block font-bold">السعر الأساسي ($) <span className="text-[10px] text-gray-500">(اختياري)</span></label>
                                <div className="relative">
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white focus:border-yellow-400 outline-none transition-colors pl-8"
                                      value={prodForm.price ?? ''}
                                      onChange={e => {
                                        const v = e.target.value;
                                        setProdForm({
                                          ...prodForm,
                                          price: v === '' ? undefined : parseFloat(v)
                                        });
                                      }}
                                    />
                                    <span className="absolute left-3 top-3.5 text-gray-500 font-mono">$</span>
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-400 mb-1.5 block font-bold">الشعار (Tag)</label>
                                <input className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white focus:border-yellow-400 outline-none transition-colors" placeholder="جديد، عرض.." value={prodForm.tag || ''} onChange={e => setProdForm({...prodForm, tag: e.target.value})} />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 mb-1.5 block font-bold">الفئة</label>
                            <div className="relative">
                                <select className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white focus:border-yellow-400 outline-none appearance-none transition-colors" value={prodForm.category} onChange={e => setProdForm({...prodForm, category: e.target.value})}>
                                    {categories.map(c => <option key={c.id} value={c.id === 'all' ? 'games' : c.id}>{c.name}</option>)}
                                </select>
                                <div className="absolute left-3 top-3.5 text-gray-500 pointer-events-none">
                                    <LayoutGrid size={16} />
                                </div>
                            </div>
                        </div>
                     </div>
                 )}

                 {/* TAB 2: DETAILS & VISUALS */}
                 {activeProductTab === 'details' && (
                     <div className="space-y-4 animate-fadeIn">
                        <div>
                            <label className="text-xs text-gray-400 mb-1.5 block font-bold">رابط الصورة (URL)</label>
                            <div className="flex gap-3">
                                <input className="flex-1 bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white text-left dir-ltr focus:border-yellow-400 outline-none transition-colors" placeholder="https://..." value={prodForm.imageUrl || ''} onChange={e => setProdForm({...prodForm, imageUrl: e.target.value})} />
                                <div className="w-12 h-12 bg-[#13141f] rounded-xl border border-gray-700 flex items-center justify-center overflow-hidden">
                                    {prodForm.imageUrl ? <img src={prodForm.imageUrl} className="w-full h-full object-cover" alt="Preview" /> : <ImageIcon size={20} className="text-gray-600"/>}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-400 mb-1.5 block font-bold">وصف المنتج (يظهر تحت الاسم)</label>
                            <textarea 
                                className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white focus:border-yellow-400 outline-none h-32 resize-none transition-colors text-sm leading-relaxed" 
                                value={prodForm.description || ''} 
                                onChange={e => setProdForm({...prodForm, description: e.target.value})}
                                placeholder="اكتب وصفاً جذاباً للمنتج..."
                            />
                        </div>

                        {/* Custom Input Configuration */}
                        <div className="bg-[#242636] p-4 rounded-xl border border-gray-700 mt-4">
                            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-700">
                                <h3 className="font-bold text-white text-sm flex items-center gap-2"><User size={16} className="text-blue-400"/> حقل إدخال مخصص (عام)</h3>
                                <button 
                                    type="button"
                                    onClick={() => setProdForm({
                                        ...prodForm, 
                                        customInput: { 
                                            enabled: !prodForm.customInput?.enabled, 
                                            label: prodForm.customInput?.label || '',
                                            placeholder: prodForm.customInput?.placeholder || '',
                                            required: prodForm.customInput?.required || false 
                                        } 
                                    })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${prodForm.customInput?.enabled ? 'bg-yellow-400' : 'bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${prodForm.customInput?.enabled ? 'translate-x-1' : 'translate-x-5'}`} />
                                </button>
                            </div>
                            
                            {prodForm.customInput?.enabled && (
                                <div className="space-y-3 animate-fadeIn">
                                    <div>
                                        <label className="text-[10px] text-gray-400 mb-1 block">عنوان الحقل</label>
                                        <input 
                                            className="w-full bg-[#13141f] p-2 rounded-lg border border-gray-600 text-white text-xs" 
                                            placeholder="مثال: رابط الحساب، ID اللعبة..." 
                                            value={prodForm.customInput.label}
                                            onChange={e => setProdForm({...prodForm, customInput: { ...prodForm.customInput!, label: e.target.value }})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 mb-1 block">نص توضيحي (Placeholder)</label>
                                        <input 
                                            className="w-full bg-[#13141f] p-2 rounded-lg border border-gray-600 text-white text-xs" 
                                            placeholder="مثال: انسخ الرابط هنا" 
                                            value={prodForm.customInput.placeholder}
                                            onChange={e => setProdForm({...prodForm, customInput: { ...prodForm.customInput!, placeholder: e.target.value }})}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="checkbox" 
                                            id="req_field"
                                            className="w-4 h-4 rounded bg-[#13141f] border-gray-600 text-yellow-400 focus:ring-0"
                                            checked={prodForm.customInput.required}
                                            onChange={e => setProdForm({...prodForm, customInput: { ...prodForm.customInput!, required: e.target.checked }})}
                                        />
                                        <label htmlFor="req_field" className="text-xs text-gray-300 select-none">الحقل مطلوب (إجباري)</label>
                                    </div>
                                </div>
                            )}
                        </div>
                     </div>
                 )}

                 {/* TAB 3: VARIANTS (REGIONS & DENOMINATIONS) */}
                 {activeProductTab === 'variants' && (
                     <div className="space-y-6 animate-fadeIn">
                        
                        {/* Regions Section */}
                        <div className="bg-[#242636] p-4 rounded-xl border border-gray-700">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2 pb-2 border-b border-gray-700"><Flag size={14} className="text-blue-400"/> نوع المنتج</h3>
                            
                            {/* Region Selection */}
                            <div className="flex flex-wrap gap-2 mb-4">
                                {PREDEFINED_REGIONS.map(region => {
                                    const isSelected = prodForm.regions?.some(r => r.id === region.id);
                                    return (
                                        <button 
                                            key={region.id}
                                            onClick={() => toggleRegion(region)}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${isSelected ? 'bg-blue-600/20 text-blue-400 border-blue-500' : 'bg-[#13141f] text-gray-400 border-gray-700 hover:border-gray-600'}`}
                                        >
                                            <span>{region.flag}</span>
                                            {region.name}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Add Custom Region Input */}
                            <div className="flex items-center bg-[#13141f] rounded-xl border border-gray-700 p-1 mb-4">
                                <input className="flex-[2] bg-transparent p-2 text-white text-xs outline-none" placeholder="نوع مخصص..." value={tempRegionName} onChange={e => setTempRegionName(e.target.value)} />
                                <div className="w-[1px] h-6 bg-gray-700"></div>
                                <input className="flex-1 bg-transparent p-2 text-white text-xs outline-none text-center" placeholder="الرمز 🇪🇺" value={tempRegionFlag} onChange={e => setTempRegionFlag(e.target.value)} />
                                <button onClick={addCustomRegion} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-500 m-0.5"><Plus size={14} /></button>
                            </div>

                            {/* Active Product Types List with Config */}
                            {prodForm.regions && prodForm.regions.length > 0 && (
                                <div className="space-y-2 border-t border-gray-700 pt-3">
                                    <h4 className="text-xs text-gray-400 font-bold mb-2">تخصيص الحقول حسب نوع المنتج</h4>
                                    {prodForm.regions.map(r => (
                                        <div key={r.id} className="bg-[#1f212e] border border-gray-700 rounded-xl p-3">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{r.flag}</span>
                                                    <span className="text-xs font-bold text-white">{r.name}</span>
                                                    {r.customInput?.enabled && (
                                                        <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 rounded border border-blue-500/20">
                                                            حقل مخصص
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => setEditingRegionCustomInput(editingRegionCustomInput === r.id ? null : r.id)}
                                                        className={`p-1.5 rounded-lg transition-colors border ${editingRegionCustomInput === r.id ? 'bg-yellow-400 text-black border-yellow-400' : 'bg-[#242636] text-gray-400 border-gray-600 hover:text-white'}`}
                                                    >
                                                        <Settings2 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => updateRegionAvailability(r.id, r.isAvailable !== false ? false : true)}
                                                        className={`p-1.5 rounded-lg transition-colors border ${r.isAvailable !== false ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                                                        title={r.isAvailable !== false ? 'تعطيل توفر هذا النوع' : 'تفعيل توفر هذا النوع'}
                                                    >
                                                        {r.isAvailable !== false ? <CheckSquare size={14} /> : <XCircle size={14} />}
                                                    </button>
                                                    <button 
                                                        onClick={() => removeRegion(r.id)}
                                                        className="p-1.5 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Expandable Config for Region */}
                                            {editingRegionCustomInput === r.id && (
                                                <div className="mt-3 pt-3 border-t border-gray-700 space-y-3 animate-fadeIn">
                                                    <div className="flex justify-between items-center">
                                                        <label className="text-[10px] text-gray-400 font-bold">تفعيل الحقل المخصص لهذا النوع</label>
                                                        <button 
                                                            type="button"
                                                            onClick={() => updateRegionCustomInput(r.id, {
                                                                enabled: !(r.customInput?.enabled),
                                                                label: r.customInput?.label || '',
                                                                placeholder: r.customInput?.placeholder || '',
                                                                required: r.customInput?.required || false
                                                            })}
                                                            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${r.customInput?.enabled ? 'bg-blue-500' : 'bg-gray-600'}`}
                                                        >
                                                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${r.customInput?.enabled ? 'translate-x-1' : 'translate-x-4.5'}`} />
                                                        </button>
                                                    </div>

                                                    {r.customInput?.enabled && (
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <input 
                                                                    className="w-full bg-[#13141f] p-2 rounded-lg border border-gray-600 text-white text-[10px]" 
                                                                    placeholder="العنوان (مثال: Player ID)" 
                                                                    value={r.customInput.label}
                                                                    onChange={e => updateRegionCustomInput(r.id, { ...r.customInput!, label: e.target.value })}
                                                                />
                                                            </div>
                                                            <div>
                                                                <input 
                                                                    className="w-full bg-[#13141f] p-2 rounded-lg border border-gray-600 text-white text-[10px]" 
                                                                    placeholder="توضيح (Placeholder)" 
                                                                    value={r.customInput.placeholder}
                                                                    onChange={e => updateRegionCustomInput(r.id, { ...r.customInput!, placeholder: e.target.value })}
                                                                />
                                                            </div>
                                                            <div className="col-span-2 flex items-center gap-2 mt-1">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="w-3.5 h-3.5 rounded bg-[#13141f] border-gray-600 text-blue-500"
                                                                    checked={r.customInput.required}
                                                                    onChange={e => updateRegionCustomInput(r.id, { ...r.customInput!, required: e.target.checked })}
                                                                />
                                                                <label className="text-[10px] text-gray-300">مطلوب (إجباري)</label>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Region-specific Denominations */}
                                                    <div className="pt-3 border-t border-gray-700/60 space-y-2">
                                                        <div className="flex justify-between items-center">
                                                            <h5 className="text-[10px] text-gray-400 font-bold">الكميات / الفئات لهذا النوع</h5>
                                                            <span className="text-[9px] text-gray-500">(إذا أضيفت هنا سيتم استخدامها عند اختيار هذا النوع في التطبيق)</span>
                                                        </div>

                                                        <div className="space-y-2 max-h-28 overflow-y-auto pr-1 custom-scrollbar">
                                                            {(r.denominations && r.denominations.length > 0) ? (
                                                                r.denominations.map(d => (
                                                                    <div key={d.id} className={`p-2.5 rounded-lg flex justify-between items-center border ${d.isAvailable !== false ? 'bg-[#13141f] border-gray-700' : 'bg-red-900/20 border-red-700/50'}`}>
                                                                        <div className="min-w-0">
                                                                            <span className={`font-bold text-[11px] block truncate ${d.isAvailable !== false ? 'text-white' : 'text-red-400'}`}>{d.label}</span>
                                                                            <span className={`text-[10px] font-mono dir-ltr ${d.isAvailable !== false ? 'text-yellow-400' : 'text-red-400'}`}>${d.price}</span>
                                                                        </div>
                                                                        <div className="flex gap-2 items-center">
                                                                            <button 
                                                                                onClick={() => updateRegionDenominationAvailability(r.id, d.id, d.isAvailable !== false ? false : true)}
                                                                                className={`p-1.5 rounded-lg transition-colors border ${d.isAvailable !== false ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                                                                                title={d.isAvailable !== false ? 'تعطيل توفر هذه الكمية' : 'تفعيل توفر هذه الكمية'}
                                                                            >
                                                                                {d.isAvailable !== false ? <CheckSquare size={14} /> : <XCircle size={14} />}
                                                                            </button>
                                                                            <button onClick={() => removeRegionDenomination(r.id, d.id)} className="text-red-500 bg-red-500/10 p-1.5 rounded hover:bg-red-500 hover:text-white transition-colors border border-red-500/20"><X size={14} /></button>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-center text-gray-500 text-[10px] py-3 border border-dashed border-gray-700 rounded-lg">لا توجد فئات لهذا النوع</div>
                                                            )}
                                                        </div>

                                                        <div className="flex gap-2">
                                                            <input className="flex-[2] bg-[#13141f] p-2.5 rounded-xl border border-gray-700 text-white text-[11px] outline-none focus:border-yellow-400 transition-colors" placeholder="الاسم (مثال: 60 UC)" value={tempRegionDenomLabel} onChange={e => setTempRegionDenomLabel(e.target.value)} />
                                                            <input className="flex-1 bg-[#13141f] p-2.5 rounded-xl border border-gray-700 text-white text-[11px] outline-none focus:border-yellow-400 transition-colors" type="number" step="0.01" placeholder="السعر" value={tempRegionDenomPrice} onChange={e => setTempRegionDenomPrice(e.target.value)} />
                                                            <button onClick={() => addRegionDenomination(r.id)} className="bg-yellow-400 text-black p-2.5 rounded-xl font-bold text-[11px] hover:bg-yellow-500 transition-colors">إضافة</button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Denominations Section */}
                        <div className="bg-[#242636] p-4 rounded-xl border border-gray-700">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2 pb-2 border-b border-gray-700"><Tags size={14} className="text-yellow-400"/> الكميات / الفئات (Denominations)</h3>
                            
                            {/* List */}
                            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                {prodForm.denominations && prodForm.denominations.length > 0 ? (
                                    prodForm.denominations.map(denom => (
                                        <div key={denom.id} className="bg-[#13141f] p-3 rounded-lg flex justify-between items-center border border-gray-700">
                                            <div>
                                                <span className="text-white font-bold text-sm block">{denom.label}</span>
                                                <span className="text-yellow-400 text-xs font-mono">${denom.price}</span>
                                            </div>
                                            <button onClick={() => removeDenomination(denom.id)} className="text-red-500 bg-red-500/10 p-1.5 rounded hover:bg-red-500 hover:text-white transition-colors"><X size={14}/></button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center text-gray-500 text-xs py-4 border border-dashed border-gray-700 rounded-lg">لا توجد فئات مضافة</div>
                                )}
                            </div>

                            {/* Add Denom Inputs */}
                            <div className="flex gap-2">
                                <input className="flex-[2] bg-[#13141f] p-2.5 rounded-xl border border-gray-700 text-white text-xs outline-none focus:border-yellow-400 transition-colors" placeholder="الاسم (مثال: 100 جوهرة)" value={tempDenomLabel} onChange={e => setTempDenomLabel(e.target.value)} />
                                <input className="flex-1 bg-[#13141f] p-2.5 rounded-xl border border-gray-700 text-white text-xs outline-none focus:border-yellow-400 transition-colors" type="number" step="0.01" placeholder="السعر" value={tempDenomPrice} onChange={e => setTempDenomPrice(e.target.value)} />
                                <button onClick={addDenomination} className="bg-yellow-400 text-black p-2.5 rounded-xl font-bold text-xs hover:bg-yellow-500 transition-colors">إضافة</button>
                            </div>
                        </div>
                     </div>
                 )}

                 {/* TAB 4: AUTOMATION */}
                 {activeProductTab === 'automation' && (
                     <div className="space-y-6 animate-fadeIn">
                        <div className="bg-[#242636] p-5 rounded-xl border border-gray-700">
                            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Server size={16} className="text-purple-400"/> إعدادات التسليم التلقائي</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs text-gray-400 mb-1.5 block font-bold">نوع التنفيذ</label>
                                    <div className="flex bg-[#13141f] p-1 rounded-xl border border-gray-700">
                                        <button 
                                            onClick={() => setProdForm({...prodForm, apiConfig: { ...prodForm.apiConfig, type: 'manual' }})}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${prodForm.apiConfig?.type === 'manual' ? 'bg-gray-600 text-white shadow' : 'text-gray-400'}`}
                                        >
                                            يدوي (Manual)
                                        </button>
                                        <button 
                                            onClick={() => setProdForm({...prodForm, apiConfig: { ...prodForm.apiConfig, type: 'api' }})}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${prodForm.apiConfig?.type === 'api' ? 'bg-purple-600 text-white shadow' : 'text-gray-400'}`}
                                        >
                                            API خارجي
                                        </button>
                                    </div>
                                </div>

                                {prodForm.apiConfig?.type === 'api' && (
                                    <div className="space-y-3 pt-2 border-t border-gray-700/50">
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">اسم المزود (Provider)</label>
                                            <input className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white text-xs outline-none focus:border-purple-500 transition-colors" placeholder="مثال: EzPin, MintRoute" value={prodForm.apiConfig?.providerName || ''} onChange={e => setProdForm({...prodForm, apiConfig: {...prodForm.apiConfig!, providerName: e.target.value}})} />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-400 mb-1 block">معرف الخدمة (Service ID / SKU)</label>
                                            <input className="w-full bg-[#13141f] p-3 rounded-xl border border-gray-700 text-white text-xs outline-none focus:border-purple-500 transition-colors" placeholder="ID الخدمة عند المزود" value={prodForm.apiConfig?.serviceId || ''} onChange={e => setProdForm({...prodForm, apiConfig: {...prodForm.apiConfig!, serviceId: e.target.value}})} />
                                        </div>
                                    </div>
                                )}
                                
                                <div className="pt-4 border-t border-gray-700/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-white text-sm font-bold">التسليم من المخزون (Stock)</h4>
                                            <p className="text-[10px] text-gray-400 mt-1">سحب الكود تلقائياً من الأكواد المضافة في النظام</p>
                                        </div>
                                        <button 
                                            onClick={() => setProdForm({...prodForm, autoDeliverStock: !prodForm.autoDeliverStock})}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prodForm.autoDeliverStock ? 'bg-emerald-500' : 'bg-gray-600'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prodForm.autoDeliverStock ? 'translate-x-1' : 'translate-x-6'}`} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-gray-700/50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-white text-sm font-bold">حالة توفر المنتج</h4>
                                            <p className="text-[10px] text-gray-400 mt-1">عند إيقاف التوفر، سيظهر المنتج باهتاً وغير قابل للشراء</p>
                                        </div>
                                        <button 
                                            onClick={() => setProdForm({...prodForm, isAvailable: prodForm.isAvailable === undefined ? false : !prodForm.isAvailable})}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prodForm.isAvailable !== false ? 'bg-green-500' : 'bg-red-500'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prodForm.isAvailable !== false ? 'translate-x-1' : 'translate-x-6'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                     </div>
                 )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-800 bg-[#242636] flex gap-3">
                  <button onClick={() => setShowProductModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3.5 rounded-xl font-bold transition-colors">إلغاء</button>
                  <button onClick={handleSaveProduct} className="flex-[2] bg-yellow-400 hover:bg-yellow-500 text-black py-3.5 rounded-xl font-bold shadow-lg shadow-yellow-400/20 transition-colors flex items-center justify-center gap-2">
                      <Save size={18} /> حفظ المنتج
                  </button>
              </div>
           </div>
        </div>
      )}
      
      {/* Invoice Modal for Admin */}
      {selectedInvoiceOrder && (
          <InvoiceModal 
            order={selectedInvoiceOrder}
            isOpen={!!selectedInvoiceOrder}
            onClose={() => setSelectedInvoiceOrder(null)}
            formatPrice={adminFormatPrice}
          />
      )}

    </div>
  );
};

export default Admin;
