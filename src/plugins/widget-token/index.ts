import { registerPlugin } from '@capacitor/core';

export interface WidgetTokenPlugin {
  /**
   * Save JWT token for widget access
   */
  saveToken(options: { token: string }): Promise<{ success: boolean }>;
  
  /**
   * Remove JWT token
   */
  removeToken(): Promise<{ success: boolean }>;
  
  /**
   * Get current saved token (for debugging)
   */
  getToken(): Promise<{ token: string | null }>;
}

const WidgetToken = registerPlugin<WidgetTokenPlugin>('WidgetToken', {
  web: () => import('./web').then(m => new m.WidgetTokenWeb()),
});

export default WidgetToken;
