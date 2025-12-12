/**
 * Renderer Layer - VDOMCompiler (Refactored)
 * 基于虚拟 DOM 的编译器实现
 * 重构版本：分离关注点，模块化设计
 */

import type { Block, Document, BlockType } from '../../model/types';
import type { EditorController } from '../../logic/EditorController';
import type { Compiler, BlockRenderer, RenderContext } from '../types';
import type { VNode } from '../vdom/types';
import { h, text } from '../vdom/h';
import { diff } from '../vdom/diff';
import { applyPatches, createElement } from '../vdom/patch';
import { DOMSelectionAdapter } from './DOMSelectionAdapter';
import { DirtyTracker } from '../vdom/DirtyTracker';
import { BlockRenderCache } from '../vdom/MemoizedBlock';
import { InputHandler } from './handlers/InputHandler';
import { KeyboardHandler } from './handlers/KeyboardHandler';
import { SelectionHandler } from './handlers/SelectionHandler';

/**
 * VDOM Compiler 配置
 */
export interface VDOMCompilerConfig {
  cacheSize?: number;
  enableDebug?: boolean;
}

/**
 * 基于虚拟 DOM 的编译器
 */
export class VDOMCompilerRefactored implements Compiler<HTMLElement, HTMLElement> {
  readonly name = 'vdom-refactored';

  // 核心依赖
  private container: HTMLElement | null = null;
  private controller: EditorController | null = null;
  private selectionAdapter: DOMSelectionAdapter | null = null;

  // 虚拟 DOM
  private currentTree: VNode = null;
  private isFirstRender: boolean = true;
  private dirtyTracker: DirtyTracker;
  private renderCache: BlockRenderCache;

  // 块元素映射
  private blockElements: Map<string, HTMLElement> = new Map();

  // 状态
  private focusedBlockId: string | null = null;
  private pendingRender: boolean = false;

  // 处理器（分离关注点）
  private inputHandler: InputHandler;
  private keyboardHandler: KeyboardHandler;
  private selectionHandler: SelectionHandler;

  // 配置
  private config: Required<VDOMCompilerConfig>;

  constructor(config: VDOMCompilerConfig = {}) {
    this.config = {
      cacheSize: config.cacheSize ?? 500,
      enableDebug: config.enableDebug ?? false,
    };

    this.dirtyTracker = new DirtyTracker();
    this.renderCache = new BlockRenderCache(this.config.cacheSize);

    // 创建处理器
    this.inputHandler = new InputHandler(this.createInputHandlerDeps());
    this.keyboardHandler = new KeyboardHandler(this.createKeyboardHandlerDeps());
    this.selectionHandler = new SelectionHandler(this.createSelectionHandlerDeps());
  }

  // ============================================
  // Lifecycle
  // ============================================

  init(container: HTMLElement, controller: EditorController): void {
    this.container = container;
    this.controller = controller;
    this.selectionAdapter = new DOMSelectionAdapter(container, controller);

    // 设置容器属性
    container.classList.add('nexo-editor', 'nexo-vdom');
    container.setAttribute('role', 'textbox');
    container.setAttribute('aria-multiline', 'true');

    this.bindEvents();
    this.subscribeToController();
  }

  destroy(): void {
    this.unbindEvents();
    this.container = null;
    this.controller = null;
    this.selectionAdapter = null;
    this.blockElements.clear();
    this.renderCache.clear();
    this.dirtyTracker.clear();
  }

  // ============================================
  // Event Binding
  // ============================================

  private bindEvents(): void {
    if (!this.container) return;

    // 输入事件
    this.container.addEventListener('input', this.inputHandler.handleInput);
    this.container.addEventListener('compositionstart', this.inputHandler.handleCompositionStart);
    this.container.addEventListener('compositionend', this.inputHandler.handleCompositionEnd);
    this.container.addEventListener('paste', this.inputHandler.handlePaste);

    // 键盘事件
    this.container.addEventListener('keydown', this.keyboardHandler.handleKeyDown);

    // 选择事件
    this.container.addEventListener('mousedown', this.selectionHandler.handleMouseDown);
    this.container.addEventListener('mousemove', this.selectionHandler.handleMouseMove);
    document.addEventListener('mouseup', this.selectionHandler.handleMouseUp);

    // 焦点事件
    this.container.addEventListener('focusin', this.handleFocusIn);
    this.container.addEventListener('focusout', this.handleFocusOut);

    // 选区变化
    document.addEventListener('selectionchange', this.handleSelectionChange);
  }

