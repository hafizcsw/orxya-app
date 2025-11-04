/**
 * Battery-Aware Scheduling System
 * Web-optimized implementation for smart notifications and updates
 */

interface ScheduledTask {
  id: string;
  type: 'exact' | 'near-exact' | 'deferred' | 'opportunistic';
  callback: () => Promise<void>;
  timestamp: number;
  window?: number; // For near-exact tasks (in ms)
}

class BatteryAwareScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private isLowPowerMode = false;
  private lastWakeup = 0;
  private wakeupCount = 0;

  constructor() {
    this.detectPowerMode();
    this.setupVisibilityTracking();
  }

  /**
   * Schedule an exact task (prayer times, meetings)
   */
  scheduleExact(id: string, timestamp: number, callback: () => Promise<void>) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      console.warn('Exact scheduling requires notification permission');
      return this.scheduleNearExact(id, timestamp, 5 * 60 * 1000, callback);
    }

    const delay = timestamp - Date.now();
    if (delay < 0) return;

    const timeoutId = setTimeout(async () => {
      this.wakeupCount++;
      this.lastWakeup = Date.now();
      await callback();
      this.tasks.delete(id);
    }, delay);

    this.tasks.set(id, {
      id,
      type: 'exact',
      callback,
      timestamp,
    });

    // Track exact alarms
    this.logTelemetry('exact_alarm_scheduled', { id, timestamp });
  }

  /**
   * Schedule near-exact task (reminders 10-30min before)
   */
  scheduleNearExact(
    id: string,
    timestamp: number,
    window: number,
    callback: () => Promise<void>
  ) {
    const jitter = Math.random() * window;
    const delay = timestamp - Date.now() + jitter;

    if (delay < 0) return;

    setTimeout(async () => {
      if (!this.shouldSuppress()) {
        await callback();
      }
      this.tasks.delete(id);
    }, delay);

    this.tasks.set(id, {
      id,
      type: 'near-exact',
      callback,
      timestamp,
      window,
    });
  }

  /**
   * Schedule deferred task (sync, AI summaries)
   */
  scheduleDeferred(id: string, callback: () => Promise<void>) {
    if (this.isLowPowerMode) {
      console.log(`Deferred task ${id} skipped - low power mode`);
      return;
    }

    // Use Background Sync API if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration: any) => {
        if ('sync' in registration) {
          registration.sync.register(id);
        }
      }).catch(() => {
        // Fallback if sync fails
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => callback());
        } else {
          setTimeout(() => callback(), 1000);
        }
      });
    } else {
      // Fallback: schedule when idle
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => callback());
      } else {
        setTimeout(() => callback(), 1000);
      }
    }
  }

  /**
   * Opportunistic update (Glances refresh)
   */
  scheduleOpportunistic(id: string, callback: () => Promise<void>, minInterval = 60000) {
    const lastExecution = localStorage.getItem(`last_${id}`);
    const now = Date.now();

    if (lastExecution && now - parseInt(lastExecution) < minInterval) {
      console.log(`Opportunistic task ${id} skipped - too soon`);
      return;
    }

    if (document.visibilityState === 'visible') {
      callback().then(() => {
        localStorage.setItem(`last_${id}`, now.toString());
      });
    }
  }

  /**
   * Cancel scheduled task
   */
  cancel(id: string) {
    this.tasks.delete(id);
  }

  /**
   * Clear all tasks
   */
  clearAll() {
    this.tasks.clear();
  }

  /**
   * Check if we should suppress notifications (noise gate)
   */
  private shouldSuppress(): boolean {
    const now = Date.now();
    const lastShown = parseInt(localStorage.getItem('last_notification_shown') || '0');
    const WINDOW_MS = 90000; // 90 seconds

    if (now - lastShown < WINDOW_MS) {
      return true; // Suppress
    }

    localStorage.setItem('last_notification_shown', now.toString());
    return false;
  }

  /**
   * Detect power saving mode
   */
  private async detectPowerMode() {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery();
        this.isLowPowerMode = battery.level < 0.2 && !battery.charging;

        battery.addEventListener('levelchange', () => {
          this.isLowPowerMode = battery.level < 0.2 && !battery.charging;
        });
      } catch (e) {
        console.warn('Battery API not available');
      }
    }
  }

  /**
   * Track visibility changes
   */
  private setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.logTelemetry('app_resumed', {
          wakeupsSinceLastResume: this.wakeupCount,
        });
        this.wakeupCount = 0;
      }
    });
  }

  /**
   * Log telemetry
   */
  private logTelemetry(event: string, data: any) {
    console.log(`[Telemetry] ${event}`, data);
    // Send to analytics
    if (typeof window !== 'undefined' && (window as any).track) {
      (window as any).track(event, data);
    }
  }

  /**
   * Get stats for dashboard
   */
  getStats() {
    return {
      activeTasks: this.tasks.size,
      wakeupCount: this.wakeupCount,
      lastWakeup: this.lastWakeup,
      isLowPowerMode: this.isLowPowerMode,
      tasksByType: Array.from(this.tasks.values()).reduce((acc, task) => {
        acc[task.type] = (acc[task.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

export const scheduler = new BatteryAwareScheduler();
