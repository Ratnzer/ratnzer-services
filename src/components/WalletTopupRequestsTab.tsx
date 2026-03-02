import React, { useState } from 'react';
import { X, Check, AlertTriangle, DollarSign, Phone, Mail, Calendar, CreditCard, Copy } from 'lucide-react';
import { WalletTopupRequest } from '../types';
import { walletTopupService } from '../services/api';

interface Props {
  requests: WalletTopupRequest[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
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
  const [selectedRequest, setSelectedRequest] = useState<WalletTopupRequest | null>(null);
  const [approvalAmount, setApprovalAmount] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (!rejectionReason.trim()) {
      alert('يرجى تحديد سبب الرفض');
      return;
    }

    setIsProcessing(true);
    try {
      await walletTopupService.rejectRequest(request.id, rejectionReason);
      onRequestsUpdate(requests.filter(r => r.id !== request.id));
      setRejectionReason('');
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'فشل رفض الطلب';
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={onRefresh}
          className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity"
          disabled={loading}
        >
          {loading ? 'جاري التحديث...' : 'تحديث'}
        </button>
        <h3 className="text-lg font-bold text-white">طلبات المحفظة المعلقة ({requests.length})</h3>
      </div>

      {loading && requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">جاري تحميل الطلبات...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">لا توجد طلبات معلقة</div>
      ) : (
        <div className="space-y-3">
          {requests.map(request => (
            <div key={request.id} className="bg-[#242636] p-4 rounded-xl border border-gray-700 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                    <CreditCard size={24} className="text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-white">{request.user?.name || 'مستخدم'}</h4>
                    <p className="text-xs text-gray-400">رقم الطلب: {request.id}</p>
                    <div className="mt-2 flex items-center gap-2 bg-[#13141f] p-2 rounded-lg border border-gray-700 w-fit">
                      <span className="text-xs text-gray-400 font-bold">رقم الكارت:</span>
                      <span className="text-sm text-yellow-400 font-mono font-bold select-all">{request.cardNumber}</span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(request.cardNumber);
                          alert('تم نسخ رقم الكارت');
                        }}
                        className="text-gray-500 hover:text-white transition-colors p-1"
                        title="نسخ رقم الكارت"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-yellow-400">رقم الكارت</span>
                  <p className="text-xs text-gray-400 mt-1">{new Date(request.createdAt || '').toLocaleString('ar-EG')}</p>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-[#13141f] rounded-lg p-3 mb-3 space-y-2 text-sm">
                {request.user?.email && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Mail size={14} className="text-gray-500" />
                    <span className="dir-ltr">{request.user.email}</span>
                  </div>
                )}
                {request.user?.phone && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Phone size={14} className="text-gray-500" />
                    <span className="dir-ltr">{request.user.phone}</span>
                  </div>
                )}
                {request.user?.balance !== undefined && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <DollarSign size={14} className="text-gray-500" />
                    <span>الرصيد الحالي: ${request.user.balance}</span>
                  </div>
                )}
                {request.user?.createdAt && (
                  <div className="flex items-center gap-2 text-gray-300">
                    <Calendar size={14} className="text-gray-500" />
                    <span>انضم: {new Date(request.user.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedRequest(request)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Check size={14} /> قبول
                </button>
                <button
                  onClick={() => handleReject(request)}
                  className="flex-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <X size={14} /> رفض
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="bg-yellow-400 text-black px-6 py-2 rounded-xl font-bold hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'جاري التحميل...' : 'عرض المزيد'}
          </button>
        </div>
      )}

      {/* Approval Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#13141f] rounded-2xl border border-gray-700 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">قبول الطلب</h3>
            
            <div className="bg-[#242636] rounded-lg p-4 mb-4 text-sm">
              <p className="text-gray-300 mb-2"><span className="font-bold">المستخدم:</span> {selectedRequest.user?.name}</p>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-gray-300"><span className="font-bold">رقم الكارت:</span> <span className="text-yellow-400 font-mono font-bold">{selectedRequest.cardNumber}</span></p>
                <button 
                  onClick={() => navigator.clipboard.writeText(selectedRequest.cardNumber)}
                  className="text-gray-500 hover:text-white transition-colors"
                >
                  <Copy size={12} />
                </button>
              </div>
              <p className="text-gray-300"><span className="font-bold">الرصيد الحالي:</span> ${selectedRequest.user?.balance}</p>
            </div>

            <label className="text-xs font-bold text-gray-400 mb-2 block">المبلغ المراد إضافته</label>
            <input
              type="number"
              placeholder="أدخل المبلغ"
              className={`w-full bg-[#1e1f2b] border rounded-lg py-2 px-3 text-white mb-4 focus:outline-none ${approvalError ? 'border-red-500' : 'border-gray-600 focus:border-yellow-400'}`}
              value={approvalAmount}
              onChange={(e) => {
                setApprovalAmount(e.target.value);
                setApprovalError('');
              }}
            />
            {approvalError && <p className="text-red-400 text-xs mb-4">{approvalError}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setApprovalAmount('');
                  setApprovalError('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-bold transition-colors"
                disabled={isProcessing}
              >
                إلغاء
              </button>
              <button
                onClick={handleApprove}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg font-bold transition-colors disabled:opacity-50"
                disabled={isProcessing || !approvalAmount}
              >
                {isProcessing ? 'جاري...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletTopupRequestsTab;
