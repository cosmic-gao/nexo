/**
 * KeyboardHandler - 键盘事件处理器
 * 处理快捷键、Enter、Backspace、Tab 等
 */

import type { EditorController } from '../../../logic/EditorController';
import type { DOMSelectionAdapter } from '../DOMSelectionAdapter';
import type { Block } from '../../../model/types';

export interface KeyboardHandlerDeps {
  getController(): EditorController | null;
  getSelectionAdapter(): DOMSelectionAdapter | null;
  findBlockElement(target: HTMLElement): HTMLElement | null;
  getBlockElement(blockId: string): HTMLElement | null;
  hasBlockSelection(): boolean;
  getSelectedBlockIds(): string[];
  clearBlockSelection(): void;
  deleteSelectedBlocks(): void;
  copySelectedBlocks(): void;
  cutSelectedBlocks(): void;
  selectAllBlocks(): void;
  focusBlock(blockId: string, offset?: number): void;
  forceRender(): void;
}

type FormatCommand = 'bold' | 'italic' | 'underline' | 'strikeThrough';

export class KeyboardHandler {
  private deps: KeyboardHandlerDeps;

  constructor(deps: KeyboardHandlerDeps) {
    this.deps = deps;
  }

  handleKeyDown = (e: KeyboardEvent): void => {
    const controller = this.deps.getController();
    if (!controller) return;

    const target = e.target as HTMLElement;
    const blockElement = this.deps.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    const block = controller.getBlock(blockId);
    if (!block) return;

    // 多块选择时的特殊处理
    if (this.handleMultiBlockKeys(e)) return;

    // 通用快捷键
    if (this.handleGlobalShortcuts(e, controller)) return;

    // 富文本快捷键
    if (this.handleFormatShortcuts(e, block)) return;

    // 块操作
    if (this.handleBlockOperations(e, blockId, block)) return;
  };

  // ============================================
  // Multi-block Selection Keys
  // ============================================

  private handleMultiBlockKeys(e: KeyboardEvent): boolean {
    if (!this.deps.hasBlockSelection()) return false;

    switch (e.key) {
      case 'Backspace':
      case 'Delete':
        e.preventDefault();
        this.deps.deleteSelectedBlocks();
        return true;

      case 'Escape':
        e.preventDefault();
        this.deps.clearBlockSelection();
        return true;

      case 'c':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.deps.copySelectedBlocks();
          return true;
        }
        break;

      case 'x':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.deps.cutSelectedBlocks();
          return true;
        }
        break;

