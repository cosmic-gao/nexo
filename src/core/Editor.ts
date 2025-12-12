/**
 * Editor - 块编辑器核心
 * Headless 设计，纯逻辑无样式依赖
 */

import type {
  Block,
  BlockType,
  BlockData,
  BlockSelection,
  Command,
  EditorEventType,
  EventHandler,
  EditorInterface,
  EditorConfig,
  RenderContext,
} from './types';
import { EventEmitter } from './EventEmitter';
import { BlockModel } from './BlockModel';
import { SelectionManager } from './SelectionManager';
import { CommandManager, UpdateBlockCommand, CreateBlockCommand, DeleteBlockCommand, ChangeBlockTypeCommand } from './CommandManager';
import { RendererRegistry } from '../renderers';

export class Editor implements EditorInterface {
  private container: HTMLElement;
  private events: EventEmitter;
  private model: BlockModel;
  private selection: SelectionManager;
  private commands: CommandManager;
  private renderers: RendererRegistry;
  private config: EditorConfig;

  private blockElements: Map<string, HTMLElement> = new Map();
  private isComposing: boolean = false;
  private focusedBlockId: string | null = null;

  constructor(config: EditorConfig) {
    this.config = config;
    this.events = new EventEmitter();
    this.model = new BlockModel(this.events, config.initialBlocks);
    this.selection = new SelectionManager(this.events, () => this.container);
    this.commands = new CommandManager();
    this.renderers = new RendererRegistry();

    // 获取容器
    if (typeof config.container === 'string') {
      const el = document.querySelector(config.container);
      if (!el) throw new Error(`Container not found: ${config.container}`);
      this.container = el as HTMLElement;
    } else {
      this.container = config.container;
    }

    this.initContainer();
    this.render();
    this.bindEvents();
  }

  private initContainer(): void {
    this.container.classList.add('nexo-editor');
    this.container.setAttribute('role', 'textbox');
    this.container.setAttribute('aria-multiline', 'true');
  }

