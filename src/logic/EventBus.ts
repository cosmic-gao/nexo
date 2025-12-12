/**
 * Logic Layer - EventBus 事件总线
 * 平台无关的发布订阅模式
 */

import type { EventType, EditorEvent } from '../model/types';

export type EventHandler<T = unknown> = (event: EditorEvent<T>) => void;

export class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map();

  /**
   * 订阅事件
   */
  on<T>(type: EventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler);

    // 返回取消订阅函数
    return () => this.off(type, handler);
  }

  /**
   * 取消订阅
   */
  off<T>(type: EventType, handler: EventHandler<T>): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler as EventHandler);
    }
  }

  /**
   * 发布事件
   */
  emit<T>(type: EventType, payload: T, source: 'user' | 'api' | 'collaboration' = 'api'): void {
    const event: EditorEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
      source,
    };

    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${type}:`, error);
        }
      });
    }
  }

  /**
   * 一次性订阅
   */
  once<T>(type: EventType, handler: EventHandler<T>): () => void {
    const wrappedHandler: EventHandler<T> = (event) => {
      this.off(type, wrappedHandler);
      handler(event);
    };
    return this.on(type, wrappedHandler);
  }

  /**
   * 清除所有监听器
   */
  clear(type?: EventType): void {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * 获取监听器数量
   */
  listenerCount(type: EventType): number {
    return this.handlers.get(type)?.size || 0;
  }
}


