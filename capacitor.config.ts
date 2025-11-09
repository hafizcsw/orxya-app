import { CapacitorConfig } from '@capacitor/cli'

// For local development with hot reload from Lovable, set this to true
// For building production APK, set this to false
const USE_DEV_SERVER = false;

const config: CapacitorConfig = {
  appId: 'com.oryxa.app',
  appName: 'Oryxa',
  webDir: 'dist',
  bundledWebRuntime: false,
  ...(USE_DEV_SERVER && {
    server: {
      // Enable hot reload from Lovable sandbox during development
      url: 'https://57dc7576-1990-4872-a4c0-f7cfc474f0d0.lovableproject.com?forceHideBadge=true',
      cleartext: true
    }
  }),
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#ffffff',
      showSpinner: false
    }
  },
  android: {
    allowMixedContent: true
  },
  ios: {
    contentInset: 'always'
  }
}

export default config
