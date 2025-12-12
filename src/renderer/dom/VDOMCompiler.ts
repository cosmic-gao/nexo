/**
 * Renderer Layer - VDOMCompiler
 * 基于虚拟 DOM 的编译器实现
 * 使用 diff + patch 实现增量更新
 * 支持块级懒加载优化大文档性能
 */

import type { Block, Document, BlockType } from '../../model/types';
import type { EditorController } from '../../logic/EditorController';
import type { Compiler, BlockRenderer, RenderContext } from '../types';
import type { VNode, VElement } from '../vdom/types';
import { h, text } from '../vdom/h';
import { diff } from '../vdom/diff';
import { applyPatches, createElement } from '../vdom/patch';
import { DOMSelectionAdapter } from './DOMSelectionAdapter';
import { detectMarkdownShortcut, extractCodeLanguage } from './MarkdownShortcuts';
import { DirtyTracker } from '../vdom/DirtyTracker';
import { BlockRenderCache } from '../vdom/MemoizedBlock';
import { LazyBlockManager, type VisibleRange, type LazyBlockConfig } from '../vdom/LazyBlock';

/**
 * VDOMCompiler 配置
 */
export interface VDOMCompilerOptions {
  /** 懒加载配置 */
  lazyLoading?: Partial<LazyBlockConfig>;
  /** 是否启用懒加载（默认：文档超过 50 个块时启用） */
  lazyLoadingThreshold?: number;
}

/**
 * 基于虚拟 DOM 的编译器
 */
export class VDOMCompiler implements Compiler<HTMLElement, HTMLElement> {
  name = 'vdom';

  private container: HTMLElement | null = null;
  private controller: EditorController | null = null;
  private selectionAdapter: DOMSelectionAdapter | null = null;
  
  // 虚拟 DOM 相关
  private currentTree: VNode = null;
  private isFirstRender: boolean = true;
  private dirtyTracker: DirtyTracker = new DirtyTracker();
  private renderCache: BlockRenderCache = new BlockRenderCache(500);
  
  // 块元素映射（用于快速查找）
  private blockElements: Map<string, HTMLElement> = new Map();
  
  // 状态
  private isComposing: boolean = false;
  private focusedBlockId: string | null = null;
  private pendingRender: boolean = false;
  
  // 多块选择状态
  private selectedBlockIds: Set<string> = new Set();
  private selectionAnchorBlockId: string | null = null;
  private isMouseSelecting: boolean = false;

  // 懒加载
  private lazyManager: LazyBlockManager | null = null;
  private visibleRange: VisibleRange | null = null;
  private options: VDOMCompilerOptions;
  private flatBlockIds: string[] = []; // 缓存扁平化的块 ID 列表

  constructor(options: VDOMCompilerOptions = {}) {
    this.options = {
      lazyLoadingThreshold: 50,
      ...options,
    };
  }

  /**
   * 初始化编译器
   */
  init(container: HTMLElement, controller: EditorController): void {
    this.container = container;
    this.controller = controller;
    
    this.selectionAdapter = new DOMSelectionAdapter(container, controller);
    
    container.classList.add('nexo-editor', 'nexo-vdom');
    container.setAttribute('role', 'textbox');
    container.setAttribute('aria-multiline', 'true');
    
    this.bindEvents();
    this.initLazyLoading(container);
    
    // 监听文档变化
    controller.on('document:changed', () => {
      this.scheduleRender();
    });

    controller.on('block:updated', (event: any) => {
      if (event.payload?.blockId) {
        this.dirtyTracker.mark(event.payload.blockId, 'updated');
      }
    });

    // 撤销/重做时强制完整重新渲染
    controller.on('command:undone', () => {
      this.renderCache.clear();
      this.lazyManager?.clearMeasurements();
      this.isFirstRender = true;
    });

    controller.on('command:redone', () => {
      this.renderCache.clear();
      this.lazyManager?.clearMeasurements();
      this.isFirstRender = true;
    });
  }

  /**
   * 初始化懒加载
   */
  private initLazyLoading(container: HTMLElement): void {
    this.lazyManager = new LazyBlockManager({
      bufferSize: 5,
      estimatedBlockHeight: 40,
      enabled: false, // 初始禁用，根据文档大小动态启用
      ...this.options.lazyLoading,
    });

    this.lazyManager.init(container, () => {
      // 可视范围变化时重新渲染
      this.scheduleRender();
    });
  }

  /**
   * 检查是否应该启用懒加载
   */
  private shouldEnableLazyLoading(blockCount: number): boolean {
    const threshold = this.options.lazyLoadingThreshold ?? 50;
    return blockCount >= threshold;
  }

