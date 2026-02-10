import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  version: '3.3.6',
  appId: 'com.ratnzer.app',
  appName: 'خدمات راتنزر',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
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
    },
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com", "facebook.com"]
    }
  }
};

export default config;
