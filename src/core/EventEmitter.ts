/**
 * Core - EventEmitter
 * 类型安全的事件发射器
 */

import type { Unsubscribe } from './interfaces';

type EventHandler<T> = (data: T) => void;

/**
 * 泛型事件发射器
 * 提供类型安全的事件订阅和发送
 */
export class TypedEventEmitter<TEvents extends Record<string, unknown>> {
  private handlers = new Map<keyof TEvents, Set<EventHandler<unknown>>>();
  private onceHandlers = new Map<keyof TEvents, Set<EventHandler<unknown>>>();

  /**
   * 订阅事件
   */
  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): Unsubscribe {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler<unknown>);

    return () => this.off(event, handler);
  }

  /**
   * 取消订阅
   */
  off<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): void {
    this.handlers.get(event)?.delete(handler as EventHandler<unknown>);
    this.onceHandlers.get(event)?.delete(handler as EventHandler<unknown>);
  }

  /**
   * 订阅一次性事件
   */
  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): Unsubscribe {
    if (!this.onceHandlers.has(event)) {
      this.onceHandlers.set(event, new Set());
    }
    this.onceHandlers.get(event)!.add(handler as EventHandler<unknown>);

    return () => this.off(event, handler);
  }

  /**
   * 发送事件
   */
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    // 调用普通处理器
    this.handlers.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for "${String(event)}":`, error);
      }
    });

    // 调用一次性处理器
    const onceSet = this.onceHandlers.get(event);
    if (onceSet) {
      onceSet.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in once handler for "${String(event)}":`, error);
        }
      });
      onceSet.clear();
    }
  }

  /**
   * 清除所有事件监听
   */
  clear(): void {
    this.handlers.clear();
    this.onceHandlers.clear();
  }

  /**
   * 清除特定事件的监听
   */
  clearEvent<K extends keyof TEvents>(event: K): void {
    this.handlers.delete(event);
    this.onceHandlers.delete(event);
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    return (this.handlers.get(event)?.size || 0) + 
           (this.onceHandlers.get(event)?.size || 0);
  }

  /**
   * 检查是否有事件监听器
   */
  hasListeners<K extends keyof TEvents>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }
}

/**
 * 创建事件发射器实例
 */
export function createEventEmitter<TEvents extends Record<string, unknown>>(): TypedEventEmitter<TEvents> {
  return new TypedEventEmitter<TEvents>();
}

// ============================================
// 预定义事件类型
// ============================================

/**
 * 编辑器事件
 */
export interface EditorEvents {
  'document:changed': { previous: unknown; current: unknown };
  'document:loaded': { document: unknown };
  'document:saved': { document: unknown };
  
  'block:created': { blockId: string; type: string };
  'block:updated': { blockId: string; data: unknown };
  'block:deleted': { blockId: string };
  'block:moved': { blockId: string; fromIndex: number; toIndex: number };
  
  'selection:changed': { selection: unknown };
  'selection:cleared': void;
  
  'focus:changed': { blockId: string | null };
  
  'command:executed': { commandId: string };
  'command:undone': { commandId: string };
  'command:redone': { commandId: string };
  
  'plugin:loaded': { pluginName: string };
  'plugin:unloaded': { pluginName: string };
  
  'error': { error: Error; context?: string };
}

/**
 * 渲染器事件
 */
export interface RendererEvents {
  'render:start': void;
  'render:complete': { duration: number };
  'render:error': { error: Error };
  
  'block:rendered': { blockId: string; element: unknown };
  'block:updated': { blockId: string; element: unknown };
  'block:removed': { blockId: string };
}

/**
 * 插件事件
 */
export interface PluginEvents {
  'menu:show': { position: { x: number; y: number } };
  'menu:hide': void;
  'menu:select': { item: unknown };
  
  'toolbar:show': { position: { x: number; y: number } };
  'toolbar:hide': void;
  'toolbar:action': { action: string };
  
  'drag:start': { blockId: string };
  'drag:move': { blockId: string; position: { x: number; y: number } };
  'drag:end': { blockId: string; targetId: string | null };
}

