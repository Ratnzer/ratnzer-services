

import React, { useRef, useState } from 'react';
import { X, CheckCircle, Download, Share2, Receipt, Copy, Loader2, MapPin, Tag, Grid, User, Calendar, Hash } from 'lucide-react';
import { Order } from '../types';
import html2canvas from 'html2canvas';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface Props {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  formatPrice: (price: number) => string;
}

const InvoiceModal: React.FC<Props> = ({ order, isOpen, onClose, formatPrice }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !order) return null;

  const safeDateLabel = (() => {
    const d: any = (order as any)?.date;
    if (typeof d === 'string' && d.trim()) {
      return d.split(',')[0] || d;
    }
    const createdAt: any = (order as any)?.createdAt;
    if (createdAt) {
      try { return new Date(createdAt).toLocaleDateString('en-US'); } catch { /* ignore */ }
    }
    return '—';
  })();

  const generateCanvas = async () => {
    if (!invoiceRef.current) return null;
    
    try {
        // Use simpler options for better compatibility
        return await html2canvas(invoiceRef.current, {
            backgroundColor: '#1f212e',
            scale: 2, // 2 is enough and more stable than 3
            useCORS: true,
            allowTaint: true,
            logging: true, // Enable logging for debugging
            onclone: (clonedDoc: Document) => {
                const invoiceElement = clonedDoc.querySelector('[data-invoice-container]') as HTMLElement;
                if (invoiceElement) {
                    invoiceElement.style.animation = 'none';
                    invoiceElement.style.transform = 'none';
                    invoiceElement.style.transition = 'none';
                    
                    // Force Arabic support
                    invoiceElement.style.direction = 'rtl';
                    const allElements = invoiceElement.querySelectorAll('*');
                    allElements.forEach((el) => {
                        if (el instanceof HTMLElement) {
                             el.style.fontFamily = 'Arial, sans-serif'; 
                             el.style.letterSpacing = '0px';
                        }
                    });
                }
            }
        });
    } catch (err) {
        console.error("html2canvas error:", err);
        return null;
    }
  };

  const handleSaveImage = async () => {
    if (!invoiceRef.current || isProcessing) return;
    setIsProcessing(true);

    // ✅ Small delay to ensure UI updates and shows loading spinner immediately
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const canvas = await generateCanvas();
        if (!canvas) throw new Error("Could not generate canvas");
        
        const image = canvas.toDataURL("image/png", 1.0);

        // 1. Try Capacitor Native Save (If available)
        if (Capacitor.isNativePlatform()) {
            try {
                const base64Data = image.split(',')[1];
                const fileName = `Invoice-${order.id}-${Date.now()}.png`;
                
                await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Documents,
                    recursive: true
                });
                
                alert("تم حفظ صورة الفاتورة في جهازك بنجاح");
                setIsProcessing(false);
                return;
            } catch (e) {
                console.error("Native save error:", e);
                // Continue to fallback
            }
        }
        
        // 2. Standard Web Download Fallback
        const link = document.createElement("a");
        link.href = image;
        link.download = `Invoice-${order.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 3. Android WebView "Long Press" Fallback
        // We show a clear message to the user for the best experience
        setTimeout(() => {
            const newWindow = window.open();
            if (newWindow) {
                newWindow.document.write(`
                    <div style="background:#1f212e; color:white; text-align:center; padding:20px; font-family:sans-serif; direction:rtl;">
                        <h3>تم توليد الفاتورة بنجاح</h3>
                        <p>اضغط مطولاً على الصورة بالأسفل واختر "حفظ الصورة"</p>
                        <img src="${image}" style="width:100%; max-width:400px; height:auto; border-radius:10px; margin-top:20px; box-shadow:0 10px 20px rgba(0,0,0,0.5);" />
                    </div>
                `);
                newWindow.document.title = "حفظ الفاتورة";
            }
        }, 500);
        
    } catch (error) {
        console.error("Failed to save image", error);
        alert("حدث خطأ أثناء حفظ الصورة. يرجى المحاولة مرة أخرى.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleShare = async () => {
    if (!invoiceRef.current || isProcessing) return;
    setIsProcessing(true);

    // ✅ Small delay to ensure UI updates and shows loading spinner immediately
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const canvas = await generateCanvas();
        if (!canvas) throw new Error("Canvas generation failed");

        const image = canvas.toDataURL("image/png");
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        
        // 1. Try Capacitor Native Share (Best for Android/iOS)
        if (Capacitor.isNativePlatform()) {
            try {
                const base64Data = image.split(',')[1];
                const fileName = `invoice-${order.id}.png`;
                
                // First save to temp cache to share
                const cacheFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Cache
                });

                await Share.share({
                    title: `فاتورة شراء - ${order.productName}`,
                    text: `فاتورة الطلب رقم ${order.id}`,
                    url: cacheFile.uri,
                });
                
                setIsProcessing(false);
                return;
            } catch (e) {
                console.error("Native share error:", e);
            }
        }

        // 2. Web Share API Fallback
        if (navigator.share) {
            try {
                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                if (blob) {
                    const file = new File([blob], `invoice-${order.id}.png`, { type: "image/png" });
                    if (navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: `فاتورة شراء - ${order.productName}`,
                            text: `فاتورة الطلب رقم ${order.id}`,
                            files: [file],
                        });
                        setIsProcessing(false);
                        return;
                    }
                }
            } catch (e) {
                console.warn("Web share failed");
            }
        }

        // 3. Final Fallback: Save Image (Silent fallback for better UX)
        handleSaveImage();

    } catch (error) {
        console.error("Failed to share", error);
        handleSaveImage();
    } finally {
        setIsProcessing(false);
    }
  };

  const getCategoryName = (catId?: string) => {
      switch(catId) {
          case 'games': return 'ألعاب';
          case 'stores': return 'متاجر تطبيقات';
          case 'telecom': return 'اتصالات';
          case 'software': return 'خدمات / برامج';
          case 'shopping': return 'تسوق';
          case 'media': return 'خدمات ميديا';
          default: return catId || 'غير محدد';
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>

      {/* Container for the card */}
      <div className="relative z-10 w-full max-w-[270px] animate-slide-up">
        
        {/* Close Button */}
        <button 
            onClick={onClose} 
            className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white/10 hover:bg-white/20 p-1.5 rounded-full text-white backdrop-blur-md transition-colors"
        >
            <X size={20} />
        </button>

        {/* The Invoice Card (Ref for Capture) */}
        <div 
            ref={invoiceRef} 
            data-invoice-container
            className="bg-[#1f212e] rounded-xl overflow-hidden shadow-2xl border border-gray-700 relative"
        >
            {/* Minimal Header */}
            <div className="h-14 bg-gradient-to-r from-yellow-500 to-yellow-600 flex items-center justify-center relative">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
                <div className="flex items-center gap-2 text-black/80">
                   <Receipt size={20} strokeWidth={2.5} />
                   <span className="font-black text-sm tracking-wide">إيصال دفع</span>
                </div>
            </div>

            {/* Content Body */}
            <div className="px-4 py-4 text-center">
                
                {/* Date Only Row (Centered) */}
                <div className="flex justify-center items-center text-[9px] text-gray-500 mb-3 border-b border-gray-800 pb-2">
                    <span className="flex items-center gap-1 font-mono dir-ltr"><Calendar size={10} /> {safeDateLabel}</span>
                </div>

                {/* Amount Box */}
                <div className="bg-[#13141f] rounded-lg p-2.5 border border-gray-700/50 mb-4 shadow-inner">
                    <p className="text-gray-500 text-[9px] font-bold mb-0.5">المبلغ المدفوع</p>
                    <p className="text-xl font-black text-yellow-400 dir-ltr font-mono">{formatPrice(order.amount)}</p>
                    <div className="flex justify-center mt-1">
                        <span className="text-emerald-500 text-[9px] font-bold flex items-center gap-1">
                            <CheckCircle size={10} /> عملية ناجحة
                        </span>
                    </div>
                </div>

                {/* Compact Details List */}
                <div className="space-y-1.5 text-right">
                    
                    {/* Order ID Row - Moved Here */}
                    <div className="flex justify-between items-center py-1 border-b border-gray-800/30">
                        <span className="text-gray-500 text-[9px] font-bold flex items-center gap-1"><Hash size={10}/> رقم الطلب</span>
                        <div className="flex items-center gap-1">
                            <span className="text-white text-[9px] font-mono dir-ltr select-all">#{order.id}</span>
                            <button 
                                onClick={() => navigator.clipboard.writeText(String(order.id || ''))}
                                className="text-gray-500 hover:text-white transition-colors p-0.5"
                                data-html2canvas-ignore="true"
                                title="نسخ رقم الطلب"
                            >
                                <Copy size={10} />
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-between items-start py-1 border-b border-gray-800/30">
                        <span className="text-gray-500 text-[9px] font-bold flex items-center gap-1 shrink-0"><Grid size={10}/> المنتج</span>
                        <span className="text-white text-[9px] font-bold text-left leading-tight max-w-[140px]">{order.productName}</span>
                    </div>

                    <div className="flex justify-between items-center py-1 border-b border-gray-800/30">
                        <span className="text-gray-500 text-[9px] font-bold flex items-center gap-1"><Tag size={10}/> نوع الفئة</span>
                        <span className="text-white text-[9px] text-left">{getCategoryName(order.productCategory)}</span>
                    </div>

                    {order.regionName && (
                        <div className="flex justify-between items-center py-1 border-b border-gray-800/30">
                            <span className="text-gray-500 text-[9px] font-bold flex items-center gap-1"><MapPin size={10}/> نوع المنتج</span>
                            <span className="text-white text-[9px] text-left">{order.regionName}</span>
                        </div>
                    )}

                    {order.quantityLabel && (
                         <div className="flex justify-between items-center py-1 border-b border-gray-800/30">
                            <span className="text-gray-500 text-[9px] font-bold flex items-center gap-1"><Grid size={10}/> الكمية</span>
                            <span className="text-white text-[9px] font-mono text-left dir-ltr">{order.quantityLabel}</span>
                        </div>
                    )}
                    
                    {/* Custom Input on Invoice */}
                    {order.customInputValue && (
                         <div className="flex justify-between items-center py-1 border-b border-gray-800/30">
                            <span className="text-gray-500 text-[9px] font-bold flex items-center gap-1"><User size={10}/> {order.customInputLabel || 'معلومات'}</span>
                            <span className="text-white text-[9px] text-left select-all">{order.customInputValue}</span>
                        </div>
                    )}

                    {/* User info */}
                    <div className="flex justify-between items-center py-1">
                        <span className="text-gray-500 text-[9px] font-bold flex items-center gap-1"><User size={10}/> المستخدم</span>
                        <div className="text-left flex items-center gap-1">
                            <span className="text-white text-[9px] font-bold">{order.userName}</span>
                            <span className="text-gray-600 text-[8px] font-mono dir-ltr">({order.userId})</span>
                        </div>
                    </div>
                </div>

                {/* Code Display */}
                {order.deliveredCode && (
                    <div className="mt-4 pt-2 border-t border-dashed border-gray-700">
                        <div className="bg-[#242636] p-2 rounded border border-gray-600/50 text-white relative overflow-hidden group">
                             <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                             <p className="text-[8px] text-gray-500 mb-1 text-right pr-2">الكود المستلم</p>
                             <p className="text-[11px] font-semibold dir-ltr font-mono text-center select-all" style={{ letterSpacing: '0px' }}>{order.deliveredCode}</p>
                        </div>
                    </div>
                )}
                
                {/* Branding Footer */}
                <div className="mt-4 pt-3 border-t border-gray-800/50 flex flex-col items-center justify-center">
                     <p className="text-[11px] text-yellow-500 font-black tracking-wide">خدمات راتلوزن</p>
                     <p className="text-[6px] text-gray-600 font-mono tracking-[0.2em] uppercase dir-ltr mt-0.5">RATLUZEN SERVICES</p>
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
            <button 
                onClick={handleSaveImage}
                disabled={isProcessing}
                className="flex-1 bg-white text-black py-2 rounded-lg font-bold text-[10px] shadow-lg flex items-center justify-center gap-1 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
                {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                حفظ
            </button>
            <button 
                onClick={handleShare}
                disabled={isProcessing}
                className="flex-1 bg-yellow-400 text-black py-2 rounded-lg font-bold text-[10px] shadow-lg flex items-center justify-center gap-1 hover:bg-yellow-500 transition-colors disabled:opacity-50"
            >
                {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
                مشاركة
            </button>
        </div>

      </div>
    </div>
  );
};

export default InvoiceModal;
