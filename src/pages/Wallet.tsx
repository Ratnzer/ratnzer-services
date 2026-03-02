import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, X, Calendar, Lock, User, ChevronLeft, Smartphone, Zap, Gem, Headset, Send, Wallet as WalletIcon, ArrowLeft, CheckCircle } from 'lucide-react';
import { View, Transaction } from '../types';
import { settingsService, walletTopupService } from '../services/api';

interface Props {
  setView: (view: View) => void;
  formatPrice: (price: number) => string;
  balance: number;
  onAddBalance?: (amount: number, paymentMethod: string, paymentDetails?: any) => Promise<boolean>;
  transactions: Transaction[];
  onRefreshTransactions?: (mode?: 'replace' | 'append') => Promise<void> | void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

const Wallet: React.FC<Props> = ({ 
  setView, 
  formatPrice, 
  balance, 
  onAddBalance, 
  transactions, 
  onRefreshTransactions,
  hasMore = false,
  loadingMore = false
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modal Step State
  const [modalStep, setModalStep] = useState<'select' | 'card' | 'support' | 'asiacell'>('select');
  const [selectedMethodName, setSelectedMethodName] = useState('');
  const [selectedMethodIcon, setSelectedMethodIcon] = useState<any>(null); 

  const [amountToAdd, setAmountToAdd] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); 

  // Asiacell card topup state
  const [cardNumber, setCardNumber] = useState('');
  const [cardNumberError, setCardNumberError] = useState('');
  const [topupSuccess, setTopupSuccess] = useState(false);

  // Drag to dismiss state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeMethods, setActiveMethods] = useState<string[]>(() => {
    const all = ['card', 'superkey', 'zaincash', 'asiacell_transfer'];
    return all.filter(id => localStorage.getItem(`payment_method_${id}_enabled`) !== 'false');
  });

  const minSwipeDistance = 100;

  useEffect(() => {
    const syncPaymentSettings = async () => {
      const methods = ['card', 'superkey', 'zaincash', 'asiacell_transfer'];
      try {
        const results = await Promise.all(methods.map(async (id) => {
          const key = `payment_method_${id}_enabled`;
          try {
            const res = await settingsService.get(key);
            const val = res?.data !== undefined ? res.data : res;
            if (val !== null && val !== undefined) {
              const isEnabled = String(val) !== 'false';
              localStorage.setItem(key, String(isEnabled));
              return isEnabled ? id : null;
            }
          } catch (e) {}
          return localStorage.getItem(key) !== 'false' ? id : null;
        }));
        
        const enabledIds = results.filter((id): id is string => id !== null);
        setActiveMethods(enabledIds);
      } catch (e) {}
    };
    
    if (showAddBalanceModal) {
      syncPaymentSettings();
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showAddBalanceModal]);

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
        setShowAddBalanceModal(false);
        setTranslateY(0);
        setTouchStart(null);
        setTouchEnd(null);
      }, 300);
    } else {
      setTranslateY(0);
    }
  };

  const filters = [
    { id: 'All', label: 'الجميع' },
    { id: 'Visa', label: 'Visa' },
    { id: 'Mastercard', label: 'Mastercard' }
  ];

  const filteredTransactions = transactions.filter((tx) => {
    if (activeFilter === 'All') return true;
    return tx.title.toLowerCase().includes(activeFilter.toLowerCase());
  });

  const handleRefresh = async () => {
    if (!onRefreshTransactions) return;
    setRefreshing(true);
    try {
      await onRefreshTransactions('replace');
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (!onRefreshTransactions) return;
    await onRefreshTransactions('append');
  };

  const handleConfirmAddBalance = async () => {
      const value = parseFloat(amountToAdd);
      if (isNaN(value) || value <= 0) {
          alert('يرجى إدخال مبلغ صحيح');
          return;
      }

      const MIN_DEPOSIT = 1.0;
      if (value < MIN_DEPOSIT) {
          alert(`عذراً، الحد الأدنى للشحن هو ${formatPrice(MIN_DEPOSIT)}`);
          return;
      }

      if (!onAddBalance) return;
      setIsProcessing(true);
      const success = await onAddBalance(value, 'card');
      setIsProcessing(false);
      if (success) {
          setAmountToAdd('');
          setShowAddBalanceModal(false);
      }
  };

  const handleAsiacellCardSubmit = async () => {
    setCardNumberError('');
    
    // Validate card number
    const cleanCardNumber = cardNumber.replace(/\D/g, '');
    if (cleanCardNumber.length < 8 || cleanCardNumber.length > 18) {
      setCardNumberError('رقم الكارت يجب أن يكون بين 8 و 18 رقم');
      return;
    }

    setIsProcessing(true);
    try {
      await walletTopupService.createRequest({ cardNumber: cleanCardNumber });
      setTopupSuccess(true);
      setTimeout(() => {
        setCardNumber('');
        setTopupSuccess(false);
        setShowAddBalanceModal(false);
        setModalStep('select');
      }, 2000);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'فشل إرسال الطلب';
      setCardNumberError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const openWhatsApp = () => {
      window.open('https://wa.me/9647763410970', '_blank');
  };

  const openTelegram = () => {
      window.open("https://t.me/ratnzer", "_blank");
  };

  const paymentMethods = [
      { 
        id: 'card', 
        name: 'بطاقة الماستر أو الفيزا', 
        icon: CreditCard, 
        color: 'text-blue-400', 
        bg: 'from-blue-500/20 to-blue-600/5', 
        border: 'border-blue-500/30',
        desc: 'دفع فوري وآمن'
      },
      { 
        id: 'superkey', 
        name: 'سوبركي', 
        icon: Zap, 
        color: 'text-yellow-400', 
        bg: 'from-yellow-500/20 to-yellow-600/5', 
        border: 'border-yellow-500/30',
        desc: 'شحن عبر وكلاء سوبركي' 
      },
      { 
        id: 'zaincash', 
        name: 'زين كاش', 
        icon: WalletIcon, 
        color: 'text-pink-500', 
        bg: 'from-pink-500/20 to-pink-600/5', 
        border: 'border-pink-500/30',
        desc: 'المحفظة الإلكترونية' 
      },
      { 
        id: 'asiacell_transfer', 
        name: 'الشحن عبر اسياسيل', 
        icon: Send, 
        color: 'text-red-600', 
        bg: 'from-red-600/20 to-red-700/5', 
        border: 'border-red-600/30',
        desc: 'تحويل رصيد مباشر' 
      },
  ].filter(method => activeMethods.includes(method.id));

  const handleMethodSelect = (method: typeof paymentMethods[0]) => {
      if (method.id === 'card') {
          setModalStep('card');
      } else if (method.id === 'asiacell_transfer') {
          setModalStep('asiacell');
          setCardNumber('');
          setCardNumberError('');
          setTopupSuccess(false);
      } else {
          setSelectedMethodName(method.name);
          setSelectedMethodIcon(method.icon);
          setModalStep('support');
      }
  };

  return (
    <div className="min-h-screen pb-36 pt-4 relative will-change-scroll">
      <div className="px-4 mb-4 flex items-center justify-between">
        {onRefreshTransactions ? (
          <button onClick={handleRefresh} className="text-xs bg-[#242636] text-gray-200 px-3 py-2 rounded-lg border border-gray-700 active:scale-95 transition-transform" disabled={refreshing}>
            {refreshing ? "جاري التحديث..." : "تحديث"}
          </button>
        ) : (
          <div className="w-10"></div>
        )}
        <h1 className="text-xl font-bold text-white">محفظتي</h1>
        <button onClick={() => setView(View.HOME)} className="active:scale-95 transition-transform"><ArrowLeft className="text-white" /></button>
      </div>

      <div className="px-4 space-y-5">
        <div className="bg-[#242636] rounded-2xl p-0 overflow-hidden shadow-lg border border-gray-800">
           <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-8 flex flex-col items-center justify-center text-white relative shadow-inner">
              <div className="text-center z-10">
                <p className="text-sm font-bold mb-1 opacity-90 text-green-50">رصيد محفظتك الحالي</p>
                <div className="flex items-center justify-center gap-1">
                   <span className="text-4xl font-black dir-ltr tracking-wider drop-shadow-md">{formatPrice(balance)}</span>
                </div>
              </div>
              <div className="absolute top-0 left-0 w-full h-full opacity-15" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
           </div>

           <div className="flex p-4 bg-[#242636]">
              <button 
                onClick={() => {
                    setAmountToAdd('');
                    setModalStep('select');
                    setShowAddBalanceModal(true);
                }}
                className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-3.5 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 transform"
              >
                <Plus size={18} strokeWidth={3} />
                إضافة رصيد
              </button>
           </div>
        </div>

        <div>
          <h3 className="text-right font-bold text-white mb-4">تسلسل العمليات</h3>
          <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
             {filters.map((filter) => (
               <button
                 key={filter.id}
                 onClick={() => setActiveFilter(filter.id)}
                 className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-sm transition-all border touch-manipulation active:scale-95 ${
                   activeFilter === filter.id
                     ? 'bg-[#10B981] text-white border-[#10B981]' 
                     : 'bg-[#242636] text-gray-400 border-gray-700 hover:border-gray-500'
                 }`}
               >
                 {filter.label}
               </button>
             ))}
          </div>

          <div className="space-y-3">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx: Transaction) => {
                const IconComponent = tx.icon || CreditCard;
                return (
                <div key={tx.id} className="bg-[#1e1f2b] p-4 rounded-xl flex items-center justify-between border border-gray-800 shadow-sm hover:border-gray-700 transition-colors animate-fadeIn will-change-transform">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#252836] flex items-center justify-center text-gray-400 border border-gray-700">
                       <IconComponent size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white mb-1">{tx.title}</h4>
                      <p className="text-[10px] text-gray-500 select-all font-mono">ID: {tx.id}</p>
                      <p className="text-[10px] text-gray-500 dir-ltr text-right">{tx.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold text-sm ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatPrice(tx.amount)}
                    </span>
                  </div>
                </div>
              );
              })
            ) : (
              <div className="text-center py-12 text-gray-500">لا توجد عمليات</div>
            )}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <button 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="bg-yellow-400 text-black px-6 py-2 rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
              >
                {loadingMore ? 'جاري التحميل...' : 'عرض المزيد'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Balance Modal */}
      {showAddBalanceModal && (
        <div 
          className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => !isDragging && setShowAddBalanceModal(false)}
        >
          <div 
            className={`w-full bg-[#13141f] rounded-t-3xl border-t border-gray-700 shadow-2xl transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ transform: `translateY(${translateY}px)` }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <div className="flex justify-between items-center mb-6">
                <button 
                  onClick={() => setShowAddBalanceModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
                <h2 className="text-xl font-bold text-white">إضافة رصيد</h2>
                <div className="w-6"></div>
              </div>

              {/* STEP 1: SELECT METHOD */}
              {modalStep === 'select' && (
                <div className="space-y-3 animate-fadeIn">
                  {paymentMethods.map(method => (
                    <button
                      key={method.id}
                      onClick={() => handleMethodSelect(method)}
                      className={`w-full p-4 rounded-2xl border-2 transition-all bg-gradient-to-br ${method.bg} ${method.border} hover:border-yellow-400 active:scale-95`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl bg-black/20 ${method.color}`}>
                          {React.createElement(method.icon, { size: 24 })}
                        </div>
                        <div className="text-right flex-1">
                          <h3 className="font-bold text-white">{method.name}</h3>
                          <p className="text-xs text-gray-400">{method.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* STEP 2: SUPPORT MESSAGE (WhatsApp & Telegram) */}
              {modalStep === 'support' && (
                <div className="flex flex-col items-center justify-center py-6 animate-fadeIn text-center">
                  <div className="w-24 h-24 bg-[#242636] rounded-full flex items-center justify-center mb-6 border border-gray-700 shadow-xl relative">
                    {selectedMethodIcon ? 
                      React.createElement(selectedMethodIcon, { size: 40, className: "text-yellow-400" }) : 
                      <Headset size={40} className="text-yellow-400" />
                    }
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">إيداع عبر {selectedMethodName}</h3>
                  <p className="text-gray-400 text-sm mb-8 leading-relaxed max-w-xs mx-auto">
                    لإتمام عملية شحن الرصيد عبر <span className="text-yellow-400 font-bold">{selectedMethodName}</span>، يرجى التواصل مباشرة مع فريق الدعم الفني لتزويدك بالتفاصيل اللازمة.
                  </p>
                  
                  <div className="w-full space-y-3">
                    <button 
                      onClick={openWhatsApp}
                      className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 group"
                    >
                      <Smartphone size={22} className="group-hover:rotate-12 transition-transform" />
                      <span className="text-base">تواصل عبر واتساب</span>
                    </button>
                    <button 
                      onClick={openTelegram}
                      className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95 group"
                    >
                      <Send size={22} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                      <span className="text-base">تواصل عبر تيليجرام</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CARD (PayTabs Redirect) */}
              {modalStep === 'card' && (
                <div className="animate-fadeIn">
                  <div className="mb-4">
                    <label className="text-xs font-bold text-gray-400 mb-2 block text-right">المبلغ المراد شحنه</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="0.00"
                        className="w-full bg-[#13141f] border border-gray-700 rounded-xl py-3 pr-4 pl-12 text-white text-xl font-bold focus:border-yellow-400 focus:outline-none transition-colors text-right dir-ltr touch-manipulation"
                        value={amountToAdd}
                        onChange={(e) => setAmountToAdd(e.target.value)}
                      />
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">$</div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-300 text-right leading-relaxed">
                    سيتم تحويلك إلى صفحة الدفع الآمنة لإدخال بيانات البطاقة (Visa / Mastercard).
                  </div>
                  <button 
                    className={`w-full bg-emerald-500 text-white font-bold py-4 rounded-xl mt-8 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95 transform flex items-center justify-center gap-2 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                    onClick={handleConfirmAddBalance}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>جاري المعالجة...</span>
                      </>
                    ) : (
                      'متابعة الدفع'
                    )}
                  </button>
                </div>
              )}

              {/* STEP 4: ASIACELL CARD */}
              {modalStep === 'asiacell' && (
                <div className="animate-fadeIn">
                  {topupSuccess ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border-2 border-emerald-500">
                        <CheckCircle size={40} className="text-emerald-500" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">تم إرسال الطلب بنجاح!</h3>
                      <p className="text-gray-400 text-sm">سيتم مراجعة طلبك من قبل الأدمن قريباً</p>
                    </div>
                  ) : (
                    <>
                      <label className="text-xs font-bold text-gray-400 mb-2 block text-right">رقم كارت أسياسيل</label>
                      <div className="mb-4">
                        <input 
                          type="text" 
                          placeholder="أدخل رقم الكارت (8-18 رقم)"
                          className={`w-full bg-[#13141f] border rounded-xl py-3 px-4 text-white text-lg font-bold focus:outline-none transition-colors text-right dir-ltr touch-manipulation ${cardNumberError ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-yellow-400'}`}
                          value={cardNumber}
                          onChange={(e) => {
                            setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 18));
                            setCardNumberError('');
                          }}
                          maxLength={18}
                        />
                      </div>
                      {cardNumberError && (
                        <p className="text-red-400 text-xs mb-4 text-right">{cardNumberError}</p>
                      )}
                      <div className="mb-4 text-sm text-gray-300 text-right leading-relaxed bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                        <p className="font-bold text-blue-400 mb-1">ملاحظة مهمة:</p>
                        <p>سيتم إرسال طلبك للأدمن للمراجعة والموافقة. بعد الموافقة، سيتم إضافة الرصيد مباشرة إلى محفظتك.</p>
                      </div>
                      <button 
                        className={`w-full bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 transform flex items-center justify-center gap-2 ${isProcessing || !cardNumber ? 'opacity-70 cursor-not-allowed' : ''}`}
                        onClick={handleAsiacellCardSubmit}
                        disabled={isProcessing || !cardNumber}
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>جاري الإرسال...</span>
                          </>
                        ) : (
                          <>
                            <Send size={18} />
                            <span>إرسال الطلب</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Wallet;
