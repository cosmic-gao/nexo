/**
 * Renderer Layer - DOMCompiler
 * Web DOM 平台的编译器实现
 */

import type { Block, Document } from '../../model/types';
import type { EditorController } from '../../logic/EditorController';
import type { Compiler, BlockRenderer, RenderContext, SelectionAdapter } from '../types';
import { DOMSelectionAdapter } from './DOMSelectionAdapter';
import { detectMarkdownShortcut, extractCodeLanguage } from './MarkdownShortcuts';
import { extractTextFromElement } from './textUtils';

export class DOMCompiler implements Compiler<HTMLElement, HTMLElement> {
  name = 'dom';

  private container: HTMLElement | null = null;
  private controller: EditorController | null = null;
  private renderers: Map<string, BlockRenderer<HTMLElement>> = new Map();
  private blockElements: Map<string, HTMLElement> = new Map();
  private selectionAdapter: DOMSelectionAdapter | null = null;
  
  private isComposing: boolean = false;
  private focusedBlockId: string | null = null;

  /**
   * 初始化编译器
   */
  init(container: HTMLElement, controller: EditorController): void {
    this.container = container;
    this.controller = controller;
    
    // 初始化选区适配器
    this.selectionAdapter = new DOMSelectionAdapter(container, controller);
    
    // 设置容器样式
    this.container.classList.add('nexo-editor');
    this.container.setAttribute('role', 'textbox');
    this.container.setAttribute('aria-multiline', 'true');
    
    // 绑定事件
    this.bindEvents();
    
    // 监听文档变化
    controller.on('document:changed', () => {
      this.render(controller.getDocument());
    });
  }

  /**
   * 绑定 DOM 事件
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
    
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
  }

  /**
   * 处理输入
   */
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

    // 从 DOM 中提取文本，正确处理 <br> 为换行符
    const text = extractTextFromElement(editableElement);
    
    // 检查斜杠命令（仅非代码块）
    if (block.type !== 'code' && text === '/') {
      this.controller.emitCustom('focus:changed', { blockId, showSlashMenu: true });
      return;
    }

    // 检查 Markdown 快捷输入（仅段落块）
    if (block.type === 'paragraph') {
      const markdownMatch = detectMarkdownShortcut(text);
      if (markdownMatch) {
        this.applyMarkdownShortcut(blockId, markdownMatch, text);
        return;
      }
    }

