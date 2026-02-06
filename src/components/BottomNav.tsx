
import React from 'react';
import { Home, ShoppingCart, ClipboardList, Settings } from 'lucide-react';
import { View } from '../types';

interface Props {
  currentView: View;
  setView: (view: View) => void;
}

const BottomNav: React.FC<Props> = ({ currentView, setView }) => {
  // Order from Right to Left as per Arabic layout in screenshot
  // Screenshot (Right -> Left): Home, Cart, Orders, Settings
  const navItems = [
    { id: View.PROFILE, icon: Settings, label: 'الإعدادات' },
    { id: View.ORDERS, icon: ClipboardList, label: 'طلباتي' },
    { id: View.CART, icon: ShoppingCart, label: 'السلة' }, 
    { id: View.HOME, icon: Home, label: 'الرئيسية' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1b26] border-t border-gray-800 pb-safe pt-3 z-[100] shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex justify-around items-center px-4 pb-4 w-full max-w-6xl mx-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center w-full transition-all duration-300 group`}
            >
              <div className={`p-1 transition-all ${isActive ? 'text-yellow-400 scale-110' : 'text-gray-500 group-hover:text-gray-300'}`}>
                <item.icon size={26} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              {/* Optional: Add labels if you want text under icons */}
              {/* <span className={`text-[10px] mt-1 ${isActive ? 'text-yellow-400 font-bold' : 'text-gray-500'}`}>{item.label}</span> */}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
