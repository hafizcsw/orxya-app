/**
 * Notification Manager with Batching and Channels
 * Web-optimized notification system
 */

export type NotificationChannel = 
  | 'calendar_events'
  | 'prayer_times'
  | 'tasks_reminders'
  | 'health_activity'
  | 'system_digest';

interface AppNotificationOptions {
  channel: NotificationChannel;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  actions?: { action: string; title: string }[];
  data?: any;
  requireInteraction?: boolean;
}

class NotificationManager {
  private pendingNotifications: Map<NotificationChannel, AppNotificationOptions[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_WINDOW_MS = 90000; // 90 seconds

  private channelConfig: Record<NotificationChannel, {
    priority: 'high' | 'default' | 'low' | 'min';
    vibrate: boolean;
    sound: boolean;
    badge: boolean;
  }> = {
    calendar_events: { priority: 'high', vibrate: true, sound: true, badge: true },
    prayer_times: { priority: 'high', vibrate: true, sound: true, badge: true },
    tasks_reminders: { priority: 'default', vibrate: false, sound: false, badge: true },
    health_activity: { priority: 'low', vibrate: false, sound: false, badge: false },
    system_digest: { priority: 'min', vibrate: false, sound: false, badge: false },
  };

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  /**
   * Schedule a notification (with batching)
   */
  async notify(options: AppNotificationOptions) {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      console.warn('Notification permission denied');
      return;
    }

    const config = this.channelConfig[options.channel];

    // High priority notifications show immediately
    if (config.priority === 'high') {
      this.showNotification(options);
      return;
    }

    // Batch lower priority notifications
    const pending = this.pendingNotifications.get(options.channel) || [];
    pending.push(options);
    this.pendingNotifications.set(options.channel, pending);

    // Start batch timer if not running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.BATCH_WINDOW_MS);
    }
  }

  /**
   * Show notification immediately
   */
  private async showNotification(options: AppNotificationOptions) {
    const config = this.channelConfig[options.channel];

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const webNotifOptions: any = {
        body: options.body,
        icon: options.icon || '/icon-192.png',
        badge: options.badge || '/icon-72.png',
        tag: options.tag || options.channel,
        requireInteraction: options.requireInteraction || config.priority === 'high',
        actions: options.actions || [],
        data: options.data,
      };
      if (config.vibrate) {
        webNotifOptions.vibrate = [200, 100, 200];
      }
      await registration.showNotification(options.title, webNotifOptions);
    } else {
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192.png',
        tag: options.tag || options.channel,
      });
    }

    // Update last shown timestamp
    localStorage.setItem('last_notification_shown', Date.now().toString());
  }

  /**
   * Flush batched notifications
   */
  private async flushBatch() {
    for (const [channel, notifications] of this.pendingNotifications.entries()) {
      if (notifications.length === 0) continue;

      if (notifications.length === 1) {
        // Single notification - show as-is
        await this.showNotification(notifications[0]);
      } else {
        // Multiple notifications - show summary
        await this.showNotification({
          channel,
          title: `${notifications.length} تحديثات جديدة`,
          body: notifications.map(n => n.title).join('\n'),
          tag: `${channel}_summary`,
          data: { notifications },
        });
      }
    }

    this.pendingNotifications.clear();
    this.batchTimer = null;
  }

  /**
   * Cancel all pending notifications for a channel
   */
  cancelChannel(channel: NotificationChannel) {
    this.pendingNotifications.delete(channel);
  }

  /**
   * Cancel all pending notifications
   */
  cancelAll() {
    this.pendingNotifications.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  /**
   * Check if in quiet hours (22:00-08:00)
   */
  isQuietHours(): boolean {
    const hour = new Date().getHours();
    return hour >= 22 || hour < 8;
  }

  /**
   * Should suppress notification based on quiet hours
   */
  shouldSuppress(channel: NotificationChannel): boolean {
    if (!this.isQuietHours()) return false;

    // Allow critical channels even during quiet hours
    return channel !== 'prayer_times' && channel !== 'calendar_events';
  }
}

export const notificationManager = new NotificationManager();
