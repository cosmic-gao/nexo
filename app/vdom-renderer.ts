/**
 * 基于虚拟 DOM 的块编辑器渲染器
 * 
 * 这个模块将虚拟 DOM 系统应用到块编辑器。
 * 每个块类型都是一个组件，使用虚拟 DOM 进行渲染和更新。
 * 
 * 架构优势：
 * 1. 组件化：每个块类型是独立组件，易于维护和扩展
 * 2. 性能优化：虚拟 DOM 自动进行 diff，只更新变化的部分
 * 3. 声明式：使用 h() 函数声明式描述 UI，代码更清晰
 * 4. 类型安全：TypeScript 提供完整的类型检查
 */

import { h, VirtualDOMRenderer, VNode, ComponentBase } from './virtual-dom.js';
import { BlockData } from './block-editor.js';
import { VirtualRenderer } from './virtual-renderer.js';

// ==================== 块组件 ====================

/**
 * 段落块组件
 * 
 * 这是一个组件示例，展示如何使用虚拟 DOM 创建块组件。
 * 每个块组件继承 ComponentBase，实现 render 方法返回虚拟节点。
 * 
 * 组件结构：
 * - 外层 div：块容器（.block-node.paragraph）
 * - 内层 div：内容容器（.virtual-block-content）
 * - span：富文本片段（.rich-text-fragment）
 * - span：文本节点（.rich-text-node）
 * 
 * 使用虚拟 DOM 的优势：
 * - 当块内容更新时，虚拟 DOM 会自动 diff，只更新文本内容
 * - 不需要手动操作 DOM，代码更简洁
 */
export class ParagraphBlock extends ComponentBase {
  /**
   * 渲染方法
   * 
   * 返回描述段落块 UI 的虚拟节点。
   * 这个方法会在以下情况被调用：
   * 1. 首次渲染块时
   * 2. 块数据更新时（通过虚拟 DOM 的 diff 机制）
   * 
   * @returns 虚拟节点树
   */
  render(): VNode {
    const block = this.props.block as BlockData;
    
    // 创建块容器虚拟节点
    return h('div', {
      className: 'block-node paragraph',  // CSS 类名
      'data-block-id': block.id,           // 数据属性：用于标识块
    }, this.renderContent(block));        // 子节点：内容部分
  }

  /**
   * 渲染内容部分
   * 
   * 创建块的内容区域，包含文本内容。
   * 
   * @param block - 块数据
   * @returns 内容虚拟节点
   */
  private renderContent(block: BlockData): VNode {
    return h('div', {
      className: 'virtual-block-content',  // 内容容器
      'data-block-id': block.id,           // 块 ID（用于事件处理）
      tabIndex: 0,                         // 可聚焦
      contenteditable: 'false',            // 禁用原生 contentEditable
    }, 
      // 注意：这里不直接渲染文本，而是留一个占位符
      // 实际的文本内容由虚拟渲染器管理（用于输入处理）
      // 虚拟渲染器会在渲染后附加fragment到这个容器
      h('span', {
        className: 'rich-text-fragment',
        'data-placeholder': 'true',  // 标记为占位符，虚拟渲染器会替换它
      }, 
        h('span', {
          className: 'rich-text-node',
          'data-node-id': `node_${block.id}`,
        }, block.content || '\u200B')
      )
    );
  }
}

/**
 * 标题块组件
 * 
 * 与段落块类似，但支持不同的标题级别（h1, h2, h3 等）。
 * 通过 data-level 属性控制样式。
 */
export class HeadingBlock extends ComponentBase {
  render(): VNode {
    const block = this.props.block as BlockData;
    const level = block.props?.level || 1;  // 标题级别（1-6）
    
    return h('div', {
      className: 'block-node heading',
      'data-block-id': block.id,
      'data-level': String(level),  // 标题级别（用于 CSS 样式）
    }, this.renderContent(block));
  }

  private renderContent(block: BlockData): VNode {
    // 内容结构与段落块相同
    return h('div', {
      className: 'virtual-block-content',
      'data-block-id': block.id,
      tabIndex: 0,
      contenteditable: 'false',
    }, h('span', {
      className: 'rich-text-fragment',
      'data-placeholder': 'true',  // 占位符，虚拟渲染器会替换
    }, h('span', {
      className: 'rich-text-node',
      'data-node-id': `node_${block.id}`,
    }, block.content || '\u200B')));
  }
}

/**
 * 代码块组件
 * 
 * 用于显示代码，使用等宽字体。
 * 通过内联样式设置字体。
 */
export class CodeBlock extends ComponentBase {
  render(): VNode {
    const block = this.props.block as BlockData;
    return h('div', {
      className: 'block-node code',
      'data-block-id': block.id,
    }, this.renderContent(block));
  }

