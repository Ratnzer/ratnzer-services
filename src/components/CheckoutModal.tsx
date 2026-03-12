
import React, { useState, useEffect } from 'react';
import { X, Wallet, CreditCard, ArrowLeft, Calendar, User, Lock, CheckCircle, Wifi } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  price: number;
  userBalance: number;
  onSuccess: (method: 'wallet' | 'card' | 'pi') => void;
  formatPrice: (price: number) => string;
  onRequireLogin?: () => void; // Optional fallback
  title?: string; // ✅ New optional title prop
}

const CheckoutModal: React.FC<Props> = ({ isOpen, onClose, itemName, price, userBalance, onSuccess, formatPrice, title }) => {
  const isPiUser = localStorage.getItem('user_email')?.endsWith('@pi.network');
  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'card' | 'pi' | null>(isPiUser ? 'pi' : null);
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
            setIsSubmitting(false);
            return;
        }
        // Direct purchase without confirmation
        onSuccess('wallet');
        onClose();
    } else if (selectedMethod === 'card') {
        // ✅ PayTabs flow (redirect handled by parent)
        onSuccess('card');
        onClose();
    } else if (selectedMethod === 'pi') {
        // ✅ Pi Network flow (handled by parent)
        onSuccess('pi');
        onClose();
    }
  };

	  return (
	    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center">
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
        
	        {/* Handle Bar */}
	        <div 
	          className="w-full flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing"
	          onTouchStart={onTouchStart}
	          onTouchMove={onTouchMove}
	          onTouchEnd={onTouchEnd}
	        >
	          <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-50"></div>
	        </div>
	
		        {/* Header Title & Actions */}
		        <div className="relative px-4 py-3 border-b border-gray-800/50 min-h-[56px] flex items-center justify-center">
		           {/* Left: Close Button (X) - Absolute for no interference */}
		           <button 
		             onClick={(e) => {
		                 e.preventDefault();
		                 e.stopPropagation();
		                 onClose();
		             }}
		             className="absolute left-4 p-2 bg-[#242636] hover:bg-[#2f3245] rounded-full text-gray-400 hover:text-white border border-gray-700/50 transition-all active:scale-90 z-[130] flex items-center justify-center"
		             aria-label="Close"
		           >
		             <X size={20} strokeWidth={2.5} />
		           </button>
		
		           {/* Center: Title */}
		           <h2 className="text-base font-bold text-white text-center">
		             {title || 'إتمام الطلب'}
		           </h2>
		
		           {/* Right: Back Button - Absolute for no interference */}
		           <button 
		             onClick={(e) => {
		                 e.preventDefault();
		                 e.stopPropagation();
		                 onClose();
		             }}
		             className="absolute right-4 flex items-center gap-1.5 text-gray-400 hover:text-white transition-all active:scale-95 bg-[#242636]/50 px-3 py-1.5 rounded-lg border border-gray-700/30 z-[130]"
		           >
		             <span className="text-[11px] font-bold">رجوع</span>
		             <ArrowLeft size={16} />
		           </button>
		        </div>

        <div className="px-4 pb-4 pt-1 space-y-2 flex flex-col h-full">
              {/* Item Info - Reduced Margins */}
              <div className="text-center mb-1">
                 <p className="text-gray-400 text-[11px] mb-0.5">أنت على وشك شراء</p>
                 <h3 className="text-white font-bold text-base dir-rtl leading-tight">{itemName}</h3>
                 <p className="text-yellow-400 font-black text-xl mt-1 dir-ltr font-mono">{formatPrice(price)}</p>
              </div>

              {/* Payment Methods - Reduced Spacing */}
              <div className="space-y-2 flex-1">
                 <p className="text-right text-[10px] font-bold text-gray-400 mb-1">اختر طريقة الدفع</p>
                 
	                 {/* Wallet Option */}
	                 <button 
	                   onClick={() => {
	                       if (userBalance >= price) {
	                           setSelectedMethod('wallet');
	                       } else {
	                           alert('عذراً، رصيد المحفظة غير كافي لإتمام العملية.');
	                       }
	                   }}
	                   className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between group relative overflow-hidden ${
	                       selectedMethod === 'wallet' 
	                       ? 'bg-yellow-400/10 border-yellow-400' 
	                       : 'bg-[#242636] border-gray-700 hover:border-gray-500'
	                   } ${userBalance < price ? 'opacity-80' : 'cursor-pointer'}`}
	                 >
	                    <div className="flex items-center gap-3 relative z-10">
	                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${selectedMethod === 'wallet' ? 'bg-yellow-400 text-black' : 'bg-emerald-500/10 text-emerald-500'}`}>
	                            <Wallet size={18} />
	                        </div>
	                        <div className="text-right">
	                            <h3 className={`font-bold text-xs ${selectedMethod === 'wallet' ? 'text-yellow-400' : 'text-white'}`}>محفظتي</h3>
	                            <p className="text-gray-400 text-[10px] mt-0.5 dir-ltr text-right font-mono">
	                                الرصيد: {formatPrice(userBalance)}
	                            </p>
	                        </div>
	                    </div>
	                    {selectedMethod === 'wallet' && <div className="absolute top-2.5 left-3 text-yellow-400"><CheckCircle size={14} /></div>}
	                    {userBalance < price && (
	                        <span className="text-[8px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded font-bold absolute top-2.5 left-3">غير كافي</span>
	                    )}
	                 </button>
	
	                 {/* Card Option */}
	                 {!isPiUser && (
	                     <button 
	                       onClick={() => setSelectedMethod('card')}
	                       className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between group relative overflow-hidden ${
	                           selectedMethod === 'card' 
	                           ? 'bg-yellow-400/10 border-yellow-400' 
	                           : 'bg-[#242636] border-gray-700 hover:border-gray-500'
	                       }`}
	                     >
	                        <div className="flex items-center gap-3 relative z-10">
	                            <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors overflow-hidden ${selectedMethod === 'card' ? 'bg-yellow-400 text-black' : 'bg-blue-500/10 text-blue-500'}`}>
	                                {localStorage.getItem('payment_method_card_icon') ? (
	                                    <img src={localStorage.getItem('payment_method_card_icon') || ''} alt="Card" className="w-full h-full object-cover rounded-full" />
	                                ) : (
	                                    <CreditCard size={18} />
	                                )}
	                            </div>
	                            <div className="text-right">
	                                <h3 className={`font-bold text-xs ${selectedMethod === 'card' ? 'text-yellow-400' : 'text-white'}`}>بطاقة مصرفية</h3>
	                                <p className="text-gray-400 text-[10px] mt-0.5">دفع فوري وآمن</p>
	                            </div>
	                        </div>
	                        {selectedMethod === 'card' && <div className="absolute top-2.5 left-3 text-yellow-400"><CheckCircle size={14} /></div>}
	                     </button>
	                 )}

                 {/* Pi Network Option */}
                 <button 
                   onClick={() => setSelectedMethod('pi')}
                   className={`w-full p-2.5 rounded-xl border transition-all flex items-center justify-between group relative overflow-hidden ${
                       selectedMethod === 'pi' 
                       ? 'bg-yellow-400/10 border-yellow-400' 
                       : 'bg-[#242636] border-gray-700 hover:border-gray-500'
                   }`}
                 >
                    <div className="flex items-center gap-3 relative z-10">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors overflow-hidden ${selectedMethod === 'pi' ? 'bg-yellow-400 text-black' : 'bg-[#593B8B]/10 text-[#593B8B]'}`}>
	                            {localStorage.getItem('payment_method_pi_icon') ? (
	                                <img src={localStorage.getItem('payment_method_pi_icon') || ''} alt="Pi" className="w-full h-full object-cover rounded-full" />
	                            ) : (
                                <svg viewBox="176.2 47.4 530.8 530.7" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="441.6" cy="312.8" fill="white" r="227.4"/>
                                  <g fill="#593B8B">
                                    <path d="m441.6 142.2c-94.2 0-170.6 76.4-170.6 170.6s76.4 170.6 170.6 170.6 170.6-76.4 170.6-170.6-76.4-170.6-170.6-170.6zm0 312.8c-78.5 0-142.2-63.7-142.2-142.2s63.7-142.2 142.2-142.2 142.2 63.7 142.2 142.2-63.7 142.2-142.2 142.2z"/>
                                    <path d="m491.3 234.7h-99.4c-11.8 0-21.3 9.5-21.3 21.3v113.7c0 11.8 9.5 21.3 21.3 21.3h99.4c11.8 0 21.3-9.5 21.3-21.3v-113.7c0-11.8-9.5-21.3-21.3-21.3zm-7.1 127.9h-85.2v-99.4h85.2z"/>
                                  </g>
                                </svg>
                            )}
                        </div>
                        <div className="text-right">
	                            <h3 className={`font-bold text-xs ${selectedMethod === 'pi' ? 'text-yellow-400' : 'text-white'}`}>الدفع عبر Pi</h3>
                            <p className="text-gray-400 text-[10px] mt-0.5">متوفر في Pi Browser</p>
                        </div>
                    </div>
                    {selectedMethod === 'pi' && <div className="absolute top-2.5 left-3 text-yellow-400"><CheckCircle size={14} /></div>}
                 </button>
              </div>

              {/* Action Button - Reduced Padding */}
              <div className="pt-2 mt-auto pb-1">
                  <button 
                    onClick={handleProceed}
                    disabled={!selectedMethod || isSubmitting}
                    className={`w-full py-2.5 rounded-lg font-bold text-sm shadow-lg transition-all active:scale-95 ${
                        selectedMethod && !isSubmitting
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' 
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? 'جاري...' : 'اكمال الدفع'}
                  </button>
              </div>
           </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