  /**
   * 获取扁平化的块 ID 列表
   */
  private getFlatBlockIds(doc: Document): string[] {
    const result: string[] = [];
    
    const collectIds = (blockIds: string[]) => {
      for (const blockId of blockIds) {
        result.push(blockId);
        const block = doc.blocks[blockId];
        if (block && block.childrenIds.length > 0) {
          collectIds(block.childrenIds);
        }
      }
    };
    
    collectIds(doc.rootIds);
    return result;
  }

  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.container) return;

    this.container.addEventListener('input', this.handleInput.bind(this));
    this.container.addEventListener('compositionstart', () => this.isComposing = true);
    this.container.addEventListener('compositionend', this.handleCompositionEnd.bind(this));
    this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.container.addEventListener('focusin', this.handleFocusIn.bind(this));
    this.container.addEventListener('focusout', this.handleFocusOut.bind(this));
    this.container.addEventListener('paste', this.handlePaste.bind(this));
    
    // 多块选择事件
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
  }

  /**
   * 调度渲染（批量合并）
   */
  private scheduleRender(): void {
    if (this.pendingRender) return;
    
    this.pendingRender = true;
    requestAnimationFrame(() => {
      this.pendingRender = false;
      if (this.controller) {
        this.render(this.controller.getDocument());
      }
    });
  }

  /**
   * 渲染文档
   */
  render(doc: Document): void {
    if (!this.container || !this.controller) return;

    // 保存当前焦点和选区
    const savedSelection = this.selectionAdapter?.syncFromPlatform();
    const activeBlockId = this.focusedBlockId;

    // 更新扁平化块 ID 列表
    this.flatBlockIds = this.getFlatBlockIds(doc);
    
    // 动态启用/禁用懒加载
    const enableLazy = this.shouldEnableLazyLoading(this.flatBlockIds.length);
    if (this.lazyManager) {
      this.lazyManager.setConfig({ enabled: enableLazy });
      
      // 计算可视范围
      if (enableLazy) {
        this.visibleRange = this.lazyManager.calculateVisibleRange(this.flatBlockIds);
      } else {
        this.visibleRange = null;
      }
    }

    // 构建虚拟 DOM 树
    const newTree = this.buildVirtualTree(doc);

    if (this.isFirstRender) {
      // 首次渲染：直接创建 DOM
      this.container.innerHTML = '';
      const element = createElement(newTree);
      if (element) {
        this.container.appendChild(element);
      }
      this.isFirstRender = false;
    } else {
      // 增量更新：diff + patch
      const patches = diff(this.currentTree, newTree, this.container.firstChild);
      applyPatches(patches, this.container);
    }

    this.currentTree = newTree;
    
    // 更新块元素映射
    this.updateBlockElementsMap();
    
    // 更新懒加载测量
    if (this.lazyManager && enableLazy) {
      this.lazyManager.measureBlocks(this.blockElements);
    }
    
    // 清除脏标记
    this.dirtyTracker.clear();

    // 恢复焦点和选区
    if (activeBlockId && savedSelection) {
      requestAnimationFrame(() => {
        if (savedSelection) {
          this.selectionAdapter?.syncToPlatform(savedSelection);
        }
        if (activeBlockId) {
          this.focus(activeBlockId);
        }
      });
    }
  }

  /**
   * 构建虚拟 DOM 树
   */
  private buildVirtualTree(doc: Document): VNode {
    const children: VNode[] = [];
    const useLazyLoading = this.visibleRange && this.lazyManager?.isEnabled();

    if (useLazyLoading && this.visibleRange) {
      // 懒加载模式：只渲染可视范围内的块
      const { startIndex, endIndex, offsetTop, totalHeight } = this.visibleRange;
      
      // 上方占位符
      if (offsetTop > 0) {
        children.push(this.createPlaceholder('top', offsetTop));
      }

      // 渲染可视范围内的根块
      for (let i = startIndex; i <= endIndex && i < this.flatBlockIds.length; i++) {
        const blockId = this.flatBlockIds[i];
        const block = doc.blocks[blockId];
        
        // 只渲染根块（非嵌套块由父块渲染）
        if (block && !block.parentId) {
          const rootIndex = doc.rootIds.indexOf(blockId);
          if (rootIndex !== -1) {
            const blockVNode = this.buildBlockVNode(block, doc, 0, rootIndex);
            children.push(blockVNode);
          }
        }
      }

      // 下方占位符
      const renderedHeight = this.calculateRenderedHeight(startIndex, endIndex);
      const bottomHeight = totalHeight - offsetTop - renderedHeight;
      if (bottomHeight > 0) {
        children.push(this.createPlaceholder('bottom', bottomHeight));
      }
    } else {
      // 普通模式：渲染所有块
      doc.rootIds.forEach((blockId, index) => {
        const block = doc.blocks[blockId];
        if (block) {
          const blockVNode = this.buildBlockVNode(block, doc, 0, index);
          children.push(blockVNode);
        }
      });
    }

    return h('div', { className: 'nexo-blocks-container' }, ...children);
  }

  /**
   * 创建占位符
   */
  private createPlaceholder(position: 'top' | 'bottom', height: number): VNode {
    return h('div', {
      className: `nexo-lazy-placeholder nexo-lazy-placeholder-${position}`,
      style: `height: ${height}px; pointer-events: none;`,
      'data-placeholder': position,
      key: `placeholder-${position}`,
    });
  }

  /**
   * 计算已渲染块的高度
   */
  private calculateRenderedHeight(startIndex: number, endIndex: number): number {
    let height = 0;
    for (let i = startIndex; i <= endIndex && i < this.flatBlockIds.length; i++) {
      const blockId = this.flatBlockIds[i];
      const element = this.blockElements.get(blockId);
      if (element) {
        height += element.offsetHeight;
      } else {
        height += 40; // 估计高度
      }
    }
    return height;
  }

  /**
   * 构建单个块的虚拟节点
   */
  private buildBlockVNode(block: Block, doc: Document, depth: number, index: number): VNode {
    // 检查缓存
    const cached = this.renderCache.get(block);
    if (cached && !this.dirtyTracker.isDirty(block.id)) {
      return cached;
    }

    const blockVNode = this.createBlockVNode(block, depth);
    
    // 如果有子块，创建子块容器
    if (block.childrenIds.length > 0) {
      const childrenNodes: VNode[] = block.childrenIds.map((childId, childIndex) => {
        const childBlock = doc.blocks[childId];
        if (childBlock) {
          return this.buildBlockVNode(childBlock, doc, depth + 1, childIndex);
        }
        return null;
      }).filter((n): n is VNode => n !== null);

      const wrapper = h('div', 
        { 
          className: 'nexo-block-with-children',
          key: `wrapper-${block.id}`,
        },
        blockVNode,
        h('div', { className: 'nexo-block-children' }, ...childrenNodes)
      );

      this.renderCache.set(block, wrapper);
      return wrapper;
    }

    this.renderCache.set(block, blockVNode);
    return blockVNode;
  }

  /**
   * 创建块虚拟节点
   */
  private createBlockVNode(block: Block, depth: number): VNode {
    const style = depth > 0 ? `margin-left: ${depth * 24}px` : undefined;
    
    const content = this.createBlockContent(block);
    
    return h('div',
      {
        className: `nexo-block nexo-block-${block.type}`,
        'data-block-id': block.id,
        'data-block-type': block.type,
        'data-depth': String(depth),
        key: block.id,
        style,
      },
      content
    );
  }

  /**
   * 创建块内容
   */
  private createBlockContent(block: Block): VNode {
    const blockText = block.data.text || '';
    const placeholder = this.getPlaceholder(block.type);

    switch (block.type) {
      case 'paragraph':
        return h('div', {
          className: 'nexo-block-content',
          contentEditable: 'true',
          'data-placeholder': placeholder,
        }, blockText ? text(blockText) : null);

      case 'heading1':
        return h('h1', {
          className: 'nexo-block-content',
          contentEditable: 'true',
          'data-placeholder': placeholder,
        }, blockText ? text(blockText) : null);

      case 'heading2':
        return h('h2', {
          className: 'nexo-block-content',
          contentEditable: 'true',
          'data-placeholder': placeholder,
        }, blockText ? text(blockText) : null);

      case 'heading3':
        return h('h3', {
          className: 'nexo-block-content',
          contentEditable: 'true',
          'data-placeholder': placeholder,
        }, blockText ? text(blockText) : null);

      case 'bulletList':
        return h('div', { className: 'nexo-list-item' },
          h('span', { className: 'nexo-list-bullet' }, '•'),
          h('div', {
            className: 'nexo-block-content',
            contentEditable: 'true',
            'data-placeholder': placeholder,
          }, blockText ? text(blockText) : null)
        );

      case 'numberedList':
        return h('div', { className: 'nexo-list-item' },
          h('span', { className: 'nexo-list-number' }, '1.'),
          h('div', {
            className: 'nexo-block-content',
            contentEditable: 'true',
            'data-placeholder': placeholder,
          }, blockText ? text(blockText) : null)
        );

      case 'todoList':
        return h('div', { className: 'nexo-todo-item' },
          h('input', {
            type: 'checkbox',
            className: 'nexo-todo-checkbox',
            checked: block.data.checked || false,
          }),
          h('div', {
            className: `nexo-block-content ${block.data.checked ? 'nexo-todo-checked' : ''}`,
            contentEditable: 'true',
            'data-placeholder': placeholder,
          }, blockText ? text(blockText) : null)
        );

      case 'quote':
        return h('blockquote', { className: 'nexo-quote' },
          h('div', {
            className: 'nexo-block-content',
            contentEditable: 'true',
            'data-placeholder': placeholder,
          }, blockText ? text(blockText) : null)
        );

      case 'code':
        return h('pre', { className: 'nexo-code-block' },
          h('code', {
            className: 'nexo-block-content',
            contentEditable: 'true',
            'data-placeholder': '输入代码...',
          }, blockText ? text(blockText) : null)
        );

      case 'divider':
        return h('hr', { className: 'nexo-divider' });

      case 'image':
        if (block.data.url) {
          return h('div', { className: 'nexo-image-container' },
            h('img', { src: block.data.url, alt: '' })
          );
        }
        return h('div', { className: 'nexo-image-placeholder' },
          text('点击添加图片')
        );

      default:
        return h('div', {
          className: 'nexo-block-content',
          contentEditable: 'true',
        }, blockText ? text(blockText) : null);
    }
  }

  /**
   * 获取占位符文本
   */
  private getPlaceholder(type: BlockType): string {
    const placeholders: Record<string, string> = {
      paragraph: "输入 '/' 使用命令...",
      heading1: '标题 1',
      heading2: '标题 2',
      heading3: '标题 3',
      bulletList: '列表',
      numberedList: '列表',
      todoList: '待办事项',
      quote: '引用',
      code: '代码',
    };
    return placeholders[type] || '';
  }

  /**
   * 更新块元素映射
   */
  private updateBlockElementsMap(): void {
    this.blockElements.clear();
    if (!this.container) return;

    const blocks = this.container.querySelectorAll('[data-block-id]');
    blocks.forEach(el => {
      const blockId = (el as HTMLElement).dataset.blockId;
      if (blockId) {
        this.blockElements.set(blockId, el as HTMLElement);
      }
    });
  }

  // ============================================
  // 事件处理（复用 DOMCompiler 的逻辑）
  // ============================================

  private handleInput(e: Event): void {
    if (this.isComposing || !this.controller) return;

    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const block = this.controller.getBlock(blockId);
    if (!block) return;

    const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editableElement) return;

    const text = block.type === 'code' 
      ? editableElement.innerText || ''
      : editableElement.textContent || '';
    
    if (block.type !== 'code' && text === '/') {
      this.controller.emitCustom('focus:changed', { blockId, showSlashMenu: true });
      return;
    }

    // 检查 Markdown 快捷输入
    if (block.type === 'paragraph') {
      const markdownMatch = detectMarkdownShortcut(text);
      if (markdownMatch) {
        this.applyMarkdownShortcut(blockId, markdownMatch, text);
        return;
      }
    }

    // 标记为脏并更新
    this.dirtyTracker.mark(blockId, 'updated');
    this.controller.updateBlockDirect(blockId, { text });
  }

  private applyMarkdownShortcut(
    blockId: string,
    match: { type: BlockType; pattern: RegExp; data?: Record<string, unknown> },
    text: string
  ): void {
    if (!this.controller) return;

    this.controller.changeBlockType(blockId, match.type);

    if (match.type === 'code') {
      const language = extractCodeLanguage(text.trim());
      this.controller.updateBlockDirect(blockId, { text: '', language: language || undefined });
    } else if (match.type === 'divider') {
      this.controller.updateBlockDirect(blockId, { text: '' });
      const newBlock = this.controller.createBlock('paragraph', { text: '' }, blockId);
      if (newBlock) {
        requestAnimationFrame(() => this.focus(newBlock.id));
      }
    } else {
      this.controller.updateBlockDirect(blockId, { text: '', ...match.data });
    }

    requestAnimationFrame(() => this.focus(blockId));
  }

  private handleCompositionEnd(e: CompositionEvent): void {
    this.isComposing = false;
    
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement || !this.controller) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const block = this.controller.getBlock(blockId);
    if (!block) return;

    const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editableElement) return;

    const text = block.type === 'code'
      ? editableElement.innerText || ''
      : editableElement.textContent || '';
    
    this.dirtyTracker.mark(blockId, 'updated');
    this.controller.updateBlockDirect(blockId, { text });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.controller) return;

    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const block = this.controller.getBlock(blockId);
    if (!block) return;
    
    // 多块选择时的特殊处理
    if (this.selectedBlockIds.size > 0) {
      // Delete / Backspace 删除选中的块
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        this.deleteSelectedBlocks();
        return;
      }
      
      // Escape 取消选择
      if (e.key === 'Escape') {
        e.preventDefault();
        this.clearBlockSelection();
        return;
      }
      
      // Ctrl+C 复制
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        this.copySelectedBlocks();
        return;
      }
      
      // Ctrl+X 剪切
      if ((e.ctrlKey || e.metaKey) && e.key === 'x') {
        e.preventDefault();
        this.cutSelectedBlocks();
        return;
      }
      
      // Ctrl+A 全选
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        this.selectAllBlocks();
        return;
      }
    }

    // Ctrl+Z / Ctrl+Shift+Z
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.controller.redo();
      } else {
        this.controller.undo();
      }
      return;
    }

    // Ctrl+Y
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      this.controller.redo();
      return;
    }

    // 富文本快捷键
    if ((e.ctrlKey || e.metaKey) && block.type !== 'code') {
      if (this.handleFormatShortcut(e)) {
        return;
      }
    }

    // Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === 'code') return;
      e.preventDefault();
      this.handleEnterKey(blockId);
      return;
    }

    // Backspace
    if (e.key === 'Backspace') {
      this.handleBackspaceKey(e, blockId);
      return;
    }

    // Tab
    if (e.key === 'Tab') {
      if (block.type === 'code') return;
      e.preventDefault();
      if (e.shiftKey) {
        this.handleOutdent(blockId);
      } else {
        this.handleIndent(blockId);
      }
      return;
    }
  }

  private handleFormatShortcut(e: KeyboardEvent): boolean {
    const key = e.key.toLowerCase();
    let command: string | null = null;

    switch (key) {
      case 'b': command = 'bold'; break;
      case 'i': command = 'italic'; break;
      case 'u': command = 'underline'; break;
      case 's': if (e.shiftKey) command = 'strikeThrough'; break;
    }

    if (command) {
      e.preventDefault();
      document.execCommand(command, false);
      return true;
    }
    return false;
  }

  private handleEnterKey(blockId: string): void {
    if (!this.controller || !this.selectionAdapter) return;

    const block = this.controller.getBlock(blockId);
    if (!block) return;

    // 先同步当前 DOM 内容到模型（使用 updateBlock 记录历史，以便撤销）
    const blockElement = this.blockElements.get(blockId);
    if (blockElement) {
      const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editableElement) {
        const currentText = editableElement.textContent || '';
        if (currentText !== block.data.text) {
          // 使用 updateBlock 而不是 updateBlockDirect，以便撤销时能正确恢复
          this.controller.updateBlock(blockId, { text: currentText });
        }
      }
    }

    // 获取当前选区
    const selection = this.selectionAdapter.syncFromPlatform();
    if (!selection) {
      // 如果获取不到选区，创建新块在当前块后
      const newBlock = this.controller.createBlock('paragraph', { text: '' }, blockId);
      if (newBlock) {
        requestAnimationFrame(() => {
          this.focus(newBlock.id);
        });
      }
      return;
    }

    // 空的非段落块，转换为段落
    const currentBlock = this.controller.getBlock(blockId);
    if (!currentBlock) return;
    
    if (!currentBlock.data.text && currentBlock.type !== 'paragraph') {
      this.controller.changeBlockType(blockId, 'paragraph');
      return;
    }

    const offset = selection.anchor.offset;
    const text = currentBlock.data.text || '';

    if (offset >= text.length) {
      // 在末尾，创建新空块在当前块之后
      const newBlock = this.controller.createBlock('paragraph', { text: '' }, blockId);
      
      if (newBlock) {
        // 清除缓存强制完整重新渲染
        this.renderCache.clear();
        this.isFirstRender = true;
        this.render(this.controller.getDocument());
        
        // 渲染后聚焦到新块
        this.focusBlock(newBlock.id, 0);
      }
    } else {
      // 在中间，分割块
      const newBlock = this.controller.splitBlock(blockId, offset);
      if (newBlock) {
        // 清除缓存强制完整重新渲染
        this.renderCache.clear();
        this.isFirstRender = true;
        this.render(this.controller.getDocument());
        
        // 渲染后聚焦到新块
        this.focusBlock(newBlock.id, 0);
      }
    }
  }
  
  /**
   * 聚焦到指定块的指定位置
   */
  private focusBlock(blockId: string, offset: number = 0): void {
    // 需要等待 DOM 更新完成
    requestAnimationFrame(() => {
      // 更新块元素映射
      this.updateBlockElementsMap();
      
      const blockElement = this.blockElements.get(blockId);
      if (!blockElement) return;
      
      const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
      if (!editableElement) return;
      
      editableElement.focus();
      
      // 设置光标位置
      const selection = window.getSelection();
      if (!selection) return;
      
      const range = document.createRange();
      
      if (editableElement.childNodes.length > 0) {
        const textNode = editableElement.childNodes[0];
        const pos = Math.min(offset, textNode.textContent?.length || 0);
        range.setStart(textNode, pos);
        range.setEnd(textNode, pos);
      } else {
        range.setStart(editableElement, 0);
        range.setEnd(editableElement, 0);
      }
      
      selection.removeAllRanges();
      selection.addRange(range);
    });
  }

  private handleBackspaceKey(e: KeyboardEvent, blockId: string): void {
    if (!this.controller || !this.selectionAdapter) return;

    const block = this.controller.getBlock(blockId);
    if (!block) return;

    const selection = this.selectionAdapter.syncFromPlatform();
    if (!selection || !selection.isCollapsed) return;
    if (selection.anchor.offset !== 0) return;

    e.preventDefault();

    if (block.type !== 'paragraph') {
      this.controller.changeBlockType(blockId, 'paragraph');
      return;
    }

    const blocks = this.controller.getBlocks();
    const index = blocks.findIndex(b => b.id === blockId);
    if (index > 0) {
      const prevBlock = blocks[index - 1];
      if (prevBlock.type !== 'divider' && prevBlock.type !== 'image') {
        const prevTextLength = prevBlock.data.text?.length || 0;
        this.controller.mergeBlocks(blockId, prevBlock.id);
        
        requestAnimationFrame(() => {
          this.selectionAdapter?.setCursor(prevBlock.id, prevTextLength);
          this.focus(prevBlock.id);
        });
      }
    }
  }

  private handleIndent(blockId: string): void {
    if (!this.controller) return;
    
    const doc = this.controller.getDocument();
    const block = doc.blocks[blockId];
    if (!block) return;

    // 获取当前块的兄弟列表
    const siblings = block.parentId 
      ? doc.blocks[block.parentId]?.childrenIds || []
      : doc.rootIds;
    const index = siblings.indexOf(blockId);
    
    // 需要有前一个兄弟才能缩进（index > 0）
    if (index <= 0) return;
    
    const prevSiblingId = siblings[index - 1];
    const prevSibling = doc.blocks[prevSiblingId];
    if (!prevSibling) return;
    
    // 移动到前一个兄弟的子块末尾
    this.controller.moveBlock(blockId, prevSiblingId, prevSibling.childrenIds.length);
    
    // 清除所有相关缓存
    this.renderCache.clear();
    
    // 强制完整重新渲染
    this.isFirstRender = true;
    
    // document:changed 事件会触发 scheduleRender，但我们需要立即渲染
    requestAnimationFrame(() => {
      this.render(this.controller!.getDocument());
      this.focus(blockId);
    });
  }

  private handleOutdent(blockId: string): void {
    if (!this.controller) return;
    
    const doc = this.controller.getDocument();
    const block = doc.blocks[blockId];
    if (!block || !block.parentId) return;

    const parent = doc.blocks[block.parentId];
    if (!parent) return;

    const parentSiblings = parent.parentId
      ? doc.blocks[parent.parentId]?.childrenIds || []
      : doc.rootIds;
    const parentIndex = parentSiblings.indexOf(parent.id);
    
    this.controller.moveBlock(blockId, parent.parentId, parentIndex + 1);
    
    // 清除所有相关缓存
    this.renderCache.clear();
    
    // 强制完整重新渲染
    this.isFirstRender = true;
    
    requestAnimationFrame(() => {
      this.render(this.controller!.getDocument());
      this.focus(blockId);
    });
  }

  private handleFocusIn(e: FocusEvent): void {
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (blockElement) {
      this.focusedBlockId = blockElement.dataset.blockId || null;
      blockElement.classList.add('nexo-block-focused');
    }
  }

  private handleFocusOut(e: FocusEvent): void {
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (blockElement) {
      blockElement.classList.remove('nexo-block-focused');
    }
    this.focusedBlockId = null;
  }

  // ============================================
  // 多块选择
  // ============================================

  private handleMouseDown(e: MouseEvent): void {
    if (!this.controller) return;
    
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) {
      // 点击空白区域，清除多块选择
      this.clearBlockSelection();
      return;
    }

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    // Shift + 点击：范围选择
    if (e.shiftKey && this.selectionAnchorBlockId) {
      e.preventDefault();
      this.selectBlockRange(this.selectionAnchorBlockId, blockId);
      return;
    }

    // Ctrl/Cmd + 点击：切换单块选择
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      this.toggleBlockSelected(blockId);
      return;
    }

    // 普通点击
    if (this.selectedBlockIds.size > 0) {
      // 如果当前有多块选择，点击会清除选择
      if (!this.selectedBlockIds.has(blockId)) {
        this.clearBlockSelection();
      }
    }

    // 记录锚点用于后续 Shift 选择
    this.selectionAnchorBlockId = blockId;
    
    // 开始可能的拖拽选择
    this.isMouseSelecting = true;
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isMouseSelecting || !this.selectionAnchorBlockId) return;
    if (!e.buttons) {
      this.isMouseSelecting = false;
      return;
    }

    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId || blockId === this.selectionAnchorBlockId) return;

    // 拖拽形成范围选择
    this.selectBlockRange(this.selectionAnchorBlockId, blockId);
  }

  private handleMouseUp(): void {
    this.isMouseSelecting = false;
  }

  /**
   * 选择块范围
   */
  private selectBlockRange(startBlockId: string, endBlockId: string): void {
    if (!this.controller) return;

    const doc = this.controller.getDocument();
    const flatBlocks = this.getFlatBlockIds(doc);
    
    const startIndex = flatBlocks.indexOf(startBlockId);
    const endIndex = flatBlocks.indexOf(endBlockId);
    
    if (startIndex === -1 || endIndex === -1) return;

    const [fromIndex, toIndex] = startIndex <= endIndex
      ? [startIndex, endIndex]
      : [endIndex, startIndex];

    this.clearBlockSelectionUI();
    this.selectedBlockIds.clear();

    for (let i = fromIndex; i <= toIndex; i++) {
      this.selectedBlockIds.add(flatBlocks[i]);
    }

    this.updateBlockSelectionUI();
  }

  /**
   * 切换块选择状态
   */
  private toggleBlockSelected(blockId: string): void {
    if (this.selectedBlockIds.has(blockId)) {
      this.selectedBlockIds.delete(blockId);
    } else {
      this.selectedBlockIds.add(blockId);
      this.selectionAnchorBlockId = blockId;
    }
    this.updateBlockSelectionUI();
  }

  /**
   * 清除块选择
   */
  clearBlockSelection(): void {
    this.clearBlockSelectionUI();
    this.selectedBlockIds.clear();
    this.selectionAnchorBlockId = null;
  }

  /**
   * 更新选择 UI
   */
  private updateBlockSelectionUI(): void {
    this.blockElements.forEach((element, blockId) => {
      if (this.selectedBlockIds.has(blockId)) {
        element.classList.add('nexo-block-selected');
      } else {
        element.classList.remove('nexo-block-selected');
      }
    });
  }

  /**
   * 清除选择 UI
   */
  private clearBlockSelectionUI(): void {
    this.blockElements.forEach((element) => {
      element.classList.remove('nexo-block-selected');
    });
  }

  /**
   * 获取选中的块 ID
   */
  getSelectedBlockIds(): string[] {
    return Array.from(this.selectedBlockIds);
  }

  /**
   * 检查是否有多块选择
   */
  hasBlockSelection(): boolean {
    return this.selectedBlockIds.size > 0;
  }

  /**
   * 删除选中的块
   */
  private deleteSelectedBlocks(): void {
    if (!this.controller || this.selectedBlockIds.size === 0) return;

    const blockIds = Array.from(this.selectedBlockIds);
    const doc = this.controller.getDocument();
    const flatBlocks = this.getFlatBlockIds(doc);
    
    // 找到删除后要聚焦的块
    let firstSelectedIndex = Infinity;
    for (const blockId of blockIds) {
      const index = flatBlocks.indexOf(blockId);
      if (index !== -1 && index < firstSelectedIndex) {
        firstSelectedIndex = index;
      }
    }
    
    // 删除所有选中的块
    for (const blockId of blockIds) {
      this.controller.deleteBlock(blockId);
    }
    
    this.clearBlockSelection();
    
    // 强制重新渲染
    this.renderCache.clear();
    this.isFirstRender = true;
    this.render(this.controller.getDocument());
    
    // 聚焦到合适的块
    const newDoc = this.controller.getDocument();
    const newFlatBlocks = this.getFlatBlockIds(newDoc);
    if (newFlatBlocks.length > 0) {
      const focusIndex = Math.min(firstSelectedIndex, newFlatBlocks.length - 1);
      this.focusBlock(newFlatBlocks[focusIndex], 0);
    }
  }

  /**
   * 复制选中的块
   */
  private copySelectedBlocks(): void {
    if (!this.controller || this.selectedBlockIds.size === 0) return;

    const doc = this.controller.getDocument();
    const blockIds = Array.from(this.selectedBlockIds);
    
    // 按文档顺序排序
    const flatBlocks = this.getFlatBlockIds(doc);
    blockIds.sort((a, b) => flatBlocks.indexOf(a) - flatBlocks.indexOf(b));
    
    // 收集文本内容
    const textContent: string[] = [];
    const blocksData: any[] = [];
    
    for (const blockId of blockIds) {
      const block = doc.blocks[blockId];
      if (block) {
        textContent.push(block.data.text || '');
        blocksData.push({
          type: block.type,
          data: { ...block.data },
        });
      }
    }
    
    // 写入剪贴板
    const text = textContent.join('\n');
    const html = blocksData.map(b => `<div data-block-type="${b.type}">${b.data.text || ''}</div>`).join('');
    
    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })
    ]).catch(() => {
      // 降级到只复制纯文本
      navigator.clipboard.writeText(text);
    });
  }

  /**
   * 剪切选中的块
   */
  private cutSelectedBlocks(): void {
    this.copySelectedBlocks();
    this.deleteSelectedBlocks();
  }

  /**
   * 全选所有块
   */
  private selectAllBlocks(): void {
    if (!this.controller) return;

    const doc = this.controller.getDocument();
    const flatBlocks = this.getFlatBlockIds(doc);
    
    this.clearBlockSelectionUI();
    this.selectedBlockIds.clear();
    
    for (const blockId of flatBlocks) {
      this.selectedBlockIds.add(blockId);
    }
    
    if (flatBlocks.length > 0) {
      this.selectionAnchorBlockId = flatBlocks[0];
    }
    
    this.updateBlockSelectionUI();
  }

  private handlePaste(e: ClipboardEvent): void {
    e.preventDefault();
    
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;

    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement || !this.controller) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);

      const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editableElement) {
        this.dirtyTracker.mark(blockId, 'updated');
        this.controller.updateBlockDirect(blockId, { text: editableElement.textContent || '' });
      }
    }
  }

  private handleSelectionChange(): void {
    if (!this.container?.contains(document.activeElement)) return;
    if (!this.selectionAdapter || !this.controller) return;

    const selection = this.selectionAdapter.syncFromPlatform();
    if (selection) {
      this.controller.setSelection(selection);
    }
  }

  // ============================================
  // 公共 API
  // ============================================

  renderBlock(block: Block, context: RenderContext<HTMLElement>): HTMLElement {
    const vnode = this.createBlockVNode(block, 0);
    return createElement(vnode) as HTMLElement;
  }

  updateBlock(blockId: string, block: Block): void {
    this.dirtyTracker.mark(blockId, 'updated');
    this.renderCache.invalidate(blockId);
    this.scheduleRender();
  }

  removeBlock(blockId: string): void {
    this.dirtyTracker.mark(blockId, 'deleted');
    this.blockElements.delete(blockId);
    this.renderCache.invalidate(blockId);
  }

  getBlockElement(blockId: string): HTMLElement | null {
    return this.blockElements.get(blockId) || null;
  }

  registerRenderer(renderer: BlockRenderer<HTMLElement>): void {
    // VDOMCompiler 使用内置渲染逻辑，不需要外部渲染器
  }

  focus(blockId: string): void {
    const element = this.blockElements.get(blockId);
    if (!element) return;

    const editable = element.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editable) {
      editable.focus();
    }
  }

  getContainer(): HTMLElement | null {
    return this.container;
  }

  getSelectionAdapter(): DOMSelectionAdapter | null {
    return this.selectionAdapter;
  }

  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.blockElements.clear();
    this.renderCache.clear();
    this.dirtyTracker.clear();
    this.currentTree = null;
    this.isFirstRender = true;
    this.container = null;
    this.controller = null;
    this.selectionAdapter = null;
  }

  private findBlockElement(target: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = target;
    while (current && current !== this.container) {
      if (current.dataset.blockId) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
}

