/**
 * Core Module - 核心模块导出
 * 包含接口定义、事件系统和通用工具
 */

// 接口定义
export * from './interfaces';

// 事件系统
export { TypedEventEmitter, createEventEmitter } from './EventEmitter';
export type { EditorEvents, RendererEvents, PluginEvents } from './EventEmitter';

// ============================================
// 工具函数
// ============================================

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      fn(...args);
    }
  };
}

/**
 * 深拷贝
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }

  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
}

/**
 * 深比较
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (Array.isArray(a) || Array.isArray(b)) return false;
  
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => 
    deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
}

/**
 * 批量执行（合并多次调用）
 */
export function batch<T extends (...args: unknown[]) => void>(
  fn: T,
  timeout: number = 0
): (...args: Parameters<T>) => void {
  let scheduled = false;
  let latestArgs: Parameters<T>;
  
  return (...args: Parameters<T>) => {
    latestArgs = args;
    
    if (!scheduled) {
      scheduled = true;
      
      const execute = () => {
        scheduled = false;
        fn(...latestArgs);
      };
      
      if (timeout === 0) {
        requestAnimationFrame(execute);
      } else {
        setTimeout(execute, timeout);
      }
    }
  };
}

/**
 * 创建带取消功能的 Promise
 */
export function createCancellablePromise<T>(
  executor: (
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
    onCancel: (callback: () => void) => void
  ) => void
): { promise: Promise<T>; cancel: () => void } {
  let cancelCallback: (() => void) | null = null;
  let isCancelled = false;

  const promise = new Promise<T>((resolve, reject) => {
    executor(
      (value) => {
        if (!isCancelled) resolve(value);
      },
      (reason) => {
        if (!isCancelled) reject(reason);
      },
      (callback) => {
        cancelCallback = callback;
      }
    );
  });

  return {
    promise,
    cancel: () => {
      isCancelled = true;
      cancelCallback?.();
    },
  };
}
