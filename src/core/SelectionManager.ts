/**
 * SelectionManager - 选区管理器
 * 管理编辑器中的光标和选区状态
 */

import type { BlockSelection } from './types';
import { EventEmitter } from './EventEmitter';

export class SelectionManager {
  private currentSelection: BlockSelection | null = null;
  private events: EventEmitter;
  private containerGetter: () => HTMLElement | null;

  constructor(events: EventEmitter, containerGetter: () => HTMLElement | null) {
    this.events = events;
    this.containerGetter = containerGetter;
  }

  getSelection(): BlockSelection | null {
    return this.currentSelection;
  }

  setSelection(selection: BlockSelection | null): void {
    this.currentSelection = selection;
    this.events.emit('selection:changed', { selection });
  }

  /**
   * 从 DOM Selection 同步到内部状态
   */
  syncFromDOM(): BlockSelection | null {
    const container = this.containerGetter();
    if (!container) return null;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      this.currentSelection = null;
      return null;
    }

    const range = selection.getRangeAt(0);
    
    const anchorBlock = this.findBlockElement(range.startContainer);
    const focusBlock = this.findBlockElement(range.endContainer);

    if (!anchorBlock || !focusBlock) {
      return null;
    }

    const anchorBlockId = anchorBlock.dataset.blockId;
    const focusBlockId = focusBlock.dataset.blockId;

    if (!anchorBlockId || !focusBlockId) {
      return null;
    }

    const anchorOffset = this.getOffsetInBlock(anchorBlock, range.startContainer, range.startOffset);
    const focusOffset = this.getOffsetInBlock(focusBlock, range.endContainer, range.endOffset);

    const blockSelection: BlockSelection = {
      anchorBlockId,
      anchorOffset,
      focusBlockId,
      focusOffset,
    };

    this.currentSelection = blockSelection;
    return blockSelection;
  }

  /**
   * 从内部状态同步到 DOM Selection
   */
  syncToDOM(selection: BlockSelection): void {
    const container = this.containerGetter();
    if (!container) return;

    const anchorBlock = container.querySelector(`[data-block-id="${selection.anchorBlockId}"]`);
    const focusBlock = container.querySelector(`[data-block-id="${selection.focusBlockId}"]`);

    if (!anchorBlock || !focusBlock) return;

    const anchorNode = this.findEditableElement(anchorBlock as HTMLElement);
    const focusNode = this.findEditableElement(focusBlock as HTMLElement);

    if (!anchorNode || !focusNode) return;

    const range = document.createRange();
    const domSelection = window.getSelection();
    
    if (!domSelection) return;

    try {
      const { node: startNode, offset: startOffset } = this.resolveOffset(anchorNode, selection.anchorOffset);
      const { node: endNode, offset: endOffset } = this.resolveOffset(focusNode, selection.focusOffset);

      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);

      domSelection.removeAllRanges();
      domSelection.addRange(range);
    } catch (error) {
      console.warn('Failed to set selection:', error);
    }

    this.currentSelection = selection;
  }

  /**
   * 设置光标到指定块的指定位置
   */
  setCursor(blockId: string, offset: number): void {
    this.syncToDOM({
      anchorBlockId: blockId,
      anchorOffset: offset,
      focusBlockId: blockId,
      focusOffset: offset,
    });
  }

  /**
   * 设置光标到块的开头
   */
  setCursorToStart(blockId: string): void {
    this.setCursor(blockId, 0);
  }

  /**
   * 设置光标到块的末尾
   */
  setCursorToEnd(blockId: string): void {
    const container = this.containerGetter();
    if (!container) return;

    const blockElement = container.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockElement) return;

    const editableElement = this.findEditableElement(blockElement as HTMLElement);
    if (!editableElement) return;

    const textLength = editableElement.textContent?.length || 0;
    this.setCursor(blockId, textLength);
  }

  /**
   * 聚焦到指定块
   */
  focusBlock(blockId: string): void {
    const container = this.containerGetter();
    if (!container) return;

    const blockElement = container.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockElement) return;

    const editableElement = this.findEditableElement(blockElement as HTMLElement);
    if (editableElement) {
      editableElement.focus();
    }
  }

  private findBlockElement(node: Node): HTMLElement | null {
    let current: Node | null = node;
    while (current && current !== document.body) {
      if (current instanceof HTMLElement && current.dataset.blockId) {
        return current;
      }
      current = current.parentNode;
    }
    return null;
  }

  private findEditableElement(blockElement: HTMLElement): HTMLElement | null {
    return blockElement.querySelector('[contenteditable="true"]') || 
           (blockElement.isContentEditable ? blockElement : null);
  }

  private getOffsetInBlock(blockElement: HTMLElement, node: Node, offset: number): number {
    const editableElement = this.findEditableElement(blockElement);
    if (!editableElement) return 0;

    const walker = document.createTreeWalker(
      editableElement,
      NodeFilter.SHOW_TEXT,
      null
    );

    let totalOffset = 0;
    let currentNode: Node | null = walker.nextNode();

    while (currentNode) {
      if (currentNode === node) {
        return totalOffset + offset;
      }
      totalOffset += currentNode.textContent?.length || 0;
      currentNode = walker.nextNode();
    }

    // 如果 node 是元素节点
    if (node === editableElement) {
      return offset === 0 ? 0 : editableElement.textContent?.length || 0;
    }

    return totalOffset;
  }

  private resolveOffset(element: HTMLElement, offset: number): { node: Node; offset: number } {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentOffset = 0;
    let node: Node | null = walker.nextNode();

    while (node) {
      const nodeLength = node.textContent?.length || 0;
      if (currentOffset + nodeLength >= offset) {
        return { node, offset: offset - currentOffset };
      }
      currentOffset += nodeLength;
      node = walker.nextNode();
    }

    // 如果没有文本节点，返回元素本身
    if (!element.firstChild) {
      const textNode = document.createTextNode('');
      element.appendChild(textNode);
      return { node: textNode, offset: 0 };
    }

    return { node: element, offset: 0 };
  }

  /**
   * 检查当前选区是否在块的开头
   */
  isAtBlockStart(): boolean {
    const selection = this.syncFromDOM();
    if (!selection) return false;
    return selection.anchorOffset === 0 && selection.focusOffset === 0;
  }

  /**
   * 检查当前选区是否在块的末尾
   */
  isAtBlockEnd(blockId: string): boolean {
    const container = this.containerGetter();
    if (!container) return false;

    const selection = this.syncFromDOM();
    if (!selection) return false;

    const blockElement = container.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockElement) return false;

    const editableElement = this.findEditableElement(blockElement as HTMLElement);
    if (!editableElement) return false;

    const textLength = editableElement.textContent?.length || 0;
    return selection.focusOffset === textLength;
  }

  /**
   * 检查选区是否是折叠的（光标状态）
   */
  isCollapsed(): boolean {
    const selection = this.syncFromDOM();
    if (!selection) return true;
    return selection.anchorBlockId === selection.focusBlockId && 
           selection.anchorOffset === selection.focusOffset;
  }
}

