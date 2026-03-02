import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard, Copy, Clock, CheckCircle, XCircle, User as UserIcon } from 'lucide-react';
import { WalletTopupRequest } from '../types';
import { walletTopupService } from '../services/api';

interface Props {
  requests: WalletTopupRequest[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: (status?: string) => void;
  onRequestsUpdate: (requests: WalletTopupRequest[]) => void;
}

export const WalletTopupRequestsTab: React.FC<Props> = ({
  requests,
  loading,
  hasMore,
  onLoadMore,
  onRefresh,
  onRequestsUpdate,
}) => {
  const [activeStatus, setActiveStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<WalletTopupRequest | null>(null);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync with parent when tab changes
  useEffect(() => {
    onRefresh(activeStatus);
  }, [activeStatus]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`تم نسخ ${label} بنجاح`);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    const amount = parseFloat(approvalAmount);
    if (isNaN(amount) || amount <= 0) {
      setApprovalError('المبلغ غير صحيح');
      return;
    }

    setIsProcessing(true);
    setApprovalError('');
    try {
      await walletTopupService.approveRequest(selectedRequest.id, amount);
      onRequestsUpdate(requests.filter(r => r.id !== selectedRequest.id));
      setSelectedRequest(null);
      setApprovalAmount('');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'فشل قبول الطلب';
      setApprovalError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (request: WalletTopupRequest) => {
    const reason = prompt('يرجى كتابة سبب الرفض:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('يجب كتابة سبب للرفض');
      return;
    }

    setIsProcessing(true);
    try {
      await walletTopupService.rejectRequest(request.id, reason);
      onRequestsUpdate(requests.filter(r => r.id !== request.id));
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'فشل رفض الطلب';
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const statusTabs = [
    { id: 'pending', label: 'المعلقة', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400' },
    { id: 'approved', label: 'المقبولة', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400' },
    { id: 'rejected', label: 'المرفوضة', icon: XCircle, color: 'text-red-400', bg: 'bg-red-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        {statusTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveStatus(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all whitespace-nowrap border ${
              activeStatus === tab.id
                ? `bg-[#242636] border-gray-600 ${tab.color} shadow-lg`
                : 'bg-[#1a1b26] border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          {statusTabs.find(t => t.id === activeStatus)?.label} ({requests.length})
        </h3>
        <button
          onClick={() => onRefresh(activeStatus)}
          className="text-xs bg-[#242636] text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 hover:bg-[#2f3245] transition-colors"
          disabled={loading}
        >
          {loading ? 'جاري التحديث...' : 'تحديث القائمة'}
        </button>
      </div>

      {loading && requests.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">جاري تحميل الطلبات...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 bg-[#242636]/30 rounded-3xl border border-dashed border-gray-800">
          <CreditCard size={48} className="text-gray-700 mx-auto mb-4 opacity-20" />
          <p className="text-gray-500 font-bold">لا توجد طلبات في هذا القسم</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {requests.map(request => (
            <div key={request.id} className="bg-[#242636] p-5 rounded-2xl border border-gray-800 shadow-sm hover:border-gray-700 transition-colors relative overflow-hidden group">
              {/* Status Indicator Stripe */}
              <div className={`absolute top-0 right-0 w-1.5 h-full ${statusTabs.find(t => t.id === request.status)?.bg}`}></div>
              
              {/* Header: User Info & Date */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1a1b26] flex items-center justify-center border border-gray-700">
                    <UserIcon size={20} className="text-gray-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-white text-sm">{request.user?.name || 'مستخدم'}</h4>
                      <button onClick={() => copyToClipboard(request.user?.name || 'مستخدم', 'الاسم')} className="text-gray-600 hover:text-white transition-colors"><Copy size={10} /></button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[10px] text-gray-500 font-mono">User ID: {request.userId}</p>
                      <button onClick={() => copyToClipboard(request.userId, 'User ID')} className="text-gray-600 hover:text-white transition-colors"><Copy size={10} /></button>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <p className="text-[10px] text-gray-500 font-bold">{new Date(request.createdAt || '').toLocaleString('ar-EG')}</p>
                    <button onClick={() => copyToClipboard(new Date(request.createdAt || '').toLocaleString('ar-EG'), 'التاريخ')} className="text-gray-600 hover:text-white transition-colors"><Copy size={10} /></button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                    <p className="text-[10px] text-gray-500 font-mono">Req ID: {request.id}</p>
                    <button onClick={() => copyToClipboard(request.id, 'معرف الطلب')} className="text-gray-600 hover:text-white transition-colors"><Copy size={10} /></button>
                  </div>
                </div>
              </div>

              {/* Card Number Box */}
              <div className="bg-[#13141f] p-3 rounded-xl border border-gray-700/50 mb-4 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mb-1">رقم كارت أسياسيل</span>
                  <span className="text-sm text-yellow-400 font-mono font-bold tracking-widest">{request.cardNumber}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(request.cardNumber, 'رقم الكارت')}
                  className="p-2.5 bg-[#242636] text-gray-400 hover:text-white rounded-lg transition-all active:scale-90 border border-gray-700 flex items-center gap-1.5"
                >
                  <Copy size={14} />
                  <span className="text-[10px] font-bold">نسخ الكارت</span>
                </button>
              </div>

              {/* Status Specific Info */}
              {request.status === 'approved' && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-2 rounded-lg mb-4 flex items-center justify-between">
                  <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> تم شحن مبلغ: ${request.amount}
                  </p>
                  <button onClick={() => copyToClipboard(request.amount?.toString() || '0', 'المبلغ')} className="text-emerald-500/50 hover:text-emerald-400"><Copy size={10} /></button>
                </div>
              )}
              {request.status === 'rejected' && (
                <div className="bg-red-500/5 border border-red-500/20 p-2 rounded-lg mb-4 flex items-center justify-between">
                  <p className="text-[10px] text-red-400 font-bold">سبب الرفض: {request.rejectionReason || 'بدون سبب'}</p>
                  <button onClick={() => copyToClipboard(request.rejectionReason || 'بدون سبب', 'سبب الرفض')} className="text-red-500/50 hover:text-red-400"><Copy size={10} /></button>
                </div>
              )}

              {/* Actions for Pending */}
              {request.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSelectedRequest(request)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-600/10"
                  >
                    <Check size={14} /> قبول وشحن
                  </button>
                  <button
                    onClick={() => handleReject(request)}
                    className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 border border-red-500/20"
                  >
                    <X size={14} /> رفض
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-6">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="bg-yellow-400 text-black px-8 py-3 rounded-2xl font-bold hover:bg-yellow-500 transition-all active:scale-95 shadow-xl shadow-yellow-400/20 disabled:opacity-50"
          >
            {loading ? 'جاري التحميل...' : 'عرض المزيد'}
          </button>
        </div>
      )}

      {/* Approval Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#13141f] rounded-3xl border border-gray-700 max-w-md w-full p-8 shadow-2xl transform animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">تأكيد شحن الرصيد</h3>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-500 hover:text-white"><X size={24} /></button>
            </div>
            
            <div className="bg-[#242636] rounded-2xl p-5 mb-6 border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-yellow-400/10 flex items-center justify-center text-yellow-400">
                  <UserIcon size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">المستخدم</p>
                  <p className="text-sm text-white font-bold">{selectedRequest.user?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                  <CreditCard size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-bold uppercase">رقم الكارت</p>
                  <p className="text-sm text-yellow-400 font-mono font-bold">{selectedRequest.cardNumber}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-bold text-gray-400 mb-2 block text-right">المبلغ المراد إضافته ($)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  className={`w-full bg-[#1e1f2b] border rounded-2xl py-4 px-4 text-white text-xl font-bold focus:outline-none transition-all text-right dir-ltr ${approvalError ? 'border-red-500' : 'border-gray-600 focus:border-yellow-400'}`}
                  value={approvalAmount}
                  onChange={(e) => {
                    setApprovalAmount(e.target.value);
                    setApprovalError('');
                  }}
                  autoFocus
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</div>
              </div>
              {approvalError && <p className="text-red-400 text-xs mt-2 text-right font-bold">{approvalError}</p>}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setApprovalAmount('');
                  setApprovalError('');
                }}
                className="flex-1 bg-[#242636] hover:bg-[#2f3245] text-white py-4 rounded-2xl font-bold transition-all active:scale-95 border border-gray-700"
                disabled={isProcessing}
              >
                إلغاء
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                disabled={isProcessing || !approvalAmount}
              >
                {isProcessing ? 'جاري المعالجة...' : 'تأكيد الشحن'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletTopupRequestsTab;
