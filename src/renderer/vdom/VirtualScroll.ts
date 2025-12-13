/**
 * Virtual Scroll - 简单稳定的虚拟滚动实现
 * 
 * 设计原则：
 * 1. 只基于根块进行虚拟化（不处理嵌套子块）
 * 2. 使用固定的容器高度 + CSS transform 定位，避免抖动
 * 3. 持久化高度缓存，渲染后更新实际高度
 * 4. 大缓冲区 + 滚动节流，确保流畅
 */

export interface VirtualScrollConfig {
  /** 可视区域上下的缓冲数量 */
  overscan: number;
  /** 默认块高度估计 */
  estimatedHeight: number;
  /** 启用阈值（块数量） */
  threshold: number;
}

export const defaultConfig: VirtualScrollConfig = {
  overscan: 10,
  estimatedHeight: 36,
  threshold: 100,
};

export interface VirtualScrollState {
  /** 可视范围开始索引 */
  startIndex: number;
  /** 可视范围结束索引 */
  endIndex: number;
  /** 容器总高度 */
  totalHeight: number;
  /** 可视内容的 Y 偏移量 */
  offsetY: number;
}

/**
 * 虚拟滚动管理器
 */
export class VirtualScrollManager {
  private config: VirtualScrollConfig;
  private container: HTMLElement | null = null;
  private heightCache: Map<string, number> = new Map();
  private scrollHandler: (() => void) | null = null;
  private onUpdate: (() => void) | null = null;
  private lastScrollTop: number = 0;
  private ticking: boolean = false;

  constructor(config: Partial<VirtualScrollConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * 初始化
   */
  init(container: HTMLElement, onUpdate: () => void): void {
    this.container = container;
    this.onUpdate = onUpdate;

    // 使用 RAF 节流的滚动监听
    this.scrollHandler = () => {
      if (!this.ticking) {
        this.ticking = true;
        requestAnimationFrame(() => {
          this.handleScroll();
          this.ticking = false;
        });
      }
    };

    container.addEventListener('scroll', this.scrollHandler, { passive: true });
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.scrollHandler && this.container) {
      this.container.removeEventListener('scroll', this.scrollHandler);
      window.removeEventListener('scroll', this.scrollHandler);
    }
    this.container = null;
    this.onUpdate = null;
  }

  /**
   * 处理滚动
   */
  private handleScroll(): void {
    if (!this.container) return;

    const scrollTop = this.getScrollTop();
    
    // 只有滚动距离超过一定阈值才触发更新
    if (Math.abs(scrollTop - this.lastScrollTop) > 50) {
      this.lastScrollTop = scrollTop;
      this.onUpdate?.();
    }
  }

  /**
   * 获取当前滚动位置
   */
  private getScrollTop(): number {
    if (!this.container) return 0;
    
    // 检查是容器滚动还是窗口滚动
    if (this.container.scrollHeight > this.container.clientHeight) {
      return this.container.scrollTop;
    }
    return window.scrollY;
  }

  /**
   * 获取可视区域高度
   */
  private getViewportHeight(): number {
    if (!this.container) return window.innerHeight;
    
    if (this.container.scrollHeight > this.container.clientHeight) {
      return this.container.clientHeight;
    }
    return window.innerHeight;
  }

  /**
   * 计算虚拟滚动状态
   */
  calculate(rootIds: string[]): VirtualScrollState {
    const count = rootIds.length;
    
    // 块数量少于阈值，不启用虚拟滚动
    if (count < this.config.threshold) {
      return {
        startIndex: 0,
        endIndex: count - 1,
        totalHeight: 0,
        offsetY: 0,
      };
    }

    const scrollTop = this.getScrollTop();
    const viewportHeight = this.getViewportHeight();

    // 计算每个块的位置
    const positions: number[] = [];
    let accHeight = 0;
    
    for (let i = 0; i < count; i++) {
      positions.push(accHeight);
      accHeight += this.getBlockHeight(rootIds[i]);
    }

    const totalHeight = accHeight;

    // 二分查找开始索引
    let startIndex = this.binarySearch(positions, scrollTop);
    startIndex = Math.max(0, startIndex - this.config.overscan);

    // 找结束索引
    let endIndex = startIndex;
    let currentHeight = positions[startIndex] || 0;
    const targetBottom = scrollTop + viewportHeight;

    while (endIndex < count && currentHeight < targetBottom) {
      currentHeight += this.getBlockHeight(rootIds[endIndex]);
      endIndex++;
    }
    
    endIndex = Math.min(count - 1, endIndex + this.config.overscan);

    // 计算偏移量
    const offsetY = positions[startIndex] || 0;

    return {
      startIndex,
      endIndex,
      totalHeight,
      offsetY,
    };
  }

  /**
   * 二分查找
   */
  private binarySearch(positions: number[], target: number): number {
    let low = 0;
    let high = positions.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (positions[mid] < target) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return Math.max(0, low - 1);
  }

  /**
   * 获取块高度（使用缓存或估计值）
   */
  getBlockHeight(blockId: string): number {
    return this.heightCache.get(blockId) ?? this.config.estimatedHeight;
  }

  /**
   * 更新块高度缓存
   */
  updateHeight(blockId: string, height: number): void {
    const cached = this.heightCache.get(blockId);
    // 只有高度变化时才更新
    if (cached !== height) {
      this.heightCache.set(blockId, height);
    }
  }

  /**
   * 批量更新高度
   */
  measureRenderedBlocks(blockElements: Map<string, HTMLElement>): void {
    blockElements.forEach((element, blockId) => {
      // 查找包含子块的 wrapper 元素
      const wrapper = element.closest('.nexo-block-with-children') as HTMLElement;
      const height = wrapper ? wrapper.offsetHeight : element.offsetHeight;
      this.updateHeight(blockId, height);
    });
  }

  /**
   * 清除高度缓存
   */
  clearCache(): void {
    this.heightCache.clear();
  }

  /**
   * 是否应该启用虚拟滚动
   */
  shouldEnable(blockCount: number): boolean {
    return blockCount >= this.config.threshold;
  }

  /**
   * 获取配置
   */
  getConfig(): VirtualScrollConfig {
    return this.config;
  }

  /**
   * 强制更新
   */
  forceUpdate(): void {
    this.lastScrollTop = -1000;
    this.onUpdate?.();
  }
}

