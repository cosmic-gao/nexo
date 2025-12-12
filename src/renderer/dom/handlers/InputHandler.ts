/**
 * InputHandler - 输入事件处理器
 * 处理文本输入、组合输入、粘贴等
 */

import type { EditorController } from '../../../logic/EditorController';
import type { DOMSelectionAdapter } from '../DOMSelectionAdapter';
import { detectMarkdownShortcut, extractCodeLanguage } from '../MarkdownShortcuts';

export interface InputHandlerDeps {
  getContainer(): HTMLElement | null;
  getController(): EditorController | null;
  getSelectionAdapter(): DOMSelectionAdapter | null;
  findBlockElement(target: HTMLElement): HTMLElement | null;
  markDirty(blockId: string): void;
  scheduleRender(): void;
}

export class InputHandler {
  private deps: InputHandlerDeps;
  private isComposing: boolean = false;
  private slashMenuCallback?: (blockId: string, rect: DOMRect) => void;

  constructor(deps: InputHandlerDeps) {
    this.deps = deps;
  }

  setSlashMenuCallback(callback: (blockId: string, rect: DOMRect) => void): void {
    this.slashMenuCallback = callback;
  }

  // ============================================
  // Event Handlers
  // ============================================

  handleCompositionStart = (): void => {
    this.isComposing = true;
  };

  handleCompositionEnd = (e: CompositionEvent): void => {
    this.isComposing = false;
    const target = e.target as HTMLElement;
    this.syncInputToModel(target);
  };

  handleInput = (e: Event): void => {
    if (this.isComposing) return;

    const controller = this.deps.getController();
    if (!controller) return;

    const target = e.target as HTMLElement;
    const blockElement = this.deps.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const block = controller.getBlock(blockId);
    if (!block) return;

    const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editableElement) return;

    // 代码块使用 innerText 保留换行
    const text = block.type === 'code' 
      ? editableElement.innerText 
      : editableElement.textContent || '';

    // 检测 Markdown 快捷输入（代码块除外）
    if (block.type !== 'code') {
      const shortcut = detectMarkdownShortcut(text);
      if (shortcut) {
        this.applyMarkdownShortcut(blockId, shortcut, editableElement);
        return;
      }

      // 检测斜杠菜单
      if (text === '/' && this.slashMenuCallback) {
        const rect = editableElement.getBoundingClientRect();
        this.slashMenuCallback(blockId, rect);
      }
    }

    // 同步到模型
    this.deps.markDirty(blockId);
    controller.updateBlockDirect(blockId, { text });
  };

  handlePaste = (e: ClipboardEvent): void => {
    e.preventDefault();

    const text = e.clipboardData?.getData('text/plain');
    if (!text) return;

    const controller = this.deps.getController();
    if (!controller) return;

    const target = e.target as HTMLElement;
    const blockElement = this.deps.findBlockElement(target);
    if (!blockElement) return;

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
        this.deps.markDirty(blockId);
        controller.updateBlockDirect(blockId, { text: editableElement.textContent || '' });
      }
    }
  };

  // ============================================
  // Private Methods
  // ============================================

  private syncInputToModel(target: HTMLElement): void {
    const controller = this.deps.getController();
    if (!controller) return;

    const blockElement = this.deps.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const block = controller.getBlock(blockId);
    if (!block) return;

    const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editableElement) return;

    const text = block.type === 'code'
      ? editableElement.innerText
      : editableElement.textContent || '';

    this.deps.markDirty(blockId);
    controller.updateBlockDirect(blockId, { text });
  }

  private applyMarkdownShortcut(
    blockId: string,
    shortcut: ReturnType<typeof detectMarkdownShortcut>,
    editableElement: HTMLElement
  ): void {
    const controller = this.deps.getController();
    if (!controller || !shortcut) return;

    const text = editableElement.textContent || '';
    
    // 获取匹配的部分并移除
    const match = text.match(shortcut.pattern);
    const matchedText = match ? match[0] : '';
    const newText = text.slice(matchedText.length);

    // 更新块类型和内容
    controller.changeBlockType(blockId, shortcut.type);

    // 处理代码块语言
    if (shortcut.type === 'code') {
      const language = extractCodeLanguage(text);
      controller.updateBlockDirect(blockId, { 
        text: '', 
        language: language || undefined 
      });
    } else {
      controller.updateBlockDirect(blockId, { 
        text: newText,
        checked: shortcut.data?.checked as boolean | undefined,
      });
    }

    this.deps.scheduleRender();

    // 恢复光标
    requestAnimationFrame(() => {
      this.deps.getSelectionAdapter()?.setCursor(blockId, 0);
    });
  }
}

