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
    <div className="fixed bottom-3 left-4 right-4 z-[100]">
      {/* Slimmer container with much clearer background and stronger border */}
      <div className="bg-[#2a2c3e]/95 backdrop-blur-2xl border border-gray-600/40 rounded-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.9)] px-1.5 py-1 max-w-md mx-auto">
        <div className="flex justify-between items-center relative">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`relative flex items-center justify-center transition-all duration-300 h-10 flex-1`}
              >
                {/* Active Background Pill - More visible and slimmer */}
                {isActive && (
                  <div className="absolute inset-x-1 inset-y-0.5 bg-yellow-400/20 border border-yellow-400/40 rounded-xl animate-fadeIn" />
                )}
                
                <div className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
                  isActive ? 'text-yellow-400 scale-105' : 'text-gray-400 hover:text-gray-200'
                }`}>
                  <item.icon 
                    size={20} 
                    strokeWidth={isActive ? 2.5 : 2} 
                    className={isActive ? 'drop-shadow-[0_0_12px_rgba(250,204,21,0.6)]' : ''}
                  />
                  {/* Small dot indicator for active state */}
                  {isActive && (
                    <div className="absolute -bottom-1 w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_8px_rgba(250,204,21,1)]" />
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
