/**
 * 简化的块编辑器渲染器
 *
 * 这个模块直接使用原生DOM操作渲染块编辑器。
 * 移除了虚拟DOM依赖，简化了架构，提高了性能。
 *
 * 架构优势：
 * 1. 组件化：每个块类型是独立组件，易于维护和扩展
 * 2. 性能优化：直接DOM操作，避免虚拟DOM开销
 * 3. 简单直接：代码更易理解和维护
 * 4. 类型安全：TypeScript 提供完整的类型检查
 */

import { BlockData } from './block-editor.js';
import { VirtualRenderer } from './virtual-renderer.js';

// ==================== 块组件接口 ====================

/**
 * 块组件接口
 * 所有块组件都需要实现这个接口
 */
export interface BlockComponent {
  render(block: BlockData): HTMLElement;
  update?(block: BlockData): void;
}

// ==================== 块组件 ====================

/**
 * 段落块组件
 *
 * 直接创建DOM元素，不使用虚拟DOM。
 * 组件结构：
 * - 外层 div：块容器（.block-node.paragraph）
 * - 内层 div：内容容器（.virtual-block-content）
 * - span：富文本片段占位符（由虚拟渲染器填充）
 */
export class ParagraphBlock implements BlockComponent {
  /**
   * 渲染方法
   *
   * 直接创建并返回DOM元素。
   *
   * @param block - 块数据
   * @returns DOM元素
   */
  render(block: BlockData): HTMLElement {
    // 创建块容器
    const blockElement = document.createElement('div');
    blockElement.className = 'block-node paragraph';
    blockElement.setAttribute('data-block-id', block.id);

    // 创建内容容器
    const contentElement = document.createElement('div');
    contentElement.className = 'virtual-block-content';
    contentElement.setAttribute('data-block-id', block.id);
    contentElement.tabIndex = 0;
    contentElement.setAttribute('contenteditable', 'false');

    // 创建占位符（由虚拟渲染器填充实际内容）
    const placeholder = document.createElement('span');
    placeholder.className = 'rich-text-fragment';
    placeholder.setAttribute('data-placeholder', 'true');

    const textNode = document.createElement('span');
    textNode.className = 'rich-text-node';
    textNode.setAttribute('data-node-id', `node_${block.id}`);
    textNode.textContent = block.content || '\u200B';

    placeholder.appendChild(textNode);
    contentElement.appendChild(placeholder);
    blockElement.appendChild(contentElement);

    return blockElement;
  }
}

/**
 * 标题块组件
 *
 * 与段落块类似，但支持不同的标题级别（h1, h2, h3 等）。
 * 通过 data-level 属性控制样式。
 */
export class HeadingBlock implements BlockComponent {
  render(block: BlockData): HTMLElement {
    const level = block.props?.level || 1;  // 标题级别（1-6）

    // 创建块容器
    const blockElement = document.createElement('div');
    blockElement.className = 'block-node heading';
    blockElement.setAttribute('data-block-id', block.id);
    blockElement.setAttribute('data-level', String(level));

    // 创建内容容器
    const contentElement = document.createElement('div');
    contentElement.className = 'virtual-block-content';
    contentElement.setAttribute('data-block-id', block.id);
    contentElement.tabIndex = 0;
    contentElement.setAttribute('contenteditable', 'false');

    // 创建占位符
    const placeholder = document.createElement('span');
    placeholder.className = 'rich-text-fragment';
    placeholder.setAttribute('data-placeholder', 'true');

    const textNode = document.createElement('span');
    textNode.className = 'rich-text-node';
    textNode.setAttribute('data-node-id', `node_${block.id}`);
    textNode.textContent = block.content || '\u200B';

    placeholder.appendChild(textNode);
    contentElement.appendChild(placeholder);
    blockElement.appendChild(contentElement);

    return blockElement;
  }
}

/**
 * 代码块组件
 *
 * 用于显示代码，使用等宽字体。
 */
