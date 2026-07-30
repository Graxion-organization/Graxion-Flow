const logger = require('./logger');

class WebhookQueue {
  constructor(maxConcurrency = 2, timeoutMs = 30000) {
    this.maxConcurrency = maxConcurrency;
    this.timeoutMs = timeoutMs;
    this.runningCount = 0;
    
    this.queues = new Map(); // key -> Array of Task objects
    this.activeKeys = new Set(); // Set of keys currently running in a worker slot
    this.suspendedKeys = new Set(); // Set of keys in retry backoff sleep
    
    this.dlq = [];
    this.maxDlqSize = 100;

    this.metrics = {
      totalProcessed: 0,
      totalFailed: 0,
      avgExecutionTime: 0, // Exponential moving average
      failureCountPerPlatform: {
        whatsapp: 0,
        telegram: 0,
        instagram: 0,
        facebook: 0,
        unknown: 0
      }
    };
  }

  /**
   * Enqueue a new webhook task
   * @param {string} key - Unique key per user/conversation for sequential execution
   * @param {Function} taskFn - The async function to execute
   * @param {Object} [metadata] - Optional task metadata (platform, payload, maxAttempts)
   */
  enqueue(key, taskFn, metadata = {}) {
    if (!this.queues.has(key)) {
      this.queues.set(key, []);
    }

    const task = {
      taskFn,
      key,
      attempts: 0,
      maxAttempts: metadata.maxAttempts || 3,
      platform: metadata.platform || 'unknown',
      payload: metadata.payload || null,
      enqueuedAt: Date.now()
    };

    this.queues.get(key).push(task);
    logger.debug(`[WebhookQueue] Enqueued task for key: ${key}. Queue size: ${this.queues.get(key).length}`);
    this.process();
  }

  async process() {
    // If we've reached the global concurrency limit, stop.
    if (this.runningCount >= this.maxConcurrency) {
      return;
    }

    // Find a key that has tasks, is not actively running, and is not suspended in backoff
    let nextKey = null;
    for (const [key, queue] of this.queues.entries()) {
      if (queue.length > 0 && !this.activeKeys.has(key) && !this.suspendedKeys.has(key)) {
        nextKey = key;
        break;
      }
    }

    if (!nextKey) {
      return;
    }

    const queue = this.queues.get(nextKey);
    const task = queue.shift();

    // Mark key active and increment global concurrency
    this.activeKeys.add(nextKey);
    this.runningCount++;

    const startTime = Date.now();

    try {
      logger.info(`[WebhookQueue] Executing task for key: ${nextKey} (Attempt ${task.attempts + 1}/${task.maxAttempts})`);
      
      // Run with timeout wrapper
      await this.runWithTimeout(task);
      
      // Task succeeded, update metrics
      const execTime = Date.now() - startTime;
      this.metrics.totalProcessed++;
      if (this.metrics.avgExecutionTime === 0) {
        this.metrics.avgExecutionTime = execTime;
      } else {
        // Exponential moving average (EMA) with alpha = 0.1
        this.metrics.avgExecutionTime = (this.metrics.avgExecutionTime * 0.9) + (execTime * 0.1);
      }
    } catch (err) {
      task.attempts++;
      this.metrics.totalFailed++;
      const platform = task.platform;
      this.metrics.failureCountPerPlatform[platform] = (this.metrics.failureCountPerPlatform[platform] || 0) + 1;

      if (task.attempts < task.maxAttempts) {
        const delay = Math.pow(2, task.attempts) * 1000;
        logger.warn(`[WebhookQueue] Task for key ${nextKey} failed (Attempt ${task.attempts}/${task.maxAttempts}). Suspending key for ${delay}ms. Error: ${err.message}`);
        
        // Put task back at the head of the queue to maintain strict FIFO order
        queue.unshift(task);

        // Suspend processing for this key only
        this.suspendedKeys.add(nextKey);
        setTimeout(() => {
          this.suspendedKeys.delete(nextKey);
          logger.info(`[WebhookQueue] Retry suspension cleared for key ${nextKey}. Resuming queue.`);
          this.process();
        }, delay);

      } else {
        logger.error(`[WebhookQueue] Task for key ${nextKey} permanently failed after ${task.attempts} attempts. Moving to DLQ. Error: ${err.message}`);
        this.addToDLQ(task, err);
      }
    } finally {
      // Release worker slot and key lock
      this.activeKeys.delete(nextKey);
      this.runningCount--;

      // Clean up empty queues
      if (queue.length === 0) {
        this.queues.delete(nextKey);
      }

      // Schedule next processing on the next tick
      setImmediate(() => this.process());
    }

    // Try processing another task concurrently up to maxConcurrency limit
    if (this.runningCount < this.maxConcurrency) {
      this.process();
    }
  }

  async runWithTimeout(task) {
    let timerId;
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        reject(new Error(`Task timeout after ${this.timeoutMs}ms`));
      }, this.timeoutMs);
    });

    try {
      const result = await Promise.race([
        (async () => {
          const res = await task.taskFn();
          clearTimeout(timerId);
          return res;
        })(),
        timeoutPromise
      ]);
      return result;
    } catch (err) {
      clearTimeout(timerId);
      throw err;
    }
  }

  addToDLQ(task, error) {
    const dlqItem = {
      key: task.key,
      platform: task.platform,
      attempts: task.attempts,
      error: {
        message: error.message,
        stack: error.stack
      },
      payload: task.payload,
      failedAt: new Date(),
      enqueuedAt: new Date(task.enqueuedAt)
    };

    this.dlq.push(dlqItem);

    // Keep DLQ size capped to prevent memory leaks
    if (this.dlq.length > this.maxDlqSize) {
      this.dlq.shift();
    }
  }

  getDLQ() {
    return this.dlq;
  }

  clearDLQ() {
    this.dlq = [];
  }

  getMetrics() {
    let pendingTasks = 0;
    const queueDistribution = {};
    
    for (const [key, queue] of this.queues.entries()) {
      pendingTasks += queue.length;
      queueDistribution[key] = queue.length;
    }

    return {
      activeRunningTasks: this.runningCount,
      totalPendingTasks: pendingTasks,
      totalProcessed: this.metrics.totalProcessed,
      totalFailed: this.metrics.totalFailed,
      avgExecutionTimeMs: Math.round(this.metrics.avgExecutionTime),
      failureCountPerPlatform: this.metrics.failureCountPerPlatform,
      queueDistribution
    };
  }
}

module.exports = new WebhookQueue(2, 30000); // 2 concurrent, 30s timeout
