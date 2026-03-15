import React from 'react';
import { Home, ShoppingCart, ClipboardList, Settings } from 'lucide-react';
import { View } from '../types';

interface Props {
  currentView: View;
  setView: (view: View) => void;
  isHidden?: boolean;
}

const BottomNav: React.FC<Props> = ({ currentView, setView, isHidden }) => {
  if (isHidden) return null;

  // Arabic Order (Right to Left): Home | Cart | Orders | Profile
  const navItems = [
    { id: View.HOME, icon: Home, label: 'الرئيسية' },
    { id: View.CART, icon: ShoppingCart, label: 'السلة' },
    { id: View.ORDERS, icon: ClipboardList, label: 'طلباتي' },
    { id: View.PROFILE, icon: Settings, label: 'الإعدادات' },
  ];

  return (
    <div className="fixed bottom-2 left-4 right-4 z-[100]">
      <div className="bg-[#1a1b26]/90 backdrop-blur-lg border border-gray-800/50 rounded-[24px] shadow-2xl px-2 py-1.5 max-w-md mx-auto">
        <div className="flex justify-between items-center relative">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`relative flex items-center justify-center transition-all duration-300 h-11 flex-1`}
              >
                {/* Active Background Pill - Slimmer */}
                {isActive && (
                  <div className="absolute inset-x-1 inset-y-0.5 bg-yellow-400/10 border border-yellow-400/20 rounded-xl animate-fadeIn" />
                )}
                
                <div className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
                  isActive ? 'text-yellow-400 scale-105' : 'text-gray-500 hover:text-gray-300'
                }`}>
                  <item.icon 
                    size={22} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={isActive ? 'drop-shadow-[0_0_8px_rgba(250,204,21,0.4)]' : ''}
                  />
                  {/* Small dot indicator for active state */}
                  {isActive && (
                    <div className="absolute -bottom-1 w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_4px_rgba(250,204,21,0.8)]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
