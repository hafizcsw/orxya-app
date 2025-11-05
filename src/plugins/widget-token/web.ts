import { WebPlugin } from '@capacitor/core';
import type { WidgetTokenPlugin } from './index';

export class WidgetTokenWeb extends WebPlugin implements WidgetTokenPlugin {
  async saveToken(options: { token: string }): Promise<{ success: boolean }> {
    // For web, save to localStorage as fallback
    try {
      localStorage.setItem('widget_jwt_token', options.token);
      return { success: true };
    } catch (error) {
      console.error('Failed to save token on web:', error);
      return { success: false };
    }
  }

  async removeToken(): Promise<{ success: boolean }> {
    try {
      localStorage.removeItem('widget_jwt_token');
      return { success: true };
    } catch (error) {
      console.error('Failed to remove token on web:', error);
      return { success: false };
    }
  }

  async getToken(): Promise<{ token: string | null }> {
    try {
      const token = localStorage.getItem('widget_jwt_token');
      return { token };
    } catch (error) {
      console.error('Failed to get token on web:', error);
      return { token: null };
    }
  }
}