    // 直接更新（不记录历史，用于实时输入）
    this.controller.updateBlockDirect(blockId, { text });
  }

  /**
   * 应用 Markdown 快捷输入
   */
  private applyMarkdownShortcut(
    blockId: string,
    match: { type: import('../../model/types').BlockType; pattern: RegExp; data?: Record<string, unknown> },
    text: string
  ): void {
    if (!this.controller) return;

    // 改变块类型
    this.controller.changeBlockType(blockId, match.type);

    // 如果是代码块，提取语言
    if (match.type === 'code') {
      const language = extractCodeLanguage(text.trim());
      if (language) {
        this.controller.updateBlockDirect(blockId, { text: '', language });
      } else {
        this.controller.updateBlockDirect(blockId, { text: '' });
      }
    } else if (match.type === 'divider') {
      // 分割线不需要文本
      this.controller.updateBlockDirect(blockId, { text: '' });
      // 创建新段落在分割线后
      const newBlock = this.controller.createBlock('paragraph', { text: '' }, blockId);
      if (newBlock) {
        requestAnimationFrame(() => {
          this.focus(newBlock.id);
        });
      }
    } else {
      // 清除触发文本，设置额外数据
      this.controller.updateBlockDirect(blockId, { text: '', ...match.data });
    }

    // 重新渲染并聚焦
    this.render(this.controller.getDocument());
    requestAnimationFrame(() => {
      this.focus(blockId);
    });
  }

  /**
   * 处理输入法结束
   */
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

    // 从 DOM 中提取文本
    const text = extractTextFromElement(editableElement);
    this.controller.updateBlockDirect(blockId, { text });
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.controller) return;

    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const block = this.controller.getBlock(blockId);
    if (!block) return;

    // Ctrl+Z / Ctrl+Shift+Z - 撤销/重做
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.controller.redo();
      } else {
        this.controller.undo();
      }
      return;
    }

    // Ctrl+Y - 重做
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      e.preventDefault();
      this.controller.redo();
      return;
    }

    // 富文本格式化快捷键（非代码块）
    if ((e.ctrlKey || e.metaKey) && block.type !== 'code') {
      if (this.handleFormatShortcut(e, blockId)) {
        return;
      }
    }

    // Enter - 代码块中允许换行
    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === 'code') {
        // 代码块中 Enter 插入换行，不阻止默认行为
        return;
      }
      e.preventDefault();
      this.handleEnterKey(blockId);
      return;
    }

    // Backspace
    if (e.key === 'Backspace') {
      this.handleBackspaceKey(e, blockId);
      return;
    }

    // Arrow keys
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      this.handleArrowKey(e, blockId);
      return;
    }

    // Tab - 缩进/取消缩进
    if (e.key === 'Tab') {
      // 代码块中允许 Tab 输入
      if (block.type === 'code') {
        return;
      }
      e.preventDefault();
      if (e.shiftKey) {
        this.handleOutdent(blockId);
      } else {
        this.handleIndent(blockId);
      }
      return;
    }
  }

  /**
   * 处理 Enter 键
   */
  private handleEnterKey(blockId: string): void {
    if (!this.controller || !this.selectionAdapter) return;

    const block = this.controller.getBlock(blockId);
    if (!block) return;

    const selection = this.selectionAdapter.syncFromPlatform();
    if (!selection) return;

    // 空块且非段落类型，转换为段落
    if (!block.data.text && block.type !== 'paragraph') {
      this.controller.changeBlockType(blockId, 'paragraph');
      return;
    }

    const offset = selection.anchor.offset;
    const text = block.data.text || '';

    if (offset === text.length) {
      // 在末尾，创建新空块
      const newBlock = this.controller.createBlock('paragraph', { text: '' }, blockId);
      if (newBlock) {
        requestAnimationFrame(() => {
          this.selectionAdapter?.setCursor(newBlock.id, 0);
          this.focus(newBlock.id);
        });
      }
    } else {
      // 在中间，分割块
      const newBlock = this.controller.splitBlock(blockId, offset);
      if (newBlock) {
        requestAnimationFrame(() => {
          this.selectionAdapter?.setCursor(newBlock.id, 0);
          this.focus(newBlock.id);
        });
      }
    }
  }

  /**
   * 处理 Backspace 键
   */
  private handleBackspaceKey(e: KeyboardEvent, blockId: string): void {
    if (!this.controller || !this.selectionAdapter) return;

    const block = this.controller.getBlock(blockId);
    if (!block) return;

    const selection = this.selectionAdapter.syncFromPlatform();
    if (!selection || !selection.isCollapsed) return;

    // 不在块开头则由浏览器处理
    if (selection.anchor.offset !== 0) return;

    e.preventDefault();

    // 非段落类型先转换为段落
    if (block.type !== 'paragraph') {
      this.controller.changeBlockType(blockId, 'paragraph');
      return;
    }

    // 尝试与上一个块合并
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

  /**
   * 处理方向键
   */
  private handleArrowKey(e: KeyboardEvent, blockId: string): void {
    if (!this.controller || !this.selectionAdapter) return;

    const blocks = this.controller.getBlocks();
    const index = blocks.findIndex(b => b.id === blockId);

    if (e.key === 'ArrowUp' && index > 0) {
      const blockElement = this.blockElements.get(blockId);
      if (blockElement && this.isAtFirstLine(blockElement)) {
        e.preventDefault();
        const prevBlock = blocks[index - 1];
        this.selectionAdapter.setCursor(prevBlock.id, prevBlock.data.text?.length || 0);
        this.focus(prevBlock.id);
      }
    } else if (e.key === 'ArrowDown' && index < blocks.length - 1) {
      const blockElement = this.blockElements.get(blockId);
      if (blockElement && this.isAtLastLine(blockElement)) {
        e.preventDefault();
        const nextBlock = blocks[index + 1];
        this.selectionAdapter.setCursor(nextBlock.id, 0);
        this.focus(nextBlock.id);
      }
    }
  }

  private isAtFirstLine(blockElement: HTMLElement): boolean {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const blockRect = blockElement.getBoundingClientRect();
    return rect.top - blockRect.top < 20;
  }

  private isAtLastLine(blockElement: HTMLElement): boolean {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const blockRect = blockElement.getBoundingClientRect();
    return blockRect.bottom - rect.bottom < 20;
  }

  /**
   * 处理缩进（Tab）
   */
  private handleIndent(blockId: string): void {
    if (!this.controller) return;
    
    const doc = this.controller.getDocument();
    const block = doc.blocks[blockId];
    if (!block) return;

    // 获取前一个兄弟块
    const siblings = block.parentId 
      ? doc.blocks[block.parentId]?.childrenIds || []
      : doc.rootIds;
    const index = siblings.indexOf(blockId);
    
    if (index > 0) {
      const prevSiblingId = siblings[index - 1];
      const prevSibling = doc.blocks[prevSiblingId];
      
      if (prevSibling) {
        // 移动到前一个兄弟的子块末尾
        this.controller.moveBlock(blockId, prevSiblingId, prevSibling.childrenIds.length);
        
        // 重新渲染
        this.render(this.controller.getDocument());
        
        // 恢复焦点
        requestAnimationFrame(() => {
          this.focus(blockId);
        });
      }
    }
  }

  /**
   * 处理取消缩进（Shift+Tab）
   */
  private handleOutdent(blockId: string): void {
    if (!this.controller) return;
    
    const doc = this.controller.getDocument();
    const block = doc.blocks[blockId];
    if (!block || !block.parentId) return; // 已经是根级，无法取消缩进

    const parent = doc.blocks[block.parentId];
    if (!parent) return;

    // 获取父块的索引
    const parentSiblings = parent.parentId
      ? doc.blocks[parent.parentId]?.childrenIds || []
      : doc.rootIds;
    const parentIndex = parentSiblings.indexOf(parent.id);

    // 移动到父块的下一个位置
    this.controller.moveBlock(blockId, parent.parentId, parentIndex + 1);
    
    // 重新渲染
    this.render(this.controller.getDocument());
    
    // 恢复焦点
    requestAnimationFrame(() => {
      this.focus(blockId);
    });
  }

  /**
   * 处理富文本格式化快捷键
   */
  private handleFormatShortcut(e: KeyboardEvent, blockId: string): boolean {
    const key = e.key.toLowerCase();
    let command: string | null = null;

    switch (key) {
      case 'b': // Ctrl+B 加粗
        command = 'bold';
        break;
      case 'i': // Ctrl+I 斜体
        command = 'italic';
        break;
      case 'u': // Ctrl+U 下划线
        command = 'underline';
        break;
      case 's': // Ctrl+Shift+S 删除线
        if (e.shiftKey) {
          command = 'strikeThrough';
        }
        break;
      case 'e': // Ctrl+E 行内代码
        command = 'code';
        break;
      case 'k': // Ctrl+K 链接
        command = 'link';
        break;
      default:
        return false;
    }

    if (command) {
      e.preventDefault();
      this.applyFormat(command, blockId);
      return true;
    }

    return false;
  }

  /**
   * 应用文本格式
   */
  private applyFormat(command: string, blockId: string): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    // 使用 document.execCommand 应用格式（简单但有效）
    if (command === 'code') {
      // 行内代码使用特殊处理
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();
      
      if (selectedText) {
        const codeElement = document.createElement('code');
        codeElement.className = 'nexo-inline-code';
        codeElement.textContent = selectedText;
        
        range.deleteContents();
        range.insertNode(codeElement);
        
        // 移动光标到代码后
        range.setStartAfter(codeElement);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // 同步内容到模型
        this.syncContentToModel(blockId);
      }
    } else if (command === 'link') {
      // 链接处理
      const url = prompt('输入链接地址:', 'https://');
      if (url) {
        document.execCommand('createLink', false, url);
        this.syncContentToModel(blockId);
      }
    } else {
      // 使用 execCommand 处理常规格式
      document.execCommand(command, false);
      this.syncContentToModel(blockId);
    }
  }

  /**
   * 同步 DOM 内容到模型
   */
  private syncContentToModel(blockId: string): void {
    if (!this.controller) return;

    const blockElement = this.blockElements.get(blockId);
    if (!blockElement) return;

    const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editableElement) return;

    // 获取 HTML 内容（保留格式）
    const html = editableElement.innerHTML;
    const text = editableElement.textContent || '';

    // 更新模型（暂时只更新纯文本，富文本需要解析 HTML）
    this.controller.updateBlockDirect(blockId, { text, html });
  }

  /**
   * 处理选区变化
   */
  private handleSelectionChange(): void {
    if (!this.container?.contains(document.activeElement)) return;
    if (!this.selectionAdapter || !this.controller) return;

    const selection = this.selectionAdapter.syncFromPlatform();
    if (selection) {
      this.controller.setSelection(selection);
    }
  }

  /**
   * 处理焦点进入
   */
  private handleFocusIn(e: FocusEvent): void {
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (blockId && blockId !== this.focusedBlockId) {
      this.focusedBlockId = blockId;
      blockElement.classList.add('nexo-block-focused');
      this.controller?.emit('focus:changed', { blockId });
    }
  }

  /**
   * 处理焦点离开
   */
  private handleFocusOut(e: FocusEvent): void {
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (blockElement) {
      blockElement.classList.remove('nexo-block-focused');
    }

    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !this.container?.contains(relatedTarget)) {
      this.focusedBlockId = null;
    }
  }

  /**
   * 处理粘贴
   */
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
        this.controller.updateBlockDirect(blockId, { text: extractTextFromElement(editableElement) });
      }
    }
  }

  /**
   * 渲染整个文档
   */
  render(doc: Document): void {
    if (!this.container || !this.controller) return;

    const context = this.createRenderContext();

    // 清空容器
    this.container.innerHTML = '';
    this.blockElements.clear();

    // 递归渲染所有块（包括子块）
    doc.rootIds.forEach((blockId: string, index: number) => {
      const block = doc.blocks[blockId];
      if (block) {
        const element = this.renderBlockWithChildren(block, doc, { ...context, index }, 0);
        this.container!.appendChild(element);
      }
    });
  }

  /**
   * 递归渲染块及其子块
   */
  private renderBlockWithChildren(
    block: Block,
    doc: Document,
    context: RenderContext<HTMLElement>,
    depth: number
  ): HTMLElement {
    const element = this.renderBlock(block, context);
    
    // 设置缩进深度
    element.style.marginLeft = depth > 0 ? `${depth * 24}px` : '';
    element.dataset.depth = String(depth);

    // 渲染子块
    if (block.childrenIds.length > 0) {
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'nexo-block-children';
      
      block.childrenIds.forEach((childId, childIndex) => {
        const childBlock = doc.blocks[childId];
        if (childBlock) {
          const childElement = this.renderBlockWithChildren(
            childBlock,
            doc,
            { ...context, index: childIndex },
            depth + 1
          );
          childrenContainer.appendChild(childElement);
        }
      });

      // 子块容器添加到块元素后面（不是内部）
      element.after(childrenContainer);
      
      // 返回一个包装器包含块和子块
      const wrapper = document.createElement('div');
      wrapper.className = 'nexo-block-with-children';
      wrapper.appendChild(element);
      wrapper.appendChild(childrenContainer);
      return wrapper;
    }
    
    return element;
  }

  /**
   * 渲染单个块
   */
  renderBlock(block: Block, context: RenderContext<HTMLElement>): HTMLElement {
    const renderer = this.renderers.get(block.type);
    
    if (!renderer) {
      console.warn(`No renderer found for block type: ${block.type}`);
      const div = document.createElement('div');
      div.textContent = `[Unknown block type: ${block.type}]`;
      return div;
    }

    const element = renderer.render(block, context);
    this.blockElements.set(block.id, element);
    
    return element;
  }

  /**
   * 更新单个块
   */
  updateBlock(blockId: string, block: Block): void {
    const element = this.blockElements.get(blockId);
    if (!element) return;

    const renderer = this.renderers.get(block.type);
    if (renderer) {
      renderer.update(element, block, this.createRenderContext());
    }
  }

  /**
   * 删除块元素
   */
  removeBlock(blockId: string): void {
    const element = this.blockElements.get(blockId);
    if (element) {
      element.remove();
      this.blockElements.delete(blockId);
    }
  }

  /**
   * 获取块元素
   */
  getBlockElement(blockId: string): HTMLElement | null {
    return this.blockElements.get(blockId) || null;
  }

  /**
   * 注册块渲染器
   */
  registerRenderer(renderer: BlockRenderer<HTMLElement>): void {
    this.renderers.set(renderer.type, renderer);
  }

  /**
   * 聚焦到块
   */
  focus(blockId: string): void {
    this.selectionAdapter?.focusBlock(blockId);
  }

  /**
   * 获取容器
   */
  getContainer(): HTMLElement | null {
    return this.container;
  }

  /**
   * 获取选区适配器
   */
  getSelectionAdapter(): DOMSelectionAdapter | null {
    return this.selectionAdapter;
  }

  /**
   * 销毁编译器
   */
  destroy(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.blockElements.clear();
    this.renderers.clear();
    this.container = null;
    this.controller = null;
    this.selectionAdapter = null;
  }

  /**
   * 创建渲染上下文
   */
  private createRenderContext(): RenderContext<HTMLElement> {
    return {
      controller: this.controller!,
      selection: this.controller?.getSelection() || null,
    };
  }

  /**
   * 查找块元素
   */
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


