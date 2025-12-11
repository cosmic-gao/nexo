/**
 * 最小化块编辑器 - 三层架构实现
 * 
 * 架构层次：
 * 1. 数据层（Block Model）
 * 2. 视图层（Block → Component 映射）
 * 3. 渲染层（虚拟渲染引擎 - 类似 Notion，不使用 contentEditable）
 */

import { VirtualRenderer } from './virtual-renderer.js';

// ==================== 1. 数据层（Block Model） ====================

export interface BlockData {
  id: string;
  type: string;
  content: string;
  props?: Record<string, any>;
  children?: BlockData[];
  createdAt: number;
  updatedAt: number;
}

export class BlockDatabase {
  private blocks: Map<string, BlockData> = new Map();
  private rootIds: string[] = [];

  create(block: Omit<BlockData, 'id' | 'createdAt' | 'updatedAt'>): BlockData {
    const id = `block_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const now = Date.now();
    const blockData: BlockData = {
      ...block,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.blocks.set(id, blockData);
    return blockData;
  }

  get(id: string): BlockData | undefined {
    return this.blocks.get(id);
  }

  update(id: string, updates: Partial<BlockData>): BlockData | null {
    const block = this.blocks.get(id);
    if (!block) return null;
    const updated = { ...block, ...updates, updatedAt: Date.now() };
    this.blocks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    const block = this.blocks.get(id);
    if (!block) return false;
    if (block.children) {
      block.children.forEach(child => this.delete(child.id));
    }
    this.blocks.delete(id);
    this.rootIds = this.rootIds.filter(rootId => rootId !== id);
    return true;
  }

  setRootIds(ids: string[]) {
    this.rootIds = ids;
  }

  getRootIds(): string[] {
    return [...this.rootIds];
  }

  getAllBlocks(): BlockData[] {
    return Array.from(this.blocks.values());
  }
}

// ==================== 2. 视图层（Block → Component 映射） ====================

export interface BlockComponent {
  render(block: BlockData): HTMLElement;
  update(element: HTMLElement, block: BlockData): void;
}

export class BlockComponentRegistry {
  private components: Map<string, BlockComponent> = new Map();

  register(type: string, component: BlockComponent) {
    this.components.set(type, component);
  }

  get(type: string): BlockComponent | undefined {
    return this.components.get(type);
  }

  has(type: string): boolean {
    return this.components.has(type);
  }
}

// 默认组件实现 - 使用虚拟渲染器
export class ParagraphComponent implements BlockComponent {
  constructor(private virtualRenderer: VirtualRenderer) {}

  render(block: BlockData): HTMLElement {
    const element = document.createElement('div');
    element.className = 'block-node paragraph';
    element.dataset.blockId = block.id;
    
    // 使用虚拟渲染器渲染内容（不使用 contentEditable）
    const content = this.virtualRenderer.renderBlock(block.id, block.content);
    element.appendChild(content);
    return element;
  }

  update(element: HTMLElement, block: BlockData): void {
    this.virtualRenderer.updateBlock(block.id, block.content);
  }
}

export class HeadingComponent implements BlockComponent {
  constructor(private virtualRenderer: VirtualRenderer) {}

  render(block: BlockData): HTMLElement {
    const element = document.createElement('div');
    const level = block.props?.level || 1;
    element.className = `block-node heading`;
    element.dataset.blockId = block.id;
    element.dataset.level = String(level);
    
    // 使用虚拟渲染器渲染内容
    const content = this.virtualRenderer.renderBlock(block.id, block.content);
    element.appendChild(content);
    return element;
  }

  update(element: HTMLElement, block: BlockData): void {
    const level = block.props?.level || 1;
    element.dataset.level = String(level);
    
    this.virtualRenderer.updateBlock(block.id, block.content);
  }
}

export class CodeComponent implements BlockComponent {
  constructor(private virtualRenderer: VirtualRenderer) {}

  render(block: BlockData): HTMLElement {
    const element = document.createElement('div');
    element.className = 'block-node code';
    element.dataset.blockId = block.id;
    
    // 使用虚拟渲染器渲染内容
    const content = this.virtualRenderer.renderBlock(block.id, block.content);
    content.style.fontFamily = 'monospace';
    element.appendChild(content);
    return element;
  }

  update(element: HTMLElement, block: BlockData): void {
    this.virtualRenderer.updateBlock(block.id, block.content);
  }
}

export class QuoteComponent implements BlockComponent {
  constructor(private virtualRenderer: VirtualRenderer) {}

  render(block: BlockData): HTMLElement {
    const element = document.createElement('div');
    element.className = 'block-node quote';
    element.dataset.blockId = block.id;
    
    // 使用虚拟渲染器渲染内容
    const content = this.virtualRenderer.renderBlock(block.id, block.content);
    element.appendChild(content);
    return element;
  }

  update(element: HTMLElement, block: BlockData): void {
    this.virtualRenderer.updateBlock(block.id, block.content);
  }
}

// ==================== 3. 渲染层（DOM 渲染） ====================

export class Renderer {
  private container: HTMLElement;
  private componentRegistry: BlockComponentRegistry;
  private blockElements: Map<string, HTMLElement> = new Map();
  private virtualRenderer: VirtualRenderer;

  constructor(container: HTMLElement, componentRegistry: BlockComponentRegistry) {
    this.container = container;
    this.componentRegistry = componentRegistry;
    this.virtualRenderer = new VirtualRenderer(container);
    this.setupStyles();
  }

  private setupStyles() {
    const style = document.createElement('style');
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
      .block-node.code pre {
        margin: 0;
        white-space: pre-wrap;
        word-wrap: break-word;
      }
      .block-node.quote {
        border-left: 3px solid #17b3a3;
        padding-left: 16px;
        color: #666;
      }
      .block-content {
        outline: none;
        width: 100%;
        min-height: 24px;
      }
      .virtual-block-content {
        position: relative;
      }
    `;
    document.head.appendChild(style);
  }