export class CodeBlock implements BlockComponent {
  render(block: BlockData): HTMLElement {
    // 创建块容器
    const blockElement = document.createElement('div');
    blockElement.className = 'block-node code';
    blockElement.setAttribute('data-block-id', block.id);

    // 创建内容容器
    const contentElement = document.createElement('div');
    contentElement.className = 'virtual-block-content';
    contentElement.setAttribute('data-block-id', block.id);
    contentElement.tabIndex = 0;
    contentElement.setAttribute('contenteditable', 'false');
    contentElement.style.fontFamily = 'monospace';  // 等宽字体

    // 创建占位符
    const placeholder = document.createElement('span');
    placeholder.className = 'rich-text-fragment';
    placeholder.setAttribute('data-placeholder', 'true');

    const textNode = document.createElement('span');
    textNode.className = 'rich-text-node';
    textNode.setAttribute('data-node-id', `node_${block.id}`);
    textNode.textContent = block.content || '\u200B';

    placeholder.appendChild(textNode);
    contentElement.appendChild(placeholder);
    blockElement.appendChild(contentElement);

    return blockElement;
  }
}

/**
 * 引用块组件
 *
 * 用于显示引用内容，通常有特殊的样式（如左边框）。
 */
export class QuoteBlock implements BlockComponent {
  render(block: BlockData): HTMLElement {
    // 创建块容器
    const blockElement = document.createElement('div');
    blockElement.className = 'block-node quote';
    blockElement.setAttribute('data-block-id', block.id);

    // 创建内容容器
    const contentElement = document.createElement('div');
    contentElement.className = 'virtual-block-content';
    contentElement.setAttribute('data-block-id', block.id);
    contentElement.tabIndex = 0;
    contentElement.setAttribute('contenteditable', 'false');

    // 创建占位符
    const placeholder = document.createElement('span');
    placeholder.className = 'rich-text-fragment';
    placeholder.setAttribute('data-placeholder', 'true');

    const textNode = document.createElement('span');
    textNode.className = 'rich-text-node';
    textNode.setAttribute('data-node-id', `node_${block.id}`);
    textNode.textContent = block.content || '\u200B';

    placeholder.appendChild(textNode);
    contentElement.appendChild(placeholder);
    blockElement.appendChild(contentElement);

    return blockElement;
  }
}

// ==================== 块组件注册表 ====================

/**
 * 块组件注册表
 *
 * 管理块类型到组件类的映射。
 *
 * 作用：
 * 1. 注册块类型：将块类型名称映射到组件类
 * 2. 获取组件：根据块类型获取对应的组件实例
 * 3. 扩展性：可以动态注册新的块类型
 *
 * 使用示例：
 * registry.register('paragraph', ParagraphBlock);
 * const component = registry.get('paragraph');
 */
export class BlockComponentRegistry {
  // 存储块类型到组件类的映射
  private components: Map<string, new() => BlockComponent> = new Map();

  /**
   * 注册块组件
   *
   * @param type - 块类型名称（如 'paragraph', 'heading'）
   * @param component - 组件类（构造函数）
   */
  register(type: string, component: new() => BlockComponent) {
    this.components.set(type, component);
  }

  /**
   * 获取块组件实例
   *
   * @param type - 块类型名称
   * @returns 组件实例，如果未注册则返回 undefined
   */
  get(type: string): BlockComponent | undefined {
    const ComponentClass = this.components.get(type);
    return ComponentClass ? new ComponentClass() : undefined;
  }

  /**
   * 检查块类型是否已注册
   *
   * @param type - 块类型名称
   * @returns 是否已注册
   */
  has(type: string): boolean {
    return this.components.has(type);
  }
}

// ==================== 简化块渲染器 ====================

/**
 * 简化的块编辑器渲染器
 *
 * 直接使用原生DOM操作，不依赖虚拟DOM系统。
 *
 * 工作流程：
 * 1. 接收块数据列表
 * 2. 为每个块创建DOM元素（使用对应的组件）
 * 3. 直接操作DOM进行渲染和更新
 *
 * 优势：
 * - 性能更好：避免虚拟DOM的额外开销
 * - 更简单：直接的DOM操作，易于理解
 * - 组件化：每个块是独立组件，易于维护
 */
export class SimpleBlockRenderer {
  private container: HTMLElement;                    // 容器元素
  private componentRegistry: BlockComponentRegistry; // 组件注册表
  private blockElements: Map<string, HTMLElement> = new Map(); // 块 ID 到 DOM 元素的映射
  private currentBlocks: BlockData[] = [];           // 当前渲染的块列表
  private virtualRenderer: VirtualRenderer;          // 虚拟渲染器（用于输入处理和光标管理）

