/**
 * Virtual DOM - 块级懒加载
 * 只渲染可视区域内的块，提升大文档性能
 */

import type { Block, Document } from '../../model/types';
import type { VNode } from './types';

export interface LazyBlockConfig {
  /** 可视区域上下的缓冲区块数 */
  bufferSize: number;
  /** 块的估计高度（用于初始计算） */
  estimatedBlockHeight: number;
  /** 是否启用懒加载 */
  enabled: boolean;
}

export const defaultLazyConfig: LazyBlockConfig = {
  bufferSize: 5,
  estimatedBlockHeight: 40,
  enabled: true,
};

export interface VisibleRange {
  startIndex: number;
  endIndex: number;
  totalHeight: number;
  offsetTop: number;
}

export interface BlockMeasurement {
  blockId: string;
  height: number;
  top: number;
}

/**
 * 懒加载管理器
 */
export class LazyBlockManager {
  private config: LazyBlockConfig;
  private measurements: Map<string, BlockMeasurement> = new Map();
  private container: HTMLElement | null = null;
  private scrollHandler: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private onVisibleRangeChange: ((range: VisibleRange) => void) | null = null;

  constructor(config: Partial<LazyBlockConfig> = {}) {
    this.config = { ...defaultLazyConfig, ...config };
  }

  /**
   * 初始化
   */
  init(
    container: HTMLElement,
    onVisibleRangeChange: (range: VisibleRange) => void
  ): void {
    this.container = container;
    this.onVisibleRangeChange = onVisibleRangeChange;

    // 监听滚动
    this.scrollHandler = this.throttle(() => {
      this.updateVisibleRange();
    }, 16);
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
    container.addEventListener('scroll', this.scrollHandler, { passive: true });

    // 监听尺寸变化
    this.resizeObserver = new ResizeObserver(() => {
      this.updateVisibleRange();
    });
    this.resizeObserver.observe(container);
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.container?.removeEventListener('scroll', this.scrollHandler);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.measurements.clear();
    this.container = null;
  }

  /**
   * 更新块高度测量
   */
  measureBlock(blockId: string, element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const containerRect = this.container?.getBoundingClientRect();
    
    if (containerRect) {
      this.measurements.set(blockId, {
        blockId,
        height: rect.height,
        top: rect.top - containerRect.top + (this.container?.scrollTop || 0),
      });
    }
  }

  /**
   * 批量更新测量
   */
  measureBlocks(blockElements: Map<string, HTMLElement>): void {
    blockElements.forEach((element, blockId) => {
      this.measureBlock(blockId, element);
    });
  }

  /**
   * 计算可视范围
   */
  calculateVisibleRange(blockIds: string[]): VisibleRange {
    if (!this.container || !this.config.enabled || blockIds.length === 0) {
      return {
        startIndex: 0,
        endIndex: blockIds.length - 1,
        totalHeight: 0,
        offsetTop: 0,
      };
    }

    const containerRect = this.container.getBoundingClientRect();
    const scrollTop = this.container.scrollTop || window.scrollY;
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerRect.height;

    let startIndex = -1; // 使用 -1 表示尚未找到
    let endIndex = blockIds.length - 1;
    let totalHeight = 0;
    let offsetTop = 0;
    let accumulatedHeight = 0;

    // 计算总高度和可视范围
    for (let i = 0; i < blockIds.length; i++) {
      const blockId = blockIds[i];
      const measurement = this.measurements.get(blockId);
      const blockHeight = measurement?.height || this.config.estimatedBlockHeight;

      const blockTop = accumulatedHeight;
      const blockBottom = blockTop + blockHeight;

      // 找到第一个可视块（只设置一次）
      if (startIndex === -1 && blockBottom >= viewportTop) {
        startIndex = Math.max(0, i - this.config.bufferSize);
        offsetTop = this.getAccumulatedHeight(blockIds, 0, startIndex);
      }

      // 找到最后一个可视块
      if (blockTop <= viewportBottom) {
        endIndex = Math.min(blockIds.length - 1, i + this.config.bufferSize);
      }

      accumulatedHeight += blockHeight;
    }

    // 如果没有找到可视块，默认显示开头
    if (startIndex === -1) {
      startIndex = 0;
    }

    totalHeight = accumulatedHeight;

    return { startIndex, endIndex, totalHeight, offsetTop };
  }

  /**
   * 获取累积高度
   */
  private getAccumulatedHeight(blockIds: string[], start: number, end: number): number {
    let height = 0;
    for (let i = start; i < end; i++) {
      const measurement = this.measurements.get(blockIds[i]);
      height += measurement?.height || this.config.estimatedBlockHeight;
    }
    return height;
  }

  /**
   * 更新可视范围
   */
  private updateVisibleRange(): void {
    // 需要从外部获取 blockIds，这里通过回调通知
    if (this.onVisibleRangeChange) {
      // 触发外部重新计算
      this.onVisibleRangeChange({
        startIndex: 0,
        endIndex: 0,
        totalHeight: 0,
        offsetTop: 0,
      });
    }
  }

  /**
   * 节流函数
   */
  private throttle(fn: () => void, delay: number): () => void {
    let lastCall = 0;
    let timeoutId: number | null = null;

    return () => {
      const now = Date.now();
      const remaining = delay - (now - lastCall);

      if (remaining <= 0) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        lastCall = now;
        fn();
      } else if (!timeoutId) {
        timeoutId = window.setTimeout(() => {
          lastCall = Date.now();
          timeoutId = null;
          fn();
        }, remaining);
      }
    };
  }

  /**
   * 创建虚拟滚动占位符
   */
  createPlaceholder(height: number): VNode {
    return {
      type: 'element',
      tag: 'div',
      props: {
        className: 'nexo-lazy-placeholder',
        style: `height: ${height}px;`,
      },
      children: [],
    };
  }

  /**
   * 滚动到指定块
   */
  scrollToBlock(blockId: string): void {
    const measurement = this.measurements.get(blockId);
    if (measurement && this.container) {
      this.container.scrollTo({
        top: measurement.top,
        behavior: 'smooth',
      });
    }
  }

  /**
   * 获取配置
   */
  getConfig(): LazyBlockConfig {
    return this.config;
  }

  /**
   * 更新配置
   */
  setConfig(config: Partial<LazyBlockConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 是否启用
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * 清除测量缓存
   */
  clearMeasurements(): void {
    this.measurements.clear();
  }
}