  render(blocks: BlockData[]) {
    // 清空容器
    this.container.innerHTML = '';
    this.blockElements.clear();

    // 渲染每个块
    blocks.forEach(block => {
      const component = this.componentRegistry.get(block.type);
      if (component) {
        const element = component.render(block);
        this.container.appendChild(element);
        this.blockElements.set(block.id, element);
      } else {
        // 默认使用段落组件
        const defaultComponent = this.componentRegistry.get('paragraph');
        if (defaultComponent) {
          const element = defaultComponent.render(block);
          this.container.appendChild(element);
          this.blockElements.set(block.id, element);
        }
      }
    });
  }

  updateBlock(block: BlockData) {
    const element = this.blockElements.get(block.id);
    if (element) {
      const component = this.componentRegistry.get(block.type);
      if (component) {
        component.update(element, block);
      }
    }
  }

  getBlockElement(blockId: string): HTMLElement | undefined {
    return this.blockElements.get(blockId);
  }

  getVirtualRenderer(): VirtualRenderer {
    return this.virtualRenderer;
  }
}

// ==================== 主编辑器类 ====================

export class BlockEditor {
  private database: BlockDatabase;
  private componentRegistry: BlockComponentRegistry;
  private renderer: Renderer;
  private container: HTMLElement;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.container.className = 'block-editor-container';

    // 初始化各层
    this.database = new BlockDatabase();
    this.componentRegistry = new BlockComponentRegistry();
    this.renderer = new Renderer(this.container, this.componentRegistry);

    // 注册默认组件
    this.registerDefaultComponents();

