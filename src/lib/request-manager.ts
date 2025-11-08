/**
 * Request Manager - Centralized API request handling with queueing and rate limiting
 */

interface QueuedRequest {
  id: string;
  fn: () => Promise<any>;
  priority: number;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

class RequestManagerClass {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private rateLimits = new Map<string, number>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_CONCURRENT = 3;
  private activeRequests = 0;

  /**
   * Add request to queue with rate limiting
   */
  async enqueue<T>(
    key: string,
    fn: () => Promise<T>,
    options: {
      priority?: number;
      maxRetries?: number;
      rateLimit?: number;
    } = {}
  ): Promise<T> {
    const { priority = 5, maxRetries = 2, rateLimit = 5 } = options;

    // Check rate limit
    if (!this.checkRateLimit(key, rateLimit)) {
      console.warn(`[RequestManager] Rate limit exceeded for ${key}`);
      throw new Error('Rate limit exceeded');
    }

    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: `${key}-${Date.now()}`,
        fn: async () => {
          try {
            this.activeRequests++;
            const result = await fn();
            this.activeRequests--;
            resolve(result);
            return result;
          } catch (error) {
            this.activeRequests--;
            if (request.retries < request.maxRetries) {
              request.retries++;
              console.log(`[RequestManager] Retrying ${key} (${request.retries}/${request.maxRetries})`);
              this.queue.push(request);
              this.processQueue();
            } else {
              reject(error);
            }
          }
        },
        priority,
        timestamp: Date.now(),
        retries: 0,
        maxRetries
      };

      this.queue.push(request);
      this.processQueue();
    });
  }

  /**
   * Process request queue
   */
  private async processQueue() {
    if (this.processing || this.activeRequests >= this.MAX_CONCURRENT) return;
    
    this.processing = true;

    // Sort by priority (higher first) then timestamp (older first)
    this.queue.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });

    while (this.queue.length > 0 && this.activeRequests < this.MAX_CONCURRENT) {
      const request = this.queue.shift();
      if (request) {
        request.fn().catch(console.error);
      }
    }

    this.processing = false;
  }

  /**
   * Check if request is within rate limit
   */
  private checkRateLimit(key: string, limit: number): boolean {
    const now = Date.now();
    const lastCall = this.rateLimits.get(key);

    if (!lastCall || now - lastCall > this.RATE_LIMIT_WINDOW) {
      this.rateLimits.set(key, now);
      return true;
    }

    return false;
  }

  /**
   * Clear all queued requests
   */
  clear() {
    this.queue = [];
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      processing: this.processing
    };
  }
}

export const RequestManager = new RequestManagerClass();
