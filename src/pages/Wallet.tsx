import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, X, Calendar, Lock, User, ChevronLeft, Smartphone, Zap, Gem, Headset, Send, Wallet as WalletIcon, ArrowLeft } from 'lucide-react';
import { View, Transaction } from '../types';
import { settingsService } from '../services/api';

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
  const [modalStep, setModalStep] = useState<'select' | 'card' | 'support'>('select');
  const [selectedMethodName, setSelectedMethodName] = useState('');
  const [selectedMethodIcon, setSelectedMethodIcon] = useState<any>(null); 

  const [amountToAdd, setAmountToAdd] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); 

  // Drag to dismiss state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const minSwipeDistance = 100;

  useEffect(() => {
    const syncPaymentSettings = async () => {
      const methods = ['card', 'superkey', 'zaincash', 'asiacell', 'asiacell_transfer'];
      try {
        await Promise.all(methods.map(async (id) => {
          const key = `payment_method_${id}_enabled`;
          try {
            const res = await settingsService.get(key);
            if (res !== null) {
              localStorage.setItem(key, String(res));
            }
          } catch (e) {}
        }));
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
  ].filter(method => localStorage.getItem(`payment_method_${method.id}_enabled`) !== 'false');

  const handleMethodSelect = (method: typeof paymentMethods[0]) => {
      if (method.id === 'card') {
          setModalStep('card');
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
                  <div className="flex flex-col items-end">
                    <span className={`font-bold text-sm dir-ltr ${tx.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                      {tx.type === 'credit' ? '+' : ''} {formatPrice(tx.amount)}
                    </span>
                    <p className="text-[10px] text-gray-500 mt-1">الحالة</p>
                    <p className={`text-[10px] font-bold ${tx.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                        {tx.status === 'completed' ? 'مكتملة' : 'قيد الانتظار'}
                    </p>
                  </div>
                </div>
              )})
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm bg-[#1e1f2b] rounded-xl border border-dashed border-gray-800">
                لا توجد عمليات {activeFilter !== 'All' ? `بواسطة ${activeFilter}` : ''}
              </div>
            )}
            {hasMore && (
              <div className="flex justify-center pt-3">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-xl bg-[#242636] border border-gray-700 text-gray-200 text-sm font-bold hover:bg-[#2f3245] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      جاري التحميل...
                    </>
                  ) : (
                    'عرض المزيد'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddBalanceModal && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
           {/* Backdrop */}
           <div 
             className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`} 
             onClick={() => setShowAddBalanceModal(false)}
           ></div>
           
           {/* Modal Content */}
           <div 
             className={`bg-[#1f212e] w-full max-w-md rounded-t-3xl p-6 pb-24 relative z-10 border-t border-gray-800 max-h-[85vh] flex flex-col transform transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} ${isDragging ? 'duration-0 transition-none' : ''}`}
             style={{ 
               transform: translateY > 0 ? `translate3d(0, ${translateY}px, 0)` : 'translate3d(0, 0, 0)',
               willChange: 'transform, opacity'
             }}
           >
              {/* Handle Bar & Close Button */}
              <div className="relative mb-6">
                <div 
                  className="w-full flex justify-center pt-2 pb-4 cursor-grab active:cursor-grabbing"
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  <div className="w-12 h-1.5 bg-gray-600 rounded-full opacity-50"></div>
                </div>
                
                {modalStep === 'select' ? (
                    <button 
                      onClick={() => setShowAddBalanceModal(false)} 
                      className="absolute top-0 left-0 p-2 bg-[#242636]/80 hover:bg-[#2f3245] rounded-full text-gray-400 hover:text-white border border-gray-700/50 backdrop-blur-md transition-all active:scale-95"
                    >
                        <X size={20} strokeWidth={2} />
                    </button>
                ) : (
                    <button 
                      onClick={() => setModalStep('select')} 
                      className="absolute top-0 left-0 p-2 bg-[#242636]/80 hover:bg-[#2f3245] rounded-full text-gray-400 hover:text-white border border-gray-700/50 backdrop-blur-md transition-all active:scale-95 flex items-center gap-1 text-xs font-bold"
                    >
                        <ChevronLeft size={16} /> رجوع
                    </button>
                )}
                
                <h2 className="text-center text-lg font-bold text-white">
                    {modalStep === 'select' ? 'طريقة الدفع' : modalStep === 'card' ? 'الدفع عبر البطاقة' : 'تواصل مع الدعم'}
                </h2>
              </div>

              <div className="overflow-y-auto no-scrollbar">
                {/* STEP 1: SELECT METHOD */}
                {modalStep === 'select' && (
                    <div className="space-y-3 animate-fadeIn pb-4">
                        {paymentMethods.map((method) => (
                            <button
                                key={method.id}
                                onClick={() => handleMethodSelect(method)}
                                className={`w-full bg-gradient-to-r ${method.bg} p-4 rounded-2xl flex items-center justify-between border ${method.border} hover:opacity-90 transition-all group active:scale-95 shadow-sm touch-manipulation`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-[#242636] shadow-inner ${method.color}`}>
                                        <method.icon size={24} strokeWidth={1.5} />
                                    </div>
                                    <div className="text-right">
                                        <span className="font-bold text-sm text-white block">{method.name}</span>
                                        <span className="text-[10px] text-gray-400 font-bold">{method.desc}</span>
                                    </div>
                                </div>
                                <div className="bg-[#242636]/50 p-2 rounded-lg text-gray-400 group-hover:text-white transition-colors">
                                   <ChevronLeft size={18} />
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
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Wallet;
