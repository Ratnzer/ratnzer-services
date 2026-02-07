import React from 'react';
import { Search, Wallet, Bell, User } from 'lucide-react';
import { View } from '../types';

interface Props {
  setView: (view: View) => void;
  formattedBalance?: string;
  cartItemCount: number;
  isLoggedIn?: boolean;
  onLoginClick?: () => void;
  hasUnreadNotifications?: boolean;
}

const TopHeader: React.FC<Props> = ({ 
  setView, 
  formattedBalance, 
  isLoggedIn = true, 
  onLoginClick,
  hasUnreadNotifications = false 
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 flex justify-center bg-[#13141f]/95 backdrop-blur-md border-b border-gray-800/50 z-50 h-[65px] shadow-sm">
      <div className="w-full max-w-6xl flex justify-between items-center px-4 h-full">
         {/* Right: Balance/Wallet OR Login (First in RTL) */}
         {isLoggedIn ? (
             <button 
               onClick={() => setView(View.WALLET)} 
               className="group relative flex items-center gap-3 bg-[#1a1c24] pl-3.5 pr-1.5 py-1.5 rounded-full border border-gray-700/50 shadow-lg shadow-black/20 overflow-hidden transition-all active:scale-95 hover:border-green-500/30"
             >
                <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/5 transition-colors duration-300"></div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-inner text-white z-10 ring-2 ring-[#13141f]">
                     <Wallet size={16} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-start justify-center z-10 h-full pl-1">
                     <span className="text-[9px] text-gray-400 font-bold leading-none mb-0.5">الرصيد الحالي</span>
                     <span className="text-white font-black text-[11px] dir-ltr leading-none tracking-wide font-mono drop-shadow-sm group-hover:text-green-400 transition-colors">
                        {formattedBalance}
                     </span>
                </div>
             </button>
         ) : (
             <button 
               onClick={onLoginClick}
               className="group flex items-center gap-2 bg-yellow-400 text-black px-4 py-2 rounded-xl font-bold text-xs shadow-lg shadow-yellow-400/20 active:scale-95 transition-all"
             >
                <User size={16} strokeWidth={2.5} />
                تسجيل الدخول
             </button>
         )}

         {/* Center: Simple Text Logo */}
<div className="flex items-center justify-center gap-2 cursor-pointer" onClick={() => setView(View.HOME)}>
            <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-lg" />
            <h1 className="text-xl font-bold text-yellow-400 drop-shadow-sm tracking-wide hidden sm:block">
              خدمات راتنزر
            </h1>
         </div>

         {/* Left: Search & Notifications (Last in RTL) */}
         <div className="flex items-center gap-2">
             <button onClick={() => setView(View.SEARCH)} className="bg-[#242636] p-2.5 rounded-xl text-yellow-400 hover:text-yellow-300 hover:bg-[#2f3245] border border-transparent hover:border-gray-700 transition-all active:scale-95 shadow-sm">
               <Search size={22} strokeWidth={2} />
             </button>

             <button onClick={() => setView(View.NOTIFICATIONS)} className="bg-[#242636] p-2.5 rounded-xl text-yellow-400 hover:text-yellow-300 hover:bg-[#2f3245] border border-transparent hover:border-gray-700 transition-all active:scale-95 relative shadow-sm">
               <Bell size={22} strokeWidth={2} />
               {hasUnreadNotifications && (
                 <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-[#13141f] flex items-center justify-center animate-bounce shadow-lg">
                   !
                 </span>
               )}
             </button>
         </div>
      </div>
    </div>
  );
};

export default TopHeader;
