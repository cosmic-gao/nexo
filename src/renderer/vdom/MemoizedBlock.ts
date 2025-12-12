/**
 * Virtual DOM - 块渲染缓存
 * 避免不必要的重新渲染
 */

import type { Block } from '../../model/types';
import type { VNode } from './types';

export interface MemoEntry {
  block: Block;
  vnode: VNode;
  version: number;
  lastAccess: number;
}

/**
 * 块渲染缓存
 */
export class BlockRenderCache {
  private cache: Map<string, MemoEntry> = new Map();
  private maxSize: number;
  private cleanupThreshold: number;

  constructor(maxSize: number = 1000, cleanupThreshold: number = 0.8) {
    this.maxSize = maxSize;
    this.cleanupThreshold = cleanupThreshold;
  }

  /**
   * 获取缓存的渲染结果
   */
  get(block: Block): VNode | null {
    const entry = this.cache.get(block.id);
    
    if (!entry) return null;
    
    // 检查版本是否匹配
    if (entry.block.meta?.version !== block.meta?.version) {
      this.cache.delete(block.id);
      return null;
    }

    // 更新访问时间
    entry.lastAccess = Date.now();
    return entry.vnode;
  }

  /**
   * 设置缓存
   */
  set(block: Block, vnode: VNode): void {
    // 检查是否需要清理
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(block.id, {
      block,
      vnode,
      version: block.meta?.version || 0,
      lastAccess: Date.now(),
    });
  }

  /**
   * 检查块是否需要重新渲染
   */
  needsRerender(block: Block): boolean {
    const entry = this.cache.get(block.id);
    if (!entry) return true;
    return entry.version !== (block.meta?.version || 0);
  }

  /**
   * 使某个块的缓存失效
   */
  invalidate(blockId: string): void {
    this.cache.delete(blockId);
  }

  /**
   * 使多个块的缓存失效
   */
  invalidateMany(blockIds: string[]): void {
    blockIds.forEach(id => this.cache.delete(id));
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理最久未使用的条目
   */
  private cleanup(): void {
    const targetSize = Math.floor(this.maxSize * this.cleanupThreshold);
    const entries = Array.from(this.cache.entries());
    
    // 按最后访问时间排序
    entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // 删除最旧的条目
    const toRemove = entries.slice(0, entries.length - targetSize);
    toRemove.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存统计
   */
  stats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // 可以添加命中率统计
    };
  }
}

/**
 * 比较两个块是否相等（浅比较）
 */
export function shallowEqual(a: Block, b: Block): boolean {
  if (a === b) return true;
  if (a.id !== b.id) return false;
  if (a.type !== b.type) return false;
  if (a.meta?.version !== b.meta?.version) return false;
  return true;
}

/**
 * 深度比较块数据
 */
export function deepEqual(a: Block, b: Block): boolean {
  if (!shallowEqual(a, b)) return false;
  
  // 比较 data
  const aData = JSON.stringify(a.data);
  const bData = JSON.stringify(b.data);
  if (aData !== bData) return false;

  // 比较 children
  if (a.childrenIds.length !== b.childrenIds.length) return false;
  for (let i = 0; i < a.childrenIds.length; i++) {
    if (a.childrenIds[i] !== b.childrenIds[i]) return false;
  }

  return true;
}

/**
 * 创建记忆化渲染函数
 */
export function memoize<T extends Block>(
  render: (block: T) => VNode,
  cache: BlockRenderCache
): (block: T) => VNode {
  return (block: T) => {
    const cached = cache.get(block);
    if (cached) return cached;

    const vnode = render(block);
    cache.set(block, vnode);
    return vnode;
  };
}


