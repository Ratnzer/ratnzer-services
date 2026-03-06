import React, { useState, useEffect } from 'react';
import { Plus, CreditCard, X, Calendar, Lock, User, ChevronLeft, Smartphone, Zap, Gem, Headset, Send, Wallet as WalletIcon, ArrowLeft, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
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
  const [modalStep, setModalStep] = useState<'select' | 'card' | 'support' | 'asiacell' | 'pi'>('select');
  const [selectedMethodName, setSelectedMethodName] = useState('');
  const [selectedMethodIcon, setSelectedMethodIcon] = useState<any>(null); 

  const [amountToAdd, setAmountToAdd] = useState('');
  const [isProcessing, setIsProcessing] = useState(false); 

  // Asiacell card topup state
  const [cardNumber, setCardNumber] = useState('');
  const [cardNumberError, setCardNumberError] = useState('');
  const [topupSuccess, setTopupSuccess] = useState(false);
  const [banTimeLeft, setBanTimeLeft] = useState<number>(0);
  const [isBanned, setIsBanned] = useState(false);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (banTimeLeft <= 0) {
      setIsBanned(false);
      return;
    }
    const timer = setInterval(() => {
      setBanTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [banTimeLeft]);

  useEffect(() => {
    if (modalStep === 'asiacell') {
      const banUntil = localStorage.getItem('asiacell_ban_until');
      if (banUntil) {
        const remaining = Math.ceil((parseInt(banUntil) - Date.now()) / 1000);
        if (remaining > 0) {
          setBanTimeLeft(remaining);
          setIsBanned(true);
        } else {
          localStorage.removeItem('asiacell_ban_until');
          setIsBanned(false);
          setBanTimeLeft(0);
        }
      }
    }
  }, [modalStep]);

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

      // ✅ Handle Pi Network Payment
      if (modalStep === 'pi') {
          try {
              if (!window.Pi) throw new Error('Pi SDK غير متاح');
              
              const piAmount = value * 3; // 1 USD = 3 Pi
              
              const paymentData = {
                  amount: piAmount,
                  memo: `شحن رصيد المحفظة بمبلغ ${value}$`,
                  metadata: { amountUSD: value, type: 'wallet_topup' }
              };

              const callbacks = {
                  onReadyForServerApproval: async (paymentId: string) => {
                      // في بيئة حقيقية، يجب إرسال paymentId للخلفية للتحقق
                      console.log('Payment ready for approval:', paymentId);
                  },
                  onReadyForServerCompletion: async (paymentId: string, txid: string) => {
                      // تأكيد العملية في الخلفية وإضافة الرصيد
                      const success = await onAddBalance(value, 'pi', { paymentId, txid });
                      if (success) {
                          setAmountToAdd('');
                          setShowAddBalanceModal(false);
                      }
                  },
                  onCancel: (paymentId: string) => {
                      console.log('Payment cancelled:', paymentId);
                      setIsProcessing(false);
                  },
                  onError: (error: any, paymentId?: string) => {
                      console.error('Payment error:', error, paymentId);
                      alert('حدث خطأ أثناء الدفع عبر Pi');
                      setIsProcessing(false);
                  }
              };

              window.Pi.createPayment(paymentData, callbacks);
              return; // Do not proceed to standard onAddBalance yet
          } catch (error: any) {
              alert(error.message || 'فشل الاتصال بـ Pi Network');
              setIsProcessing(false);
              return;
          }
      }

      const success = await onAddBalance(value, 'card');
      setIsProcessing(false);
      if (success) {
          setAmountToAdd('');
          setShowAddBalanceModal(false);
      }
  };

  const handleAsiacellCardSubmit = async () => {
    if (isBanned) return;
    setCardNumberError('');
    const cleanCardNumber = cardNumber.replace(/\D/g, '');
    if (cleanCardNumber.length < 8 || cleanCardNumber.length > 18) {
      setCardNumberError('رقم الكارت يجب أن يكون بين 8 و 18 رقم');
      return;
    }
    const now = Date.now();
    const lastRequestTime = parseInt(localStorage.getItem('asiacell_last_request_time') || '0');
    const requestCountInMinute = parseInt(localStorage.getItem('asiacell_request_count') || '0');
    const lastCardNumber = localStorage.getItem('asiacell_last_card_number');
    if (cleanCardNumber === lastCardNumber) {
      const banUntil = now + 30 * 60 * 1000;
      localStorage.setItem('asiacell_ban_until', banUntil.toString());
      setIsBanned(true);
      setBanTimeLeft(30 * 60);
      setCardNumberError('تم حظرك لمدة 30 دقيقة بسبب محاولة إرسال نفس الرقم مكرراً');
      return;
    }
    let newCount = 1;
    if (now - lastRequestTime < 60000) {
      newCount = requestCountInMinute + 1;
    }
    if (newCount > 2) {
      const banUntil = now + 30 * 60 * 1000;
      localStorage.setItem('asiacell_ban_until', banUntil.toString());
      setIsBanned(true);
      setBanTimeLeft(30 * 60);
      setCardNumberError('تم حظرك لمدة 30 دقيقة بسبب إرسال الطلبات بسرعة كبيرة');
      return;
    }
    localStorage.setItem('asiacell_last_request_time', now.toString());
    localStorage.setItem('asiacell_request_count', newCount.toString());
    localStorage.setItem('asiacell_last_card_number', cleanCardNumber);
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
      { 
        id: 'pi', 
        name: 'شحن عبر Pi Network', 
        icon: () => (
          <svg viewBox="176.2 47.4 530.8 530.7" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
            <circle cx="441.6" cy="312.8" fill="white" r="227.4"/>
            <g fill="#593B8B">
              <path d="M441.6 47.4c-146.6 0-265.4 118.8-265.4 265.4S295 578.1 441.6 578.1 707 459.3 707 312.7 588.1 47.4 441.6 47.4zm0 492.8c-125.6 0-227.4-101.8-227.4-227.4S316 85.4 441.6 85.4 669 187.2 669 312.8 567.2 540.2 441.6 540.2z"/>
              <path d="M412 214h-34.5c-2.8 0-5-2.3-5-5v-25.2c0-2.8 2.3-5 5-5H412c2.8 0 5 2.3 5 5V209c.1 2.7-2.2 5-5 5zM493.5 214H459c-2.8 0-5-2.3-5-5v-25.2c0-2.8 2.3-5 5-5h34.5c2.8 0 5 2.3 5 5V209c0 2.7-2.2 5-5 5zM340.5 313.7h-45.4v-32.3s1.8-44.6 43.7-45.2h191.4v-26.3h45.6v25.4s-1.2 45.9-43.4 46.5l-33.8.9.5 156.2s.5 2.6-2.6 4.3l-35.2 12.5s-7.8 3.2-8.1-4.7V282H418v155.3s1 4.6-4.1 6.8l-32.3 11.4s-10.1 3.8-10-6.3V281.7h-30.9z"/>
            </g>
          </svg>
        ), 
        color: 'text-[#593B8B]', 
        bg: 'from-[#593B8B]/20 to-[#593B8B]/5', 
        border: 'border-[#593B8B]/30',
        desc: 'الدفع عبر Pi SDK' 
      },
  ].filter(method => method.id === 'pi' || activeMethods.includes(method.id));

  const handleMethodSelect = (method: typeof paymentMethods[0])      if (method.id === 'card') {
          setModalStep('card');
      } else if (method.id === 'pi') {
          setModalStep('pi');
      } else if (method.id === 'asiacell_transfer') {
          setModalStep('asiacell');
      } else {
          setModalStep('support');
      }rError('');
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
              );
              })
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
                    {modalStep === 'select' ? 'طريقة الدفع' : modalStep === 'card' ? 'الدفع عبر البطاقة' : modalStep === 'asiacell' ? 'شحن كارت أسياسيل' : 'تواصل مع الدعم'}
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
	                                        {typeof method.icon === 'function' ? (
	                                          <method.icon />
	                                        ) : (
	                                          <method.icon size={24} strokeWidth={1.5} />
	                                        )}
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
	                              (typeof selectedMethodIcon === 'function' ? 
	                                <div className="scale-[2]">{React.createElement(selectedMethodIcon)}</div> : 
	                                React.createElement(selectedMethodIcon, { size: 40, className: "text-yellow-400" })
	                              ) : 
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
	
	                {/* STEP 5: PI NETWORK PAYMENT */}
	                {modalStep === 'pi' && (
	                    <div className="animate-fadeIn">
	                      <div className="mb-4">
	                          <label className="text-xs font-bold text-gray-400 mb-2 block text-right">المبلغ المراد شحنه (بالدولار)</label>
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
	
	                      {amountToAdd && parseFloat(amountToAdd) > 0 && (
	                        <div className="bg-[#593B8B]/10 border border-[#593B8B]/30 rounded-xl p-4 mb-6 animate-slideUp">
	                          <div className="flex justify-between items-center mb-2">
	                            <span className="text-[#593B8B] font-bold text-sm">المبلغ المطلوب بـ Pi:</span>
	                            <span className="text-white font-black text-lg">{(parseFloat(amountToAdd) * 3).toFixed(2)} π</span>
	                          </div>
	                          <p className="text-[10px] text-gray-400 text-right">معدل التحويل الثابت: 1 دولار = 3 Pi</p>
	                        </div>
	                      )}
	
	                      <div className="mt-2 text-sm text-gray-300 text-right leading-relaxed">
	                        سيتم فتح متصفح Pi Network لإتمام عملية الدفع بشكل آمن ومباشر.
	                      </div>
	
	                      <button 
	                          className={`w-full bg-[#593B8B] text-white font-bold py-4 rounded-xl mt-8 hover:bg-[#4a3174] transition-all shadow-lg shadow-[#593B8B]/20 active:scale-95 transform flex items-center justify-center gap-2 ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
	                          onClick={handleConfirmAddBalance}
	                          disabled={isProcessing}
	                      >
	                          {isProcessing ? (
	                               <>
	                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
	                                  <span>جاري الاتصال بـ Pi SDK...</span>
	                               </>
	                          ) : (
	                               'شحن الآن عبر Pi'
	                          )}
	                      </button>
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
                    {isBanned ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-red-500/5 border border-red-500/20 rounded-3xl">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                          <Lock size={30} className="text-red-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">ميزة الشحن مقيدة مؤقتاً</h3>
                        <p className="text-gray-400 text-xs mb-6 px-6">
                          تم تقييد حسابك من إرسال طلبات شحن أسياسيل بسبب نشاط مشبوه.
                        </p>
                        <div className="flex items-center gap-2 bg-[#13141f] px-6 py-3 rounded-2xl border border-gray-800">
                          <Clock size={18} className="text-yellow-400" />
                          <span className="text-xl font-black text-white font-mono">{formatTime(banTimeLeft)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-4 font-bold">يرجى المحاولة مرة أخرى بعد انتهاء الوقت</p>
                      </div>
                    ) : topupSuccess ? (
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
