/**
 * Renderer Layer - DOMSelectionAdapter
 * DOM 平台的选区适配器
 */

import type { EditorController } from '../../logic/EditorController';
import type { SelectionAdapter } from '../types';

// 使用 logic 层的简化选区类型
export interface SelectionPoint {
  blockId: string;
  offset: number;
}

export interface SimpleSelection {
  anchor: SelectionPoint;
  focus: SelectionPoint;
  isCollapsed: boolean;
}

export class DOMSelectionAdapter implements SelectionAdapter {
  private container: HTMLElement;
  private controller: EditorController;

  constructor(container: HTMLElement, controller: EditorController) {
    this.container = container;
    this.controller = controller;
  }

  /**
   * 从 DOM 选区同步到模型
   */
  syncFromPlatform(): SimpleSelection | null {
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      return null;
    }

    const range = domSelection.getRangeAt(0);
    
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

    return {
      anchor: { blockId: anchorBlockId, offset: anchorOffset },
      focus: { blockId: focusBlockId, offset: focusOffset },
      isCollapsed: range.collapsed,
    };
  }

  /**
   * 从模型同步到 DOM 选区
   */
  syncToPlatform(selection: SimpleSelection): void {
    const anchorBlock = this.container.querySelector(`[data-block-id="${selection.anchor.blockId}"]`);
    const focusBlock = this.container.querySelector(`[data-block-id="${selection.focus.blockId}"]`);

    if (!anchorBlock || !focusBlock) return;

    const anchorEditable = this.findEditableElement(anchorBlock as HTMLElement);
    const focusEditable = this.findEditableElement(focusBlock as HTMLElement);

    if (!anchorEditable || !focusEditable) return;

    const range = document.createRange();
    const domSelection = window.getSelection();
    
    if (!domSelection) return;

    try {
      const start = this.resolveOffset(anchorEditable, selection.anchor.offset);
      const end = this.resolveOffset(focusEditable, selection.focus.offset);

      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);

      domSelection.removeAllRanges();
      domSelection.addRange(range);
    } catch (error) {
      console.warn('Failed to set selection:', error);
    }
  }

  /**
   * 聚焦到块
   */
  focusBlock(blockId: string): void {
    const blockElement = this.container.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockElement) return;

    const editableElement = this.findEditableElement(blockElement as HTMLElement);
    if (editableElement) {
      editableElement.focus();
    }
  }

  /**
   * 设置光标位置
   */
  setCursor(blockId: string, offset: number): void {
    this.syncToPlatform({
      anchor: { blockId, offset },
      focus: { blockId, offset },
      isCollapsed: true,
    });
  }

  /**
   * 设置光标到块末尾
   */
  setCursorToEnd(blockId: string): void {
    const blockElement = this.container.querySelector(`[data-block-id="${blockId}"]`);
    if (!blockElement) return;

    const editableElement = this.findEditableElement(blockElement as HTMLElement);
    if (!editableElement) return;

    const textLength = editableElement.textContent?.length || 0;
    this.setCursor(blockId, textLength);
  }

  // ============================================
  // Private Methods
  // ============================================

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

    // 如果没有文本节点，创建一个
    if (!element.firstChild) {
      const textNode = document.createTextNode('');
      element.appendChild(textNode);
      return { node: textNode, offset: 0 };
    }

    return { node: element, offset: 0 };
  }
}