  private renderContent(block: BlockData): VNode {
    return h('div', {
      className: 'virtual-block-content',
      'data-block-id': block.id,
      tabIndex: 0,
      contenteditable: 'false',
      style: { fontFamily: 'monospace' },  // 等宽字体
    }, h('span', {
      className: 'rich-text-fragment',
      'data-placeholder': 'true',  // 占位符，虚拟渲染器会替换
    }, h('span', {
      className: 'rich-text-node',
      'data-node-id': `node_${block.id}`,
    }, block.content || '\u200B')));
  }
}

/**
 * 引用块组件
 * 
 * 用于显示引用内容，通常有特殊的样式（如左边框）。
 */
export class QuoteBlock extends ComponentBase {
  render(): VNode {
    const block = this.props.block as BlockData;
    return h('div', {
      className: 'block-node quote',
      'data-block-id': block.id,
    }, this.renderContent(block));
  }

  private renderContent(block: BlockData): VNode {
    // 内容结构与段落块相同
    return h('div', {
      className: 'virtual-block-content',
      'data-block-id': block.id,
      tabIndex: 0,
      contenteditable: 'false',
    }, h('span', {
      className: 'rich-text-fragment',
      'data-placeholder': 'true',  // 占位符，虚拟渲染器会替换
    }, h('span', {
      className: 'rich-text-node',
      'data-node-id': `node_${block.id}`,
    }, block.content || '\u200B')));
  }
}

// ==================== 块组件注册表 ====================

/**
 * 块组件注册表
 * 
 * 管理块类型到组件类的映射。
 * 类似于 React 的组件注册系统。
 * 
 * 作用：
 * 1. 注册块类型：将块类型名称映射到组件类
 * 2. 获取组件：根据块类型获取对应的组件类
 * 3. 扩展性：可以动态注册新的块类型
 * 
 * 使用示例：
 * registry.register('paragraph', ParagraphBlock);
 * const Component = registry.get('paragraph');
 */
export class BlockComponentRegistry {
  // 存储块类型到组件类的映射
  private components: Map<string, typeof ComponentBase> = new Map();

  /**
   * 注册块组件
   * 
   * @param type - 块类型名称（如 'paragraph', 'heading'）
   * @param component - 组件类（构造函数）
   */
  register(type: string, component: typeof ComponentBase) {
    this.components.set(type, component);
  }

