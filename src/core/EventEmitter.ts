/**
 * EventEmitter - 事件发射器
 * 实现发布订阅模式
 */

import type { EditorEventType, EventHandler, EditorEvent } from './types';

export class EventEmitter {
  private handlers: Map<EditorEventType, Set<EventHandler>> = new Map();

  on<T>(type: EditorEventType, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as EventHandler);
    
    // 返回取消订阅函数
    return () => this.off(type, handler);
  }

  off<T>(type: EditorEventType, handler: EventHandler<T>): void {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler as EventHandler);
    }
  }

  emit<T>(type: EditorEventType, payload: T): void {
    const event: EditorEvent<T> = {
      type,
      payload,
      timestamp: Date.now(),
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

  removeAllListeners(type?: EditorEventType): void {
    if (type) {
      this.handlers.delete(type);
    } else {
      this.handlers.clear();
    }
  }
}

