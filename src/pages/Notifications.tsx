import React from 'react';
import { Clock, Info, AlertTriangle, Gift, Megaphone, ShoppingBag, Wallet, ShieldAlert, ArrowLeft } from 'lucide-react';
import { View, Announcement } from '../types';

interface Props {
  setView: (view: View) => void;
  formatPrice: (price: number) => string;
  announcements?: Announcement[];
  hasMore?: boolean;
  loadingMore?: boolean;
  refreshing?: boolean;
  onLoadMore?: () => void;
  onRefresh?: () => void;
}

const Notifications: React.FC<Props> = ({ 
  setView, 
  formatPrice, 
  announcements = [],
  hasMore = false,
  loadingMore = false,
  refreshing = false,
  onLoadMore,
  onRefresh
}) => {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const visibleAnnouncements = (announcements || []).filter(a => a && a.showInNotifications !== false && (a.isActive ?? true));

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore || !onLoadMore) return;

    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        onLoadMore();
      }
    }, { threshold: 0.1 });

    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, onLoadMore]);

  return (
    <div className="min-h-screen pb-24 bg-[#13141f] pt-4">
      {/* Header */}
      <div className="px-4 mb-4 flex items-center justify-between">
        <button 
          onClick={onRefresh} 
          className="text-xs bg-[#242636] text-gray-200 px-3 py-2 rounded-lg border border-gray-700" 
          disabled={refreshing}
        >
          {refreshing ? "جاري التحديث..." : "تحديث"}
        </button>
        <h1 className="text-xl font-bold text-white">الإشعارات</h1>
        <button onClick={() => setView(View.HOME)}><ArrowLeft className="text-white" /></button>
      </div>

      <div className="p-4 space-y-3 pt-0">
        {/* Empty state (Centered) */}
        {(refreshing ? false : visibleAnnouncements.length === 0) && !loadingMore && (
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="bg-[#242636] p-5 rounded-xl border border-gray-700 text-center text-gray-400 text-sm w-full max-w-md">
              لا توجد إشعارات حالياً
            </div>
          </div>
        )}

        {/* Dynamic Announcements from Admin */}
        {visibleAnnouncements.map((ann) => (
          <div
            key={ann.id}
            className={`bg-[#242636] p-4 rounded-xl shadow-md flex items-start gap-4 relative border border-l-4 overflow-hidden animate-fadeIn ${
              ann.type === 'offer'
                ? 'border-emerald-500 border-l-emerald-500'
                : ann.type === 'alert'
                ? 'border-red-500 border-l-red-500'
                : ann.type === 'ad'
                ? 'border-purple-500 border-l-purple-500'
                : ann.type === 'order' || ann.type === 'order_pending'
                ? 'border-yellow-500 border-l-yellow-500'
                : ann.type === 'order_completed'
                ? 'border-emerald-500 border-l-emerald-500'
                : ann.type === 'order_cancelled'
                ? 'border-red-500 border-l-red-500'
                : ann.type === 'wallet'
                ? 'border-amber-500 border-l-amber-500'
                : ann.type === 'wallet_credit'
                ? 'border-emerald-500 border-l-emerald-500'
                : ann.type === 'wallet_debit'
                ? 'border-red-500 border-l-red-500'
                : ann.type === 'account'
                ? 'border-rose-500 border-l-rose-500'
                : 'border-blue-500 border-l-blue-500'
            }`}
          >
            {/* Status Dot */}
            <div
              className={`absolute top-2 left-2 w-2 h-2 rounded-full ${
                ann.type === 'offer'
                  ? 'bg-emerald-500'
                  : ann.type === 'alert'
                  ? 'bg-red-500'
                  : ann.type === 'ad'
                  ? 'bg-purple-500'
                  : ann.type === 'order' || ann.type === 'order_pending'
                  ? 'bg-yellow-500'
                  : ann.type === 'order_completed'
                  ? 'bg-emerald-500'
                  : ann.type === 'order_cancelled'
                  ? 'bg-red-500'
                  : ann.type === 'wallet'
                  ? 'bg-amber-500'
                  : ann.type === 'wallet_credit'
                  ? 'bg-emerald-500'
                  : ann.type === 'wallet_debit'
                  ? 'bg-red-500'
                  : ann.type === 'account'
                  ? 'bg-rose-500'
                  : 'bg-blue-500'
              }`}
            ></div>

            <div className="text-2xl mt-1">
              {ann.type === 'offer' && <Gift className="text-emerald-500" size={32} />}
              {ann.type === 'alert' && <AlertTriangle className="text-red-500" size={32} />}
              {ann.type === 'info' && <Info className="text-blue-500" size={32} />}
              {ann.type === 'ad' && <Megaphone className="text-purple-500" size={32} />}
              {(ann.type === 'order' || ann.type === 'order_pending') && <ShoppingBag className="text-yellow-500" size={32} />}
              {ann.type === 'order_completed' && <ShoppingBag className="text-emerald-500" size={32} />}
              {ann.type === 'order_cancelled' && <ShoppingBag className="text-red-500" size={32} />}
              {ann.type === 'wallet' && <Wallet className="text-amber-500" size={32} />}
              {ann.type === 'wallet_credit' && <Wallet className="text-emerald-500" size={32} />}
              {ann.type === 'wallet_debit' && <Wallet className="text-red-500" size={32} />}
              {ann.type === 'account' && <ShieldAlert className="text-rose-500" size={32} />}
            </div>

            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-white text-sm">{ann.title}</h3>
              </div>
              <p className="text-gray-400 text-xs mb-3 leading-relaxed">{ann.message}</p>
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono">
                <Clock size={12} />
                <span>{ann.date}</span>
              </div>
            </div>
          </div>
        ))}
      
        <div ref={sentinelRef} style={{ height: 1 }} />
        {loadingMore && (<div className="text-center text-gray-400 text-xs py-3">جاري تحميل المزيد...</div>)}
        {!hasMore && announcements.length >= 10 && visibleAnnouncements.length > 0 && (<div className="text-center text-gray-500 text-xs py-3">تم عرض كل الإشعارات</div>)}
      </div>
    </div>
  );
};

export default Notifications;
