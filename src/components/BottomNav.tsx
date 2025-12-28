
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
    <div className="absolute bottom-0 left-0 right-0 bg-[#181920] border-t border-gray-800 pb-safe pt-3 z-50">
      <div className="flex justify-around items-center px-4 pb-4">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center w-full transition-all duration-300 group`}
            >
              <div className={`p-1 transition-all ${isActive ? 'text-yellow-400' : 'text-gray-500 group-hover:text-gray-300'}`}>
                <item.icon size={26} strokeWidth={2} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
