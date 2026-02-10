import React from 'react';
import { ShieldAlert, RefreshCcw, Copy, Trash2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  persistedCrash: any | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    let savedCrash = null;
    try {
      const raw = localStorage.getItem('last_app_crash');
      if (raw) savedCrash = JSON.parse(raw);
    } catch (_e) {}

    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      persistedCrash: savedCrash
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('CRITICAL UI CRASH:', error, errorInfo);
    
    // حفظ الكراش فوراً في localStorage
    try {
      const crashData = {
        message: error.message || String(error),
        stack: error.stack || 'No stack trace',
        componentStack: errorInfo?.componentStack || '',
        time: new Date().toISOString(),
        type: 'ReactErrorBoundary'
      };
      localStorage.setItem('last_app_crash', JSON.stringify(crashData));
    } catch (_e) {}
  }

  clearCrash = () => {
    localStorage.removeItem('last_app_crash');
    this.setState({ persistedCrash: null, hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  dismissCrashLog = () => {
    localStorage.removeItem('last_app_crash');
    this.setState({ persistedCrash: null, hasError: false, error: null, errorInfo: null });
  };

  render() {
    // ✅ FIX: عرض سجل الأخطاء المحفوظ فقط إذا لم يكن هناك كراش نشط
    // الكراش النشط (hasError) يعني أن React نفسه انهار ويجب عرض شاشة الخطأ
    // الكراش المحفوظ (persistedCrash) يعني أن التطبيق كرش سابقاً وأُعيد فتحه
    const isActiveCrash = this.state.hasError;
    const hasPersistedCrash = !!this.state.persistedCrash && !isActiveCrash;

    if (isActiveCrash) {
      const crash = {
        message: this.state.error?.message || String(this.state.error),
        stack: this.state.error?.stack || 'No stack trace available',
        componentStack: this.state.errorInfo?.componentStack || '',
        type: 'ActiveCrash',
        time: new Date().toISOString()
      };

      return this.renderCrashScreen(crash, true);
    }

    if (hasPersistedCrash) {
      return this.renderCrashScreen(this.state.persistedCrash, false);
    }

    return this.props.children;
  }

  renderCrashScreen(crash: any, isActive: boolean) {
    const fullLog = [
      `Type: ${crash.type || 'Unknown'}`,
      `Time: ${crash.time || 'Unknown'}`,
      `Message: ${crash.message || 'No message'}`,
      '',
      `Stack Trace:`,
      crash.stack || 'No stack trace',
      crash.componentStack ? `\nComponent Stack:\n${crash.componentStack}` : ''
    ].join('\n');

    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-6 py-10 text-center overflow-y-auto">
        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 border border-red-500/20 shadow-2xl shadow-red-500/10">
          <ShieldAlert className="text-red-500" size={40} />
        </div>
        
        <div className="text-2xl font-black text-white mb-2 tracking-tight">
          {isActive ? 'حدث خطأ في التطبيق' : 'تم اكتشاف انهيار سابق'}
        </div>
        <div className="text-gray-400 mb-8 text-sm leading-relaxed max-w-xs mx-auto">
          {isActive 
            ? 'حدث خطأ غير متوقع. يمكنك نسخ سجل الخطأ وإرساله للدعم الفني لمساعدتنا في إصلاح المشكلة.'
            : 'يبدو أن التطبيق خرج بشكل مفاجئ. تم التقاط سجل الخطأ أدناه لمساعدتنا في إصلاح المشكلة.'
          }
        </div>

        <div className="w-full max-w-md bg-[#13141f] border border-gray-800 rounded-2xl p-5 mb-8 text-left shadow-xl">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-800/50">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Crash Log</span>
              <span className="text-[9px] text-gray-500 font-mono">{crash.time || 'Just now'}</span>
            </div>
            <button 
              onClick={() => {
                try {
                  // ✅ FIX: استخدام طريقة متوافقة مع Capacitor WebView
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(fullLog).then(() => {
                      alert('تم نسخ تفاصيل الخطأ بنجاح');
                    }).catch(() => {
                      this.fallbackCopy(fullLog);
                    });
                  } else {
                    this.fallbackCopy(fullLog);
                  }
                } catch (_e) {
                  this.fallbackCopy(fullLog);
                }
              }}
              className="flex items-center gap-2 text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-3 py-1.5 rounded-lg transition-all border border-emerald-500/20 font-bold"
            >
              <Copy size={12} />
              نسخ السجل
            </button>
          </div>
          <div className="font-mono text-[11px] text-gray-300 break-words whitespace-pre-wrap max-h-60 overflow-y-auto no-scrollbar bg-black/20 p-3 rounded-xl border border-black/40 select-all">
            <span className="text-red-400 font-bold">[{crash.type}]</span> {crash.message}
            {"\n\n"}
            <span className="text-gray-600 leading-loose">{crash.stack}</span>
            {crash.componentStack && (
              <>
                {"\n\n"}
                <span className="text-yellow-600 text-[10px]">{crash.componentStack}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col w-full max-w-md gap-3">
          <button
            onClick={this.clearCrash}
            className="w-full px-4 py-4 rounded-2xl bg-white text-black font-black text-sm active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-2"
          >
            <RefreshCcw size={18} />
            إعادة تشغيل التطبيق
          </button>
          
          {!isActive && (
            <button
              onClick={this.dismissCrashLog}
              className="w-full px-4 py-3 rounded-2xl bg-transparent text-gray-500 font-bold text-xs hover:text-gray-300 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={14} />
              مسح السجل والمتابعة
            </button>
          )}
        </div>

        <div className="mt-12 text-[10px] text-gray-600 font-medium tracking-widest uppercase">
          Ratnzer Services Debug System v3.0
        </div>
      </div>
    );
  }

  // ✅ طريقة بديلة للنسخ تعمل في جميع البيئات
  fallbackCopy(text: string) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (success) {
        alert('تم نسخ تفاصيل الخطأ بنجاح');
      } else {
        alert('لم نتمكن من النسخ التلقائي. يرجى تحديد النص يدوياً ونسخه.');
      }
    } catch (_e) {
      alert('لم نتمكن من النسخ التلقائي. يرجى تحديد النص يدوياً ونسخه.');
    }
  }
}
