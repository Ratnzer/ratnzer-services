

export interface Region {
  id: string;
  name: string;
  flag: string;
  customInput?: CustomInputConfig; // NEW: Allow custom input override per region
  denominations?: Denomination[]; // NEW: Allow custom quantities/prices per product type
  isAvailable?: boolean; // NEW: Availability status for this region
}

export interface Denomination {
  id: string;
  label: string;
  price: number;
  // Some endpoints return quantity/price under `amount`, so keep it for compatibility
  amount?: number;
  isAvailable?: boolean; // NEW: Availability status for this denomination
}

export interface ApiConfig {
  type: 'manual' | 'api';
  providerName?: string; // e.g., 'EzPin', 'MintRoute'
  serviceId?: string; // SKU or ID at the provider
  autoApprove?: boolean;
}

export interface CustomInputConfig {
  enabled: boolean;
  label: string;
  placeholder?: string;
  required: boolean;
  type?: 'text' | 'number'; // optional for future use
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  imageColor: string; // Gradient fallback
  imageUrl?: string; // Real image URL
  tag?: string; // e.g. "New", "Sale"
  description?: string;
  stock?: number;
  regions?: Region[]; // Available regions for this product
  denominations?: Denomination[]; // Available quantities/prices
  apiConfig?: ApiConfig; // Fulfillment settings
  autoDeliverStock?: boolean; // NEW: Flag to enable auto-delivery from inventory
  customInput?: CustomInputConfig; // NEW: Config for custom user input
  isAvailable?: boolean; // NEW: Product availability status
}

export interface InventoryCode {
  id: string;
  productId: string;
  regionId?: string; // Optional (some products are global)
  denominationId?: string; // Optional (some products have fixed price)
  code: string;
  isUsed: boolean;
  dateAdded: string;
}

export interface CartItem {
  id: string; // Unique ID for the cart entry
  productId: string;
  name: string;
  category?: string; // Added category
  price: number;
  imageUrl?: string;
  imageColor: string;
  selectedRegion?: Region;
  selectedDenomination?: Denomination;
  quantity: number;
  apiConfig?: ApiConfig;
  customInputValue?: string; // NEW: Value entered by user
  customInputLabel?: string; // NEW: Label of the input field
}

export interface Order {
  id: string;
  userId: string;
  userName: string;
  productName: string;
  productCategory?: string; // Added category to order history
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  deliveredCode?: string; // The code sent to user
  fulfillmentType: 'manual' | 'api' | 'stock'; // Added 'stock' type
  rejectionReason?: string; // Message sent by admin when cancelling
  regionName?: string;
  quantityLabel?: string;
  customInputValue?: string; // NEW: User provided info (ID, Link, etc.)
  customInputLabel?: string; // NEW: What was requested
  providerName?: string;
  providerOrderId?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: any; // Lucide icon component
}

export interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'completed' | 'pending';
  icon: any;
  userId?: string; // NEW: Optional user ID for filtering
}

export interface Currency {
  code: string;
  name: string;
  flag: string;
  rate: number; // Exchange rate relative to USD
  symbol: string;
}

export interface AdminAnalytics {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  activeUsers: number;
  salesChart: { day: string; fullDate: string; value: number }[];
  maxChartValue: number;
  categoryStats: { id?: string; name: string; icon?: any; count: number; percentage: number }[];
}

// Changed from TermSection[] to a single object with full text fields
export interface AppTerms {
  contentAr: string; 
  contentEn: string;
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  desc: string;
  bg: string;
  pattern?: string;
  imageUrl?: string; // URL for custom image banner
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  balance: number;
  preferredCurrency?: string;
  hasPassword?: boolean;
  joinedDate: string;
  status: 'active' | 'banned';
  ip?: string;
  avatar?: string;
  password?: string; // NEW: Optional password field
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'offer' | 'alert' | 'info' | 'ad';
  isActive: boolean;
  showOnHome?: boolean; // NEW: whether announcement should appear on the home page
  showInNotifications?: boolean; // NEW: whether announcement should appear in notifications page
  date: string;
}

export enum View {
  HOME = 'home',
  SEARCH = 'search',
  WALLET = 'wallet',
  ORDERS = 'orders',
  PROFILE = 'profile',
  NOTIFICATIONS = 'notifications',
  CART = 'cart',
  ADMIN = 'admin'
}