  private bindEvents(): void {
    // 输入事件
    this.container.addEventListener('input', this.handleInput.bind(this));
    this.container.addEventListener('compositionstart', () => this.isComposing = true);
    this.container.addEventListener('compositionend', this.handleCompositionEnd.bind(this));

    // 键盘事件
    this.container.addEventListener('keydown', this.handleKeyDown.bind(this));

    // 选区事件
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));

    // 焦点事件
    this.container.addEventListener('focusin', this.handleFocusIn.bind(this));
    this.container.addEventListener('focusout', this.handleFocusOut.bind(this));

    // 粘贴事件
    this.container.addEventListener('paste', this.handlePaste.bind(this));

    // 拖拽事件
    this.container.addEventListener('dragstart', this.handleDragStart.bind(this));
    this.container.addEventListener('dragover', this.handleDragOver.bind(this));
    this.container.addEventListener('drop', this.handleDrop.bind(this));
  }

  private handleInput(e: Event): void {
    if (this.isComposing) return;

    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editableElement) return;

    const text = editableElement.textContent || '';
    
    // 检查是否是斜杠命令
    if (text === '/') {
      this.emit('focus:changed', { blockId, showSlashMenu: true });
      return;
    }

    this.model.updateBlock(blockId, { text });
  }

  private handleCompositionEnd(e: CompositionEvent): void {
    this.isComposing = false;
    
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editableElement) return;

    const text = editableElement.textContent || '';
    this.model.updateBlock(blockId, { text });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const block = this.model.getBlock(blockId);
    if (!block) return;

    // 撤销/重做
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
      return;
    }

    // Enter 键处理
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleEnterKey(blockId);
      return;
    }

    // Backspace 键处理
    if (e.key === 'Backspace') {
      this.handleBackspaceKey(e, blockId);
      return;
    }

    // 方向键处理
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      this.handleArrowKey(e, blockId);
      return;
    }

    // Tab 键处理（用于列表缩进）
    if (e.key === 'Tab') {
      e.preventDefault();
      // 可扩展：处理列表缩进
      return;
    }
  }

  private handleEnterKey(blockId: string): void {
    const block = this.model.getBlock(blockId);
    if (!block) return;

    const selection = this.selection.syncFromDOM();
    if (!selection) return;

    // 如果是空块并且是特殊类型，转换为段落
    if (!block.data.text && block.type !== 'paragraph') {
      this.model.changeBlockType(blockId, 'paragraph');
      return;
    }

    // 在光标位置分割块
    const offset = selection.anchorOffset;
    const text = block.data.text || '';
    
    if (offset === 0) {
      // 在开头按回车，在当前块前创建空块
      const newBlock = this.model.createBlock('paragraph', { text: '' });
      this.model.moveBlock(newBlock.id, blockId, 'before');
    } else if (offset === text.length) {
      // 在末尾按回车，创建新空块
      const newBlock = this.model.createBlock('paragraph', { text: '' }, blockId);
      this.renderBlock(newBlock);
      
      requestAnimationFrame(() => {
        this.selection.setCursorToStart(newBlock.id);
        this.selection.focusBlock(newBlock.id);
      });
    } else {
      // 在中间按回车，分割块
      const newBlock = this.model.splitBlock(blockId, offset);
      if (newBlock) {
        this.renderBlock(newBlock);
        
        requestAnimationFrame(() => {
          this.selection.setCursorToStart(newBlock.id);
          this.selection.focusBlock(newBlock.id);
        });
      }
    }
  }

  private handleBackspaceKey(e: KeyboardEvent, blockId: string): void {
    const block = this.model.getBlock(blockId);
    if (!block) return;

    // 检查是否在块开头
    if (this.selection.isAtBlockStart()) {
      // 如果是特殊类型，先转换为段落
      if (block.type !== 'paragraph') {
        e.preventDefault();
        this.model.changeBlockType(blockId, 'paragraph');
        return;
      }

      // 如果是段落，尝试与上一个块合并
      const prevBlock = this.model.getPreviousBlock(blockId);
      if (prevBlock && prevBlock.type !== 'divider' && prevBlock.type !== 'image') {
        e.preventDefault();
        const prevTextLength = prevBlock.data.text?.length || 0;
        this.model.mergeBlocks(blockId, prevBlock.id);
        
        this.render();
        
        requestAnimationFrame(() => {
          this.selection.setCursor(prevBlock.id, prevTextLength);
          this.selection.focusBlock(prevBlock.id);
        });
      }
    }
  }

  private handleArrowKey(e: KeyboardEvent, blockId: string): void {
    const selection = this.selection.syncFromDOM();
    if (!selection) return;

    if (e.key === 'ArrowUp') {
      // 检查是否在块的开头行
      const prevBlock = this.model.getPreviousBlock(blockId);
      if (prevBlock && this.isAtFirstLine(blockId)) {
        e.preventDefault();
        this.selection.setCursorToEnd(prevBlock.id);
        this.selection.focusBlock(prevBlock.id);
      }
    } else if (e.key === 'ArrowDown') {
      // 检查是否在块的最后一行
      const nextBlock = this.model.getNextBlock(blockId);
      if (nextBlock && this.isAtLastLine(blockId)) {
        e.preventDefault();
        this.selection.setCursorToStart(nextBlock.id);
        this.selection.focusBlock(nextBlock.id);
      }
    }
  }

  private isAtFirstLine(blockId: string): boolean {
    const blockElement = this.blockElements.get(blockId);
    if (!blockElement) return false;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const blockRect = blockElement.getBoundingClientRect();

    return rect.top - blockRect.top < 20;
  }

  private isAtLastLine(blockId: string): boolean {
    const blockElement = this.blockElements.get(blockId);
    if (!blockElement) return false;

    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return false;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const blockRect = blockElement.getBoundingClientRect();

    return blockRect.bottom - rect.bottom < 20;
  }

  private handleSelectionChange(): void {
    if (!this.container.contains(document.activeElement)) return;
    
    const selection = this.selection.syncFromDOM();
    if (selection) {
      this.emit('selection:changed', { selection });
    }
  }

  private handleFocusIn(e: FocusEvent): void {
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (blockId && blockId !== this.focusedBlockId) {
      this.focusedBlockId = blockId;
      blockElement.classList.add('nexo-block-focused');
      this.emit('focus:changed', { blockId });
    }
  }

  private handleFocusOut(e: FocusEvent): void {
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (blockElement) {
      blockElement.classList.remove('nexo-block-focused');
    }
    
    // 检查焦点是否完全离开编辑器
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !this.container.contains(relatedTarget)) {
      this.focusedBlockId = null;
    }
  }

  private handlePaste(e: ClipboardEvent): void {
    e.preventDefault();
    
    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;

    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    // 简单粘贴：插入纯文本
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
      
      // 同步到模型
      const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editableElement) {
        this.model.updateBlock(blockId, { text: editableElement.textContent || '' });
      }
    }
  }

  private handleDragStart(e: DragEvent): void {
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (blockId) {
      e.dataTransfer?.setData('text/plain', blockId);
      blockElement.classList.add('nexo-block-dragging');
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    
    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);
    if (blockElement) {
      // 显示插入指示器
      const rect = blockElement.getBoundingClientRect();
      const isTop = e.clientY < rect.top + rect.height / 2;
      
      this.container.querySelectorAll('.nexo-drop-indicator').forEach(el => el.remove());
      
      const indicator = document.createElement('div');
      indicator.className = 'nexo-drop-indicator';
      
      if (isTop) {
        blockElement.insertAdjacentElement('beforebegin', indicator);
      } else {
        blockElement.insertAdjacentElement('afterend', indicator);
      }
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    
    this.container.querySelectorAll('.nexo-drop-indicator').forEach(el => el.remove());
    this.container.querySelectorAll('.nexo-block-dragging').forEach(el => {
      el.classList.remove('nexo-block-dragging');
    });

    const sourceBlockId = e.dataTransfer?.getData('text/plain');
    if (!sourceBlockId) return;

    const target = e.target as HTMLElement;
    const targetBlockElement = this.findBlockElement(target);
    if (!targetBlockElement) return;

    const targetBlockId = targetBlockElement.dataset.blockId;
    if (!targetBlockId || sourceBlockId === targetBlockId) return;

    const rect = targetBlockElement.getBoundingClientRect();
    const position = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';

    this.moveBlock(sourceBlockId, targetBlockId, position);
    this.render();
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

  private render(): void {
    const blocks = this.model.getBlocks();
    const context = this.createRenderContext();

    // 清理旧元素
    this.container.innerHTML = '';
    this.blockElements.clear();

    // 渲染所有块
    blocks.forEach(block => {
      const element = this.renderBlock(block, context);
      this.container.appendChild(element);
    });
  }

  private renderBlock(block: Block, context?: RenderContext): HTMLElement {
    const ctx = context || this.createRenderContext();
    const renderer = this.renderers.get(block.type);
    
    if (!renderer) {
      console.warn(`No renderer found for block type: ${block.type}`);
      return document.createElement('div');
    }

    const element = renderer.render(block, ctx);
    this.blockElements.set(block.id, element);
    
    // 如果块不在容器中，添加它
    if (!this.container.contains(element)) {
      const prevBlock = this.model.getPreviousBlock(block.id);
      if (prevBlock) {
        const prevElement = this.blockElements.get(prevBlock.id);
        if (prevElement) {
          prevElement.insertAdjacentElement('afterend', element);
        } else {
          this.container.appendChild(element);
        }
      } else {
        this.container.insertBefore(element, this.container.firstChild);
      }
    }

    return element;
  }

  private createRenderContext(): RenderContext {
    const blockSelection = this.selection.getSelection();
    // 将 BlockSelection 转换为 SelectionState
    const selectionState = blockSelection ? {
      blockId: blockSelection.anchorBlockId,
      offset: blockSelection.anchorOffset,
      length: blockSelection.focusOffset - blockSelection.anchorOffset,
    } : null;
    
    return {
      editor: this,
      selection: selectionState,
    };
  }

  // ============================================
  // EditorInterface 实现
  // ============================================

  getBlock(id: string): Block | undefined {
    return this.model.getBlock(id);
  }

  getBlocks(): Block[] {
    return this.model.getBlocks();
  }

  createBlock(type: BlockType, data?: BlockData, afterId?: string): Block {
    const command = new CreateBlockCommand(this.model, type, data, afterId);
    this.commands.execute(command);
    
    const blockId = command.getCreatedBlockId();
    const block = blockId ? this.model.getBlock(blockId) : undefined;
    
    if (block) {
      this.renderBlock(block);
    }
    
    return block!;
  }

  updateBlock(id: string, data: Partial<BlockData>): void {
    const command = new UpdateBlockCommand(this.model, id, data);
    this.commands.execute(command);
    
    const block = this.model.getBlock(id);
    const element = this.blockElements.get(id);
    
    if (block && element) {
      const renderer = this.renderers.get(block.type);
      if (renderer) {
        renderer.update(element, block, this.createRenderContext());
      }
    }
  }

  deleteBlock(id: string): void {
    const command = new DeleteBlockCommand(this.model, id);
    this.commands.execute(command);
    
    const element = this.blockElements.get(id);
    if (element) {
      element.remove();
      this.blockElements.delete(id);
    }
  }

  moveBlock(id: string, targetId: string, position: 'before' | 'after'): void {
    this.model.moveBlock(id, targetId, position);
  }

  changeBlockType(id: string, newType: BlockType): void {
    const command = new ChangeBlockTypeCommand(this.model, id, newType);
    this.commands.execute(command);
    this.render();
  }

  getSelection(): BlockSelection | null {
    return this.selection.getSelection();
  }

  setSelection(selection: BlockSelection): void {
    this.selection.syncToDOM(selection);
  }

  focus(blockId?: string): void {
    if (blockId) {
      this.selection.focusBlock(blockId);
    } else {
      const blocks = this.model.getBlocks();
      if (blocks.length > 0) {
        this.selection.focusBlock(blocks[0].id);
      }
    }
  }

  blur(): void {
    (document.activeElement as HTMLElement)?.blur();
  }

  execute(command: Command): void {
    this.commands.execute(command);
  }

  undo(): void {
    if (this.commands.undo()) {
      this.render();
    }
  }

  redo(): void {
    if (this.commands.redo()) {
      this.render();
    }
  }

  on<T>(type: EditorEventType, handler: EventHandler<T>): void {
    this.events.on(type, handler);
  }

  off<T>(type: EditorEventType, handler: EventHandler<T>): void {
    this.events.off(type, handler);
  }

  emit<T>(type: EditorEventType, payload: T): void {
    this.events.emit(type, payload);
  }

  getContainer(): HTMLElement {
    return this.container;
  }

  getBlockElement(id: string): HTMLElement | null {
    return this.blockElements.get(id) || null;
  }

  // ============================================
  // 其他公开方法
  // ============================================

  destroy(): void {
    this.events.removeAllListeners();
    this.container.innerHTML = '';
    this.blockElements.clear();
  }

  toJSON(): Block[] {
    return this.model.toJSON();
  }

  fromJSON(blocks: Block[]): void {
    this.model.fromJSON(blocks);
    this.render();
  }
}

