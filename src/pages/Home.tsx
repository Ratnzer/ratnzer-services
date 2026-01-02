import React, { useState, useRef, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
// ProductDetailsModal import removed
import { View, Product, Category, Banner, Announcement, CartItem } from '../types';
import { Megaphone, Sparkles } from 'lucide-react';

// ============================================================
// Simple local cache (for instant render on app reopen)
// ============================================================
const HOME_CACHE_PRODUCTS_KEY = 'home_cache_products';
const HOME_CACHE_CATEGORIES_KEY = 'home_cache_categories';
const HOME_CACHE_BANNERS_KEY = 'home_cache_banners';
const HOME_CACHE_ANNOUNCEMENTS_KEY = 'home_cache_announcements';

const readCache = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeCache = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};

interface Props {
  setView: (view: View) => void;
  formatPrice: (price: number) => string;
  products: Product[];
  categories: Category[];
  banners: Banner[];
  announcements: Announcement[];
  addToCart: (item: CartItem) => Promise<boolean>;
  userBalance: number;
  onPurchase: (
    itemName: string,
    price: number,
    fulfillmentType?: 'manual' | 'api',
    regionName?: string,
    quantityLabel?: string,
    category?: string,
    productId?: string,
    regionId?: string,
    denominationId?: string,
    customInputValue?: string,
    customInputLabel?: string,
    paymentMethod?: 'wallet' | 'card',
    selectedRegionObj?: any,
    selectedDenominationObj?: any
  ) => void;
  onProductSelect: (product: Product) => void;
  isRefreshing?: boolean;
  hasCachedData?: boolean;
}

// ============================================================
// Local fixed category: "كل المنتجات" (stored locally & auto-selected)
// ============================================================
const LOCAL_LATEST_CATEGORY_ID = 'all';
const LOCAL_LATEST_CATEGORY_NAME = 'كل المنتجات';
const LOCAL_CATEGORY_STORAGE_KEY = 'selectedCategoryId';

const LOCAL_LATEST_CATEGORY: Category = {
  id: LOCAL_LATEST_CATEGORY_ID,
  name: LOCAL_LATEST_CATEGORY_NAME,
  // Category.icon is a component in this project
  icon: (Sparkles as unknown) as any,
};

