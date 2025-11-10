/**
 * Update Notifications System
 * Manages local push notifications for app updates
 */

import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
}

const STORAGE_KEY = 'update_notification_settings';
const NOTIFICATION_CHANNEL_ID = 'app-updates';

/**
 * Initialize notification system
 */
export async function initUpdateNotifications() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Request permissions
    const permission = await LocalNotifications.requestPermissions();
    
    if (permission.display !== 'granted') {
      console.log('[UpdateNotifications] Permission denied');
      return;
    }

    // Create notification channel for Android
    if (Capacitor.getPlatform() === 'android') {
      await LocalNotifications.createChannel({
        id: NOTIFICATION_CHANNEL_ID,
        name: 'تحديثات التطبيق',
        description: 'إشعارات التحديثات الجديدة المتوفرة',
        importance: 4, // High importance
        visibility: 1, // Public
        sound: 'default',
        vibration: true,
      });
    }

    console.log('[UpdateNotifications] Initialized successfully');
  } catch (error) {
    console.error('[UpdateNotifications] Failed to initialize:', error);
  }
}

/**
 * Get notification settings
 */
export function getNotificationSettings(): NotificationSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {
      enabled: true,
      sound: true,
      vibration: true,
    };
  } catch (error) {
    console.error('[UpdateNotifications] Failed to load settings:', error);
    return {
      enabled: true,
      sound: true,
      vibration: true,
    };
  }
}

/**
 * Save notification settings
 */
export function saveNotificationSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    console.log('[UpdateNotifications] Settings saved:', settings);
  } catch (error) {
    console.error('[UpdateNotifications] Failed to save settings:', error);
  }
}

/**
 * Show update available notification
 */
export async function showUpdateNotification(version: string, type: 'pwa' | 'native') {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  const settings = getNotificationSettings();
  
  if (!settings.enabled) {
    console.log('[UpdateNotifications] Notifications disabled');
    return;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: 'تحديث جديد متوفر 🎉',
          body: `النسخة ${version} جاهزة للتثبيت. اضغط للتحديث الآن.`,
          schedule: { at: new Date(Date.now() + 1000) }, // 1 second delay
          sound: settings.sound ? 'default' : undefined,
          channelId: NOTIFICATION_CHANNEL_ID,
          extra: {
            action: 'open-updates',
            version,
            type,
          },
        },
      ],
    });

    console.log('[UpdateNotifications] Notification scheduled for version:', version);
  } catch (error) {
    console.error('[UpdateNotifications] Failed to show notification:', error);
  }
}

/**
 * Clear all update notifications
 */
export async function clearUpdateNotifications() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const pending = await LocalNotifications.getPending();
    const updateNotifications = pending.notifications.filter(
      n => n.extra?.action === 'open-updates'
    );
    
    if (updateNotifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: updateNotifications,
      });
      console.log('[UpdateNotifications] Cleared notifications');
    }
  } catch (error) {
    console.error('[UpdateNotifications] Failed to clear:', error);
  }
}

/**
 * Handle notification tap
 */
export function setupNotificationHandlers(onUpdateTap: () => void) {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
    if (notification.notification.extra?.action === 'open-updates') {
      console.log('[UpdateNotifications] User tapped update notification');
      onUpdateTap();
    }
  });
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return Capacitor.isNativePlatform();
}
