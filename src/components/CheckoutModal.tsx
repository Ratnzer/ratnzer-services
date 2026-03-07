
import React, { useState, useEffect } from 'react';
import { X, Wallet, CreditCard, ArrowLeft, Calendar, User, Lock, CheckCircle, Wifi } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  price: number;
  userBalance: number;
  onSuccess: (method: 'wallet' | 'card') => void;
  formatPrice: (price: number) => string;
  onRequireLogin?: () => void; // Optional fallback
}

const CheckoutModal: React.FC<Props> = ({ isOpen, onClose, itemName, price, userBalance, onSuccess, formatPrice }) => {
  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'card' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Drag to dismiss state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const minSwipeDistance = 100;

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

  if (!isOpen) return null;

  const handleProceed = () => {
    if (!selectedMethod || isSubmitting) return;

    setIsSubmitting(true);

    if (selectedMethod === 'wallet') {
        if (userBalance < price) {
            alert('عذراً، رصيد المحفظة غير كافي لإتمام العملية.');
            return;
        }
        // Direct purchase without confirmation
        onSuccess('wallet');
        onClose();
    } else if (selectedMethod === 'card') {
        // ✅ PayTabs flow (redirect handled by parent)
        onSuccess('card');
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div 
        className={`bg-[#1f212e] w-full max-w-md sm:rounded-3xl rounded-t-3xl relative z-10 flex flex-col shadow-2xl border-t border-gray-700 max-h-[85vh] mb-0 sm:mb-0 pb-safe transform transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} ${isDragging ? 'duration-0 transition-none' : ''}`}
        style={{ 
          transform: translateY > 0 ? `translate3d(0, ${translateY}px, 0)` : 'translate3d(0, 0, 0)',
          willChange: 'transform, opacity'
        }}
      >
        
        {/* Handle Bar & Close Button */}
        <div className="relative">
          <div 
            className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-50"></div>
          </div>
          
          <button 
            onClick={onClose}
            className="absolute top-4 left-4 p-2 bg-[#242636]/80 hover:bg-[#2f3245] rounded-full text-gray-400 hover:text-white border border-gray-700/50 backdrop-blur-md transition-all active:scale-95"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Header Title */}
        <div className="flex items-center justify-center p-4">
           <h2 className="text-lg font-bold text-white">إتمام الطلب</h2>
        </div>

        <div className="p-6 space-y-6 flex flex-col h-full">
              <div className="text-center mb-2">
                 <p className="text-gray-400 text-xs mb-1">أنت على وشك شراء</p>
                 <h3 className="text-white font-bold text-lg dir-rtl">{itemName}</h3>
                 <p className="text-yellow-400 font-black text-2xl mt-2 dir-ltr font-mono">{formatPrice(price)}</p>
              </div>

              <div className="space-y-3 flex-1">
                 <p className="text-right text-xs font-bold text-gray-400">اختر طريقة الدفع</p>
                 
                 {/* Wallet Option */}
                 <button 
                   onClick={() => {
                       if (userBalance >= price) {
                           setSelectedMethod('wallet');
                       } else {
                           alert('عذراً، رصيد المحفظة غير كافي لإتمام العملية.');
                       }
                   }}
                   className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group relative overflow-hidden ${
                       selectedMethod === 'wallet' 
                       ? 'bg-yellow-400/10 border-yellow-400' 
                       : 'bg-[#242636] border-gray-700 hover:border-gray-500'
                   } ${userBalance < price ? 'opacity-80' : 'cursor-pointer'}`}
                 >
                    <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${selectedMethod === 'wallet' ? 'bg-yellow-400 text-black' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            <Wallet size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className={`font-bold text-sm ${selectedMethod === 'wallet' ? 'text-yellow-400' : 'text-white'}`}>محفظتي</h3>
                            <p className="text-gray-400 text-xs mt-1 dir-ltr text-right font-mono">
                                Balance: {formatPrice(userBalance)}
                            </p>
                        </div>
                    </div>
                    {selectedMethod === 'wallet' && <div className="absolute top-4 left-4 text-yellow-400"><CheckCircle size={20} /></div>}
                    {userBalance < price && (
                        <span className="text-[10px] text-red-500 bg-red-500/10 px-2 py-1 rounded font-bold absolute top-4 left-4">رصيد غير كافي</span>
                    )}
                 </button>

                 {/* Card Option */}
                 <button 
                   onClick={() => setSelectedMethod('card')}
                   className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group relative overflow-hidden ${
                       selectedMethod === 'card' 
                       ? 'bg-yellow-400/10 border-yellow-400' 
                       : 'bg-[#242636] border-gray-700 hover:border-gray-500'
                   }`}
                 >
                    <div className="flex items-center gap-4 relative z-10">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors overflow-hidden ${selectedMethod === 'card' ? 'bg-yellow-400 text-black' : 'bg-blue-500/10 text-blue-500'}`}>
                            {localStorage.getItem('payment_method_card_icon') ? (
                                <img src={localStorage.getItem('payment_method_card_icon') || ''} alt="Card" className="w-full h-full object-contain p-2" />
                            ) : (
                                <CreditCard size={24} />
                            )}
                        </div>
                        <div className="text-right">
                            <h3 className={`font-bold text-sm ${selectedMethod === 'card' ? 'text-yellow-400' : 'text-white'}`}>بطاقة مصرفية</h3>

                        </div>
                    </div>
                    {selectedMethod === 'card' && <div className="absolute top-4 left-4 text-yellow-400"><CheckCircle size={20} /></div>}
                 </button>
              </div>

              <div className="pt-4 mt-auto pb-4">
                  <button 
                    onClick={handleProceed}
                    disabled={!selectedMethod || isSubmitting}
                    className={`w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 ${
                        selectedMethod && !isSubmitting
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' 
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? 'جاري المعالجة...' : 'اكمال الدفع'}
                  </button>
              </div>
           </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
