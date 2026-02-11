import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  version: '3.3.6',
  appId: 'com.ratnzer.app',
  appName: 'خدمات راتنزر',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'ratnzer-services-bb0a0cce4837.herokuapp.com',
      '*.paytabs.com',
      '*.paytabs.com.sa',
      '*.paytabs.io'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#10b981"
    }
  }
};

export default config;
