import React, { useState, useEffect } from 'react';
import { Send, X } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber?: string;
  telegramUsername?: string;
}

const SupportModal: React.FC<SupportModalProps> = ({ 
  isOpen, 
  onClose, 
  whatsappNumber = '9647763410970', 
  telegramUsername = 'ratnzer' 
}) => {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const minSwipeDistance = 100;

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

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
        onClose();
        setTranslateY(0);
        setTouchStart(null);
        setTouchEnd(null);
      }, 300);
    } else {
      setTranslateY(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div 
        className={`bg-[#1f212e] w-full max-w-md sm:rounded-3xl rounded-t-3xl relative z-10 flex flex-col shadow-2xl border-t border-gray-700 max-h-[85vh] mb-0 sm:mb-0 pb-safe transform transition-all duration-300 cubic-bezier(0.2, 0.8, 0.2, 1) ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} ${isDragging ? 'duration-0 transition-none' : ''}`}
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
          
          <button 
            onClick={onClose}
            className="absolute top-0 left-0 p-2 bg-[#242636]/80 hover:bg-[#2f3245] rounded-full text-yellow-400 hover:text-yellow-300 border border-gray-700/50 backdrop-blur-md transition-all active:scale-95"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-6 pt-0">
          <h2 className="text-xl font-bold mb-6 text-center text-white">الدعم الفني</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button 
              onClick={() => window.open(`https://wa.me/${whatsappNumber}`, '_blank')} 
              className="bg-[#242636] p-5 rounded-2xl flex flex-col items-center gap-3 border border-gray-700 text-white font-bold active:scale-95 transition-transform"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#25D366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              واتس اب
            </button>
            <button 
              onClick={() => window.open(`https://t.me/${telegramUsername}`, '_blank')} 
              className="bg-[#242636] p-5 rounded-2xl flex flex-col items-center gap-3 border border-gray-700 text-white font-bold active:scale-95 transition-transform"
            >
              <Send size={24} className="text-blue-400" />
              تيليجرام
            </button>
          </div>
          <button 
            onClick={onClose} 
            className="w-full bg-gray-700 text-white font-bold py-3.5 rounded-xl active:scale-95 transition-transform"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupportModal;
