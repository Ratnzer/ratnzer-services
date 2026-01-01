import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  version: '3.3.6',
  appId: 'com.ratelozn.services',
  appName: 'خدمات راتلوزن',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // ✅ مهم: هذا يمنع فتح PayTabs بمتصفح خارجي ويجعل صفحة الدفع تفتح داخل التطبيق (WebView)
    // Capacitor يمنع التنقّل إلى دومينات خارجية افتراضياً، فلابد من عمل whitelist.
    allowNavigation: [
      'rrrr-production-f1ca.up.railway.app',
      '*.paytabs.com',
      '*.paytabs.com.sa',
      '*.paytabs.io'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#000000"
    }
  }
};

export default config;
