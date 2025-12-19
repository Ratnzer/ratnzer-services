
import React, { useState } from 'react';
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
  const [step, setStep] = useState<'method' | 'card'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'wallet' | 'card' | null>(null);
  
  // Card Form State
  const [cardDetails, setCardDetails] = useState({
      number: '',
      name: '',
      expiry: '',
      cvv: ''
  });

  if (!isOpen) return null;

  const handleProceed = () => {
    if (!selectedMethod) return;

    if (selectedMethod === 'wallet') {
        if (userBalance < price) {
            alert('عذراً، رصيد المحفظة غير كافي لإتمام العملية.');
            return;
        }
        // Direct purchase without confirmation
        onSuccess('wallet');
        onClose();
    } else if (selectedMethod === 'card') {
        setStep('card');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="bg-[#1f212e] w-full max-w-md sm:rounded-3xl rounded-t-3xl relative z-10 animate-slide-up flex flex-col shadow-2xl border-t border-gray-700 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
           <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
           <h2 className="text-lg font-bold text-white">إتمام الطلب</h2>
           <div className="w-5"></div>
        </div>

        {step === 'method' ? (
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
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${selectedMethod === 'card' ? 'bg-yellow-400 text-black' : 'bg-blue-500/10 text-blue-500'}`}>
                            <CreditCard size={24} />
                        </div>
                        <div className="text-right">
                            <h3 className={`font-bold text-sm ${selectedMethod === 'card' ? 'text-yellow-400' : 'text-white'}`}>بطاقة مصرفية</h3>
                            <div className="flex gap-1 mt-1 opacity-80">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4 bg-white rounded px-1" />
                                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-4 bg-white rounded px-1" />
                            </div>
                        </div>
                    </div>
                    {selectedMethod === 'card' && <div className="absolute top-4 left-4 text-yellow-400"><CheckCircle size={20} /></div>}
                 </button>
              </div>

              <div className="pt-4 mt-auto">
                  <button 
                    onClick={handleProceed}
                    disabled={!selectedMethod}
                    className={`w-full py-4 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-95 ${
                        selectedMethod 
                        ? 'bg-yellow-400 text-black hover:bg-yellow-500 shadow-yellow-400/20' 
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    اكمال الدفع
                  </button>
              </div>
           </div>
        ) : (
           <div className="p-6 overflow-y-auto max-h-[70vh] no-scrollbar">
               <div className="flex items-center gap-2 mb-4 cursor-pointer text-gray-400 hover:text-white" onClick={() => setStep('method')}>
                  <ArrowLeft size={18} />
                  <span className="text-sm font-bold">تغيير الطريقة</span>
               </div>

               <div className="space-y-4">
                  <div>
                     <label className="text-xs text-gray-400 font-bold mb-2 block text-right">رقم البطاقة</label>
                     <div className="relative">
                        <input 
                          type="text" 
                          placeholder="0000 0000 0000 0000"
                          className="w-full bg-[#242636] border border-gray-700 rounded-xl py-3 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors font-mono"
                          value={cardDetails.number}
                          onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                          maxLength={19}
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
                          maxLength={5}
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
                 onClick={() => { onSuccess('card'); onClose(); }}
                 className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl mt-8 shadow-lg shadow-emerald-500/20 active:scale-95 transform flex items-center justify-center gap-2"
               >
                 <CheckCircle size={18} />
                 دفع {formatPrice(price)}
               </button>
           </div>
        )}
      </div>
    </div>
  );
};

export default CheckoutModal;
