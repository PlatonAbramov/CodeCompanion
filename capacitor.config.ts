import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.platonabramov.app',
  appName: 'Platon Abramov Group',
  webDir: 'dist/public',
  server: {
    url: 'https://pagcrm.com',
    cleartext: false
  }
};

export default config;