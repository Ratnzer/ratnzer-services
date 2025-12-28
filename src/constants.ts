import {
  Product,
  Category,
  Transaction,
  Currency,
  AppTerms,
  Banner,
  UserProfile,
  Region,
  Order,
  InventoryCode,
} from './types';

export const APP_NAME = 'خدمات راتلوزن';

// المناطق (تترك فاضية الآن، وتتعبّى لاحقاً من الباكند أو من لوحة الإدارة)
export const PREDEFINED_REGIONS: Region[] = [];

// التصنيفات (تُحمَّل من الـ API أو تُعرَّف لاحقاً)
export const CATEGORIES: Category[] = [];

// المنتجات (من الـ API)
export const PRODUCTS: Product[] = [];

// الحركات المالية (من الـ API)
export const TRANSACTIONS: Transaction[] = [];

// ⚠️ مهم: عملات ابتدائية حتى لا ينهار التطبيق عندما يستدعي formatPrice
export const INITIAL_CURRENCIES: Currency[] = [
  {
    code: 'USD',
    name: 'الدولار الأمريكي',
    symbol: '$',
    rate: 1,
  },
  {
    code: 'IQD',
    name: 'الدينار العراقي',
    symbol: 'ع.د',
    // هذا رقم تقريبي لتحويل الدولار إلى دينار، يمكنك تعديله لاحقاً
    rate: 1300,
  },
] as Currency[];

// البانرات – تترك فاضية، ويتم جلبها من /api/content/banners مثلاً
export const INITIAL_BANNERS: Banner[] = [] as Banner[];

// المستخدمون التجريبيون – حُذفت البيانات، نترك مصفوفة فاضية فقط للتوافق مع الكود
export const MOCK_USERS: UserProfile[] = [] as UserProfile[];

// الطلبات التجريبية – حُذفت البيانات الوهمية
export const MOCK_ORDERS: Order[] = [] as Order[];

// المخزون التجريبي – أيضاً فاضي
export const MOCK_INVENTORY: InventoryCode[] = [] as InventoryCode[];

// شروط الاستخدام – بدون نصوص وهمية، جاهزة تعبئتها من الباكند أو من لوحة الإدارة
export const INITIAL_TERMS: AppTerms = {
  contentAr: '',
  contentEn: '',
} as AppTerms;
