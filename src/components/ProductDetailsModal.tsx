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
  const isPiUser = localStorage.getItem('user_email')?.endsWith('@pi.network');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [selectedDenomId, setSelectedDenomId] = useState<string>('');
  
  // Custom Input State
  const [customInputValue, setCustomInputValue] = useState<string>('');
  
  // Checkout Steps State
  const [currentStep, setCurrentStep] = useState<'details' | 'payment_select' | 'card_form'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'pi' | null>(isPiUser ? 'pi' : null);

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
    if (distance > minSwipeDistance) {
      setIsVisible(false);
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
        setCurrentStep('details');
        setPaymentMethod(isPiUser ? 'pi' : null);
        setCardDetails({ number: '', name: '', expiry: '', cvv: '' });
        setCustomInputValue('');
        setIsSubmitting(false);
        
        const initialRegionId = (product.regions && product.regions.length > 0) ? product.regions[0].id : '';
        setSelectedRegion(initialRegionId);

        const initialRegionObj = initialRegionId ? product.regions?.find(r => r.id === initialRegionId) : undefined;
        const initialDenoms = (initialRegionObj?.denominations && initialRegionObj.denominations.length > 0)
          ? initialRegionObj.denominations
          : (product.denominations || []);
        setSelectedDenomId(initialDenoms.length > 0 ? initialDenoms[0].id : '');
    }
  }, [isOpen, product, isPiUser]);

  // Keep selected denomination valid when region changes
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

  const regionObj = product.regions?.find(r => r.id === selectedRegion);
  const effectiveDenoms = (regionObj?.denominations && regionObj.denominations.length > 0)
    ? regionObj.denominations
    : product.denominations;
  const denomObj = effectiveDenoms?.find(d => d.id === selectedDenomId);
  
  const isAvailableGlobally = product.isAvailable !== false && regionObj?.isAvailable !== false && denomObj?.isAvailable !== false;

  const activeCustomInput = regionObj?.customInput?.enabled !== undefined 
    ? regionObj.customInput 
    : product.customInput;

  const currentPriceRaw = denomObj
    ? Number((denomObj as any).price ?? (denomObj as any).amount ?? (denomObj as any).value ?? (denomObj as any).cost ?? (denomObj as any).denomination ?? product.price)
    : Number(product.price);

  const currentPrice = Number.isFinite(currentPriceRaw) && currentPriceRaw > 0 ? currentPriceRaw : Number(product.price);

  const handleAddToCart = async () => {
    if (!isAvailableGlobally) { alert("المنتج غير متوفر حالياً"); return; }
    if (!isLoggedIn) { if (onRequireAuth) onRequireAuth(); return; }
    if (effectiveDenoms && effectiveDenoms.length > 0 && !selectedDenomId) { alert("يرجى اختيار الكمية/الفئة السعرية أولاً"); return; }
    if (activeCustomInput?.enabled && activeCustomInput.required && !customInputValue.trim()) { alert(`يرجى إدخال ${activeCustomInput.label || 'المعلومات المطلوبة'}`); return; }

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

    void addToCart(newItem);
    onClose();
  };

  const handleBuyNowClick = () => {
      if (!isAvailableGlobally) { alert("المنتج غير متوفر حالياً"); return; }
      if (!isLoggedIn) { if (onRequireAuth) onRequireAuth(); return; }
      if (effectiveDenoms && effectiveDenoms.length > 0 && !selectedDenomId) { alert("يرجى اختيار الكمية/الفئة السعرية أولاً"); return; }
      if (activeCustomInput?.enabled && activeCustomInput.required && !customInputValue.trim()) { alert(`يرجى إدخال ${activeCustomInput.label || 'المعلومات المطلوبة'}`); return; }
      setCurrentStep('payment_select');
  };

  const handleProceedPayment = () => {
      if (!paymentMethod || isSubmitting) return;
      setIsSubmitting(true);

      if (paymentMethod === 'wallet') {
        if (userBalance >= currentPrice) {
            if (onPurchase) {
                onPurchase(product.name, currentPrice, product.apiConfig?.type || 'manual', regionObj?.name, denomObj?.label, product.category, product.id, selectedRegion, selectedDenomId, customInputValue.trim(), activeCustomInput?.label, 'wallet', regionObj, denomObj);
                onClose();
            }
        } else {
            alert('عذراً، رصيد المحفظة غير كافي لإتمام العملية.');
            setIsSubmitting(false);
        }
      } else {
          if (onPurchase) {
                onPurchase(product.name, currentPrice, product.apiConfig?.type || 'manual', regionObj?.name, denomObj?.label, product.category, product.id, selectedRegion, selectedDenomId, customInputValue.trim(), activeCustomInput?.label, paymentMethod, regionObj, denomObj);
                onClose();
          }
      }
  };

  const renderDetails = () => (
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
            <div className="flex flex-col items-center text-center mb-4">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-3 shadow-lg ${product.imageColor || 'bg-yellow-400'}`}>
                    <img src={product.imageUrl} alt={product.name} className="w-14 h-14 object-contain" />
                </div>
                <h2 className="text-lg font-bold text-white mb-1">{product.name}</h2>
                <div className="flex items-center gap-1 text-yellow-400">
                    <Star size={14} fill="currentColor" />
                    <span className="text-xs font-bold">4.9</span>
                    <span className="text-gray-500 text-[10px] mr-1">(1.2k تقييم)</span>
                </div>
            </div>

            {product.regions && product.regions.length > 0 && (
                <div className="mb-4">
                    <h3 className="text-right text-gray-300 text-[10px] font-bold mb-2">اختر المنطقة</h3>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
                        {product.regions.map((region) => (
                            <button
                                key={region.id}
                                onClick={() => setSelectedRegion(region.id)}
                                className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all whitespace-nowrap snap-center ${selectedRegion === region.id ? 'bg-yellow-400 border-yellow-400 text-black shadow-md' : 'bg-[#242636] border-transparent text-gray-400 hover:border-gray-600'}`}
                            >
                                {region.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {effectiveDenoms && effectiveDenoms.length > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-gray-300 text-[10px] font-bold">اختيار كمية المنتج</h3>
                    </div>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
                        {effectiveDenoms.map((denom) => (
                            <button
                                key={denom.id}
                                onClick={() => setSelectedDenomId(denom.id)}
                                className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border transition-all min-w-[85px] h-[40px] snap-center relative ${selectedDenomId === denom.id ? 'bg-yellow-400 border-yellow-400 text-black shadow-md' : 'bg-[#242636] border-transparent text-gray-400 hover:border-gray-600'}`}
                            >
                                <span className="text-xs font-bold leading-none">{denom.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {activeCustomInput && activeCustomInput.enabled && (
                <div className="mb-4 animate-fadeIn">
                    <h3 className="text-right text-gray-300 text-[10px] font-bold mb-2 flex items-center gap-1">
                        {activeCustomInput.label}
                        {activeCustomInput.required && <span className="text-red-500">*</span>}
                    </h3>
                    <div className="relative">
                        <input 
                            type="text" 
                            className="w-full bg-[#242636] border border-gray-700 rounded-lg py-2 px-3 text-sm text-white focus:border-yellow-400 outline-none transition-colors text-right"
                            placeholder={activeCustomInput.placeholder || '...'}
                            value={customInputValue}
                            onChange={(e) => setCustomInputValue(e.target.value)}
                        />
                        <div className="absolute top-2.5 left-3 text-gray-500 pointer-events-none">
                            <User size={14} />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-3 mt-2">
                <button onClick={handleBuyNowClick} className="flex-1 bg-yellow-400 text-black py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all">شراء الآن</button>
                <button onClick={handleAddToCart} className="w-14 h-12 bg-[#242636] text-white rounded-xl flex items-center justify-center border border-gray-700 active:scale-95 transition-all"><ShoppingCart size={20} /></button>
            </div>
      </div>
  );

  const renderPaymentSelect = () => (
      <div className="flex-1 p-4 animate-fadeIn flex flex-col h-full">
          <div className="flex items-center gap-2 mb-3 cursor-pointer text-gray-400 hover:text-white" onClick={() => setCurrentStep('details')}>
              <ArrowLeft size={18} />
              <span className="text-xs font-bold">رجوع</span>
          </div>

          <div className="text-center mb-3">
             <h2 className="text-base font-bold text-white">شراء سريع</h2>
             <p className="text-gray-400 text-[11px] mt-0.5">أنت على وشك شراء {product.name}</p>
             <p className="text-yellow-400 font-black text-xl dir-ltr mt-1 font-mono">{formatPrice(currentPrice)}</p>
          </div>

          <div className="space-y-2 flex-1">
              <p className="text-right text-[10px] font-bold text-gray-400 mb-1">اختر طريقة الدفع</p>
              
              <button 
                onClick={() => { if (userBalance >= currentPrice) setPaymentMethod('wallet'); else alert('عذراً، رصيد المحفظة غير كافي لإتمام العملية.'); }}
                className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between group relative overflow-hidden ${paymentMethod === 'wallet' ? 'bg-yellow-400/10 border-yellow-400' : 'bg-[#242636] border-gray-700 hover:border-gray-500'} ${userBalance < currentPrice ? 'opacity-80' : 'cursor-pointer'}`}
              >
                  <div className="flex items-center gap-3 relative z-10">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'wallet' ? 'bg-yellow-400 text-black' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          <Wallet size={18} />
                      </div>
                      <div className="text-right">
                          <h3 className={`font-bold text-xs ${paymentMethod === 'wallet' ? 'text-yellow-400' : 'text-white'}`}>محفظتي</h3>
                          <p className="text-gray-400 text-[10px] mt-0.5 dir-ltr text-right font-mono">الرصيد: {formatPrice(userBalance)}</p>
                      </div>
                  </div>
                  {paymentMethod === 'wallet' && <div className="absolute top-2.5 left-3 text-yellow-400"><CheckCircle size={14} /></div>}
              </button>

              {!isPiUser && (
                  <button 
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between group relative overflow-hidden ${paymentMethod === 'card' ? 'bg-yellow-400/10 border-yellow-400' : 'bg-[#242636] border-gray-700 hover:border-gray-500'}`}
                  >
                      <div className="flex items-center gap-3 relative z-10">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors overflow-hidden ${paymentMethod === 'card' ? 'bg-yellow-400 text-black' : 'bg-blue-500/10 text-blue-500'}`}>
                              {localStorage.getItem('payment_method_card_icon') ? <img src={localStorage.getItem('payment_method_card_icon') || ''} alt="Card" className="w-full h-full object-cover rounded-full" /> : <CreditCard size={18} />}
                          </div>
                          <div className="text-right">
                              <h3 className={`font-bold text-xs ${paymentMethod === 'card' ? 'text-yellow-400' : 'text-white'}`}>بطاقة مصرفية</h3>
                              <p className="text-gray-400 text-[10px] mt-0.5">دفع فوري وآمن</p>
                          </div>
                      </div>
                      {paymentMethod === 'card' && <div className="absolute top-2.5 left-3 text-yellow-400"><CheckCircle size={14} /></div>}
                  </button>
              )}

              <button 
                onClick={() => setPaymentMethod('pi')}
                className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between group relative overflow-hidden ${paymentMethod === 'pi' ? 'bg-yellow-400/10 border-yellow-400' : 'bg-[#242636] border-gray-700 hover:border-gray-500'}`}
              >
                  <div className="flex items-center gap-3 relative z-10">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors overflow-hidden ${paymentMethod === 'pi' ? 'bg-yellow-400 text-black' : 'bg-[#593B8B]/10 text-[#593B8B]'}`}>
                          {localStorage.getItem('payment_method_pi_icon') ? <img src={localStorage.getItem('payment_method_pi_icon') || ''} alt="Pi" className="w-full h-full object-cover rounded-full" /> : (
                              <svg viewBox="176.2 47.4 530.8 530.7" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="441.6" cy="312.8" fill="white" r="227.4"/><g fill="#593B8B"><path d="m441.6 142.2c-94.2 0-170.6 76.4-170.6 170.6s76.4 170.6 170.6 170.6 170.6-76.4 170.6-170.6-76.4-170.6-170.6-170.6zm0 312.8c-78.5 0-142.2-63.7-142.2-142.2s63.7-142.2 142.2-142.2 142.2 63.7 142.2 142.2-63.7 142.2-142.2 142.2z"/><path d="m491.3 234.7h-99.4c-11.8 0-21.3 9.5-21.3 21.3v113.7c0 11.8 9.5 21.3 21.3 21.3h99.4c11.8 0 21.3-9.5 21.3-21.3v-113.7c0-11.8-9.5-21.3-21.3-21.3zm-7.1 127.9h-85.2v-99.4h85.2z"/></g>
                              </svg>
                          )}
                      </div>
                      <div className="text-right">
                          <h3 className={`font-bold text-xs ${paymentMethod === 'pi' ? 'text-yellow-400' : 'text-white'}`}>الدفع عبر Pi</h3>
                          <p className="text-gray-400 text-[10px] mt-0.5">متوفر في Pi Browser</p>
                      </div>
                  </div>
                  {paymentMethod === 'pi' && <div className="absolute top-2.5 left-3 text-yellow-400"><CheckCircle size={14} /></div>}
              </button>
          </div>

          <div className="pt-2 mt-auto pb-1">
             <button 
               onClick={handleProceedPayment}
               disabled={!paymentMethod || isSubmitting}
               className={`w-full py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95 ${paymentMethod && !isSubmitting ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
             >
               {isSubmitting ? 'جاري...' : 'اكمال الدفع'}
             </button>
          </div>
      </div>
  );

  const renderCardForm = () => (
      <div className="flex-1 p-4 animate-fadeIn overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-2 mb-4 cursor-pointer text-gray-400 hover:text-white" onClick={() => setCurrentStep('payment_select')}>
              <ArrowLeft size={18} />
              <span className="text-xs font-bold">تغيير طريقة الدفع</span>
          </div>
          <div className="space-y-3 mt-2">
                 <div>
                    <label className="text-[10px] text-gray-400 font-bold mb-1.5 block text-right">رقم البطاقة</label>
                    <div className="relative">
                        <input type="text" placeholder="0000 0000 0000 0000" className="w-full bg-[#242636] border border-gray-700 rounded-xl py-2.5 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors font-mono text-sm" value={cardDetails.number} maxLength={19} onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})} />
                        <CreditCard className="absolute right-3 top-3 text-gray-500" size={16} />
                    </div>
                 </div>
                 <div>
                    <label className="text-[10px] text-gray-400 font-bold mb-1.5 block text-right">اسم حامل البطاقة</label>
                    <div className="relative">
                        <input type="text" placeholder="الاسم المطبوع" className="w-full bg-[#242636] border border-gray-700 rounded-xl py-2.5 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors uppercase text-sm" value={cardDetails.name} onChange={(e) => setCardDetails({...cardDetails, name: e.target.value})} />
                        <User className="absolute right-3 top-3 text-gray-500" size={16} />
                    </div>
                 </div>
                 <div className="flex gap-3">
                    <div className="relative flex-1">
                        <label className="text-[10px] text-gray-400 font-bold mb-1.5 block text-right">تاريخ الانتهاء</label>
                        <input type="text" placeholder="MM/YY" maxLength={5} className="w-full bg-[#242636] border border-gray-700 rounded-xl py-2.5 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors font-mono text-sm" value={cardDetails.expiry} onChange={(e) => {
                              const inputVal = e.target.value;
                              const isDeleting = inputVal.length < cardDetails.expiry.length;
                              if (isDeleting) { setCardDetails({...cardDetails, expiry: inputVal}); return; }
                              let clean = inputVal.replace(/\D/g, '');
                              if (clean.length > 4) clean = clean.slice(0, 4);
                              if (clean.length >= 2) clean = clean.slice(0, 2) + '/' + clean.slice(2);
                              setCardDetails({...cardDetails, expiry: clean});
                        }} />
                        <Calendar className="absolute right-3 top-3 text-gray-500" size={16} />
                     </div>
                     <div className="relative flex-1">
                        <label className="text-[10px] text-gray-400 font-bold mb-1.5 block text-right">CVV</label>
                        <input type="text" placeholder="123" maxLength={3} className="w-full bg-[#242636] border border-gray-700 rounded-xl py-2.5 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors font-mono text-sm" value={cardDetails.cvv} onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})} />
                        <Lock className="absolute right-3 top-3 text-gray-500" size={16} />
                     </div>
                  </div>
          </div>
          <button onClick={() => { if (isSubmitting) return; setIsSubmitting(true); if (onPurchase) { onPurchase(product.name, currentPrice, product.apiConfig?.type || 'manual', regionObj?.name, denomObj?.label, product.category, product.id, selectedRegion, selectedDenomId, customInputValue.trim(), activeCustomInput?.label, 'card'); onClose(); } }} disabled={isSubmitting} className={`w-full font-bold py-3 rounded-xl mt-6 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'}`}>
              <CheckCircle size={18} />
              {isSubmitting ? 'جاري المعالجة...' : `دفع ${formatPrice(currentPrice)}`}
          </button>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
      <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}></div>
      <div className={`bg-[#1f212e] w-full max-w-md sm:rounded-3xl rounded-t-3xl relative z-10 max-h-[85vh] flex flex-col shadow-2xl border-t border-gray-700 h-auto sm:mb-0 mb-safe transform transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} ${isDragging ? 'duration-0 transition-none' : ''}`} style={{ transform: translateY > 0 ? `translate3d(0, ${translateY}px, 0)` : 'translate3d(0, 0, 0)', willChange: 'transform, opacity' }}>
        <div className="relative">
          <div className="w-full flex justify-center pt-2 pb-0.5 cursor-grab active:cursor-grabbing" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-50"></div>
          </div>
          <button onClick={onClose} className="absolute top-3 left-4 z-50 p-1.5 bg-[#242636]/80 hover:bg-[#2f3245] rounded-full text-gray-400 hover:text-white border border-gray-700/50 backdrop-blur-md transition-all shadow-lg active:scale-95"><X size={18} /></button>
        </div>
        {currentStep === 'details' ? renderDetails() : currentStep === 'payment_select' ? renderPaymentSelect() : renderCardForm()}
      </div>
    </div>
  );
};

export default ProductDetailsModal;
