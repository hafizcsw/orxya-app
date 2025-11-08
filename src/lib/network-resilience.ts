import { toast } from 'sonner';

/**
 * Network Resilience - Handle offline/online states and auto-retry
 */

type NetworkStatus = 'online' | 'offline' | 'slow';

class NetworkResilienceClass {
  private status: NetworkStatus = 'online';
  private listeners: Array<(status: NetworkStatus) => void> = [];
  private retryQueue: Array<() => Promise<any>> = [];

  constructor() {
    this.initNetworkMonitoring();
  }

  /**
   * Initialize network monitoring
   */
  private initNetworkMonitoring() {
    // Monitor online/offline events
    window.addEventListener('online', () => {
      this.updateStatus('online');
      toast.success('اتصال الإنترنت عاد', { duration: 2000 });
      this.processRetryQueue();
    });

    window.addEventListener('offline', () => {
      this.updateStatus('offline');
      toast.error('لا يوجد اتصال بالإنترنت - استخدام البيانات المخزنة', { 
        duration: 5000 
      });
    });

    // Initial check
    this.status = navigator.onLine ? 'online' : 'offline';
  }

  /**
   * Update network status
   */
  private updateStatus(status: NetworkStatus) {
    const oldStatus = this.status;
    this.status = status;

    if (oldStatus !== status) {
      this.listeners.forEach(listener => listener(status));
    }
  }

  /**
   * Subscribe to network status changes
   */
  onStatusChange(callback: (status: NetworkStatus) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return this.status;
  }

  /**
   * Check if online
   */
  isOnline(): boolean {
    return this.status === 'online';
  }

  /**
   * Execute request with auto-retry and exponential backoff
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      initialDelay?: number;
      fallback?: () => T;
      onOffline?: () => void;
    } = {}
  ): Promise<T> {
    const { maxRetries = 3, initialDelay = 1000, fallback, onOffline } = options;

    // If offline, try fallback immediately
    if (!this.isOnline()) {
      if (onOffline) onOffline();
      if (fallback) {
        toast.info('استخدام البيانات المخزنة', { duration: 2000 });
        return fallback();
      }
      throw new Error('No network connection');
    }

    let lastError: any;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // If it's a network error and we're offline, try fallback
        if (!this.isOnline() && fallback) {
          toast.warning('انقطع الاتصال - استخدام البيانات المخزنة', { duration: 3000 });
          return fallback();
        }

        // Exponential backoff
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          console.log(`[NetworkResilience] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    if (fallback) {
      toast.error('فشل الاتصال - استخدام البيانات المخزنة', { duration: 3000 });
      return fallback();
    }

    throw lastError;
  }

  /**
   * Add failed request to retry queue
   */
  addToRetryQueue(fn: () => Promise<any>) {
    this.retryQueue.push(fn);
  }

  /**
   * Process retry queue when connection is restored
   */
  private async processRetryQueue() {
    console.log(`[NetworkResilience] Processing ${this.retryQueue.length} queued requests`);
    
    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const fn of queue) {
      try {
        await fn();
      } catch (error) {
        console.error('[NetworkResilience] Failed to retry request:', error);
      }
    }
  }
}

export const NetworkResilience = new NetworkResilienceClass();