  private unbindEvents(): void {
    if (!this.container) return;

    this.container.removeEventListener('input', this.inputHandler.handleInput);
    this.container.removeEventListener('compositionstart', this.inputHandler.handleCompositionStart);
    this.container.removeEventListener('compositionend', this.inputHandler.handleCompositionEnd);
    this.container.removeEventListener('paste', this.inputHandler.handlePaste);
    this.container.removeEventListener('keydown', this.keyboardHandler.handleKeyDown);
    this.container.removeEventListener('mousedown', this.selectionHandler.handleMouseDown);
    this.container.removeEventListener('mousemove', this.selectionHandler.handleMouseMove);
    document.removeEventListener('mouseup', this.selectionHandler.handleMouseUp);
    this.container.removeEventListener('focusin', this.handleFocusIn);
    this.container.removeEventListener('focusout', this.handleFocusOut);
    document.removeEventListener('selectionchange', this.handleSelectionChange);
  }

  private subscribeToController(): void {
    if (!this.controller) return;

    this.controller.on('document:changed', () => {
      this.scheduleRender();
    });

    this.controller.on('block:updated', (event: { payload?: { blockId?: string } }) => {
      if (event.payload?.blockId) {
        this.dirtyTracker.mark(event.payload.blockId, 'updated');
      }
    });
  }

  // ============================================
  // Focus Events
  // ============================================

  private handleFocusIn = (e: FocusEvent): void => {
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (blockElement) {
      this.focusedBlockId = blockElement.dataset.blockId || null;
      blockElement.classList.add('nexo-block-focused');
    }
  };

  private handleFocusOut = (e: FocusEvent): void => {
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (blockElement) {
      blockElement.classList.remove('nexo-block-focused');
    }
    this.focusedBlockId = null;
  };

  private handleSelectionChange = (): void => {
    if (!this.container?.contains(document.activeElement)) return;
    if (!this.selectionAdapter || !this.controller) return;

    const selection = this.selectionAdapter.syncFromPlatform();
    if (selection) {
      this.controller.setSelection(selection);
    }
  };

  // ============================================
  // Rendering
  // ============================================

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

  render(doc: Document): void {
    if (!this.container || !this.controller) return;

    const savedSelection = this.selectionAdapter?.syncFromPlatform();
    const activeBlockId = this.focusedBlockId;

    const newTree = this.buildVirtualTree(doc);

    if (this.isFirstRender) {
      this.container.innerHTML = '';
      const element = createElement(newTree);
      if (element) {
        this.container.appendChild(element);
      }
      this.isFirstRender = false;
    } else {
      const patches = diff(this.currentTree, newTree, this.container.firstChild);
      applyPatches(patches, this.container);
    }

    this.currentTree = newTree;
    this.updateBlockElementsMap();
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

  private buildVirtualTree(doc: Document): VNode {
    const children: VNode[] = [];

    doc.rootIds.forEach((blockId, index) => {
      const block = doc.blocks[blockId];
      if (block) {
        children.push(this.buildBlockVNode(block, doc, 0, index));
      }
    });

    return h('div', { className: 'nexo-blocks-container' }, ...children);
  }

  private buildBlockVNode(block: Block, doc: Document, depth: number, index: number): VNode {
    const cached = this.renderCache.get(block);
    if (cached && !this.dirtyTracker.isDirty(block.id)) {
      return cached;
    }

    const blockVNode = this.createBlockVNode(block, depth);

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
        return h('div', { className: 'nexo-list-item nexo-todo-item' },
          h('input', {
            type: 'checkbox',
            className: 'nexo-todo-checkbox',
            checked: block.data.checked || false,
          }),
          h('div', {
            className: 'nexo-block-content',
            contentEditable: 'true',
            'data-placeholder': placeholder,
          }, blockText ? text(blockText) : null)
        );

      case 'quote':
        return h('blockquote', {
          className: 'nexo-block-content nexo-quote',
          contentEditable: 'true',
          'data-placeholder': placeholder,
        }, blockText ? text(blockText) : null);

      case 'code':
        return h('pre', { className: 'nexo-code-block' },
          h('code', {
            className: 'nexo-block-content',
            contentEditable: 'true',
            'data-placeholder': placeholder,
          }, blockText ? text(blockText) : null)
        );

      case 'divider':
        return h('hr', { className: 'nexo-divider' });

      case 'image':
        return h('div', { className: 'nexo-image-block' },
          block.data.url
            ? h('img', { src: block.data.url as string, alt: block.data.alt as string || '' })
            : h('div', { className: 'nexo-image-placeholder' }, '点击上传图片')
        );

      default:
        return h('div', {
          className: 'nexo-block-content',
          contentEditable: 'true',
        }, blockText ? text(blockText) : null);
    }
  }