      case 'a':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this.deps.selectAllBlocks();
          return true;
        }
        break;
    }

    return false;
  }

  // ============================================
  // Global Shortcuts
  // ============================================

  private handleGlobalShortcuts(e: KeyboardEvent, controller: EditorController): boolean {
    const isModifier = e.ctrlKey || e.metaKey;

    // Ctrl+Z / Ctrl+Shift+Z - Undo/Redo
    if (isModifier && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        controller.redo();
      } else {
        controller.undo();
      }
      return true;
    }

    // Ctrl+Y - Redo
    if (isModifier && e.key === 'y') {
      e.preventDefault();
      controller.redo();
      return true;
    }

    return false;
  }

  // ============================================
  // Format Shortcuts
  // ============================================

  private handleFormatShortcuts(e: KeyboardEvent, block: Block): boolean {
    if (block.type === 'code') return false;
    if (!e.ctrlKey && !e.metaKey) return false;

    const key = e.key.toLowerCase();
    let command: FormatCommand | null = null;

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

  // ============================================
  // Block Operations
  // ============================================

  private handleBlockOperations(e: KeyboardEvent, blockId: string, block: Block): boolean {
    const controller = this.deps.getController();
    if (!controller) return false;

    // Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === 'code') return false;
      e.preventDefault();
      this.handleEnter(blockId, block);
      return true;
    }

    // Backspace
    if (e.key === 'Backspace') {
      return this.handleBackspace(e, blockId, block);
    }

    // Tab
    if (e.key === 'Tab') {
      if (block.type === 'code') return false;
      e.preventDefault();
      if (e.shiftKey) {
        this.handleOutdent(blockId);
      } else {
        this.handleIndent(blockId);
      }
      return true;
    }

    return false;
  }

  private handleEnter(blockId: string, block: Block): void {
    const controller = this.deps.getController();
    const selectionAdapter = this.deps.getSelectionAdapter();
    if (!controller) return;

    // 同步 DOM 到模型（使用 updateBlock 记录历史，以便撤销时正确恢复）
    const blockElement = this.deps.getBlockElement(blockId);
    if (blockElement) {
      const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editableElement) {
        const currentText = editableElement.textContent || '';
        if (currentText !== block.data.text) {
          controller.updateBlock(blockId, { text: currentText });
        }
      }
    }

    const selection = selectionAdapter?.syncFromPlatform();
    const currentBlock = controller.getBlock(blockId);
    if (!currentBlock) return;

    // 空的非段落块转换为段落
    if (!currentBlock.data.text && currentBlock.type !== 'paragraph') {
      controller.changeBlockType(blockId, 'paragraph');
      return;
    }

    const offset = selection?.anchor.offset ?? (currentBlock.data.text?.length || 0);
    const text = currentBlock.data.text || '';

    if (offset >= text.length) {
      // 在末尾创建新块
      const newBlock = controller.createBlock('paragraph', { text: '' }, blockId);
      if (newBlock) {
        this.deps.forceRender();
        this.deps.focusBlock(newBlock.id, 0);
      }
    } else {
      // 分割块
      const newBlock = controller.splitBlock(blockId, offset);
      if (newBlock) {
        this.deps.forceRender();
        this.deps.focusBlock(newBlock.id, 0);
      }
    }
  }

  private handleBackspace(e: KeyboardEvent, blockId: string, block: Block): boolean {
    const controller = this.deps.getController();
    const selectionAdapter = this.deps.getSelectionAdapter();
    if (!controller || !selectionAdapter) return false;

    const selection = selectionAdapter.syncFromPlatform();
    if (!selection || !selection.isCollapsed) return false;
    if (selection.anchor.offset !== 0) return false;

    e.preventDefault();

    // 非段落块转换为段落
    if (block.type !== 'paragraph') {
      controller.changeBlockType(blockId, 'paragraph');
      return true;
    }

    // 与前一个块合并
    const blocks = controller.getBlocks();
    const index = blocks.findIndex(b => b.id === blockId);
    if (index > 0) {
      const prevBlock = blocks[index - 1];
      if (prevBlock.type !== 'divider' && prevBlock.type !== 'image') {
        const prevTextLength = prevBlock.data.text?.length || 0;
        controller.mergeBlocks(blockId, prevBlock.id);

        requestAnimationFrame(() => {
          selectionAdapter.setCursor(prevBlock.id, prevTextLength);
          this.deps.focusBlock(prevBlock.id, prevTextLength);
        });
      }
    }

    return true;
  }

  private handleIndent(blockId: string): void {
    const controller = this.deps.getController();
    if (!controller) return;

    const doc = controller.getDocument();
    const block = doc.blocks[blockId];
    if (!block) return;

    const siblings = block.parentId
      ? doc.blocks[block.parentId]?.childrenIds || []
      : doc.rootIds;
    const index = siblings.indexOf(blockId);

    if (index <= 0) return;

    const prevSiblingId = siblings[index - 1];
    const prevSibling = doc.blocks[prevSiblingId];
    if (!prevSibling) return;

    controller.moveBlock(blockId, prevSiblingId, prevSibling.childrenIds.length);
    this.deps.forceRender();

    requestAnimationFrame(() => {
      this.deps.focusBlock(blockId, 0);
    });
  }

  private handleOutdent(blockId: string): void {
    const controller = this.deps.getController();
    if (!controller) return;

    const doc = controller.getDocument();
    const block = doc.blocks[blockId];
    if (!block || !block.parentId) return;

    const parent = doc.blocks[block.parentId];
    if (!parent) return;

    const parentSiblings = parent.parentId
      ? doc.blocks[parent.parentId]?.childrenIds || []
      : doc.rootIds;
    const parentIndex = parentSiblings.indexOf(parent.id);

    controller.moveBlock(blockId, parent.parentId, parentIndex + 1);
    this.deps.forceRender();

    requestAnimationFrame(() => {
      this.deps.focusBlock(blockId, 0);
    });
  }
}

