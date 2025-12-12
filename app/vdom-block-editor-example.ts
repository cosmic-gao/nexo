/**
 * 简化块编辑器核心实现
 *
 * 这是一个完整的块编辑器实现示例，展示了如何构建一个功能丰富的文本编辑器。
 * 采用分层架构设计，将不同职责分离到独立的模块中，确保代码的可维护性和扩展性。
 *
 * 核心架构设计：
 * ===============
 *
 * 1. 数据层 (BlockDatabase)
 *    - 负责块数据的存储和管理
 *    - 提供增删改查的基本操作
 *    - 维护块之间的父子关系和顺序
 *    - 使用观察者模式通知数据变化
 *
 * 2. 组件层 (BlockComponentRegistry)
 *    - 管理不同类型块的渲染组件
 *    - 支持动态注册新的块类型
 *    - 为每个块类型提供定制的渲染逻辑
 *    - 实现组件的热插拔和扩展
 *
 * 3. 渲染层 (SimpleBlockRenderer)
 *    - 负责将块数据转换为DOM元素
 *    - 使用直接DOM操作，性能优于虚拟DOM
 *    - 整合虚拟渲染器处理复杂的文本输入
 *    - 管理块元素的生命周期和更新
 *
 * 4. 编辑器层 (SimpleBlockEditor)
 *    - 整合所有底层模块，提供统一API
 *    - 处理用户交互和事件分发
 *    - 管理编辑器的整体状态和行为
 *    - 实现撤销/重做等高级功能
 *
 * 关键设计理念：
 * =============
 *
 * - 分离关注点：每个模块只负责一个明确的职责
 * - 数据驱动：所有UI变化都通过数据状态驱动
 * - 组件化：支持灵活的组件注册和定制
 * - 性能优化：直接DOM操作避免不必要的抽象开销
 * - 类型安全：完整的TypeScript类型支持
 *
 * 支持的块类型：
 * ============
 * - 段落块 (paragraph): 普通文本段落
 * - 标题块 (heading): 支持多级标题
 * - 代码块 (code): 代码显示和编辑
 * - 引用块 (quote): 引用文本显示
 *
 * 学习要点：
 * ========
 * - 如何设计分层架构的复杂应用
 * - 如何平衡性能和可维护性
 * - 如何实现可扩展的组件系统
 * - 如何处理复杂的用户交互逻辑
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
   * 构造函数 - 初始化完整的块编辑器
   *
   * 这个构造函数执行编辑器的完整初始化流程，确保所有依赖模块都正确设置
   * 并建立它们之间的协作关系。采用依赖注入的方式组织各个模块。
   *
   * 初始化流程详解：
   * ===============
   *
   * 1. 容器验证
   *    - 查找指定的DOM容器元素
   *    - 验证容器存在性，失败则抛出错误
   *    - 保存容器引用供后续操作使用
   *
   * 2. 数据层初始化
   *    - 创建BlockDatabase实例，负责所有块数据的管理
   *    - 设置内部数据结构和事件监听器
   *    - 准备接收和处理块数据的增删改操作
   *
   * 3. 组件层初始化
   *    - 创建BlockComponentRegistry实例
   *    - 注册表维护块类型到组件类的映射
   *    - 为后续的组件查找和实例化做准备
   *
   * 4. 渲染层初始化
   *    - 创建SimpleBlockRenderer实例
   *    - 注入容器和组件注册表依赖
   *    - 建立渲染器与虚拟渲染器的协作关系
   *
   * 设计模式应用：
   * ============
   * - 依赖注入：各层模块通过构造函数参数注入依赖
   * - 组合模式：编辑器组合多个子模块协同工作
   * - 工厂模式：组件注册表负责组件的创建和管理
   *
   * @param containerId - 容器元素的DOM ID，用于挂载编辑器UI
   * @throws Error 当指定的容器元素不存在时抛出错误
   */
  constructor(containerId: string) {
    // ========== 1. 容器验证阶段 ==========
    // 查找并验证容器元素的有效性
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(
        `块编辑器初始化失败：未找到ID为"${containerId}"的容器元素。` +
        '请确保HTML中存在对应的DOM元素。'
      );
    }
    this.container = container;

    // ========== 2. 数据层初始化 ==========
    // 创建数据管理核心，负责所有块数据的CRUD操作
    // BlockDatabase 维护块的树状结构、父子关系和持久化
    this.database = new BlockDatabase();

    // ========== 3. 组件层初始化 ==========
    // 创建组件注册表，管理不同类型块的渲染组件
    // 支持动态注册新的块类型，实现组件的热插拔
    this.componentRegistry = new BlockComponentRegistry();

    // ========== 4. 渲染层初始化 ==========
    // 创建渲染器，负责将块数据转换为可视化的DOM元素
    // SimpleBlockRenderer 使用直接DOM操作，性能优于虚拟DOM方案
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
  /**
   * 注册默认块组件
   *
   * 为编辑器注册核心的块类型组件，这是编辑器功能的基础。
   * 每个块类型都对应一个专门的组件类，负责该类型块的渲染和行为。
   *
   * 注册的组件类型：
   * ===============
   *
   * 1. paragraph (段落块)
   *    - 最常用的块类型，用于普通文本内容
   *    - 支持富文本编辑、多行显示
   *    - 默认的降级组件类型
   *
   * 2. heading (标题块)
   *    - 支持多级标题(h1-h6)
   *    - 具有特殊的视觉样式和语义含义
   *    - 用于文档结构化
   *
   * 3. code (代码块)
   *    - 等宽字体显示
   *    - 特殊的背景和边框样式
   *    - 用于代码片段展示
   *
   * 4. quote (引用块)
   *    - 特殊的左侧边框样式
   *    - 用于引用内容或重要提示
   *
   * 扩展性设计：
   * ===========
   * - 可以在运行时注册更多块类型
   * - 第三方插件可以通过这个机制添加自定义块
   * - 每个块类型完全独立，便于维护和测试
   *
   * @private
   */
  private registerDefaultComponents() {
    // 注册核心块类型组件
    // 每个组件都实现了BlockComponent接口，提供render方法
    this.componentRegistry.register('paragraph', ParagraphBlock);  // 基础文本段落
    this.componentRegistry.register('heading', HeadingBlock);      // 多级标题系统
    this.componentRegistry.register('code', CodeBlock);            // 代码展示块
    this.componentRegistry.register('quote', QuoteBlock);          // 引用内容块
  }

  /**
   * 初始化编辑器内容
   *
   * 创建初始的演示内容，展示编辑器的各种功能和块类型。
   * 这个方法在编辑器首次加载时调用，为用户提供即用的体验。
   *
   * 初始化策略：
   * ===========
   *
   * 1. 创建多样化的示例内容
   *    - 包含不同类型的块，展示编辑器的功能丰富性
   *    - 使用有意义的示例文本，帮助用户理解每种块的用途
   *    - 按照逻辑顺序排列，便于用户浏览和理解
   *
   * 2. 渐进式引导
   *    - 从欢迎信息开始，建立用户好感
   *    - 展示核心功能（标题、代码块）
   *    - 提供可立即编辑的内容
   *
   * 3. 实际应用中的替代方案
   *    - 从服务器API加载用户之前的编辑内容
   *    - 从本地存储恢复未保存的草稿
   *    - 根据URL参数或用户偏好创建特定内容
   *    - 为新用户提供模板选择
   *
   * 数据结构说明：
   * ============
   * - type: 块类型，决定使用哪个组件渲染
   * - content: 文本内容，支持富文本格式
   * - props: 块特定的属性（如标题级别）
   * - children: 子块列表，支持嵌套结构
   *
   * @private
   */
  private initialize() {
    // ========== 创建欢迎段落 ==========
    // 第一个块通常是欢迎或介绍性内容
    const welcomeBlock = this.database.create({
      type: 'paragraph',
      content: '欢迎使用简化块编辑器！这是一个功能完整的文本编辑器，支持多种块类型和丰富的编辑功能。',
      children: [],  // 当前版本不支持嵌套块，保留为空数组
    });

    // ========== 创建标题块 ==========
    // 展示标题功能和多级结构支持
    const titleBlock = this.database.create({
      type: 'heading',
      content: '编辑器功能演示',
      props: { level: 1 },  // H1级别标题
      children: [],
    });

    // ========== 创建代码块 ==========
    // 展示代码高亮和特殊格式支持
    const codeBlock = this.database.create({
      type: 'code',
      content: '// 这是一个代码示例\nconsole.log("Hello, Block Editor!");\n\n// 支持语法高亮\nfunction greet(name) {\n  return `Hello, ${name}!`;\n}',
      children: [],
    });

    // ========== 创建引用块 ==========
    // 展示引用功能和视觉区分
    const quoteBlock = this.database.create({
      type: 'quote',
      content: '💡 提示：按 Enter 创建新块，按 Shift+Enter 在当前块内换行。点击任意块开始编辑！',
      children: [],
    });

    // ========== 设置显示顺序 ==========
    // 定义块在编辑器中的显示顺序
    // 这个顺序决定了用户看到的内容排列
    this.database.setRootIds([
      welcomeBlock.id,
      titleBlock.id,
      codeBlock.id,
      quoteBlock.id
    ]);

    // ========== 触发首次渲染 ==========
    // 调用update方法将数据转换为可视化的DOM元素
    // 这会触发整个渲染流水线：数据 -> 组件 -> DOM
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
   * 插入新块到编辑器
   *
   * 这是编辑器的核心API之一，允许动态创建和插入新的内容块。
   * 支持在指定位置插入块，或者在末尾追加，实现灵活的内容编辑。
   *
   * 插入逻辑详解：
   * ============
   *
   * 1. 数据层操作
   *    - 调用database.create()创建新的块数据
   *    - 设置块的基本属性：类型、内容、子块列表
   *    - 生成唯一的块ID和时间戳
   *
   * 2. 位置确定
   *    - 获取当前根块的ID列表（定义显示顺序）
   *    - 如果指定了afterBlockId，查找其位置并插入到后面
   *    - 如果未指定位置，默认添加到列表末尾
   *    - 更新database中的根块顺序
   *
   * 3. UI更新
   *    - 调用this.update()触发重新渲染
   *    - 渲染器会创建对应的DOM元素
   *    - 虚拟渲染器会设置文本输入处理
   *
   * 使用场景：
   * ========
   * - 用户按Enter键创建新段落
   * - 工具栏点击添加特定类型的块
   * - 粘贴内容时创建多个块
   * - 模板系统插入预定义内容
   *
   * 错误处理：
   * ========
   * - 如果指定的afterBlockId不存在，会降级到末尾插入
   * - 如果块类型未注册，会尝试使用默认的paragraph组件
   *
   * @param type - 块类型字符串，必须是已注册的组件类型
   * @param content - 块的初始文本内容
   * @param afterBlockId - 可选参数，指定插入到哪个块的后面；如果不提供则插入到末尾
   * @returns 创建的块数据对象，包含ID、类型、内容等完整信息
   */
  insertBlock(type: string, content: string, afterBlockId?: string) {
    // ========== 1. 创建块数据 ==========
    // 在数据层创建新的块对象
    // database.create()会生成唯一ID和时间戳
    const block = this.database.create({
      type,           // 块类型，决定使用哪个组件渲染
      content,        // 初始文本内容
      children: [],   // 子块列表（当前版本保留为空数组）
    });

    // ========== 2. 确定插入位置 ==========
    // 获取当前所有根块的ID列表，这定义了块的显示顺序
    const rootIds = this.database.getRootIds();

    if (afterBlockId) {
      // 插入到指定块的后面
      // 查找目标块在列表中的位置
      const index = rootIds.indexOf(afterBlockId);
      if (index !== -1) {
        // 在目标位置后插入新块ID
        // splice(index + 1, 0, block.id) 会在index+1位置插入，不删除任何元素
        rootIds.splice(index + 1, 0, block.id);
        this.database.setRootIds(rootIds);
      } else {
        // 指定的afterBlockId不存在，降级处理：添加到末尾
        console.warn(`指定的块ID "${afterBlockId}"不存在，新块将添加到末尾`);
        rootIds.push(block.id);
        this.database.setRootIds(rootIds);
      }
    } else {
      // 未指定位置，默认添加到末尾
      // 这是最常见的插入方式
      rootIds.push(block.id);
      this.database.setRootIds(rootIds);
    }

    // ========== 3. 触发UI更新 ==========
    // 调用update()重新渲染整个编辑器
    // 这会触发渲染流水线：数据 -> 组件 -> DOM
    this.update();

    // 返回创建的块对象，方便调用者后续操作
    return block;
  }

  /**
   * 更新现有块的内容或属性
   *
   * 支持部分更新，只修改指定的字段而不影响其他属性。
   * 这是编辑器响应用户输入的核心方法，用于实时更新块内容。
   *
   * 更新流程：
   * ========
   *
   * 1. 数据层更新
   *    - 调用database.update()修改块数据
   *    - 只更新指定的字段，保持其他属性不变
   *    - 返回更新后的完整块对象
   *
   * 2. UI同步更新
   *    - 调用renderer.updateBlock()更新DOM
   *    - 渲染器会高效地只更新变化的部分
   *    - 虚拟渲染器会更新文本内容和光标位置
   *
   * 3. 错误处理
   *    - 如果块ID不存在，update()返回null
   *    - 这种情况下跳过UI更新，避免错误
   *
   * 性能优化：
   * ========
   * - 只更新变化的块，避免重新渲染整个编辑器
   * - 使用Partial<BlockData>支持精确的字段更新
   * - 渲染器会进一步优化DOM操作
   *
   * 使用场景：
   * ========
   * - 用户输入文本时实时更新content
   * - 修改块的类型或属性（type, props）
   * - 撤销/重做操作恢复之前的状态
   * - 协作编辑时同步其他用户的更改
   *
   * @param blockId - 要更新的块的唯一标识符
   * @param updates - 包含要更新的字段的对象，支持部分更新
   *                 例如：{content: "新内容"} 或 {props: {level: 2}}
   */
  updateBlock(blockId: string, updates: Partial<BlockData>) {
    // ========== 数据层更新 ==========
    // 调用数据库的update方法，只修改指定的字段
    // database.update()会验证blockId存在性并合并更新
    const updated = this.database.update(blockId, updates);

    if (updated) {
      // ========== UI层同步 ==========
      // 块存在且更新成功，通知渲染器更新DOM
      // renderer.updateBlock()会高效地更新单个块的显示
      this.renderer.updateBlock(updated);
    } else {
      // 块不存在或更新失败
      // 可能是ID错误或并发冲突，记录警告但不抛出错误
      console.warn(`尝试更新不存在的块: ${blockId}`);
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

