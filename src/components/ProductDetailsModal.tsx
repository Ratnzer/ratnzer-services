import React, { useState, useEffect } from 'react';
import { X, Star, ShoppingCart, CheckCircle, ArrowLeft, CreditCard, Wallet, Calendar, User, Lock, Wifi, AlertTriangle } from 'lucide-react';
import { Product, CartItem } from '../types';
import { generateShortId } from '../utils/id';

interface Props {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  formatPrice: (price: number) => string;
  addToCart: (item: CartItem) => Promise<boolean>;
  userBalance?: number; 
  onPurchase?: (
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
    paymentMethod?: 'wallet' | 'card' | 'pi',
    selectedRegionObj?: any,
    selectedDenominationObj?: any
  ) => void;
  isLoggedIn?: boolean; // New prop
  onRequireAuth?: () => void; // New prop
}

const ProductDetailsModal: React.FC<Props> = ({ product, isOpen, onClose, formatPrice, addToCart, userBalance = 0, onPurchase, isLoggedIn = true, onRequireAuth }) => {
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedDenomId, setSelectedDenomId] = useState<string>('');
  
  // Custom Input State
  const [customInputValue, setCustomInputValue] = useState<string>('');
  
  // Checkout Steps State
  const [currentStep, setCurrentStep] = useState<'details' | 'payment_select' | 'card_form'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'pi' | null>(null);

  // Card Form State
  const [cardDetails, setCardDetails] = useState({
      number: '',
      name: '',
      expiry: '',
      cvv: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Drag to dismiss state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const minSwipeDistance = 100;

  // Handle entry animation when isOpen changes
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure the DOM is ready for the transition
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = e.targetTouches[0].clientY;
    const diff = currentTouch - touchStart;
    
    if (diff > 0) {
      // Use requestAnimationFrame style logic via direct state update for React
      // diff * 0.8 adds a slight resistance feel for better UX
      setTranslateY(diff);
      setTouchEnd(currentTouch);
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);
    if (!touchStart || !touchEnd) {
      setTranslateY(0);
      return;
    }
    const distance = touchEnd - touchStart;
    const isSwipeDown = distance > minSwipeDistance;
    
    if (isSwipeDown) {
      setIsVisible(false); // Trigger exit animation
      // Wait for animation to finish before calling onClose
      setTimeout(() => {
        onClose();
        setTranslateY(0);
        setTouchStart(null);
        setTouchEnd(null);
      }, 300);
    } else {
      setTranslateY(0);
    }
  };

  // Reset or initialize state when product opens
  useEffect(() => {
    if (isOpen) {
        // Reset Steps
        setCurrentStep('details');
        setPaymentMethod(null);
        setCardDetails({ number: '', name: '', expiry: '', cvv: '' });
        setCustomInputValue(''); // Reset input
        setIsSubmitting(false);
        
        // Auto-select first Region if available
        const initialRegionId = (product.regions && product.regions.length > 0) ? product.regions[0].id : '';
        setSelectedRegion(initialRegionId);

        // Auto-select first Denomination (supports per-region denominations)
        const initialRegionObj = initialRegionId ? product.regions?.find(r => r.id === initialRegionId) : undefined;
        const initialDenoms = (initialRegionObj?.denominations && initialRegionObj.denominations.length > 0)
          ? initialRegionObj.denominations
          : (product.denominations || []);
        setSelectedDenomId(initialDenoms.length > 0 ? initialDenoms[0].id : '');
    }
  }, [isOpen, product]);

  // Keep selected denomination valid when region changes (supports per-region denominations)
  useEffect(() => {
    const regionObj = product.regions?.find(r => r.id === selectedRegion);
    const denoms = (regionObj?.denominations && regionObj.denominations.length > 0)
      ? regionObj.denominations
      : (product.denominations || []);

    if (denoms.length === 0) {
      if (selectedDenomId) setSelectedDenomId('');
      return;
    }

    const exists = denoms.some(d => d.id === selectedDenomId);
    if (!exists) {
      setSelectedDenomId(denoms[0].id);
    }
  }, [selectedRegion, product, selectedDenomId]);

  if (!isOpen) return null;

  // Helpers to get full objects
  const regionObj = product.regions?.find(r => r.id === selectedRegion);
  const effectiveDenoms = (regionObj?.denominations && regionObj.denominations.length > 0)
    ? regionObj.denominations
    : product.denominations;
  const denomObj = effectiveDenoms?.find(d => d.id === selectedDenomId);
  
  // Global Availability Check: Product must be available, and if region/denom is selected, they must also be available.
  const isAvailableGlobally = product.isAvailable !== false && regionObj?.isAvailable !== false && denomObj?.isAvailable !== false;

  // Determine price to showm Input Configuration
  const activeCustomInput = regionObj?.customInput?.enabled !== undefined 
    ? regionObj.customInput 
    : product.customInput;

  // Determine price to show
  // Price can be stored under different keys depending on the API/data source.
  // If we only read `denomObj.price`, some products will fall back to the base price.
  const currentPriceRaw = denomObj
    ? Number(
        (denomObj as any).price ??
          (denomObj as any).amount ??
          (denomObj as any).value ??
          (denomObj as any).cost ??
          (denomObj as any).denomination ??
          product.price
      )
    : Number(product.price);

  const currentPrice = Number.isFinite(currentPriceRaw) && currentPriceRaw > 0
    ? currentPriceRaw
    : Number(product.price);

  const handleAddToCart = async () => {
    // Availability Check
    if (!isAvailableGlobally) {
        alert("المنتج غير متوفر حالياً");
        return;
    }

    // Auth Check
    if (!isLoggedIn) {
        if (onRequireAuth) onRequireAuth();
        return;
    }

    if (effectiveDenoms && effectiveDenoms.length > 0 && !selectedDenomId) {
        alert("يرجى اختيار الكمية/الفئة السعرية أولاً");
        return;
    }
    
    // Validation for custom input
    if (activeCustomInput?.enabled && activeCustomInput.required && !customInputValue.trim()) {
        alert(`يرجى إدخال ${activeCustomInput.label || 'المعلومات المطلوبة'}`);
        return;
    }

    const newItem: CartItem = {
        id: generateShortId(),
        productId: product.id,
        name: product.name,
        category: product.category,
        price: currentPrice,
        imageUrl: product.imageUrl,
        imageColor: product.imageColor,
        selectedRegion: regionObj,
        selectedDenomination: denomObj,
        quantity: 1,
        apiConfig: product.apiConfig,
        customInputValue: customInputValue.trim(),
        customInputLabel: activeCustomInput?.label
    };

    // We use optimistic update now, so we can close immediately
    void addToCart(newItem);
    onClose();
  };

  const handleBuyNowClick = () => {
      // Availability Check
      if (!isAvailableGlobally) {
          alert("المنتج غير متوفر حالياً");
          return;
      }

      // Auth Check
      if (!isLoggedIn) {
          if (onRequireAuth) onRequireAuth();
          return;
      }

      if (effectiveDenoms && effectiveDenoms.length > 0 && !selectedDenomId) {
          alert("يرجى اختيار الكمية/الفئة السعرية أولاً");
          return;
      }
      
      // Validation for custom input
      if (activeCustomInput?.enabled && activeCustomInput.required && !customInputValue.trim()) {
        alert(`يرجى إدخال ${activeCustomInput.label || 'المعلومات المطلوبة'}`);
        return;
      }

      setCurrentStep('payment_select');
  };

  const handleProceedPayment = () => {
      if (!paymentMethod || isSubmitting) return;
      
      setIsSubmitting(true);

      if (paymentMethod === 'wallet') {
        if (userBalance >= currentPrice) {
            // Direct purchase without confirmation dialog
            if (onPurchase) {
                onPurchase(
                    product.name, 
                    currentPrice, 
                    product.apiConfig?.type || 'manual',
                    regionObj?.name,
                    denomObj?.label,
                    product.category,
                    product.id,
                    selectedRegion,
                    selectedDenomId,
                    customInputValue.trim(),
                    activeCustomInput?.label, // Use active label
                    'wallet',
                    regionObj,
                    denomObj
                );
                onClose();
            } else {
                alert('Error: Purchase function not connected');
            }
        } else {
            alert('عذراً، رصيد المحفظة غير كافي لإتمام العملية.');
        }
      } else {
          // ✅ PayTabs or Pi Network flow (handled by parent)
          if (onPurchase) {
                onPurchase(
                    product.name, 
                    currentPrice, 
                    product.apiConfig?.type || 'manual',
                    regionObj?.name,
                    denomObj?.label,
                    product.category,
                    product.id,
                    selectedRegion,
                    selectedDenomId,
                    customInputValue.trim(),
                    activeCustomInput?.label,
                    paymentMethod, // ✅ Pass 'card' or 'pi' correctly
                    regionObj,
                    denomObj
                );
                onClose();
          } else {
              alert('Error: Purchase function not connected');
          }
      }
  };

  // --- RENDER CONTENT BASED ON STEP ---
  
  const renderDetails = () => (
      <div className="flex-1 overflow-y-auto no-scrollbar p-5 pb-4">
            {/* Header Section */}
            <div className="flex gap-5 items-start mb-6">
                 {/* Product Card Graphic */}
                <div className={`w-32 h-40 rounded-2xl bg-gradient-to-br ${product.imageColor} flex items-center justify-center shadow-lg relative overflow-hidden flex-shrink-0 border border-white/10 group`}>
                     {product.imageUrl ? (
                         <img 
                           src={product.imageUrl} 
                           alt={product.name} 
                           className="w-full h-full object-cover opacity-90"
                           referrerPolicy="no-referrer"
                           onError={(e) => {
                               const target = e.target as HTMLImageElement;
                               target.style.display = 'none';
                               target.parentElement!.classList.add('flex', 'items-center', 'justify-center');
                               const span = document.createElement('span');
                               span.className = 'text-white text-xs font-bold text-center p-2';
                               span.innerText = product.name;
                               target.parentElement!.appendChild(span);
                           }}
                         />
                     ) : (
                        <div className="w-16 h-16 bg-white/20 rounded-full backdrop-blur-sm flex items-center justify-center shadow-inner">
                           <span className="text-white text-[10px] font-bold text-center leading-tight opacity-90">{product.name}</span>
                        </div>
                     )}
                     
                     {product.tag && (
                         <div className="absolute top-2 left-2 bg-yellow-400 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
                             {product.tag}
                         </div>
                     )}
                </div>

                {/* Text Info */}
                <div className="flex-1 py-2">
                    <h2 className="text-xl font-bold text-white mb-2 leading-snug">{product.name}</h2>
                    {product.description && (
                        <p className="text-gray-400 text-xs mb-4 leading-relaxed whitespace-pre-line">
                            {product.description}
                        </p>
                    )}
                    
                    <div className="flex items-center gap-1 bg-[#242636] w-fit px-3 py-1.5 rounded-lg border border-gray-700 shadow-sm">
                        <Star size={14} className="text-yellow-400 fill-yellow-400" />
                        <span className="text-yellow-400 text-xs font-bold dir-ltr pt-0.5">4.9 (128)</span>
                    </div>
                </div>
            </div>

            {/* Region Selection */}
            {product.regions && product.regions.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-right text-gray-300 text-xs font-bold mb-3">نوع المنتج</h3>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {product.regions.map((region) => (
                            <button
                                key={region.id}
                                onClick={() => setSelectedRegion(region.id)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all min-w-[85px] h-[42px] justify-center relative ${
                                    selectedRegion === region.id 
                                    ? 'bg-yellow-400 border-yellow-400 text-black shadow-lg shadow-yellow-400/20' 
                                    : 'bg-[#242636] border-transparent text-gray-400 hover:border-gray-600'
                                }`}
                            >
                                <span className="text-lg leading-none pt-0.5">{region.flag}</span>
                                <span className="text-xs font-bold leading-none">{region.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Denomination Selection */}
            {effectiveDenoms && effectiveDenoms.length > 0 && (
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-gray-300 text-xs font-bold">اختيار كمية المنتج</h3>
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
                        {effectiveDenoms.map((denom) => (
                            <button
                                key={denom.id}
                                onClick={() => setSelectedDenomId(denom.id)}
                                className={`
                                    flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all min-w-[85px] h-[42px] snap-center relative
                                    ${selectedDenomId === denom.id 
                                    ? 'bg-yellow-400 border-yellow-400 text-black shadow-lg shadow-yellow-400/20' 
                                    : 'bg-[#242636] border-transparent text-gray-400 hover:border-gray-600'}
                                `}
                            >
                                <span className="text-xs font-bold leading-none">{denom.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Custom Input Field (Shows Global OR Region Specific) */}
            {activeCustomInput && activeCustomInput.enabled && (
                <div className="mb-6 animate-fadeIn">
                    <h3 className="text-right text-gray-300 text-xs font-bold mb-3 flex items-center gap-1">
                        {activeCustomInput.label}
                        {activeCustomInput.required && <span className="text-red-500">*</span>}
                    </h3>
                    <div className="relative">
                        <input 
                            type="text" 
                            className="w-full bg-[#242636] border border-gray-700 rounded-xl p-3 text-white focus:border-yellow-400 outline-none transition-colors text-right"
                            placeholder={activeCustomInput.placeholder || '...'}
                            value={customInputValue}
                            onChange={(e) => setCustomInputValue(e.target.value)}
                        />
                        {/* Optional Icon indicator */}
                        <div className="absolute top-3 left-3 text-gray-500 pointer-events-none">
                            <User size={18} />
                        </div>
                    </div>
                    {activeCustomInput.required && !customInputValue && (
                        <p className="text-[9px] text-red-400 mt-1 mr-1 flex items-center gap-1">
                            <AlertTriangle size={10} /> هذا الحقل مطلوب
                        </p>
                    )}
                </div>
            )}

            {/* Total Price Display */}
            <div className="flex justify-between items-center mb-4 px-2 bg-[#242636] p-4 rounded-xl border border-gray-800">
                 <span className="text-white font-bold text-sm">المجموع الكلي</span>
                 <span className="text-yellow-400 font-black text-xl dir-ltr">{formatPrice(currentPrice)}</span>
            </div>
      </div>
  );

  const renderPaymentSelect = () => (
      <div className="flex-1 p-6 animate-fadeIn flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6 cursor-pointer text-gray-400 hover:text-white" onClick={() => setCurrentStep('details')}>
              <ArrowLeft size={20} />
              <span className="text-sm font-bold">الرجوع للمنتج</span>
          </div>

          <div className="text-center mb-6">
             <h2 className="text-xl font-bold text-white">اختر طريقة الدفع</h2>
             <p className="text-yellow-400 font-black text-xl dir-ltr mt-1 font-mono">{formatPrice(currentPrice)}</p>
          </div>

          <div className="space-y-4 flex-1">
              {/* Wallet Option */}
              <button 
                onClick={() => {
                    if (userBalance >= currentPrice) {
                        setPaymentMethod('wallet');
                    } else {
                        alert('عذراً، رصيد المحفظة غير كافي لإتمام العملية.');
                    }
                }}
                className={`w-full p-5 rounded-2xl border transition-all flex items-center justify-between group relative overflow-hidden ${
                    paymentMethod === 'wallet' 
                    ? 'bg-yellow-400/10 border-yellow-400' 
                    : 'bg-[#242636] border-gray-700 hover:border-gray-500'
                } ${userBalance < currentPrice ? 'opacity-80' : 'cursor-pointer'}`}
              >
                  <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'wallet' ? 'bg-yellow-400 text-black' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          <Wallet size={24} />
                      </div>
                      <div className="text-right">
                          <h3 className={`font-bold text-sm ${paymentMethod === 'wallet' ? 'text-yellow-400' : 'text-white'}`}>محفظتي</h3>
                          <p className="text-gray-400 text-xs mt-1 dir-ltr text-right font-mono">
                              Balance: {formatPrice(userBalance)}
                          </p>
                      </div>
                  </div>
                  {paymentMethod === 'wallet' && <div className="absolute top-5 left-5 text-yellow-400"><CheckCircle size={20} /></div>}
                  {userBalance < currentPrice && (
                      <span className="text-[10px] text-red-500 bg-red-500/10 px-2 py-1 rounded font-bold absolute top-5 left-5">رصيد غير كافي</span>
                  )}
              </button>

              {/* Card Option */}
              <button 
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-5 rounded-2xl border transition-all flex items-center justify-between group relative overflow-hidden ${
                    paymentMethod === 'card' 
                    ? 'bg-yellow-400/10 border-yellow-400' 
                    : 'bg-[#242636] border-gray-700 hover:border-gray-500'
                }`}
              >
                  <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors overflow-hidden ${paymentMethod === 'card' ? 'bg-yellow-400 text-black' : 'bg-blue-500/10 text-blue-500'}`}>
                          {localStorage.getItem('payment_method_card_icon') ? (
                              <img src={localStorage.getItem('payment_method_card_icon') || ''} alt="Card" className="w-full h-full object-contain p-2" />
                          ) : (
                              <CreditCard size={24} />
                          )}
                      </div>
                      <div className="text-right">
                          <h3 className={`font-bold text-sm ${paymentMethod === 'card' ? 'text-yellow-400' : 'text-white'}`}>بطاقة مصرفية</h3>

                      </div>
                  </div>
	                  {paymentMethod === 'card' && <div className="absolute top-5 left-5 text-yellow-400"><CheckCircle size={20} /></div>}
	              </button>

	              {/* Pi Network Option */}
	              <button 
	                onClick={() => setPaymentMethod('pi')}
	                className={`w-full p-5 rounded-2xl border transition-all flex items-center justify-between group relative overflow-hidden ${
	                    paymentMethod === 'pi' 
	                    ? 'bg-yellow-400/10 border-yellow-400' 
	                    : 'bg-[#242636] border-gray-700 hover:border-gray-500'
	                }`}
	              >
	                  <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors overflow-hidden ${paymentMethod === 'pi' ? 'bg-yellow-400 text-black' : 'bg-[#593B8B]/10 text-[#593B8B]'}`}>
                          {localStorage.getItem('payment_method_pi_icon') ? (
                              <img src={localStorage.getItem('payment_method_pi_icon') || ''} alt="Pi" className="w-full h-full object-contain p-2" />
                          ) : (
                              <svg viewBox="176.2 47.4 530.8 530.7" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="441.6" cy="312.8" fill="white" r="227.4"/>
                                <g fill="#593B8B">
                                  <path d="M441.6 47.4c-146.6 0-265.4 118.8-265.4 265.4S295 578.1 441.6 578.1 707 459.3 707 312.7 588.1 47.4 441.6 47.4zm0 492.8c-125.6 0-227.4-101.8-227.4-227.4S316 85.4 441.6 85.4 669 187.2 669 312.8 567.2 540.2 441.6 540.2z"/>
                                  <path d="M412 214h-34.5c-2.8 0-5-2.3-5-5v-25.2c0-2.8 2.3-5 5-5H412c2.8 0 5 2.3 5 5V209c.1 2.7-2.2 5-5 5zM493.5 214H459c-2.8 0-5-2.3-5-5v-25.2c0-2.8 2.3-5 5-5h34.5c2.8 0 5 2.3 5 5V209c0 2.7-2.2 5-5 5zM340.5 313.7h-45.4v-32.3s1.8-44.6 43.7-45.2h191.4v-26.3h45.6v25.4s-1.2 45.9-43.4 46.5l-33.8.9.5 156.2s.5 2.6-2.6 4.3l-35.2 12.5s-7.8 3.2-8.1-4.7V282H418v155.3s1 4.6-4.1 6.8l-32.3 11.4s-10.1 3.8-10-6.3V281.7h-30.9z"/>
                                </g>
                              </svg>
                          )}
                      </div>
	                      <div className="text-right">
	                          <h3 className={`font-bold text-sm ${paymentMethod === 'pi' ? 'text-yellow-400' : 'text-white'}`}>Pi Network</h3>
	                          <p className="text-gray-400 text-xs mt-1">الدفع المباشر عبر عملة Pi</p>
	                      </div>
	                  </div>
	                  {paymentMethod === 'pi' && <div className="absolute top-5 left-5 text-yellow-400"><CheckCircle size={20} /></div>}
	              </button>
	          </div>

          <div className="pt-6 mt-auto">
             <button 
               onClick={handleProceedPayment}
               disabled={!paymentMethod || isSubmitting}
               className={`w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 ${
                   paymentMethod && !isSubmitting
                   ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' 
                   : 'bg-gray-700 text-gray-400 cursor-not-allowed'
               }`}
             >
               {isSubmitting ? 'جاري المعالجة...' : 'اكمال الدفع'}
             </button>
          </div>
      </div>
  );

  const renderCardForm = () => (
      <div className="flex-1 p-6 animate-fadeIn overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-2 mb-4 cursor-pointer text-gray-400 hover:text-white" onClick={() => setCurrentStep('payment_select')}>
              <ArrowLeft size={20} />
              <span className="text-sm font-bold">تغيير طريقة الدفع</span>
          </div>

          <div className="space-y-4 mt-6">
                 <div>
                    <label className="text-xs text-gray-400 font-bold mb-2 block text-right">رقم البطاقة</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="0000 0000 0000 0000"
                            className="w-full bg-[#242636] border border-gray-700 rounded-xl py-3 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors font-mono tracking-wide"
                            value={cardDetails.number}
                            maxLength={19}
                            onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                        />
                        <CreditCard className="absolute right-3 top-3.5 text-gray-500" size={18} />
                    </div>
                 </div>

                 <div>
                    <label className="text-xs text-gray-400 font-bold mb-2 block text-right">اسم حامل البطاقة</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="الاسم المطبوع على البطاقة"
                            className="w-full bg-[#242636] border border-gray-700 rounded-xl py-3 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors uppercase"
                            value={cardDetails.name}
                            onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})}
                        />
                        <User className="absolute right-3 top-3.5 text-gray-500" size={18} />
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <div className="relative flex-1">
                        <label className="text-xs text-gray-400 font-bold mb-2 block text-right">تاريخ الانتهاء</label>
                        <input 
                          type="text" 
                          placeholder="شهر / سنة"
                          maxLength={5}
                          className="w-full bg-[#242636] border border-gray-700 rounded-xl py-3 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors font-mono"
                          value={cardDetails.expiry}
                          onChange={(e) => {
                              const inputVal = e.target.value;
                              const isDeleting = inputVal.length < cardDetails.expiry.length;
                              
                              if (isDeleting) {
                                  setCardDetails({...cardDetails, expiry: inputVal});
                                  return;
                              }

                              let clean = inputVal.replace(/\D/g, '');
                              if (clean.length > 4) clean = clean.slice(0, 4);
                              
                              if (clean.length >= 2) {
                                  clean = clean.slice(0, 2) + '/' + clean.slice(2);
                              }
                              setCardDetails({...cardDetails, expiry: clean});
                          }}
                        />
                        <Calendar className="absolute right-3 top-3.5 text-gray-500" size={18} />
                     </div>
                     <div className="relative flex-1">
                        <label className="text-xs text-gray-400 font-bold mb-2 block text-right">CVV</label>
                        <input 
                          type="text" 
                          placeholder="123"
                          maxLength={3}
                          className="w-full bg-[#242636] border border-gray-700 rounded-xl py-3 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors font-mono"
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                        />
                        <Lock className="absolute right-3 top-3.5 text-gray-500" size={18} />
                     </div>
                  </div>
          </div>

          <button 
            onClick={() => { 
                if (isSubmitting) return;
                setIsSubmitting(true);
                if (onPurchase) {
                    onPurchase(
                        product.name, 
                        currentPrice, 
                        product.apiConfig?.type || 'manual',
                        regionObj?.name,
                        denomObj?.label,
                        product.category,
                        product.id,
                        selectedRegion,
                        selectedDenomId,
                    customInputValue.trim(),
                    activeCustomInput?.label, // Use active label (Region or Global)
                    'card' // Method is Card
                );
                    onClose();
                } else {
                    alert('Error: Purchase function not connected');
                    setIsSubmitting(false);
                }
            }}
            disabled={isSubmitting}
            className={`w-full font-bold py-4 rounded-xl mt-8 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
                isSubmitting ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
            }`}
          >
              <CheckCircle size={18} />
              {isSubmitting ? 'جاري المعالجة...' : `دفع ${formatPrice(currentPrice)}`}
          </button>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div 
        className={`bg-[#1f212e] w-full max-w-md sm:rounded-3xl rounded-t-3xl relative z-10 max-h-[85vh] flex flex-col shadow-2xl border-t border-gray-700 h-auto sm:mb-0 mb-safe transform transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} ${isDragging ? 'duration-0 transition-none' : ''}`}
        style={{ 
            transform: translateY > 0 ? `translate3d(0, ${translateY}px, 0)` : 'translate3d(0, 0, 0)',
            willChange: 'transform, opacity'
        }}
      >
        
        {/* Close Button (X) */}
        <button 
            onClick={onClose}
            className="absolute top-4 left-4 z-50 p-2 bg-[#242636]/80 hover:bg-[#2f3245] rounded-full text-gray-400 hover:text-white border border-gray-700/50 backdrop-blur-md transition-all shadow-lg active:scale-95"
            aria-label="Close"
        >
            <X size={20} strokeWidth={2} />
        </button>

        {/* Handle Bar (Mobile feel) */}
        <div 
          className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" 
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
            <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-50"></div>
        </div>

        {/* Dynamic Content Body */}
        {currentStep === 'details' && renderDetails()}
        {currentStep === 'payment_select' && renderPaymentSelect()}
        {currentStep === 'card_form' && renderCardForm()}

        {/* Action Buttons (Only on Details Step) */}
        {currentStep === 'details' && (
            <div className="p-4 bg-[#1f212e] border-t border-gray-800 flex gap-3 pb-8 z-[110] sticky bottom-0">
                {!isAvailableGlobally ? (
                    <div className="flex-1 bg-red-700/50 text-white font-bold py-3.5 rounded-xl shadow-lg text-center">
                        المنتج غير متوفر حالياً
                    </div>
                ) : (
                    <>
                        <button 
                            onClick={handleBuyNowClick}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                            اشتر الآن
                        </button>
                        <button 
                            onClick={handleAddToCart}
                            className="flex-[1.5] bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3.5 rounded-xl shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <ShoppingCart size={18} />
                            أضف المنتج للسلة
                        </button>
                    </>
                )}
            </div>
        )}

      </div>
    </div>
  );
};

export default ProductDetailsModal;
