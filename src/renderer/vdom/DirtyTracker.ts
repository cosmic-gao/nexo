/**
 * Virtual DOM - 脏块追踪器
 * 追踪需要更新的块，避免全量 diff
 */

import type { Block, Operation, Transaction } from '../../model/types';

export type DirtyReason = 
  | 'created'
  | 'updated'
  | 'deleted'
  | 'moved'
  | 'type_changed'
  | 'children_changed'
  | 'parent_changed';

export interface DirtyBlock {
  blockId: string;
  reasons: Set<DirtyReason>;
  timestamp: number;
}

/**
 * 脏块追踪器
 */
export class DirtyTracker {
  private dirtyBlocks: Map<string, DirtyBlock> = new Map();
  private deletedBlocks: Set<string> = new Set();
  private listeners: Array<(dirty: Map<string, DirtyBlock>) => void> = [];

  /**
   * 标记块为脏
   */
  mark(blockId: string, reason: DirtyReason): void {
    const existing = this.dirtyBlocks.get(blockId);
    
    if (existing) {
      existing.reasons.add(reason);
      existing.timestamp = Date.now();
    } else {
      this.dirtyBlocks.set(blockId, {
        blockId,
        reasons: new Set([reason]),
        timestamp: Date.now(),
      });
    }

    if (reason === 'deleted') {
      this.deletedBlocks.add(blockId);
    }
  }

  /**
   * 批量标记
   */
  markMany(blockIds: string[], reason: DirtyReason): void {
    blockIds.forEach(id => this.mark(id, reason));
  }

  /**
   * 从操作中提取脏块
   */
  markFromOperation(op: Operation): void {
    switch (op.type) {
      case 'insert_block':
        this.mark(op.block.id, 'created');
        if (op.parentId) {
          this.mark(op.parentId, 'children_changed');
        }
        break;

      case 'delete_block':
        this.mark(op.blockId, 'deleted');
        break;

      case 'move_block':
        this.mark(op.blockId, 'moved');
        if (op.newParentId) {
          this.mark(op.newParentId, 'children_changed');
        }
        if (op.oldParentId) {
          this.mark(op.oldParentId, 'children_changed');
        }
        break;

      case 'set_block_type':
        this.mark(op.blockId, 'type_changed');
        break;

      case 'set_block_data':
      case 'insert_text':
      case 'delete_text':
      case 'set_annotation':
        this.mark(op.blockId, 'updated');
        break;

      case 'set_block_parent':
        this.mark(op.blockId, 'parent_changed');
        if (op.newParentId) {
          this.mark(op.newParentId, 'children_changed');
        }
        if (op.oldParentId) {
          this.mark(op.oldParentId, 'children_changed');
        }
        break;
    }
  }

  /**
   * 从事务中提取脏块
   */
  markFromTransaction(tx: Transaction): void {
    tx.operations.forEach(op => this.markFromOperation(op));
  }

  /**
   * 获取所有脏块
   */
  getDirtyBlocks(): Map<string, DirtyBlock> {
    return new Map(this.dirtyBlocks);
  }

  /**
   * 获取脏块 ID 列表
   */
  getDirtyBlockIds(): string[] {
    return Array.from(this.dirtyBlocks.keys());
  }

  /**
   * 获取已删除的块
   */
  getDeletedBlocks(): Set<string> {
    return new Set(this.deletedBlocks);
  }

  /**
   * 检查块是否为脏
   */
  isDirty(blockId: string): boolean {
    return this.dirtyBlocks.has(blockId);
  }

  /**
   * 检查块是否已删除
   */
  isDeleted(blockId: string): boolean {
    return this.deletedBlocks.has(blockId);
  }

  /**
   * 获取块的脏原因
   */
  getReasons(blockId: string): Set<DirtyReason> | undefined {
    return this.dirtyBlocks.get(blockId)?.reasons;
  }

  /**
   * 清除单个块的脏标记
   */
  clean(blockId: string): void {
    this.dirtyBlocks.delete(blockId);
    this.deletedBlocks.delete(blockId);
  }

  /**
   * 清除所有脏标记
   */
  clear(): void {
    if (this.dirtyBlocks.size > 0 || this.deletedBlocks.size > 0) {
      this.dirtyBlocks.clear();
      this.deletedBlocks.clear();
    }
  }

  /**
   * 添加监听器
   */
  subscribe(listener: (dirty: Map<string, DirtyBlock>) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知监听器
   */
  notify(): void {
    const snapshot = this.getDirtyBlocks();
    this.listeners.forEach(listener => listener(snapshot));
  }

  /**
   * 获取统计信息
   */
  stats(): { dirtyCount: number; deletedCount: number } {
    return {
      dirtyCount: this.dirtyBlocks.size,
      deletedCount: this.deletedBlocks.size,
    };
  }
}

/**
 * 创建增量渲染策略
 */
export function createIncrementalStrategy(tracker: DirtyTracker) {
  return {
    /**
     * 判断是否需要全量渲染
     */
    needsFullRender(): boolean {
      const stats = tracker.stats();
      // 如果脏块超过阈值，使用全量渲染
      return stats.dirtyCount > 50;
    },

    /**
     * 获取需要更新的块
     */
    getBlocksToUpdate(): string[] {
      return tracker.getDirtyBlockIds();
    },

    /**
     * 获取需要删除的块
     */
    getBlocksToDelete(): string[] {
      return Array.from(tracker.getDeletedBlocks());
    },

    /**
     * 完成渲染后清理
     */
    finish(): void {
      tracker.clear();
    },
  };
}


