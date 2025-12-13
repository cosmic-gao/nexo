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

    // 检查最后一个子节点是否是 BR（占位符）
    const lastChildIsBR = editableElement.lastChild?.nodeName === 'BR';

    // 遍历所有节点（包括文本和 BR 元素），计算正确的偏移量
    let totalOffset = 0;
    let found = false;

    const walk = (current: Node, isLast: boolean): boolean => {
      if (found) return true;

      if (current === node) {
        // 找到目标节点
        if (current.nodeType === Node.TEXT_NODE) {
          totalOffset += offset;
        } else if (current.nodeType === Node.ELEMENT_NODE) {
          // 如果光标在元素内，计算前 offset 个子节点的长度
          const children = Array.from(current.childNodes);
          for (let i = 0; i < offset && i < children.length; i++) {
            const isLastChild = isLast && i === children.length - 1;
            totalOffset += this.getNodeTextLength(children[i], isLastChild && lastChildIsBR);
          }
        }
        found = true;
        return true;
      }

      if (current.nodeType === Node.TEXT_NODE) {
        totalOffset += current.textContent?.length || 0;
      } else if (current.nodeType === Node.ELEMENT_NODE) {
        const el = current as HTMLElement;
        // <br> 计为一个换行符，但最后一个 BR 是占位符不计入
        if (el.tagName === 'BR') {
          if (!(isLast && lastChildIsBR)) {
            totalOffset += 1;
          }
        } else {
          // 递归处理子节点
          const children = Array.from(current.childNodes);
          for (let i = 0; i < children.length; i++) {
            const isLastChild = isLast && i === children.length - 1;
            if (walk(children[i], isLastChild)) return true;
          }
        }
      }

      return false;
    };

    const children = Array.from(editableElement.childNodes);
    for (let i = 0; i < children.length; i++) {
      const isLastChild = i === children.length - 1;
      if (walk(children[i], isLastChild)) break;
    }

    return totalOffset;
  }

  /**
   * 获取节点的文本长度（包括 BR 作为换行符）
   * @param skipIfLastBR 如果为 true 且节点是 BR，则不计入长度
   */
  private getNodeTextLength(node: Node, skipIfLastBR: boolean = false): number {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.length || 0;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      if (el.tagName === 'BR') {
        // 如果是最后一个 BR 且标记为跳过，不计入长度
        return skipIfLastBR ? 0 : 1;
      }
      let length = 0;
      const children = Array.from(node.childNodes);
      for (let i = 0; i < children.length; i++) {
        const isLastChild = i === children.length - 1;
        length += this.getNodeTextLength(children[i], skipIfLastBR && isLastChild);
      }
      return length;
    }
    return 0;
  }

  private resolveOffset(element: HTMLElement, offset: number): { node: Node; offset: number } {
    let currentOffset = 0;
    let result: { node: Node; offset: number } | null = null;

    const walk = (current: Node): boolean => {
      if (result) return true;

      if (current.nodeType === Node.TEXT_NODE) {
        const nodeLength = current.textContent?.length || 0;
        if (currentOffset + nodeLength >= offset) {
          result = { node: current, offset: offset - currentOffset };
          return true;
        }
        currentOffset += nodeLength;
      } else if (current.nodeType === Node.ELEMENT_NODE) {
        const el = current as HTMLElement;
        if (el.tagName === 'BR') {
          // <br> 计为一个换行符
          if (currentOffset + 1 >= offset) {
            // 光标应该在 <br> 之后，返回父节点中 <br> 的下一个位置
            const parent = el.parentNode;
            if (parent) {
              const index = Array.from(parent.childNodes).indexOf(el);
              result = { node: parent, offset: index + 1 };
              return true;
            }
          }
          currentOffset += 1;
        } else {
          // 递归处理子节点
          for (const child of Array.from(current.childNodes)) {
            if (walk(child)) return true;
          }
        }
      }
      return false;
    };

    walk(element);

    if (result) {
      return result;
    }

    // 如果没有找到合适的位置，放在末尾
    if (!element.firstChild) {
      const textNode = document.createTextNode('');
      element.appendChild(textNode);
      return { node: textNode, offset: 0 };
    }

    // 返回最后一个位置
    return { node: element, offset: element.childNodes.length };
  }
}
