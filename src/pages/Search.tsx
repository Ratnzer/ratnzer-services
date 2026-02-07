import React, { useEffect, useState } from 'react';
import { Search as SearchIcon, Sparkles, ArrowLeft } from 'lucide-react';
import { View, Category, Product, CartItem } from '../types';
// ProductDetailsModal import removed
import ProductCard from '../components/ProductCard';

interface Props {
  setView: (view: View) => void;
  formatPrice: (price: number) => string;
  products: Product[];
  categories: Category[];
  addToCart: (item: CartItem) => Promise<boolean>;
  userBalance?: number;
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
  icon: (Sparkles as unknown) as any,
};


const SearchPage: React.FC<Props> = ({ setView, formatPrice, products, categories, addToCart, userBalance = 0, onPurchase, onProductSelect }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    return localStorage.getItem(LOCAL_CATEGORY_STORAGE_KEY) || LOCAL_LATEST_CATEGORY_ID;
  });
  const [selectedPrice, setSelectedPrice] = useState<string>('all');
  
  const selectCategory = (id: string) => {
    setSelectedCategory(id);
    localStorage.setItem(LOCAL_CATEGORY_STORAGE_KEY, id);
  };

  // Always auto-select the local fixed category when entering the page
  useEffect(() => {
    setSelectedCategory(LOCAL_LATEST_CATEGORY_ID);
    localStorage.setItem(LOCAL_CATEGORY_STORAGE_KEY, LOCAL_LATEST_CATEGORY_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uiCategories = (() => {
    const hasLatest = categories.some(
      (c) => c.id === LOCAL_LATEST_CATEGORY_ID || c.name === LOCAL_LATEST_CATEGORY_NAME
    );
    return hasLatest ? categories : [LOCAL_LATEST_CATEGORY, ...categories];
  })();

  const priceOptions = [
    { id: 'all', label: 'الكل' },
    { id: 'under_10', label: 'أقل من 10$' },
    { id: '10_50', label: '10$ - 50$' },
    { id: 'over_50', label: 'أكثر من 50$' },
  ];

  // Logic to filter products
  let filteredProducts = products.filter((product) => {
    // 1. Filter by Name (Search Query)
    const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase());

    // 2. Filter by Category
    const matchesCategory =
      selectedCategory === 'all' ||
      selectedCategory === LOCAL_LATEST_CATEGORY_ID ||
      product.category === selectedCategory;

    // 3. Filter by Price
    let matchesPrice = true;
    if (selectedPrice === 'under_10') {
      matchesPrice = product.price < 10;
    } else if (selectedPrice === '10_50') {
      matchesPrice = product.price >= 10 && product.price <= 50;
    } else if (selectedPrice === 'over_50') {
      matchesPrice = product.price > 50;
    }

    return matchesQuery && matchesCategory && matchesPrice;
  });

  return (
    <div className="min-h-screen pb-24 bg-[#13141f] pt-4">
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10"></div>
          <h1 className="text-xl font-bold text-white">البحث</h1>
          <button onClick={() => setView(View.HOME)}><ArrowLeft className="text-white" /></button>
        </div>
        <div className="relative">
            <input 
              type="text" 
              placeholder="أبحث عن ... بطاقات ستور" 
              className="w-full bg-[#13141f] border border-white/30 rounded-full py-3 pr-10 pl-4 text-white placeholder-gray-400 focus:outline-none focus:border-white transition-colors text-sm text-right"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <SearchIcon className="absolute right-3 top-3 text-white" size={20} />
        </div>
      </div>



      {/* Results Section */}
      {filteredProducts.length > 0 ? (
          <div className="px-4 mt-6">
             <div className="grid grid-cols-3 gap-3">
                {filteredProducts.map((product) => (
                    <ProductCard 
                        key={product.id} 
                        product={product} 
                        formattedPrice={formatPrice(product.price)}
                        onClick={() => onProductSelect(product)}
                    />
                ))}
             </div>
          </div>
      ) : (
          <div className="flex flex-col items-center justify-center mt-12 px-10 text-center animate-fadeIn">
            <div className="w-32 h-32 bg-[#FCD34D] rounded-full flex items-center justify-center mb-6 relative overflow-hidden shadow-lg">
                <div className="flex gap-3 transform translate-y-1">
                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center relative overflow-hidden">
                    <div className="w-4 h-4 bg-[#1f2937] rounded-full absolute right-1"></div>
                </div>
                <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center relative overflow-hidden">
                    <div className="w-4 h-4 bg-[#1f2937] rounded-full absolute right-1"></div>
                </div>
                </div>
            </div>
            
            <h2 className="text-lg font-bold text-white mb-2">لا يوجد اي عناصر لعرضها</h2>
            <p className="text-gray-400 text-xs">جرب تغيير الفلاتر أو البحث بكلمات أخرى</p>
          </div>
      )}
    </div>
  );
};

export default SearchPage;
