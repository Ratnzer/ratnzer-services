import React, { useRef, useEffect, useState } from 'react';
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
  const activeIndex = navItems.findIndex((item) => item.id === currentView);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const btn = buttonRefs.current[activeIndex];
    const container = containerRef.current;
    if (!btn || !container) return;

    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    setIndicatorStyle({
      left: btnRect.left - containerRect.left,
      width: btnRect.width,
    });
  }, [activeIndex]);

  if (isHidden) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center px-4 pb-3 pointer-events-none">
      {/* Outer glow wrapper */}
      <div
        className="pointer-events-auto w-full max-w-md relative"
        style={{
          filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.85)) drop-shadow(0 2px 8px rgba(250,204,21,0.08))',
        }}
      >
        {/* Glass card */}
        <div
          ref={containerRef}
          className="relative flex items-center justify-between rounded-[28px] px-2 py-2 overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, rgba(30,32,50,0.97) 0%, rgba(20,22,36,0.99) 100%)',
            border: '1px solid rgba(250,204,21,0.13)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          }}
        >
          {/* Subtle top highlight line */}
          <div
            className="absolute top-0 left-6 right-6 h-px rounded-full pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.10) 40%, rgba(255,255,255,0.10) 60%, transparent)',
            }}
          />

          {/* Sliding active indicator pill */}
          <div
            className="absolute bottom-2 h-[calc(100%-16px)] rounded-[20px] transition-all duration-350 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"
            style={{
              left: indicatorStyle.left,
              width: indicatorStyle.width,
              background:
                'linear-gradient(135deg, rgba(250,204,21,0.18) 0%, rgba(250,204,21,0.10) 100%)',
              border: '1px solid rgba(250,204,21,0.30)',
              boxShadow: '0 0 18px rgba(250,204,21,0.15), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          />

          {/* Nav buttons */}
          {navItems.map((item, idx) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => { buttonRefs.current[idx] = el; }}
                onClick={() => setView(item.id)}
                className="relative flex flex-col items-center justify-center flex-1 h-14 gap-1 outline-none select-none transition-transform duration-150 active:scale-90"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {/* Icon */}
                <div
                  className="relative flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{
                    transform: isActive ? 'scale(1.20) translateY(-1px)' : 'scale(1)',
                  }}
                >
                  <item.icon
                    size={22}
                    strokeWidth={isActive ? 2.5 : 1.8}
                    style={{
                      color: isActive ? '#facc15' : 'rgba(160,163,190,0.75)',
                      filter: isActive
                        ? 'drop-shadow(0 0 8px rgba(250,204,21,0.70)) drop-shadow(0 0 2px rgba(250,204,21,0.40))'
                        : 'none',
                      transition: 'color 0.3s, filter 0.3s',
                    }}
                  />
                </div>

                {/* Label */}
                <span
                  className="text-[10px] font-bold leading-none tracking-wide transition-all duration-300"
                  style={{
                    color: isActive ? '#facc15' : 'rgba(140,143,170,0.65)',
                    opacity: isActive ? 1 : 0.8,
                    textShadow: isActive ? '0 0 10px rgba(250,204,21,0.5)' : 'none',
                    fontFamily: "'Cairo', sans-serif",
                  }}
                >
                  {item.label}
                </span>

                {/* Active bottom dot */}
                {isActive && (
                  <span
                    className="absolute bottom-1 w-1 h-1 rounded-full"
                    style={{
                      background: '#facc15',
                      boxShadow: '0 0 6px 2px rgba(250,204,21,0.70)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
