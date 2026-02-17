

import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, HelpCircle, FileText, 
  LogOut, Star, Trash2, Bell, Wallet, ClipboardList, Headset,
  CircleDollarSign, Check, Camera, User as UserIcon, Phone, Mail, X, Save, Edit2,
  Send, ShieldAlert, ChevronDown, AlertTriangle, Lock, Eye, EyeOff, Key, Copy, MessageCircle,
  ShieldCheck
} from 'lucide-react';
import SupportModal from '../components/SupportModal';
import { View, AppTerms, AppPrivacy, UserProfile, Currency } from '../types';
import { authService } from '../services/api';
import { auth } from '../services/firebase';
import versionData from '../version.json';

interface Props {
  setView: (view: View) => void;
  currentCurrency: string;
  onCurrencyChange: (code: string) => void;
  terms: AppTerms;
  privacy: AppPrivacy;
  user?: UserProfile;
  currencies: Currency[];
  rateAppLink: string;
  onLogout: () => void; 
  onUpdateUser: (updatedUser: UserProfile) => void; // New prop for updating user data
}

const Profile: React.FC<Props> = ({ setView, currentCurrency, onCurrencyChange, terms, privacy, user, currencies, rateAppLink, onLogout, onUpdateUser }) => {
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // New Modals State
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showDeleteConfirmWithPassword, setShowDeleteConfirmWithPassword] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  
  // FAQ State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Local Edit State
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: ''
  });

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false });
  const [avatarFailed, setAvatarFailed] = useState(false);

  const defaultAvatar =
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236b7280"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>';

  const socialPhoto = auth?.currentUser?.photoURL || '';
  const profileAvatar = (!avatarFailed && (user?.avatar || socialPhoto)) || defaultAvatar;

  // ✅ Server never sends the password itself; use a safe flag instead.
  const hasPassword = Boolean((user as any)?.hasPassword ?? (user as any)?.passwordSet ?? false);

  useEffect(() => {
    if (user) {
        setEditForm({
            name: user.name,
            phone: user.phone,
            email: user.email
        });
    }
  }, [user]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [user?.avatar, socialPhoto]);

  const menuItems = [
    { icon: CircleDollarSign, label: 'العملة', action: () => setShowCurrencyModal(true) },
    { icon: Lock, label: 'أمان الحساب', action: () => { setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); setShowPasswordModal(true); } },
    { icon: Bell, label: 'الإشعارات', action: () => setView(View.NOTIFICATIONS) },
    { icon: ClipboardList, label: 'طلباتي', action: () => setView(View.ORDERS) },
    { icon: Wallet, label: 'محفظتي', action: () => setView(View.WALLET) },
    { icon: HelpCircle, label: 'الأسئلة الشائعة', action: () => setShowFaqModal(true) },
    { icon: FileText, label: 'الشروط والأحكام', action: () => setShowTermsModal(true) },
    { icon: ShieldCheck, label: 'سياسة الخصوصية', action: () => setShowPrivacyModal(true) },
    { icon: Star, label: 'تقييم التطبيق', action: () => { 
        if (rateAppLink) {
            window.open(rateAppLink, '_blank');
        } else {
            alert('رابط التقييم غير متوفر حالياً');
        }
    } },
    { icon: Headset, label: 'الدعم الفني', action: () => setShowSupportModal(true) },
  ];

  const faqList = [
      {
          question: "كيف أستلم الكود بعد الشراء؟",
          answer: "يتم تسليم الأكواد بشكل فوري وتلقائي لمعظم الخدمات. ستجد الكود في قائمة 'طلباتي' وأيضاً في تفاصيل الفاتورة فور إتمام عملية الدفع بنجاح. يمكنك نسخ الكود واستخدامه مباشرة."
      },
      {
          question: "ما هي طرق الدفع المتوفرة؟",
          answer: "نوفر الدفع الآمن عبر البطاقات المصرفية العالمية (Visa / Mastercard) بالإضافة إلى إمكانية الشراء المباشر والفوري باستخدام رصيد محفظتك داخل التطبيق، والذي يمكنك شحنه مسبقاً."
      },
      {
          question: "هل يمكنني استرجاع المنتج بعد الشراء؟",
          answer: "نظراً لطبيعة المنتجات الرقمية الحساسة، لا يمكن استرجاع أو استبدال الأكواد بعد كشفها وشرائها، إلا في حال وجود خلل مثبت من المصدر وبإثبات فيديو، وذلك لضمان أمان ومصداقية الأكواد للجميع."
      },
      {
          question: "الكود لا يعمل، ماذا أفعل؟",
          answer: "يرجى أولاً التأكد من اختيار المنطقة (Region) الصحيحة لحسابك ومطابقتها لمنطقة الكود. إذا استمرت المشكلة، تواصل مع الدعم الفني فوراً مع إرفاق فيديو يوضح محاولة الشحن ورسالة الخطأ."
      },
      {
          question: "كيف أقوم بشحن رصيد المحفظة؟",
          answer: "اذهب إلى صفحة 'محفظتي' من القائمة السفلية، ثم اضغط على زر 'إضافة رصيد'. أدخل المبلغ المطلوب وبيانات بطاقتك البنكية لإتمام العملية وسيتم إضافة الرصيد لحسابك فوراً."
      }
  ];

  const handleCurrencySelect = (code: string) => {
    onCurrencyChange(code);
    setShowCurrencyModal(false);
  };

  const handleOpenEdit = () => {
    if (user) {
        setEditForm({ name: user.name, phone: user.phone, email: user.email });
        setShowEditProfile(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      const payload = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
      };
      const res = await authService.updateProfile(payload);
      const data: any = res?.data || {};
      // Some APIs return token after profile update
      if (data?.token) {
        localStorage.setItem('token', data.token);
      }
      // Merge with existing user to preserve fields not returned by API (joinedDate/status/etc.)
      const mergedUser: UserProfile = {
        ...user,
        ...data,
        id: data.id || data._id || user.id,
        phone: data.phone ?? payload.phone ?? user.phone,
        email: data.email ?? payload.email ?? user.email,
        name: data.name ?? payload.name ?? user.name,
        balance: typeof data.balance === 'number' ? data.balance : user.balance,
      };
      onUpdateUser(mergedUser);
      setShowEditProfile(false);
      alert("تم تحديث البيانات بنجاح");
    } catch (error: any) {
      console.warn('Failed to update profile via API', error);
      alert(error?.response?.data?.message || "فشل تحديث البيانات");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
        alert("يرجى إدخال كلمة المرور للتأكيد");
        return;
    }

    setIsDeleting(true);
    try {
        // We'll use a new endpoint /auth/delete-account
        await authService.deleteAccount({ password: deletePassword });
        alert("تم حذف حسابك بنجاح. نأسف لرحيلك.");
        onLogout();
    } catch (error: any) {
        console.error("Failed to delete account", error);
        alert(error?.response?.data?.message || "فشل حذف الحساب. تأكد من كلمة المرور.");
    } finally {
        setIsDeleting(false);
    }
  };

  const handleSavePassword = async () => {
      if (!user) return;

      // تحقق من الحقول
      if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
          alert("يرجى ملء جميع الحقول المطلوبة");
          return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          alert("كلمة المرور الجديدة وتأكيدها غير متطابقين");
          return;
      }

      try {
          await authService.changePassword({
              // الشكل الشائع:
              oldPassword: passwordForm.oldPassword || undefined,
              newPassword: passwordForm.newPassword,

              // توافق مع بعض الباك-إندات القديمة:
              currentPassword: passwordForm.oldPassword || undefined,
              password: passwordForm.newPassword,
          });

          setShowPasswordModal(false);
          setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
          alert("تم تحديث كلمة المرور بنجاح ✅");
      } catch (error: any) {
          console.warn('Failed to update password via API', error);
          const msg =
              error?.response?.data?.message ||
              error?.response?.data?.error ||
              "حدث خطأ أثناء تحديث كلمة المرور";
          alert(msg);
      }
  };

  const toggleFaq = (index: number) => {
      setExpandedFaq(expandedFaq === index ? null : index);
  };

  // If user is banned, show the enhanced ban UI (matches the requested design)
  if (user?.status === 'banned') {
    const getFormattedBanDate = () => {
      const rawDate = (user as any)?.bannedAt || (user as any)?.banned_at || user?.createdAt || (user as any)?.joinedDate;
      if (!rawDate) return '—';
      const parsed = new Date(rawDate);
      if (isNaN(parsed.getTime())) return rawDate;
      const day = parsed.getDate();
      const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      const yearVal = parsed.getFullYear();
      return `${day} ${monthNames[parsed.getMonth()]} ${yearVal}`;
    };

    // Note: 'year' is not defined in the scope above, let's fix the date logic inside the component
    const parsedDate = new Date((user as any)?.bannedAt || (user as any)?.banned_at || user?.createdAt || "");
    const formattedBanDate = !isNaN(parsedDate.getTime()) 
      ? `${parsedDate.getDate()} ${["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"][parsedDate.getMonth()]} ${parsedDate.getFullYear()}`
      : "—";

    return (
      <div className="fixed inset-0 z-[500] bg-[#13141f] flex flex-col items-center justify-center px-8 text-center animate-fadeIn">
        {/* Shield Icon with Glow */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full"></div>
          <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 relative z-10">
            <ShieldAlert size={48} className="text-red-500" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-black text-white mb-4 tracking-tight">تم حظر حسابك</h1>
        
        {/* Description */}
        <p className="text-gray-400 mb-10 leading-relaxed text-sm max-w-xs">
          عذراً، لقد تم حظر حسابك من قبل الإدارة بسبب مخالفة شروط الاستخدام. إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع الدعم الفني.
        </p>

        {/* Info Card */}
        <div className="w-full bg-[#1c1e2d] rounded-[2rem] p-6 mb-10 border border-gray-800/50 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(user?.id || '');
                  alert('تم نسخ المعرف');
                }}
                className="p-2 bg-[#13141f] rounded-xl text-gray-400 active:text-white transition-colors"
              >
                <Copy size={18} />
              </button>
              <span className="text-white font-bold text-lg">{user?.id || '—'}</span>
            </div>
            <span className="text-gray-500 font-medium">معرف المستخدم</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-white font-bold text-lg">{formattedBanDate}</span>
            <span className="text-gray-500 font-medium">تاريخ الإجراء</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-4">
          <button
            onClick={() => setShowSupportModal(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg shadow-lg shadow-red-600/20"
          >
            <MessageCircle size={24} />
            تواصل مع الدعم الفني
          </button>
          
          <button
            onClick={onLogout}
            className="w-full bg-[#1c1e2d] hover:bg-[#25283a] text-white font-black py-5 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg border border-gray-800/50"
          >
            <LogOut size={24} />
            تسجيل الخروج
          </button>
        </div>

        {/* Support Modal */}
        {showSupportModal && (
          <SupportModal
            isOpen={showSupportModal}
            onClose={() => setShowSupportModal(false)}
            whatsappNumber={terms.contactWhatsapp}
            telegramUsername={terms.contactTelegram}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#13141f] relative pt-6">
      
      {/* User Info Card */}
      <button 
        onClick={handleOpenEdit}
        className="w-full px-4 mb-8 flex items-center gap-4 text-right group transition-transform active:scale-98 outline-none"
      >
         <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center overflow-hidden border-[3px] border-yellow-400 shadow-lg group-hover:shadow-yellow-400/20 transition-all">
                <img
                  src={profileAvatar}
                  alt="صورة المستخدم"
                  className="w-full h-full object-cover"
                  onError={() => setAvatarFailed(true)}
                  loading="lazy"
                />
            </div>
            <div className="absolute bottom-0 left-0 bg-[#242636] text-yellow-400 p-1 rounded-full border border-gray-700 shadow-sm">
                <Edit2 size={10} />
            </div>
         </div>
         <div className="flex-1 flex flex-col items-end">
            <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-xl group-hover:text-yellow-400 transition-colors">{user?.name || 'زائر'}</h2>
            </div>
            <p className="text-gray-500 text-sm font-bold mt-0.5" dir="ltr">ID: {user?.id || '---'}</p>
         </div>
         <ChevronLeft className="text-gray-600 w-5 h-5 group-hover:text-yellow-400 transition-colors" strokeWidth={1.5} />
      </button>

      {/* Menu List */}
      <div className="px-4 space-y-3">
        {menuItems.map((item, idx) => (
          <button 
            key={idx} 
            onClick={item.action}
            className="w-full bg-[#1e1f2b] p-4 rounded-xl flex items-center justify-between border border-gray-800/50 hover:bg-[#252836] transition-colors shadow-sm group"
          >
            <div className="flex items-center gap-4">
               <div className="text-gray-200 group-hover:text-yellow-400 transition-colors">
                 <item.icon size={22} strokeWidth={1.5} />
               </div>
               <span className="font-bold text-sm text-white">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
                {item.label === 'العملة' && (
                    <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                        {currentCurrency}
                    </span>
                )}
                <ChevronLeft className="text-gray-600 w-5 h-5" strokeWidth={1.5} />
            </div>
          </button>
        ))}

        {/* Admin Button - DIRECT ACCESS */}
         <button 
           onClick={() => setView(View.ADMIN)}
           className="w-full bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 p-4 rounded-xl flex items-center justify-between border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors shadow-sm group"
         >
            <div className="flex items-center gap-4">
               <div className="text-yellow-400">
                 <ShieldAlert size={22} strokeWidth={1.5} />
               </div>
               <span className="font-bold text-sm text-yellow-400">الإدارة (Admin)</span>
            </div>
            <ChevronLeft className="text-yellow-500/50 w-5 h-5" strokeWidth={1.5} />
         </button>

        {/* Logout Button */}
        <button 
            onClick={() => setShowLogoutModal(true)}
            className="w-full bg-[#1e1f2b] p-4 rounded-xl flex items-center justify-between border border-gray-800/50 hover:bg-[#252836] transition-colors mt-6 shadow-sm"
        >
            <div className="flex items-center gap-4">
               <LogOut size={22} className="text-red-500" strokeWidth={1.5} />
               <span className="font-bold text-sm text-red-500">تسجيل الخروج</span>
            </div>
            <ChevronLeft className="text-gray-600 w-5 h-5" strokeWidth={1.5} />
        </button>

         {/* Delete Account Button */}
         <button 
            onClick={() => setShowDeleteAccountModal(true)}
            className="w-full bg-[#1e1f2b] p-4 rounded-xl flex items-center justify-between border border-gray-800/50 hover:bg-[#252836] transition-colors shadow-sm"
         >
            <div className="flex items-center gap-4">
               <Trash2 size={22} className="text-red-500" strokeWidth={1.5} />
               <span className="font-bold text-sm text-red-500">حذف الحساب</span>
            </div>
            <ChevronLeft className="text-gray-600 w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>

       {/* Version */}
       <div className="text-center text-gray-400 text-[12px] mt-8 mb-6 font-medium tracking-wider opacity-80">
         إصدار التطبيق: v{versionData.version}
       </div>

       {/* --- MODALS --- */}

       {/* Password Modal */}
       {showPasswordModal && (
           <div className="fixed inset-0 z-[70] bg-[#13141f] animate-fadeIn flex flex-col">
               <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                   <button onClick={() => setShowPasswordModal(false)} className="p-2 bg-[#242636] rounded-xl text-gray-400 hover:text-white">
                       <X size={20} />
                   </button>
                   <h2 className="text-lg font-bold text-white">أمان الحساب</h2>
                   <div className="w-9"></div>
               </div>

               <div className="p-6">
                   <div className="flex flex-col items-center mb-8">
                        <div className="w-20 h-20 bg-[#242636] rounded-full flex items-center justify-center mb-4 border border-gray-700 shadow-lg">
                            <Key size={32} className="text-yellow-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{hasPassword ? 'تغيير كلمة المرور' : 'تعيين كلمة مرور جديدة'}</h3>
                        <p className="text-gray-400 text-xs text-center max-w-xs">
                            {hasPassword 
                                ? 'قم بتحديث كلمة المرور الخاصة بك بشكل دوري للحفاظ على أمان حسابك.' 
                                : 'قم بتعيين كلمة مرور لحماية حسابك وتسهيل عملية تسجيل الدخول مستقبلاً.'}
                        </p>
                   </div>

                   <div className="space-y-4">
                       {/* Old Password - Show only if user has password */}
                       {hasPassword && (
                           <div className="space-y-1.5 animate-fadeIn">
                               <label className="text-xs font-bold text-gray-400 mr-1 block text-right">كلمة المرور الحالية</label>
                               <div className="relative">
                                   <input 
                                       type={showPasswords.old ? "text" : "password"} 
                                       value={passwordForm.oldPassword} 
                                       onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})} 
                                       className="w-full bg-[#1e1f2b] border border-gray-700 rounded-xl py-3 pr-10 pl-10 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors" 
                                   />
                                   <Lock className="absolute right-3 top-3.5 text-gray-500" size={18} />
                                   <button 
                                      onClick={() => setShowPasswords({...showPasswords, old: !showPasswords.old})}
                                      className="absolute left-3 top-3.5 text-gray-500 hover:text-white"
                                   >
                                      {showPasswords.old ? <EyeOff size={18} /> : <Eye size={18} />}
                                   </button>
                               </div>
                           </div>
                       )}

                       <div className="space-y-1.5">
                           <label className="text-xs font-bold text-gray-400 mr-1 block text-right">كلمة المرور الجديدة</label>
                           <div className="relative">
                               <input 
                                   type={showPasswords.new ? "text" : "password"} 
                                   value={passwordForm.newPassword} 
                                   onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} 
                                   className="w-full bg-[#1e1f2b] border border-gray-700 rounded-xl py-3 pr-10 pl-10 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors" 
                               />
                               <Key className="absolute right-3 top-3.5 text-gray-500" size={18} />
                               <button 
                                  onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                  className="absolute left-3 top-3.5 text-gray-500 hover:text-white"
                               >
                                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                               </button>
                           </div>
                       </div>

                       <div className="space-y-1.5">
                           <label className="text-xs font-bold text-gray-400 mr-1 block text-right">تأكيد كلمة المرور</label>
                           <div className="relative">
                               <input 
                                   type={showPasswords.confirm ? "text" : "password"} 
                                   value={passwordForm.confirmPassword} 
                                   onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} 
                                   className="w-full bg-[#1e1f2b] border border-gray-700 rounded-xl py-3 pr-10 pl-10 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors" 
                               />
                               <Check className="absolute right-3 top-3.5 text-gray-500" size={18} />
                               <button 
                                  onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                  className="absolute left-3 top-3.5 text-gray-500 hover:text-white"
                               >
                                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                               </button>
                           </div>
                       </div>
                   </div>

                   <button 
                       onClick={handleSavePassword}
                       className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3.5 rounded-xl shadow-lg mt-8 transition-transform active:scale-95"
                   >
                       حفظ التغييرات
                   </button>
               </div>
           </div>
       )}

       {/* Logout Confirmation Modal */}
       {showLogoutModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="bg-[#1f212e] w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <LogOut size={32} className="text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">تسجيل الخروج</h3>
                    <p className="text-gray-400 text-sm mb-6">هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟</p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowLogoutModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold transition-colors">إلغاء</button>
                        <button onClick={() => { setShowLogoutModal(false); onLogout(); }} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors">خروج</button>
                    </div>
                </div>
            </div>
       )}

       {/* Delete Account Confirmation Modal */}
       {showDeleteAccountModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
                <div className="bg-[#1f212e] w-full max-w-sm rounded-2xl p-6 border border-red-900/50 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                        <AlertTriangle size={32} className="text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">حذف الحساب نهائياً</h3>
                    <p className="text-gray-400 text-xs mb-6 leading-relaxed">
                        هذا الإجراء <span className="text-red-400 font-bold">لا يمكن التراجع عنه</span>. سيتم حذف جميع بياناتك، طلباتك، ورصيد محفظتك الحالي بشكل نهائي.
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setShowDeleteAccountModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold transition-colors">تراجع</button>
                        <button onClick={() => { setShowDeleteAccountModal(false); setShowDeleteConfirmWithPassword(true); }} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors">حذف نهائي</button>
                    </div>
                </div>
            </div>
       )}

       {/* Delete Account Password Verification Modal */}
       {showDeleteConfirmWithPassword && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
                <div className="bg-[#1f212e] w-full max-w-sm rounded-2xl p-6 border border-gray-700 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <button onClick={() => { setShowDeleteConfirmWithPassword(false); setDeletePassword(''); }} className="p-2 bg-[#242636] rounded-xl text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                        <h3 className="text-lg font-bold text-white">تأكيد الهوية</h3>
                        <div className="w-9"></div>
                    </div>

                    <div className="text-center mb-6">
                        <div className="w-14 h-14 bg-yellow-400/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-yellow-400/20">
                            <Lock size={24} className="text-yellow-400" />
                        </div>
                        <p className="text-gray-300 text-sm">يرجى إدخال كلمة المرور الخاصة بك للمتابعة في حذف الحساب</p>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div className="relative">
                            <input 
                                type={showDeletePassword ? "text" : "password"} 
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                                placeholder="كلمة المرور"
                                className="w-full bg-[#13141f] border border-gray-700 rounded-xl py-3.5 pr-11 pl-12 text-white text-right focus:border-red-500 focus:outline-none transition-all"
                            />
                            <Lock className="absolute right-3.5 top-4 text-gray-500" size={18} />
                            <button 
                                type="button"
                                onClick={() => setShowDeletePassword(!showDeletePassword)}
                                className="absolute left-3.5 top-4 text-gray-500 hover:text-gray-300 transition-colors"
                            >
                                {showDeletePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={handleDeleteAccount}
                        disabled={isDeleting || !deletePassword}
                        className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                            isDeleting || !deletePassword 
                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                            : 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20 active:scale-[0.98]'
                        }`}
                    >
                        {isDeleting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                جاري الحذف...
                            </>
                        ) : (
                            <>حذف الحساب نهائياً</>
                        )}
                    </button>
                </div>
            </div>
       )}

       {/* Edit Profile Modal */}
       {showEditProfile && (
           <div className="fixed inset-0 z-[70] bg-[#13141f] animate-fadeIn flex flex-col">
               <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                   <button onClick={() => setShowEditProfile(false)} className="p-2 bg-[#242636] rounded-xl text-gray-400 hover:text-white">
                       <X size={20} />
                   </button>
                   <h2 className="text-lg font-bold text-white">تعديل الملف الشخصي</h2>
                   <div className="w-9"></div>
               </div>

               <div className="flex-1 overflow-y-auto p-6">
                   <div className="flex flex-col items-center mb-8">
                       <div className="relative mb-3">
                           <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center overflow-hidden border-4 border-yellow-400">
                                <img
                                  src={profileAvatar}
                                  alt="صورة المستخدم"
                                  className="w-full h-full object-cover"
                                  onError={() => setAvatarFailed(true)}
                                  loading="lazy"
                                />
                           </div>
                           <button className="absolute bottom-0 right-0 bg-[#242636] p-2 rounded-full border border-gray-700 text-yellow-400 shadow-md">
                               <Camera size={16} />
                           </button>
                       </div>
                   </div>

                   <div className="space-y-4">
                       <div className="space-y-1.5">
                           <label className="text-xs font-bold text-gray-400 mr-1 block text-right">الاسم</label>
                           <div className="relative">
                               <input type="text" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} className="w-full bg-[#1e1f2b] border border-gray-700 rounded-xl py-3 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors" />
                               <UserIcon className="absolute right-3 top-3.5 text-gray-500" size={18} />
                           </div>
                       </div>
                       <div className="space-y-1.5">
                           <label className="text-xs font-bold text-gray-400 mr-1 block text-right">رقم الهاتف</label>
                           <div className="relative">
                               <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} className="w-full bg-[#1e1f2b] border border-gray-700 rounded-xl py-3 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors dir-rtl" />
                               <Phone className="absolute right-3 top-3.5 text-gray-500" size={18} />
                           </div>
                       </div>
                       <div className="space-y-1.5">
                           <label className="text-xs font-bold text-gray-400 mr-1 block text-right">البريد الإلكتروني</label>
                           <div className="relative">
                               <input type="email" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} className="w-full bg-[#1e1f2b] border border-gray-700 rounded-xl py-3 pr-10 pl-4 text-white text-right focus:border-yellow-400 focus:outline-none transition-colors" />
                               <Mail className="absolute right-3 top-3.5 text-gray-500" size={18} />
                           </div>
                       </div>
                   </div>

                   <button 
                       onClick={handleSaveProfile}
                       className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-3.5 rounded-xl shadow-lg mt-8 transition-transform active:scale-95"
                   >
                       حفظ التغييرات
                   </button>
               </div>
           </div>
       )}

       {/* Currency Modal */}
       {showCurrencyModal && (
         <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCurrencyModal(false)}></div>
            <div className="bg-[#1f212e] w-full max-w-md rounded-t-3xl p-6 pb-28 relative z-10 animate-slide-up border-t border-gray-700 max-h-[85vh] flex flex-col">
               <h2 className="text-xl font-bold mb-6 text-center text-white">العملة</h2>
               <div className="overflow-y-auto no-scrollbar space-y-2 mb-4 flex-1">
                 {currencies.map((currency) => (
                    <button key={currency.code} onClick={() => handleCurrencySelect(currency.code)} className={`w-full bg-[#13141f] rounded-xl border p-3 flex items-center justify-between transition-all ${currentCurrency === currency.code ? 'border-yellow-400 bg-yellow-400/5' : 'border-gray-700 hover:border-gray-500'}`}>
                        <div className="flex items-center gap-3"><span className="text-2xl">{currency.flag}</span><div className="text-right"><p className={`font-bold text-sm ${currentCurrency === currency.code ? 'text-yellow-400' : 'text-white'}`}>{currency.name}</p><p className="text-[10px] text-gray-500 text-right dir-ltr uppercase">{currency.code}</p></div></div>
                        {currentCurrency === currency.code && <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center"><Check size={14} className="text-black" strokeWidth={3} /></div>}
                    </button>
                 ))}
               </div>
               <button onClick={() => setShowCurrencyModal(false)} className="w-full bg-gray-700 text-white font-bold py-3.5 rounded-xl">إغلاق</button>
            </div>
         </div>
       )}

       {/* FAQ Modal */}
       {showFaqModal && (
         <div className="fixed inset-0 z-[60] bg-[#13141f] animate-fadeIn flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
               <button onClick={() => setShowFaqModal(false)} className="p-2 bg-[#242636] rounded-xl text-gray-400 hover:text-white"><X size={20} /></button>
               <h2 className="text-lg font-bold text-white">الأسئلة الشائعة</h2>
               <div className="w-9"></div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
               <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-[#242636] rounded-full flex items-center justify-center mx-auto mb-3 border border-gray-700 shadow-lg">
                      <HelpCircle size={32} className="text-yellow-400" />
                  </div>
                  <h3 className="text-white font-bold text-lg">كيف يمكننا مساعدتك؟</h3>
                  <p className="text-gray-400 text-xs mt-1">إليك أبرز الاستفسارات التي تصلنا من العملاء</p>
               </div>

               {faqList.map((faq, index) => (
                  <div key={index} className="bg-[#1e1f2b] rounded-xl border border-gray-800/50 overflow-hidden shadow-sm">
                      <button 
                        onClick={() => toggleFaq(index)}
                        className={`w-full p-4 flex items-center justify-between transition-colors ${expandedFaq === index ? 'bg-[#242636]' : 'hover:bg-[#252836]'}`}
                      >
                         <span className={`font-bold text-sm text-right ${expandedFaq === index ? 'text-yellow-400' : 'text-white'}`}>{faq.question}</span>
                         <div className={`transition-transform duration-300 ${expandedFaq === index ? 'rotate-180 text-yellow-400' : 'text-gray-500'}`}>
                            <ChevronDown size={20} />
                         </div>
                      </button>
                      
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedFaq === index ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
                         <div className="p-4 pt-0 text-gray-400 text-xs leading-relaxed border-t border-gray-700/30 bg-[#242636]/50 text-right">
                             {faq.answer}
                         </div>
                      </div>
                  </div>
               ))}
            </div>
            
<div className="p-4 pb-28 border-t border-gray-800/50 bg-[#13141f]">
               <button onClick={() => { setShowFaqModal(false); setShowSupportModal(true); }} className="w-full bg-[#242636] text-white font-bold py-3.5 rounded-xl hover:bg-[#2f3245] transition-colors border border-gray-700 shadow-lg">
                   لم تجد إجابة لسؤالك؟ تواصل معنا
               </button>
            </div>
         </div>
       )}

       {/* Support Modal */}
       <SupportModal 
         isOpen={showSupportModal} 
         onClose={() => setShowSupportModal(false)}
         whatsappNumber={terms.contactWhatsapp}
         telegramUsername={terms.contactTelegram}
       />

       {/* Terms Modal */}
       {showTermsModal && (
           <div className="fixed inset-0 z-[70] bg-[#13141f] animate-fadeIn flex flex-col">
               <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                   <button onClick={() => setShowTermsModal(false)} className="p-2 bg-[#242636] rounded-xl text-gray-400 hover:text-white"><X size={20} /></button>
                   <h2 className="text-lg font-bold text-white">الشروط والأحكام</h2><div className="w-9"></div>
               </div>
               <div className="flex-1 overflow-y-auto p-6 text-gray-300 pb-24">
                   <div className="space-y-6 text-right">
                       <div className="text-center mb-6"><h3 className="text-xl font-bold text-yellow-400 mb-2">الشروط والأحكام</h3></div>
                       {/* Display Full Arabic Content with whitespace preserved */}
                       <div className="whitespace-pre-line leading-relaxed text-sm bg-[#242636] p-4 rounded-xl border border-gray-700/50">
                           {terms.contentAr}
                       </div>
                   </div>
                   
                   <div className="my-8 border-t border-gray-700/50"></div>
                   
                   <div className="space-y-6 text-left dir-ltr">
                       <div className="text-center mb-6"><h3 className="text-xl font-bold text-yellow-400 mb-2">Terms and Conditions</h3></div>
                       {/* Display Full English Content with whitespace preserved */}
                       <div className="whitespace-pre-line leading-relaxed text-sm bg-[#242636] p-4 rounded-xl border border-gray-700/50">
                           {terms.contentEn}
                       </div>
                   </div>
               </div>
           </div>
       )}

       {/* Privacy Modal */}
       {showPrivacyModal && (
           <div className="fixed inset-0 z-[70] bg-[#13141f] animate-fadeIn flex flex-col">
               <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                   <button onClick={() => setShowPrivacyModal(false)} className="p-2 bg-[#242636] rounded-xl text-gray-400 hover:text-white"><X size={20} /></button>
                   <h2 className="text-lg font-bold text-white">سياسة الخصوصية</h2><div className="w-9"></div>
               </div>
               <div className="flex-1 overflow-y-auto p-6 text-gray-300 pb-24">
                   <div className="space-y-6 text-right">
                       <div className="text-center mb-6"><h3 className="text-xl font-bold text-blue-400 mb-2">سياسة الخصوصية</h3></div>
                       {/* Display Full Arabic Content with whitespace preserved */}
                       <div className="whitespace-pre-line leading-relaxed text-sm bg-[#242636] p-4 rounded-xl border border-gray-700/50">
                           {privacy.contentAr}
                       </div>
                   </div>
                   
                   <div className="my-8 border-t border-gray-700/50"></div>
                   
                   <div className="space-y-6 text-left dir-ltr">
                       <div className="text-center mb-6"><h3 className="text-xl font-bold text-blue-400 mb-2">Privacy Policy</h3></div>
                       {/* Display Full English Content with whitespace preserved */}
                       <div className="whitespace-pre-line leading-relaxed text-sm bg-[#242636] p-4 rounded-xl border border-gray-700/50">
                           {privacy.contentEn}
                       </div>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default Profile;
