import { WakeWord } from '@/plugins/wake-word';
import { Capacitor } from '@capacitor/core';

export class WakeWordManager {
  private isListening = false;
  
  async start(options: {
    accessKey: string;
    keyword?: 'BUMBLEBEE' | 'PORCUPINE' | 'PICOVOICE' | 'JARVIS' | 'ALEXA';
    customPath?: string;
    sensitivity?: number;
    onDetected: () => void;
  }) {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Wake word يعمل فقط على التطبيقات الأصلية');
      return false;
    }
    
    try {
      // Add listener first
      await WakeWord.addListener('wakeWordDetected', () => {
        options.onDetected();
      });
      
      // Start listening
      const result = await WakeWord.startListening({
        accessKey: options.accessKey,
        builtInKeyword: options.keyword,
        customKeywordPath: options.customPath,
        sensitivity: options.sensitivity ?? 0.5,
        enableBackground: true,
      });
      
      this.isListening = result.success;
      return result.success;
      
    } catch (error) {
      console.error('فشل تفعيل Wake Word:', error);
      return false;
    }
  }
  
  async stop() {
    try {
      await WakeWord.stopListening();
      await WakeWord.removeAllListeners();
      this.isListening = false;
    } catch (error) {
      console.error('فشل إيقاف Wake Word:', error);
    }
  }
  
  getStatus() {
    return this.isListening;
  }
}

export const wakeWordManager = new WakeWordManager();