const Home: React.FC<Props> = ({
  setView,
  formatPrice,
  products,
  categories,
  banners,
  announcements,
  addToCart,
  userBalance,
  onPurchase,
  onProductSelect,
  isRefreshing = false,
  hasCachedData = false,
}) => {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Cached data (used when props are temporarily empty after app reopen)
  const [cachedProducts, setCachedProducts] = useState<Product[]>(() => readCache<Product[]>(HOME_CACHE_PRODUCTS_KEY, []));
  const [cachedCategories, setCachedCategories] = useState<Category[]>(() => readCache<Category[]>(HOME_CACHE_CATEGORIES_KEY, []));
  const [cachedBanners, setCachedBanners] = useState<Banner[]>(() => readCache<Banner[]>(HOME_CACHE_BANNERS_KEY, []));
  const [cachedAnnouncements, setCachedAnnouncements] = useState<Announcement[]>(() => readCache<Announcement[]>(HOME_CACHE_ANNOUNCEMENTS_KEY, []));

  // Prefer live props; fallback to cached values if props are empty
  const viewProducts = Array.isArray(products) ? products : cachedProducts;
  const viewCategories = Array.isArray(categories) ? categories : cachedCategories;
  const viewBanners = Array.isArray(banners) ? banners : cachedBanners;

  // ✅ IMPORTANT FIX:
  // - If server returns [] announcements (after delete), do NOT fallback to cachedAnnouncements.
  // - Only use cachedAnnouncements when we're still refreshing/loading and live announcements are empty.
  const useLiveAnnouncements =
    Array.isArray(announcements) && (announcements.length > 0 || !isRefreshing);

  const viewAnnouncementsAll = useLiveAnnouncements ? announcements : cachedAnnouncements;

  const viewAnnouncements = (viewAnnouncementsAll || []).filter(
    (a) => a && a.showOnHome !== false && (a.isActive ?? true)
  );

  // Keep cache updated when fresh data arrives
  useEffect(() => {
    if (Array.isArray(products)) {
      setCachedProducts(products);
      writeCache(HOME_CACHE_PRODUCTS_KEY, products);
    }
  }, [products]);

  useEffect(() => {
    if (Array.isArray(categories)) {
      setCachedCategories(categories);
      writeCache(HOME_CACHE_CATEGORIES_KEY, categories);
    }
  }, [categories]);

  useEffect(() => {
    if (Array.isArray(banners)) {
      setCachedBanners(banners);
      writeCache(HOME_CACHE_BANNERS_KEY, banners);
    }
  }, [banners]);

  // ✅ IMPORTANT FIX:
  // Update announcements cache even when it becomes empty,
  // but only after refresh finished (so we don't overwrite cache with temporary empty on reopen).
  useEffect(() => {
    if (!Array.isArray(announcements)) return;

    if (!isRefreshing) {
      setCachedAnnouncements(announcements);
      writeCache(HOME_CACHE_ANNOUNCEMENTS_KEY, announcements);
    }
  }, [announcements, isRefreshing]);

  // Category Filter State
  const [activeCategory, setActiveCategory] = useState<string>(() => {
    return localStorage.getItem(LOCAL_CATEGORY_STORAGE_KEY) || LOCAL_LATEST_CATEGORY_ID;
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  const selectCategory = (id: string) => {
    setActiveCategory(id);
    localStorage.setItem(LOCAL_CATEGORY_STORAGE_KEY, id);
  };

  // Always auto-select the local fixed category when entering the page
  useEffect(() => {
    setActiveCategory(LOCAL_LATEST_CATEGORY_ID);
    localStorage.setItem(LOCAL_CATEGORY_STORAGE_KEY, LOCAL_LATEST_CATEGORY_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If stored category is no longer valid (category removed/changed), fallback to "latest"
  const isValidCategory = (id: string) => {
    if (id === 'all' || id === LOCAL_LATEST_CATEGORY_ID) return true;
    return viewCategories.some((c) => c.id === id);
  };

  const effectiveCategory = isValidCategory(activeCategory) ? activeCategory : LOCAL_LATEST_CATEGORY_ID;

  useEffect(() => {
    if (!isValidCategory(activeCategory)) {
      setActiveCategory(LOCAL_LATEST_CATEGORY_ID);
      localStorage.setItem(LOCAL_CATEGORY_STORAGE_KEY, LOCAL_LATEST_CATEGORY_ID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewCategories.length]);

  // Extend banners safely (avoid crash when banners is empty)
  const extendedBanners = viewBanners.length > 0 ? [...viewBanners, { ...viewBanners[0], id: -999 as any }] : [];

  useEffect(() => {
    if (viewBanners.length <= 1 || extendedBanners.length === 0) return;

    const interval = setInterval(() => {
      if (scrollRef.current) {
        const slider = scrollRef.current;
        const width = slider.offsetWidth;

        const currentScroll = Math.abs(slider.scrollLeft);
        const currentIndex = Math.round(currentScroll / width);

        if (currentIndex >= extendedBanners.length - 1) {
          slider.scrollTo({ left: 0, behavior: 'auto' });
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.style.scrollSnapType = 'none';
              scrollRef.current.scrollTo({ left: -width, behavior: 'smooth' });
            }
          }, 50);
          return;
        }

        const nextIndex = currentIndex + 1;
        slider.style.scrollSnapType = 'none';
        slider.scrollTo({
          left: -(nextIndex * width),
          behavior: 'smooth',
        });

        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.style.scrollSnapType = 'x mandatory';
            if (nextIndex >= extendedBanners.length - 1) {
              scrollRef.current.scrollTo({
                left: 0,
                behavior: 'auto',
              });
            }
          }
        }, 600);
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [viewBanners.length, extendedBanners.length]);

  const handleScroll = () => {
    if (viewBanners.length === 0) return;
    if (scrollRef.current) {
      const scrollLeft = Math.abs(scrollRef.current.scrollLeft);
      const width = scrollRef.current.offsetWidth;
      const rawIndex = Math.round(scrollLeft / width);
      const visualIndex = rawIndex >= viewBanners.length ? 0 : rawIndex;

      if (currentBannerIndex !== visualIndex) {
        setCurrentBannerIndex(visualIndex);
      }
    }
  };

  // Filter Products Logic
  const filteredProducts =
    effectiveCategory === 'all'
      ? viewProducts
      : effectiveCategory === LOCAL_LATEST_CATEGORY_ID
        ? [...viewProducts].sort((a: any, b: any) => {
            const da = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
            const db = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
            return db - da;
          })
        : viewProducts.filter((product: any) => product.category === effectiveCategory);

  // UI Categories: ensure local fixed category exists
  const uiCategories = (() => {
    const hasLatest = viewCategories.some(
      (c) => c.id === LOCAL_LATEST_CATEGORY_ID || c.name === LOCAL_LATEST_CATEGORY_NAME
    );
    return hasLatest ? viewCategories : [LOCAL_LATEST_CATEGORY, ...viewCategories];
  })();

  return (
    <div className="pb-24 pt-4 space-y-6">
      {/* Announcements / Alerts */}
      {viewAnnouncements.length > 0 && (
        <div className="px-4">
          <div className="bg-[#242636] border border-yellow-400/30 rounded-xl p-3 flex items-center gap-3 overflow-hidden shadow-sm">
            <Megaphone size={18} className="text-yellow-400 animate-pulse flex-shrink-0" />
            <div className="flex-1 overflow-hidden relative h-5">
              <div className="animate-marquee whitespace-nowrap absolute right-0 text-xs font-bold text-white">
                {viewAnnouncements[0].message}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Slider Section */}
      <div className="px-4">
        {viewBanners.length === 0 ? (
          <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg border border-gray-800 bg-[#242636] animate-pulse" />
        ) : (
          <>
            <div className="w-full h-44 rounded-2xl relative overflow-hidden shadow-lg border border-gray-800">
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                dir="rtl"
                className="flex overflow-x-auto snap-x snap-mandatory h-full w-full no-scrollbar"
              >
                {extendedBanners.map((banner: any, index: number) => (
                  <div
                    key={index}
                    className="w-full flex-shrink-0 snap-center h-full relative flex items-center justify-center bg-gradient-to-r"
                    style={{ scrollSnapStop: 'always' }}
                  >
                    {banner.imageUrl ? (
                      <img
                        src={banner.imageUrl}
                        alt={banner.title}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`absolute inset-0 bg-gradient-to-r ${banner.bg}`}></div>
                    )}

                    {!banner.imageUrl && banner.pattern && (
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{ backgroundImage: banner.pattern, backgroundSize: '20px 20px' }}
                      ></div>
                    )}

                    {(!banner.imageUrl || (banner.title || banner.subtitle)) && (
                      <>
                        {banner.imageUrl && <div className="absolute inset-0 bg-black/30"></div>}

                        <div className="z-10 w-full flex flex-col items-center justify-center text-center px-6">
                          {banner.title && (
                            <h2
                              className="text-3xl font-black text-yellow-400 mb-2 drop-shadow-lg"
                              style={{ fontFamily: 'Tahoma, Arial' }}
                            >
                              {banner.title}
                            </h2>
                          )}
                          {banner.subtitle && (
                            <p className="text-white text-lg font-bold drop-shadow-md">{banner.subtitle}</p>
                          )}
                          {banner.desc && (
                            <p className="text-yellow-400/80 text-lg font-bold drop-shadow-md">{banner.desc}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Circular Dots */}
            <div className="flex justify-center gap-2 mt-3">
              {viewBanners.map((_, index) => (
                <div
                  key={index}
                  className={`rounded-full transition-all duration-300 ${
                    currentBannerIndex === index
                      ? 'w-2 h-2 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)] scale-110'
                      : 'w-2 h-2 bg-gray-600 opacity-40 hover:opacity-100'
                  }`}
                ></div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Categories (Scrollable) */}
      <div className="px-4">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 pr-1">
          {uiCategories.map((cat: any) => (
            <button key={cat.id} onClick={() => selectCategory(cat.id)} className="flex flex-col items-center min-w-[65px] group">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-2 transition-colors border shadow-md ${
                  effectiveCategory === cat.id
                    ? 'bg-yellow-400 text-black border-yellow-400'
                    : 'bg-[#242636] border-gray-800 text-white group-hover:bg-yellow-400 group-hover:text-black'
                }`}
              >
                {(() => {
                  const IconComp: any = typeof (cat as any).icon === 'function' ? (cat as any).icon : Sparkles;
                  return <IconComp size={22} />;
                })()}
              </div>
              <span
                className={`text-[10px] font-bold whitespace-nowrap transition-colors ${
                  effectiveCategory === cat.id ? 'text-yellow-400' : 'text-gray-400'
                }`}
              >
                {cat.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Product Sections */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-center mb-4 px-1">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-yellow-400 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
            <h3 className="font-bold text-lg text-white tracking-wide">
              {effectiveCategory === LOCAL_LATEST_CATEGORY_ID
                ? LOCAL_LATEST_CATEGORY_NAME
                : effectiveCategory === 'all'
                  ? 'كل المنتجات'
                  : viewCategories.find((c) => c.id === effectiveCategory)?.name}
            </h3>
          </div>
          {effectiveCategory !== 'all' && (
            <button
              onClick={() => selectCategory('all')}
              className="text-[10px] bg-[#242636] hover:bg-[#2f3245] text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 transition-colors"
            >
              عرض الكل
            </button>
          )}
        </div>

        {/* Grid Layout - 3 Columns */}
        <div className="grid grid-cols-3 gap-3">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product: any) => (
              <ProductCard
                key={product.id}
                product={product}
                formattedPrice={formatPrice(product.price)}
                onClick={() => onProductSelect(product)}
              />
            ))
          ) : isRefreshing || (!hasCachedData && viewProducts.length === 0) ? (
            <div className="col-span-3 grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-36 rounded-2xl bg-[#242636] border border-gray-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="col-span-3 text-center py-10 text-gray-500 font-bold text-sm bg-[#242636] rounded-2xl border border-dashed border-gray-700">
              لا توجد منتجات في هذا القسم
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
