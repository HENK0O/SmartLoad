import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartload.app',
  appName: 'SmartLoad',
  webDir: 'out',
  server: {
    url: 'https://smartload.vercel.app',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,
      backgroundColor: '#030712',
      showSpinner: false,
    },
  },
};

export default config;
