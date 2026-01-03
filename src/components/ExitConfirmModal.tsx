import React from 'react';
import { X, LogOut, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ExitConfirmModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
      ></div>
      
      {/* Modal Content */}
      <div className="bg-[#1f212e] w-full max-w-sm rounded-[2rem] relative z-10 animate-slide-up border border-gray-700/50 shadow-2xl overflow-hidden">
        
        {/* Header Decoration */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>

        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-5 left-5 z-20 w-8 h-8 flex items-center justify-center bg-[#242636] hover:bg-[#2f3245] rounded-full text-gray-400 hover:text-white transition-all shadow-sm border border-gray-700"
        >
          <X size={18}/>
        </button>

        <div className="p-8 pt-12 text-center">
          {/* Icon Container */}
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 relative">
            <div className="absolute inset-0 bg-red-500/5 rounded-full animate-ping"></div>
            <LogOut size={40} className="text-red-500 relative z-10" />
          </div>

          {/* Text Content */}
          <h2 className="text-2xl font-black text-white mb-3 tracking-wide">
            تأكيد الخروج
          </h2>
          <p className="text-gray-400 leading-relaxed mb-8">
            هل أنت متأكد أنك تريد الخروج من التطبيق؟ سنفتقد وجودك معنا!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-2xl shadow-lg shadow-red-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={20} />
              نعم، خروج
            </button>
            
            <button
              onClick={onClose}
              className="w-full py-4 bg-[#242636] hover:bg-[#2f3245] text-gray-300 font-bold rounded-2xl border border-gray-700 active:scale-[0.98] transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-[#1a1c26] py-3 px-6 border-t border-gray-800/50 flex items-center justify-center gap-2">
          <AlertCircle size={14} className="text-gray-500" />
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">Ratelozn App Security</span>
        </div>
      </div>
    </div>
  );
};

export default ExitConfirmModal;
