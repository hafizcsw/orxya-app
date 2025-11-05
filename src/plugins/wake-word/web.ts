import { WebPlugin } from '@capacitor/core';
import type { WakeWordPlugin } from './definitions';

export class WakeWordWeb extends WebPlugin implements WakeWordPlugin {
  async startListening(): Promise<{ success: boolean }> {
    console.warn('Wake Word غير مدعوم على الويب');
    return { success: false };
  }
  
  async stopListening(): Promise<void> {
    console.warn('Wake Word غير مدعوم على الويب');
  }
}