    this.setupEventListeners();
    this.initialize();
  }

  private registerDefaultComponents() {
    const virtualRenderer = this.renderer.getVirtualRenderer();
    this.componentRegistry.register('paragraph', new ParagraphComponent(virtualRenderer));
    this.componentRegistry.register('heading', new HeadingComponent(virtualRenderer));
    this.componentRegistry.register('code', new CodeComponent(virtualRenderer));
    this.componentRegistry.register('quote', new QuoteComponent(virtualRenderer));
  }

  private initialize() {
    // 创建初始块
    const block1 = this.database.create({
      type: 'paragraph',
      content: '欢迎使用块编辑器',
      children: [],
    });

    const block2 = this.database.create({
      type: 'heading',
      content: '这是一个标题',
      props: { level: 1 },
      children: [],
    });

    this.database.setRootIds([block1.id, block2.id]);
    this.update();
    
    // 初始化后，设置第一个块的选择位置
    setTimeout(() => {
      const virtualRenderer = this.renderer.getVirtualRenderer();
      virtualRenderer.setSelection(block1.id, block1.content.length);
    }, 0);
  }

  private update() {
    const rootIds = this.database.getRootIds();
    const blocks = rootIds.map(id => this.database.get(id)).filter(Boolean) as BlockData[];
    this.renderer.render(blocks);
  }

  private setupEventListeners() {
    const virtualRenderer = this.renderer.getVirtualRenderer();

    // 点击选择块
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const blockElement = target.closest('.block-node') as HTMLElement;
      if (blockElement) {
        const blockId = blockElement.dataset.blockId;
        if (blockId) {
          // 移除其他块的选中状态
          this.container.querySelectorAll('.block-node').forEach(el => {
            el.classList.remove('selected', 'editing');
          });
          blockElement.classList.add('selected', 'editing');
          
          // 设置选择位置（点击位置或文本末尾）
          const contentElement = blockElement.querySelector('.virtual-block-content') as HTMLElement;
          if (contentElement) {
            const fragment = virtualRenderer.getFragment(blockId);
            if (fragment) {
              // 尝试获取点击位置的偏移量
              const offset = fragment.getOffsetFromPoint(e.clientX, e.clientY);
              virtualRenderer.setSelection(blockId, offset);
            } else {
              // 如果没有 fragment，设置到文本末尾
              const block = this.database.get(blockId);
              if (block) {
                virtualRenderer.setSelection(blockId, block.content.length);
              }
            }
          }
        }
      }
    });

    // 设置输入处理器（使用虚拟渲染器的输入拦截器）
    virtualRenderer.setupInputHandler(
      (blockId, text, offset) => {
        // 处理文本输入
        const block = this.database.get(blockId);
        if (block) {
          const fragment = virtualRenderer.getFragment(blockId);
          if (fragment) {
            fragment.insertText(offset, text);
            const newText = fragment.getText();
            this.database.update(blockId, { content: newText });
            this.renderer.updateBlock(this.database.get(blockId)!);
            
            // 更新选择位置
            const newOffset = offset + text.length;
            virtualRenderer.setSelection(blockId, newOffset);
          }
        }
      },
      (blockId, e, offset) => {
        // 处理键盘事件
        const block = this.database.get(blockId);
        if (!block) return;

        const fragment = virtualRenderer.getFragment(blockId);
        if (!fragment) return;

        const text = fragment.getText();

        if (e.key === 'Backspace') {
          if (offset > 0) {
            fragment.deleteText(offset - 1, offset);
            const newText = fragment.getText();
            this.database.update(blockId, { content: newText });
            this.renderer.updateBlock(this.database.get(blockId)!);
            virtualRenderer.setSelection(blockId, offset - 1);
          } else if (offset === 0 && text.length === 0) {
            // 空块时删除整个块
            const rootIds = this.database.getRootIds();
            const index = rootIds.indexOf(blockId);
            if (index > 0) {
              this.database.delete(blockId);
              rootIds.splice(index, 1);
              this.database.setRootIds(rootIds);
              this.update();
              // 聚焦到前一个块
              const prevBlockId = rootIds[index - 1];
              if (prevBlockId) {
                const prevBlock = this.database.get(prevBlockId);
                if (prevBlock) {
                  const prevFragment = virtualRenderer.getFragment(prevBlockId);
                  if (prevFragment) {
                    const prevText = prevFragment.getText();
                    virtualRenderer.setSelection(prevBlockId, prevText.length);
                  }
                }
              }
            }
          }
        } else if (e.key === 'Delete') {
          if (offset < text.length) {
            fragment.deleteText(offset, offset + 1);
            const newText = fragment.getText();
            this.database.update(blockId, { content: newText });
            this.renderer.updateBlock(this.database.get(blockId)!);
            virtualRenderer.setSelection(blockId, offset);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          
          if (e.shiftKey) {
            // Shift+Enter: 在块内插入换行符
            fragment.insertText(offset, '\n');
            const newText = fragment.getText();
            this.database.update(blockId, { content: newText });
            this.renderer.updateBlock(this.database.get(blockId)!);
            virtualRenderer.setSelection(blockId, offset + 1);
          } else {
            // Enter: 在块内插入换行符（普通换行）
            fragment.insertText(offset, '\n');
            const newText = fragment.getText();
            this.database.update(blockId, { content: newText });
            this.renderer.updateBlock(this.database.get(blockId)!);
            virtualRenderer.setSelection(blockId, offset + 1);
          }
        } else if (e.key === 'ArrowLeft') {
          if (offset > 0) {
            virtualRenderer.setSelection(blockId, offset - 1);
          } else {
            // 移动到前一个块
            const rootIds = this.database.getRootIds();
            const index = rootIds.indexOf(blockId);
            if (index > 0) {
              const prevBlockId = rootIds[index - 1];
              const prevBlock = this.database.get(prevBlockId);
              if (prevBlock) {
                const prevFragment = virtualRenderer.getFragment(prevBlockId);
                if (prevFragment) {
                  const prevText = prevFragment.getText();
                  virtualRenderer.setSelection(prevBlockId, prevText.length);
                }
              }
            }
          }
        } else if (e.key === 'ArrowRight') {
          if (offset < text.length) {
            virtualRenderer.setSelection(blockId, offset + 1);
          } else {
            // 移动到下一个块
            const rootIds = this.database.getRootIds();
            const index = rootIds.indexOf(blockId);
            if (index < rootIds.length - 1) {
              const nextBlockId = rootIds[index + 1];
              virtualRenderer.setSelection(nextBlockId, 0);
            }
          }
        } else if (e.key === 'ArrowUp') {
          // 移动到上一行（简化实现：移动到前一个块）
          const rootIds = this.database.getRootIds();
          const index = rootIds.indexOf(blockId);
          if (index > 0) {
            const prevBlockId = rootIds[index - 1];
            const prevBlock = this.database.get(prevBlockId);
            if (prevBlock) {
              const prevFragment = virtualRenderer.getFragment(prevBlockId);
              if (prevFragment) {
                const prevText = prevFragment.getText();
                const targetOffset = Math.min(offset, prevText.length);
                virtualRenderer.setSelection(prevBlockId, targetOffset);
              }
            }
          }
        } else if (e.key === 'ArrowDown') {
          // 移动到下一行（简化实现：移动到下一个块）
          const rootIds = this.database.getRootIds();
          const index = rootIds.indexOf(blockId);
          if (index < rootIds.length - 1) {
            const nextBlockId = rootIds[index + 1];
            const nextBlock = this.database.get(nextBlockId);
            if (nextBlock) {
              const nextFragment = virtualRenderer.getFragment(nextBlockId);
              if (nextFragment) {
                const nextText = nextFragment.getText();
                const targetOffset = Math.min(offset, nextText.length);
                virtualRenderer.setSelection(nextBlockId, targetOffset);
              }
            }
          }
        } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          // 可打印字符（由输入拦截器处理，这里不需要）
        }
      }
    );
  }

  // 公共 API
  insertBlock(type: string, content: string, afterBlockId?: string) {
    const block = this.database.create({
      type,
      content,
      children: [],
    });

    if (afterBlockId) {
      const rootIds = this.database.getRootIds();
      const index = rootIds.indexOf(afterBlockId);
      if (index !== -1) {
        rootIds.splice(index + 1, 0, block.id);
        this.database.setRootIds(rootIds);
      }
    } else {
      const rootIds = this.database.getRootIds();
      rootIds.push(block.id);
      this.database.setRootIds(rootIds);
    }

    this.update();
    return block;
  }

  deleteBlock(blockId: string) {
    this.database.delete(blockId);
    this.update();
  }

  getDatabase(): BlockDatabase {
    return this.database;
  }

  registerComponent(type: string, component: BlockComponent) {
    this.componentRegistry.register(type, component);
  }
}

// ==================== 导出 ====================

export function createBlockEditor(containerId: string): BlockEditor {
  return new BlockEditor(containerId);
}
