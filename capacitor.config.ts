import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.railguard.mobile',
  appName: 'RailGuard',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
  },
};

export default config;
