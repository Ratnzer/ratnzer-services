import React from 'react';
import { Home, ShoppingCart, ClipboardList, Settings } from 'lucide-react';
import { View } from '../types';

interface Props {
  currentView: View;
  setView: (view: View) => void;
  isHidden?: boolean;
}

const navItems = [
  { id: View.HOME, icon: Home, label: 'الرئيسية' },
  { id: View.CART, icon: ShoppingCart, label: 'السلة' },
  { id: View.ORDERS, icon: ClipboardList, label: 'طلباتي' },
  { id: View.PROFILE, icon: Settings, label: 'الإعدادات' },
];

const BottomNav: React.FC<Props> = ({ currentView, setView, isHidden }) => {
  if (isHidden) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center px-4 pb-2 pointer-events-none">
      {/* Slim glass card */}
      <div
        className="pointer-events-auto w-full flex items-center justify-between rounded-[18px] px-1 py-1.5 overflow-hidden"
        style={{
          maxWidth: '360px',
          background:
            'linear-gradient(135deg, rgba(30,32,50,0.95) 0%, rgba(20,22,36,0.98) 100%)',
          border: '1px solid rgba(250,204,21,0.10)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.80), 0 1px 4px rgba(250,204,21,0.05)',
        }}
      >
        {/* Subtle top highlight line */}
        <div
          className="absolute top-0 left-4 right-4 h-px rounded-full pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.08) 60%, transparent)',
          }}
        />

        {/* Nav buttons */}
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className="relative flex flex-col items-center justify-center flex-1 h-12 gap-0.5 outline-none select-none transition-transform duration-150 active:scale-90"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {/* Icon */}
              <div
                className="relative flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                style={{
                  transform: isActive ? 'scale(1.15) translateY(-1px)' : 'scale(1)',
                }}
              >
                <item.icon
                  size={20}
                  strokeWidth={isActive ? 2.4 : 1.8}
                  style={{
                    color: isActive ? '#facc15' : 'rgba(160,163,190,0.70)',
                    filter: isActive
                      ? 'drop-shadow(0 0 6px rgba(250,204,21,0.60))'
                      : 'none',
                    transition: 'color 0.3s, filter 0.3s',
                  }}
                />
              </div>

              {/* Label */}
              <span
                className="text-[9px] font-bold leading-none tracking-tight transition-all duration-300"
                style={{
                  color: isActive ? '#facc15' : 'rgba(140,143,170,0.60)',
                  opacity: isActive ? 1 : 0.75,
                  textShadow: isActive ? '0 0 8px rgba(250,204,21,0.40)' : 'none',
                  fontFamily: "'Cairo', sans-serif",
                }}
              >
                {item.label}
              </span>

              {/* Active bottom dot - minimal indicator */}
              {isActive && (
                <span
                  className="absolute bottom-0.5 w-0.5 h-0.5 rounded-full"
                  style={{
                    background: '#facc15',
                    boxShadow: '0 0 4px 1px rgba(250,204,21,0.60)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
