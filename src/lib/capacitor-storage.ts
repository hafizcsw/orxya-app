import { Preferences } from '@capacitor/preferences';

/**
 * Capacitor-compatible storage utilities
 * Uses Preferences API for native apps, falls back to localStorage for web
 */

export async function setStorageItem(key: string, value: string): Promise<void> {
  try {
    await Preferences.set({ key, value });
  } catch (error) {
    console.error('[Storage] Failed to set item:', error);
    // Fallback to localStorage
    localStorage.setItem(key, value);
  }
}

export async function getStorageItem(key: string): Promise<string | null> {
  try {
    const { value } = await Preferences.get({ key });
    return value;
  } catch (error) {
    console.error('[Storage] Failed to get item:', error);
    // Fallback to localStorage
    return localStorage.getItem(key);
  }
}

export async function removeStorageItem(key: string): Promise<void> {
  try {
    await Preferences.remove({ key });
  } catch (error) {
    console.error('[Storage] Failed to remove item:', error);
    // Fallback to localStorage
    localStorage.removeItem(key);
  }
}
