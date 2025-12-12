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
   * 渲染块列表
   *
   * 直接创建DOM元素并渲染到容器中。
   *
   * @param blocks - 块数据列表
   */
  render(blocks: BlockData[]) {
    this.currentBlocks = blocks;

    // 清空容器
    this.container.innerHTML = '';

    // 创建根容器
    const rootContainer = document.createElement('div');
    rootContainer.className = 'block-editor-container';

    // 为每个块创建DOM元素并添加到容器
    blocks.forEach(block => {
      const blockElement = this.createBlockElement(block);
      rootContainer.appendChild(blockElement);
    });

    // 添加到主容器
    this.container.appendChild(rootContainer);

    // 同步虚拟渲染器的文本（用于输入处理和光标管理）
    requestAnimationFrame(() => {
      blocks.forEach(block => {
        this.syncVirtualRenderer(block);
      });
    });

    // 更新块元素映射
    this.updateBlockElementsMap();
  }

  /**
   * 创建块的DOM元素
   *
   * 根据块的类型，从注册表中获取对应的组件实例，
   * 然后调用组件的render方法创建DOM元素。
   *
   * @param block - 块数据
   * @returns 块的DOM元素
   */
  private createBlockElement(block: BlockData): HTMLElement {
    // 从注册表获取组件实例
    const component = this.componentRegistry.get(block.type);

    if (!component) {
      // 如果未找到组件，使用默认的段落组件
      const defaultComponent = this.componentRegistry.get('paragraph');
      if (defaultComponent) {
        return defaultComponent.render(block);
      }
      // 如果连默认组件都没有，创建一个简单的 div
      const element = document.createElement('div');
      element.setAttribute('data-block-id', block.id);
      element.textContent = block.content;
      return element;
    }

    // 调用组件的render方法创建DOM元素
    return component.render(block);
  }

  /**
   * 同步虚拟渲染器
   *
   * 为块的内容元素设置虚拟渲染器的fragment。
   *
   * @param block - 块数据
   */
  private syncVirtualRenderer(block: BlockData) {
    const contentElement = this.container.querySelector(
      `.virtual-block-content[data-block-id="${block.id}"]`
    ) as HTMLElement;

    if (contentElement) {
      // 获取或创建虚拟渲染器的fragment
      let fragment = this.virtualRenderer.getFragment(block.id);
      if (!fragment) {
        // 创建fragment
        const virtualContentElement = this.virtualRenderer.renderBlock(block.id, block.content);
        const virtualFragment = virtualContentElement.querySelector('.rich-text-fragment');

        // 查找占位符fragment
        const placeholderFragment = contentElement.querySelector('.rich-text-fragment[data-placeholder="true"]');

        // 将虚拟渲染器的fragment替换占位符
        if (placeholderFragment && virtualFragment) {
          contentElement.replaceChild(virtualFragment, placeholderFragment);
        } else if (!placeholderFragment && virtualFragment) {
          contentElement.appendChild(virtualFragment);
        }
      } else {
        // fragment已存在，更新文本
        fragment.setText(block.content);
        const fragmentElement = fragment.render();

        // 查找现有的fragment
        const existingFragment = contentElement.querySelector('.rich-text-fragment');

        if (existingFragment && fragmentElement) {
          if (existingFragment !== fragmentElement) {
            contentElement.replaceChild(fragmentElement, existingFragment);
          }
        } else if (!existingFragment && fragmentElement) {
          contentElement.appendChild(fragmentElement);
        }
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

