/**
 * Virtual DOM - 批量更新器
 * 合并多次更新，减少 DOM 操作
 */

export type UpdateCallback = () => void;

/**
 * 批量更新调度器
 */
export class BatchUpdater {
  private pendingUpdates: Set<UpdateCallback> = new Set();
  private isScheduled: boolean = false;
  private isFlushing: boolean = false;

  /**
   * 调度一个更新
   */
  schedule(callback: UpdateCallback): void {
    this.pendingUpdates.add(callback);

    if (!this.isScheduled && !this.isFlushing) {
      this.isScheduled = true;
      this.scheduleFlush();
    }
  }

  /**
   * 调度刷新
   */
  private scheduleFlush(): void {
    // 使用 microtask 优先级
    queueMicrotask(() => {
      // 如果有更新在等待，使用 rAF 来同步 DOM
      if (this.pendingUpdates.size > 0) {
        requestAnimationFrame(() => {
          this.flush();
        });
      } else {
        this.isScheduled = false;
      }
    });
  }

  /**
   * 立即刷新所有待处理的更新
   */
  flush(): void {
    if (this.isFlushing) return;

    this.isFlushing = true;
    this.isScheduled = false;

    const updates = Array.from(this.pendingUpdates);
    this.pendingUpdates.clear();

    // 执行所有更新
    for (const update of updates) {
      try {
        update();
      } catch (error) {
        console.error('Batch update error:', error);
      }
    }

    this.isFlushing = false;

    // 如果在刷新过程中有新的更新被添加，继续调度
    if (this.pendingUpdates.size > 0) {
      this.isScheduled = true;
      this.scheduleFlush();
    }
  }

  /**
   * 取消所有待处理的更新
   */
  clear(): void {
    this.pendingUpdates.clear();
    this.isScheduled = false;
  }

  /**
   * 检查是否有待处理的更新
   */
  hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0;
  }
}

/**
 * 全局批量更新器实例
 */
export const batchUpdater = new BatchUpdater();

/**
 * 在下一次更新周期执行回调
 */
export function scheduleUpdate(callback: UpdateCallback): void {
  batchUpdater.schedule(callback);
}

/**
 * 立即刷新所有待处理的更新
 */
export function flushUpdates(): void {
  batchUpdater.flush();
}

// ============================================
// 防抖和节流工具
// ============================================

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: number | null = null;

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = delay - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = window.setTimeout(() => {
        lastCall = Date.now();
        timeoutId = null;
        fn(...args);
      }, remaining);
    }
  };
}

/**
 * 请求空闲回调
 */
export function scheduleIdle(callback: () => void, timeout: number = 1000): void {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 0);
  }
}


