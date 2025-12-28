import React from 'react';
import { Clock, Info, AlertTriangle, Gift, Megaphone } from 'lucide-react';
import { View, Announcement } from '../types';

interface Props {
  setView: (view: View) => void;
  formatPrice: (price: number) => string;
  announcements?: Announcement[];
}

const Notifications: React.FC<Props> = ({ setView, formatPrice, announcements = [] }) => {
  const [visibleCount, setVisibleCount] = React.useState<number>(10);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const visibleAnnouncements = (announcements || []).filter(a => a && a.showInNotifications !== false && (a.isActive ?? true));

  React.useEffect(() => {
    setVisibleCount(10);
  }, [announcements]);

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      if (loadingMore) return;
      if (visibleCount >= visibleAnnouncements.length) return;

      setLoadingMore(true);
      setVisibleCount((c) => Math.min(c + 10, visibleAnnouncements.length));
      setTimeout(() => setLoadingMore(false), 150);
    });

    obs.observe(el);
    return () => obs.disconnect();
  }, [visibleCount, visibleAnnouncements.length, loadingMore]);

  return (
    <div className="min-h-screen pb-24 bg-[#13141f] pt-4">
      {/* Header */}
      <div className="px-4 mb-4">
        <h1 className="text-xl font-bold text-white text-right">الإشعارات</h1>
      </div>

      <div className="p-4 space-y-3 pt-0">
        {/* Empty state (Centered) */}
        {visibleAnnouncements.length === 0 && (
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="bg-[#242636] p-5 rounded-xl border border-gray-700 text-center text-gray-400 text-sm w-full max-w-md">
              لا توجد إشعارات حالياً
            </div>
          </div>
        )}

        {/* Dynamic Announcements from Admin */}
        {visibleAnnouncements.slice(0, visibleCount).map((ann) => (
          <div
            key={ann.id}
            className={`bg-[#242636] p-4 rounded-xl shadow-md flex items-start gap-4 relative border border-l-4 overflow-hidden animate-fadeIn ${
              ann.type === 'offer'
                ? 'border-yellow-400 border-l-yellow-400'
                : ann.type === 'alert'
                ? 'border-red-500 border-l-red-500'
                : ann.type === 'ad'
                ? 'border-purple-500 border-l-purple-500'
                : 'border-blue-500 border-l-blue-500'
            }`}
          >
            {/* Status Dot */}
            <div
              className={`absolute top-2 left-2 w-2 h-2 rounded-full ${
                ann.type === 'offer'
                  ? 'bg-yellow-400'
                  : ann.type === 'alert'
                  ? 'bg-red-500'
                  : ann.type === 'ad'
                  ? 'bg-purple-500'
                  : 'bg-blue-500'
              }`}
            ></div>

            <div className="text-2xl mt-1">
              {ann.type === 'offer' && <Gift className="text-yellow-400" size={32} />}
              {ann.type === 'alert' && <AlertTriangle className="text-red-500" size={32} />}
              {ann.type === 'info' && <Info className="text-blue-500" size={32} />}
              {ann.type === 'ad' && <Megaphone className="text-purple-500" size={32} />}
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
        {visibleCount >= visibleAnnouncements.length && visibleAnnouncements.length > 0 && (<div className="text-center text-gray-500 text-xs py-3">لا يوجد المزيد</div>)}
</div>
    </div>
  );
};

export default Notifications;