  /**
   * 获取块组件类
   * 
   * @param type - 块类型名称
   * @returns 组件类，如果未注册则返回 undefined
   */
  get(type: string): typeof ComponentBase | undefined {
    return this.components.get(type);
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

// ==================== 虚拟 DOM 渲染器 ====================

/**
 * 基于虚拟 DOM 的块编辑器渲染器
 * 
 * 这是块编辑器的核心渲染器，使用虚拟 DOM 系统来渲染和管理块。
 * 
 * 工作流程：
 * 1. 接收块数据列表
 * 2. 将每个块转换为虚拟节点（使用对应的组件）
 * 3. 使用 VirtualDOMRenderer 渲染虚拟节点树
 * 4. 当块更新时，虚拟 DOM 自动进行 diff 和 patch
 * 
 * 优势：
 * - 自动优化：只更新变化的块，不重新渲染整个列表
 * - 组件化：每个块是独立组件，易于维护
 * - 类型安全：完整的 TypeScript 类型支持
 */
export class VDOMBlockRenderer {
  private container: HTMLElement;                    // 容器元素
  private vdomRenderer: VirtualDOMRenderer;          // 虚拟 DOM 渲染器（核心）
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
    
    // 创建虚拟 DOM 渲染器
    this.vdomRenderer = new VirtualDOMRenderer(container);
    
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
   * 这是主要的渲染方法。将块数据列表转换为虚拟节点树并渲染。
   * 
   * @param blocks - 块数据列表
   * 
   * 渲染流程：
   * 1. 保存当前块列表
   * 2. 将每个块转换为虚拟节点（使用对应的组件）
   * 3. 创建根虚拟节点（包含所有块的容器）
   * 4. 使用虚拟 DOM 渲染器渲染
   * 5. 同步虚拟渲染器的文本（用于输入处理）
   * 6. 更新块元素映射（用于后续查找）
   * 
   * 性能优化：
   * - 如果这是更新渲染，虚拟 DOM 会自动 diff，只更新变化的块
   * - 使用 key（block.id）来识别相同的块，避免不必要的替换
   */
  render(blocks: BlockData[]) {
    this.currentBlocks = blocks;

    // 创建虚拟节点树
    // 根节点是一个 div，包含所有块的虚拟节点
    const vnode = h('div', {
      className: 'block-editor-container',
    }, ...blocks.map(block => this.createBlockVNode(block)));

    // 使用虚拟 DOM 渲染器渲染
    // 如果是首次渲染，会直接创建 DOM
    // 如果是更新渲染，会自动进行 diff 和 patch
    this.vdomRenderer.render(vnode);

    // 同步虚拟渲染器的文本（用于输入处理和光标管理）
    // 在虚拟DOM渲染后，将虚拟渲染器的fragment附加到已存在的DOM元素
    // 使用双重 requestAnimationFrame 确保虚拟DOM完全更新
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        blocks.forEach(block => {
          // 获取虚拟DOM渲染的内容元素
          const contentElement = this.container.querySelector(
            `.virtual-block-content[data-block-id="${block.id}"]`
          ) as HTMLElement;
          
          if (contentElement) {
            // 获取或创建虚拟渲染器的fragment
            let fragment = this.virtualRenderer.getFragment(block.id);
            if (!fragment) {
              // 创建fragment（这会创建DOM元素）
              const virtualContentElement = this.virtualRenderer.renderBlock(block.id, block.content);
              const virtualFragment = virtualContentElement.querySelector('.rich-text-fragment');
              
              // 查找占位符fragment（虚拟DOM创建的）
              const placeholderFragment = contentElement.querySelector('.rich-text-fragment[data-placeholder="true"]');
              
              // 将虚拟渲染器的fragment替换占位符
              if (placeholderFragment && virtualFragment) {
                contentElement.replaceChild(virtualFragment, placeholderFragment);
              } else if (!placeholderFragment && virtualFragment) {
                // 如果没有占位符，直接添加
                contentElement.appendChild(virtualFragment);
              }
            } else {
              // fragment已存在，更新文本并重新渲染
              fragment.setText(block.content);
              const fragmentElement = fragment.render();
              
              // 查找现有的fragment（可能是占位符或之前的fragment）
              const existingFragment = contentElement.querySelector('.rich-text-fragment');
              
              if (existingFragment && fragmentElement) {
                if (existingFragment !== fragmentElement) {
                  // 替换fragment
                  contentElement.replaceChild(fragmentElement, existingFragment);
                }
                // 如果element相同，render已经更新了内容，不需要替换
              } else if (!existingFragment && fragmentElement) {
                // 如果没有fragment，直接添加
                contentElement.appendChild(fragmentElement);
              }
            }
          }
        });
      });
    });

    // 更新块元素映射（用于后续通过 ID 查找 DOM 元素）
    this.updateBlockElementsMap();
  }

  /**
   * 创建块的虚拟节点
   * 
   * 根据块的类型，从注册表中获取对应的组件类，
   * 然后使用 h() 函数创建组件虚拟节点。
   * 
   * @param block - 块数据
   * @returns 块的虚拟节点
   * 
   * 流程：
   * 1. 从注册表获取块类型对应的组件类
   * 2. 如果未找到，使用默认的段落组件
   * 3. 使用 h() 创建组件虚拟节点，传入 block 作为 props
   * 4. 使用 block.id 作为 key（用于 diff 优化）
   */
  private createBlockVNode(block: BlockData): VNode {
    // 从注册表获取组件类
    const ComponentClass = this.componentRegistry.get(block.type);
    
    if (!ComponentClass) {
      // 如果未找到组件，使用默认的段落组件
      const DefaultComponent = this.componentRegistry.get('paragraph');
      if (DefaultComponent) {
        return h(DefaultComponent as any, { block, key: block.id });
      }
      // 如果连默认组件都没有，创建一个简单的 div
      return h('div', { 'data-block-id': block.id, key: block.id }, block.content);
    }

    // 创建组件虚拟节点
    // block 作为 props 传入组件
    // block.id 作为 key，用于 diff 优化
    return h(ComponentClass as any, { block, key: block.id });
  }

  /**
   * 更新单个块
   * 
   * 当某个块的数据改变时调用。
   * 虽然这里重新渲染了整个列表，但虚拟 DOM 会自动优化，
   * 只更新变化的块。
   * 
   * @param block - 更新后的块数据
   * 
   * 优化说明：
   * - 虽然调用了 render()，但虚拟 DOM 会进行 diff
   * - 只有变化的块会被更新，其他块保持不变
   * - 这是虚拟 DOM 的核心优势：自动优化更新
   */
  updateBlock(block: BlockData) {
    // 找到块在列表中的位置
    const index = this.currentBlocks.findIndex(b => b.id === block.id);
    if (index !== -1) {
      // 更新块数据
      this.currentBlocks[index] = block;
      
      // 重新渲染整个列表
      // 虚拟 DOM 会自动进行 diff，只更新变化的块
      this.render(this.currentBlocks);
      
      // 在渲染后同步虚拟渲染器的文本（用于输入处理）
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        this.virtualRenderer.updateBlock(block.id, block.content);
        
        // 同步fragment到虚拟DOM创建的元素
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
      });
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
    this.vdomRenderer.clear();
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

