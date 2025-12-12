/**
 * 使用虚拟 DOM 渲染器的块编辑器示例
 * 
 * 这个文件展示了如何将虚拟 DOM 系统应用到块编辑器。
 * 它整合了数据层（BlockDatabase）、组件层（BlockComponentRegistry）
 * 和渲染层（VDOMBlockRenderer），提供了一个完整的块编辑器实现。
 * 
 * 架构层次：
 * 1. 数据层：BlockDatabase - 管理块数据
 * 2. 组件层：BlockComponentRegistry - 管理块组件
 * 3. 渲染层：SimpleBlockRenderer - 直接DOM操作渲染块
 * 4. 编辑器层：SimpleBlockEditor - 整合所有层，提供统一 API
 * 
 * 学习要点：
 * - 如何将虚拟 DOM 应用到实际项目
 * - 如何组织组件和数据
 * - 如何实现编辑器的增删改查功能
 */

import { SimpleBlockRenderer, BlockComponentRegistry, ParagraphBlock, HeadingBlock, CodeBlock, QuoteBlock } from './vdom-renderer.js';
import { BlockDatabase, BlockData } from './block-editor.js';

/**
 * 简化的块编辑器
 *
 * 这是完整的块编辑器实现，整合了所有必要的组件。
 * 移除了虚拟DOM依赖，使用直接DOM操作。
 *
 * 主要功能：
 * - 创建、更新、删除块
 * - 直接DOM操作，性能更好
 * - 支持多种块类型（段落、标题、代码、引用等）
 * - 提供统一的 API 接口
 */
export class SimpleBlockEditor {
  private database: BlockDatabase;                    // 数据层：管理块数据
  private componentRegistry: BlockComponentRegistry; // 组件层：管理块组件
  private renderer: SimpleBlockRenderer;             // 渲染层：直接DOM操作
  private container: HTMLElement;                    // 容器元素

  /**
   * 构造函数
   *
   * @param containerId - 容器元素的 ID
   *
   * 初始化流程：
   * 1. 查找容器元素
   * 2. 初始化各层（数据、组件、渲染）
   * 3. 注册默认组件
   * 4. 设置事件监听器
   * 5. 初始化编辑器（创建初始块）
   */
  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;

    // ========== 初始化各层 ==========

    // 数据层：管理块数据的存储和操作
    this.database = new BlockDatabase();

    // 组件层：管理块类型到组件类的映射
    this.componentRegistry = new BlockComponentRegistry();

    // 渲染层：直接DOM操作渲染块
    this.renderer = new SimpleBlockRenderer(this.container, this.componentRegistry);

    // ========== 注册默认组件 ==========
    // 将块类型名称映射到组件类
    this.registerDefaultComponents();

    // ========== 设置事件监听器 ==========
    // 处理用户交互（点击、输入等）
    this.setupEventListeners();
    