  /**
   * 构造函数
   *
   * @param container - 容器元素（块将渲染到这里）
   * @param componentRegistry - 组件注册表（用于查找块对应的组件）
   */
  constructor(container: HTMLElement, componentRegistry: BlockComponentRegistry) {
    this.container = container;
    this.componentRegistry = componentRegistry;

    // 创建虚拟渲染器（用于输入处理和光标管理）
    this.virtualRenderer = new VirtualRenderer(container);

    // 设置样式
    this.setupStyles();
  }

  private setupStyles() {
    const style = document.createElement('style');
    style.id = 'vdom-block-renderer-styles';
    if (document.getElementById('vdom-block-renderer-styles')) return;

    style.textContent = `
      .block-editor-container {
        position: relative;
        width: 100%;
        min-height: 100%;
      }
      .block-node {
        padding: 8px;
        margin: 4px 0;
        border: 1px solid transparent;
        border-radius: 4px;
        cursor: text;
        min-height: 24px;
      }
      .block-node:hover {
        border-color: #e0e0e0;
      }
      .block-node.selected {
        border-color: #17b3a3;
        background-color: #f0fdfc;
      }
      .block-node.editing {
        border-color: #17b3a3;
      }
      .block-node.paragraph {
        font-size: 14px;
        line-height: 24px;
      }
      .block-node.heading {
        font-weight: bold;
      }
      .block-node.heading[data-level="1"] {
        font-size: 24px;
        line-height: 32px;
      }
      .block-node.heading[data-level="2"] {
        font-size: 20px;
        line-height: 28px;
      }
      .block-node.heading[data-level="3"] {
        font-size: 18px;
        line-height: 26px;
      }
      .block-node.code {
        font-family: monospace;
        background-color: #f5f5f5;
        padding: 12px;
      }
      .block-node.quote {
        border-left: 3px solid #17b3a3;
        padding-left: 16px;
        color: #666;
      }
      .virtual-block-content {
        position: relative;
        outline: none;
        min-height: 24px;
        line-height: 24px;
        cursor: text;
      }
      .rich-text-fragment {
        display: block;
        width: 100%;
        white-space: pre-wrap;
        word-wrap: break-word;
        min-height: 1em;
        line-height: inherit;
      }
      .rich-text-node {
        display: inline;
        line-height: inherit;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 渲染块列表到容器中
   *
   * 这个方法是渲染器的核心，负责将块数据转换为DOM元素并显示在页面上。
   * 采用直接DOM操作的方式，性能优于虚拟DOM方案。
   *
   * 渲染流程：
   * 1. 保存当前块列表状态
   * 2. 清空容器，准备重新渲染
   * 3. 创建根容器元素
   * 4. 为每个块创建对应的DOM元素并添加到根容器
   * 5. 将根容器添加到主容器中
   * 6. 同步虚拟渲染器，为每个块设置文本处理和光标管理
   * 7. 更新块元素映射表，用于后续查找和操作
   *
   * @param blocks - 要渲染的块数据列表，按照显示顺序排列
   */
  render(blocks: BlockData[]) {
    // 保存当前渲染状态，用于后续的增量更新
    this.currentBlocks = blocks;

    // 清空容器，为全新渲染做准备
    // 注意：这里使用innerHTML=''而不是removeChild，因为更高效
    this.container.innerHTML = '';

    // 创建根容器，统一管理所有块元素的样式和布局
    const rootContainer = document.createElement('div');
    rootContainer.className = 'block-editor-container';

    // 为每个块创建对应的DOM元素
    // 这里调用createBlockElement方法，根据块类型创建不同的组件
    blocks.forEach(block => {
      const blockElement = this.createBlockElement(block);
      rootContainer.appendChild(blockElement);
    });

    // 将完整的块树添加到主容器中
    this.container.appendChild(rootContainer);

    // 同步虚拟渲染器
    // 使用requestAnimationFrame确保DOM已经完全渲染完毕
    // 为每个块设置虚拟渲染器的fragment，用于文本输入和光标管理
    requestAnimationFrame(() => {
      blocks.forEach(block => {
        this.syncVirtualRenderer(block);
      });
    });

    // 更新内部映射表，建立块ID到DOM元素的快速查找关系
    this.updateBlockElementsMap();
  }

  /**
   * 创建单个块的DOM元素
   *
   * 这是组件化和多态性的关键方法。根据块的类型动态创建对应的组件实例，
   * 然后调用组件的render方法生成DOM元素。
   *
   * 组件查找逻辑：
   * 1. 根据block.type从组件注册表中查找对应的组件类
   * 2. 如果找到对应的组件，使用该组件渲染
   * 3. 如果未找到，尝试使用默认的paragraph组件
   * 4. 如果连默认组件都没有，创建一个简单的fallback元素
   *
   * 这种设计允许：
   * - 动态注册新的块类型
   * - 为不同类型的块提供不同的渲染逻辑
   * - 优雅的降级处理（fallback）
   *
   * @param block - 块数据，包含类型、内容、属性等信息
   * @returns 渲染后的DOM元素，包含完整的块结构
   * @private
   */
  private createBlockElement(block: BlockData): HTMLElement {
    // 从组件注册表中查找对应的组件实例
    // 注册表维护着块类型到组件类的映射关系
    const component = this.componentRegistry.get(block.type);

    if (!component) {
      // 未找到指定类型的组件，尝试使用默认的段落组件
      // 这提供了向后兼容性和优雅降级
      const defaultComponent = this.componentRegistry.get('paragraph');
      if (defaultComponent) {
        return defaultComponent.render(block);
      }

      // 连默认组件都没有的情况（极少发生）
      // 创建一个简单的文本元素作为最后的fallback
      console.warn(`未找到块类型 "${block.type}" 的组件，使用默认文本显示`);
      const element = document.createElement('div');
      element.setAttribute('data-block-id', block.id);
      element.className = 'block-node fallback';
      element.textContent = block.content || '未支持的块类型';
      return element;
    }

    // 调用组件的render方法，传入块数据，获取渲染后的DOM元素
    // 这里体现了组件化的核心思想：数据驱动的声明式渲染
    return component.render(block);
  }

  /**
   * 同步虚拟渲染器与DOM元素
   *
   * 这是连接直接DOM渲染和虚拟文本渲染的关键桥梁方法。
   * 虚拟渲染器负责处理复杂的文本输入、光标管理等功能，
   * 而直接DOM渲染器负责块的整体结构。
   *
   * 同步逻辑：
   * 1. 查找当前块的内容容器元素
   * 2. 检查虚拟渲染器是否已经有该块的fragment
   * 3. 如果没有fragment，创建新的fragment并替换占位符
   * 4. 如果已有fragment，更新其文本内容并重新渲染
   *
   * 这种设计的好处：
   * - 分离关注点：结构渲染和文本处理独立
   * - 性能优化：只在必要时更新文本内容
   * - 灵活性：可以为不同块类型定制不同的文本处理逻辑
   *
   * @param block - 要同步的块数据
   * @private
   */
  private syncVirtualRenderer(block: BlockData) {
    // 查找当前块的内容容器
    // 使用data-block-id属性确保找到正确的元素
    const contentElement = this.container.querySelector(
      `.virtual-block-content[data-block-id="${block.id}"]`
    ) as HTMLElement;

    if (!contentElement) {
      console.warn(`未找到块 ${block.id} 的内容容器，跳过虚拟渲染器同步`);
      return;
    }

    // 检查虚拟渲染器是否已经为这个块创建了fragment
    let fragment = this.virtualRenderer.getFragment(block.id);

    if (!fragment) {
      // 首次渲染：创建新的fragment
      // 虚拟渲染器会创建完整的文本处理结构
      const virtualContentElement = this.virtualRenderer.renderBlock(block.id, block.content);
      const virtualFragment = virtualContentElement.querySelector('.rich-text-fragment');

      // 查找组件创建的占位符元素
      const placeholderFragment = contentElement.querySelector('.rich-text-fragment[data-placeholder="true"]');

      // 将虚拟渲染器创建的真实fragment替换占位符
      if (placeholderFragment && virtualFragment) {
        contentElement.replaceChild(virtualFragment, placeholderFragment);
      } else if (!placeholderFragment && virtualFragment) {
        // 如果组件没有创建占位符，直接添加fragment
        contentElement.appendChild(virtualFragment);
      } else {
        console.warn(`块 ${block.id} 的fragment同步失败`);
      }
    } else {
      // 更新现有fragment：这种情况发生在块内容更新时
      // 更新虚拟渲染器的文本内容
      fragment.setText(block.content);

      // 重新渲染fragment以反映文本变化
      const fragmentElement = fragment.render();

      // 查找当前DOM中的fragment元素
      const existingFragment = contentElement.querySelector('.rich-text-fragment');

      if (existingFragment && fragmentElement) {
        if (existingFragment !== fragmentElement) {
          // 如果DOM中的fragment不是最新的，替换它
          contentElement.replaceChild(fragmentElement, existingFragment);
        }
        // 如果element相同，说明render()已经更新了现有元素的内容
      } else if (!existingFragment && fragmentElement) {
        // 如果DOM中没有fragment（异常情况），添加它
        contentElement.appendChild(fragmentElement);
      }
    }
  }

  /**
   * 更新单个块
   *
   * 当某个块的数据改变时调用。
   * 直接更新DOM元素，不重新渲染整个列表。
   *
   * @param block - 更新后的块数据
   */
  updateBlock(block: BlockData) {
    // 找到块在列表中的位置
    const index = this.currentBlocks.findIndex(b => b.id === block.id);
    if (index !== -1) {
      // 更新块数据
      this.currentBlocks[index] = block;

      // 直接更新虚拟渲染器
      this.virtualRenderer.updateBlock(block.id, block.content);

      // 同步fragment到DOM元素
      const contentElement = this.container.querySelector(
        `.virtual-block-content[data-block-id="${block.id}"]`
      ) as HTMLElement;

      if (contentElement) {
        const fragment = this.virtualRenderer.getFragment(block.id);
        if (fragment) {
          const fragmentElement = fragment.getElement();
          const existingFragment = contentElement.querySelector('.rich-text-fragment');

          if (existingFragment && fragmentElement && existingFragment !== fragmentElement) {
            contentElement.replaceChild(fragmentElement, existingFragment);
          } else if (!existingFragment && fragmentElement) {
            contentElement.appendChild(fragmentElement);
          }
        }
      }
    }
  }

  /**
   * 更新块元素映射
   * 
   * 在渲染后，建立块 ID 到 DOM 元素的映射。
   * 这样可以通过块 ID 快速找到对应的 DOM 元素。
   * 
   * 用途：
   * - 事件处理：通过块 ID 找到 DOM 元素添加事件
   * - 手动操作：需要直接操作某个块的 DOM 时
   */
  private updateBlockElementsMap() {
    this.blockElements.clear();
    
    // 遍历所有块，查找对应的 DOM 元素
    this.currentBlocks.forEach(block => {
      const element = this.container.querySelector(
        `.block-node[data-block-id="${block.id}"]`
      ) as HTMLElement;
      
      if (element) {
        // 建立映射关系
        this.blockElements.set(block.id, element);
      }
    });
  }

  /**
   * 获取块的 DOM 元素
   * 
   * 通过块 ID 获取对应的真实 DOM 元素。
   * 
   * @param blockId - 块 ID
   * @returns DOM 元素，如果未找到则返回 undefined
   * 
   * 使用场景：
   * - 需要直接操作某个块的 DOM
   * - 需要获取块的位置、尺寸等信息
   */
  getBlockElement(blockId: string): HTMLElement | undefined {
    return this.blockElements.get(blockId);
  }

  /**
   * 清空渲染
   *
   * 移除所有渲染的内容，重置状态。
   * 通常在需要完全重新渲染时使用。
   */
  clear() {
    // 清空容器内容
    this.container.innerHTML = '';
    this.virtualRenderer.destroy();
    this.blockElements.clear();
    this.currentBlocks = [];
  }

  /**
   * 获取虚拟渲染器
   * 
   * 用于设置输入处理和光标管理。
   * 
   * @returns VirtualRenderer 实例
   */
  getVirtualRenderer(): VirtualRenderer {
    return this.virtualRenderer;
  }
}