  private getPlaceholder(type: BlockType): string {
    const placeholders: Record<BlockType, string> = {
      paragraph: "输入文本，或按 '/' 触发命令...",
      heading1: '标题 1',
      heading2: '标题 2',
      heading3: '标题 3',
      bulletList: '列表项',
      numberedList: '列表项',
      todoList: '待办事项',
      quote: '引用',
      code: '代码',
      divider: '',
      image: '',
      toggle: '折叠内容',
      callout: '提示',
      table: '',
      column: '',
      columnItem: '',
    };
    return placeholders[type] || '';
  }

  // ============================================
  // Block Elements
  // ============================================

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

  findBlockElement(target: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = target;
    while (current && current !== this.container) {
      if (current.dataset.blockId) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }

  // ============================================
  // Public API
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

  getContainer(): HTMLElement | null {
    return this.container;
  }

  registerRenderer(_renderer: BlockRenderer<HTMLElement>): void {
    // VDOMCompiler 使用内置渲染逻辑
  }

  focus(blockId: string): void {
    const blockElement = this.blockElements.get(blockId);
    if (!blockElement) return;

    const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editableElement) {
      editableElement.focus();
    }
  }

  focusBlock(blockId: string, offset: number = 0): void {
    requestAnimationFrame(() => {
      this.updateBlockElementsMap();

      const blockElement = this.blockElements.get(blockId);
      if (!blockElement) return;

      const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
      if (!editableElement) return;

      editableElement.focus();

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

  forceRender(): void {
    this.renderCache.clear();
    this.isFirstRender = true;
    if (this.controller) {
      this.render(this.controller.getDocument());
    }
  }

  // Selection API
  hasBlockSelection(): boolean {
    return this.selectionHandler.hasBlockSelection();
  }

  getSelectedBlockIds(): string[] {
    return this.selectionHandler.getSelectedBlockIds();
  }

  clearBlockSelection(): void {
    this.selectionHandler.clearBlockSelection();
  }

  // ============================================
  // Handler Dependencies
  // ============================================

  private createInputHandlerDeps() {
    return {
      getContainer: () => this.container,
      getController: () => this.controller,
      getSelectionAdapter: () => this.selectionAdapter,
      findBlockElement: (target: HTMLElement) => this.findBlockElement(target),
      markDirty: (blockId: string) => this.dirtyTracker.mark(blockId, 'updated'),
      scheduleRender: () => this.scheduleRender(),
    };
  }

  private createKeyboardHandlerDeps() {
    return {
      getController: () => this.controller,
      getSelectionAdapter: () => this.selectionAdapter,
      findBlockElement: (target: HTMLElement) => this.findBlockElement(target),
      getBlockElement: (blockId: string) => this.getBlockElement(blockId),
      hasBlockSelection: () => this.selectionHandler.hasBlockSelection(),
      getSelectedBlockIds: () => this.selectionHandler.getSelectedBlockIds(),
      clearBlockSelection: () => this.selectionHandler.clearBlockSelection(),
      deleteSelectedBlocks: () => this.selectionHandler.deleteSelectedBlocks(),
      copySelectedBlocks: () => this.selectionHandler.copySelectedBlocks(),
      cutSelectedBlocks: () => this.selectionHandler.cutSelectedBlocks(),
      selectAllBlocks: () => this.selectionHandler.selectAllBlocks(),
      focusBlock: (blockId: string, offset?: number) => this.focusBlock(blockId, offset),
      forceRender: () => this.forceRender(),
    };
  }

  private createSelectionHandlerDeps() {
    return {
      getController: () => this.controller,
      getContainer: () => this.container,
      findBlockElement: (target: HTMLElement) => this.findBlockElement(target),
      getBlockElements: () => this.blockElements,
      forceRender: () => this.forceRender(),
      focusBlock: (blockId: string, offset?: number) => this.focusBlock(blockId, offset),
    };
  }
}

