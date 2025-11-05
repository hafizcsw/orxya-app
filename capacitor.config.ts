import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.oryxa.app',
  appName: 'Oryxa',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    // Enable hot reload from Lovable sandbox during development
    url: 'https://57dc7576-1990-4872-a4c0-f7cfc474f0d0.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
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