    // ========== 初始化编辑器 ==========
    // 创建初始块并渲染
    this.initialize();
  }

  /**
   * 注册默认组件
   * 
   * 将块类型名称映射到对应的组件类。
   * 这样当渲染块时，可以根据块类型找到对应的组件。
   * 
   * 扩展性：
   * - 可以轻松添加新的块类型
   * - 只需要创建新组件并注册即可
   */
  private registerDefaultComponents() {
    this.componentRegistry.register('paragraph', ParagraphBlock);  // 段落块
    this.componentRegistry.register('heading', HeadingBlock);      // 标题块
    this.componentRegistry.register('code', CodeBlock);            // 代码块
    this.componentRegistry.register('quote', QuoteBlock);         // 引用块
  }

  /**
   * 初始化编辑器
   * 
   * 创建一些初始块作为示例，展示编辑器的功能。
   * 在实际应用中，可以从服务器加载数据或从本地存储恢复。
   */
  private initialize() {
    // 创建段落块
    const block1 = this.database.create({
      type: 'paragraph',
      content: '欢迎使用基于虚拟 DOM 的块编辑器',
      children: [],
    });

    // 创建标题块
    const block2 = this.database.create({
      type: 'heading',
      content: '这是一个标题',
      props: { level: 1 },  // 标题级别
      children: [],
    });

    // 创建代码块
    const block3 = this.database.create({
      type: 'code',
      content: 'console.log("Hello, Virtual DOM!");',
      children: [],
    });

    // 设置根块 ID 列表（定义块的顺序）
    this.database.setRootIds([block1.id, block2.id, block3.id]);
    
    // 渲染所有块
    this.update();
  }

  /**
   * 更新渲染
   * 
   * 从数据库获取所有块数据，然后使用渲染器渲染。
   * 这是数据驱动的渲染：数据改变 -> 调用 update() -> 自动重新渲染
   */
  private update() {
    // 获取根块 ID 列表
    const rootIds = this.database.getRootIds();
    
    // 根据 ID 获取块数据
    const blocks = rootIds.map(id => this.database.get(id)).filter(Boolean) as BlockData[];
    
    // 使用渲染器渲染所有块
    // 虚拟 DOM 会自动优化，只更新变化的块
    this.renderer.render(blocks);
  }

  /**
   * 设置事件监听器
   *
   * 处理用户的交互操作，包括：
   * - 点击选择块
   * - 输入处理（通过虚拟渲染器）
   * - 光标管理
   * - Shift+Enter 块内换行
   */
  private setupEventListeners() {
    const virtualRenderer = this.renderer.getVirtualRenderer();

    // ========== 点击选择块 ==========
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      // 查找最近的块元素
      const blockElement = target.closest('.block-node') as HTMLElement;

      if (blockElement) {
        const blockId = blockElement.dataset.blockId;
        if (blockId) {
          // 移除其他块的选中状态
          this.container.querySelectorAll('.block-node').forEach(el => {
            el.classList.remove('selected', 'editing');
          });

          // 添加当前块的选中状态
          blockElement.classList.add('selected', 'editing');

          // 设置选择位置（用于输入和光标）
          const block = this.database.get(blockId);
          if (block) {
            // 尝试获取点击位置的偏移量
            const contentElement = blockElement.querySelector('.virtual-block-content') as HTMLElement;
            if (contentElement) {
              const fragment = virtualRenderer.getFragment(blockId);
              if (fragment) {
                const offset = fragment.getOffsetFromPoint(e.clientX, e.clientY);
                virtualRenderer.setSelection(blockId, offset);
              } else {
                // 如果没有 fragment，设置到文本末尾
                virtualRenderer.setSelection(blockId, block.content.length);
              }
            }
          }
        }
      }
    });

    // ========== 设置输入处理器 ==========
    virtualRenderer.setupInputHandler(
      // 处理文本输入
      (blockId, text, offset) => {
        const block = this.database.get(blockId);
        if (block) {
          const fragment = virtualRenderer.getFragment(blockId);
          if (fragment) {
          // 插入文本
          fragment.insertText(offset, text);
          const newText = fragment.getText();
          
          // 更新数据库
          this.database.update(blockId, { content: newText });
          
          // 更新渲染（虚拟 DOM 会自动优化）
          this.renderer.updateBlock(this.database.get(blockId)!);
          
          // 等待DOM更新后再设置光标位置
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // 确保fragment已同步
              const updatedFragment = virtualRenderer.getFragment(blockId);
              if (updatedFragment) {
                // 重新渲染fragment以确保DOM正确
                updatedFragment.render();
              }
              // 更新选择位置
              const newOffset = offset + text.length;
              virtualRenderer.setSelection(blockId, newOffset);
            });
          });
          }
        }
      },
      // 处理键盘事件
      (blockId, e, offset) => {
        const block = this.database.get(blockId);
        if (!block) return;

        const fragment = virtualRenderer.getFragment(blockId);
        if (!fragment) return;

        const text = fragment.getText();

        if (e.key === 'Backspace') {
          // 退格键：删除前一个字符
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
          // Delete 键：删除后一个字符
          if (offset < text.length) {
            fragment.deleteText(offset, offset + 1);
            const newText = fragment.getText();
            this.database.update(blockId, { content: newText });
            this.renderer.updateBlock(this.database.get(blockId)!);
            virtualRenderer.setSelection(blockId, offset);
          }
        } else if (e.key === 'Enter') {
          if (e.shiftKey) {
            // Shift + Enter：在当前块内插入换行符
            fragment.insertText(offset, '\n');
            const newText = fragment.getText();
            this.database.update(blockId, { content: newText });

            // 更新渲染
            this.renderer.updateBlock(this.database.get(blockId)!);

            // 设置光标位置
            setTimeout(() => {
              virtualRenderer.setSelection(blockId, offset + 1);
            }, 0);
          } else {
            // Enter：在当前块下方创建新块
            const rootIds = this.database.getRootIds();
            const currentIndex = rootIds.indexOf(blockId);

            // 创建一个新的段落块
            const newBlock = this.database.create({
              type: 'paragraph',
              content: '',
              children: [],
            });

            // 在当前块之后插入新块
            rootIds.splice(currentIndex + 1, 0, newBlock.id);
            this.database.setRootIds(rootIds);

            // 更新渲染
            this.update();

            // 聚焦到新块
            setTimeout(() => {
              virtualRenderer.setSelection(newBlock.id, 0);
            }, 0);
          }
        } else if (e.key === 'ArrowLeft') {
          // 左箭头：移动光标向左
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
          // 右箭头：移动光标向右
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
          // 上箭头：移动到上一行（简化实现：移动到前一个块）
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
          // 下箭头：移动到下一行（简化实现：移动到下一个块）
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
        }
      }
    );

    // ========== 初始化选择位置 ==========
    // 在初始化后设置第一个块的选择位置
    setTimeout(() => {
      const blocks = this.database.getAllBlocks();
      if (blocks.length > 0) {
        virtualRenderer.setSelection(blocks[0].id, blocks[0].content.length);
      }
    }, 0);
  }

  // ==================== 公共 API ====================

  /**
   * 插入新块
   * 
   * @param type - 块类型（如 'paragraph', 'heading'）
   * @param content - 块内容
   * @param afterBlockId - 可选，插入到指定块之后
   * @returns 创建的块数据
   * 
   * 使用示例：
   * editor.insertBlock('paragraph', '新段落');
   * editor.insertBlock('heading', '新标题', 'block-id-123');
   */
  insertBlock(type: string, content: string, afterBlockId?: string) {
    // 创建新块
    const block = this.database.create({
      type,
      content,
      children: [],
    });

    // 获取根块 ID 列表
    const rootIds = this.database.getRootIds();
    
    if (afterBlockId) {
      // 插入到指定块之后
      const index = rootIds.indexOf(afterBlockId);
      if (index !== -1) {
        rootIds.splice(index + 1, 0, block.id);
        this.database.setRootIds(rootIds);
      }
    } else {
      // 添加到末尾
      rootIds.push(block.id);
      this.database.setRootIds(rootIds);
    }

    // 更新渲染
    this.update();
    return block;
  }

  /**
   * 更新块
   * 
   * @param blockId - 块 ID
   * @param updates - 要更新的字段（部分更新）
   * 
   * 使用示例：
   * editor.updateBlock('block-id-123', { content: '新内容' });
   */
  updateBlock(blockId: string, updates: Partial<BlockData>) {
    // 更新数据库中的块数据
    const updated = this.database.update(blockId, updates);
    
    if (updated) {
      // 使用渲染器更新块
      // 虚拟 DOM 会自动 diff，只更新变化的部分
      this.renderer.updateBlock(updated);
    }
  }

  /**
   * 删除块
   * 
   * @param blockId - 要删除的块 ID
   * 
   * 使用示例：
   * editor.deleteBlock('block-id-123');
   */
  deleteBlock(blockId: string) {
    // 从数据库删除块
    this.database.delete(blockId);
    
    // 更新渲染（虚拟 DOM 会自动移除对应的 DOM）
    this.update();
  }

  /**
   * 获取数据库实例
   * 
   * 用于直接访问数据库，进行更复杂的操作。
   * 
   * @returns BlockDatabase 实例
   */
  getDatabase(): BlockDatabase {
    return this.database;
  }
}

/**
 * 创建简化块编辑器
 *
 * 便捷函数，用于快速创建编辑器实例。
 *
 * @param containerId - 容器元素的 ID
 * @returns 编辑器实例
 *
 * 使用示例：
 * const editor = createSimpleBlockEditor('editor-container');
 */
export function createSimpleBlockEditor(containerId: string): SimpleBlockEditor {
  return new SimpleBlockEditor(containerId);
}

