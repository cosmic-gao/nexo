/**
 * Selection Layer - DOM 选区桥接
 * 将抽象选区与 DOM Selection 同步
 */

import type {
  Selection,
  TextPoint,
  CaretSelection,
  TextRangeSelection,
  CrossBlockSelection,
} from './types';
import type { Document, RichText } from '../model/types';
import * as DocOps from '../model/Document';
import { getAbsoluteOffset, absoluteOffsetToPoint } from './SelectionOperations';

/**
 * DOM 选区桥接器
 */
export class DOMSelectionBridge {
  private container: HTMLElement;
  private isUpdating: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * 从 DOM Selection 读取抽象选区
   */
  readFromDOM(doc: Document): Selection | null {
    const domSelection = window.getSelection();
    if (!domSelection || domSelection.rangeCount === 0) {
      return null;
    }

    const range = domSelection.getRangeAt(0);
    
    // 获取锚点
    const anchor = this.domPointToTextPoint(
      domSelection.anchorNode,
      domSelection.anchorOffset,
      doc
    );
    
    // 获取焦点
    const focus = this.domPointToTextPoint(
      domSelection.focusNode,
      domSelection.focusOffset,
      doc
    );

    if (!anchor || !focus) {
      return null;
    }

    // 判断选区类型
    if (this.pointsEqual(anchor, focus)) {
      return {
        type: 'caret',
        point: anchor,
      };
    }

    if (anchor.blockId === focus.blockId) {
      return {
        type: 'text-range',
        anchor,
        focus,
        isForward: this.isSelectionForward(domSelection),
      };
    }

    // 跨块选区
    const flatBlocks = DocOps.getFlattenedBlocks(doc);
    const blockIds = flatBlocks.map(b => b.id);
    const anchorIndex = blockIds.indexOf(anchor.blockId);
    const focusIndex = blockIds.indexOf(focus.blockId);
    const isForward = anchorIndex < focusIndex;
    const [startIndex, endIndex] = isForward
      ? [anchorIndex, focusIndex]
      : [focusIndex, anchorIndex];
    const middleBlockIds = blockIds.slice(startIndex + 1, endIndex);

    return {
      type: 'cross-block',
      anchor,
      focus,
      middleBlockIds,
      isForward,
    };
  }

  /**
   * 将抽象选区写入 DOM
   */
  writeToDOM(selection: Selection | null, doc: Document): void {
    if (this.isUpdating) return;
    this.isUpdating = true;

    try {
      const domSelection = window.getSelection();
      if (!domSelection) return;

      if (!selection) {
        domSelection.removeAllRanges();
        return;
      }

      switch (selection.type) {
        case 'caret':
          this.writeCaretToDOM(selection, domSelection, doc);
          break;
        case 'text-range':
          this.writeTextRangeToDOM(selection, domSelection, doc);
          break;
        case 'cross-block':
          this.writeCrossBlockToDOM(selection, domSelection, doc);
          break;
        case 'block':
          // 块选区不需要 DOM 选区
          domSelection.removeAllRanges();
          break;
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 写入光标
   */
  private writeCaretToDOM(
    selection: CaretSelection,
    domSelection: globalThis.Selection,
    doc: Document
  ): void {
    const domPoint = this.textPointToDOMPoint(selection.point, doc);
    if (!domPoint) return;

    const range = document.createRange();
    range.setStart(domPoint.node, domPoint.offset);
    range.collapse(true);

    domSelection.removeAllRanges();
    domSelection.addRange(range);
  }

  /**
   * 写入文本范围选区
   */
  private writeTextRangeToDOM(
    selection: TextRangeSelection,
    domSelection: globalThis.Selection,
    doc: Document
  ): void {
    const anchorPoint = this.textPointToDOMPoint(selection.anchor, doc);
    const focusPoint = this.textPointToDOMPoint(selection.focus, doc);

    if (!anchorPoint || !focusPoint) return;

    const range = document.createRange();

    if (selection.isForward) {
      range.setStart(anchorPoint.node, anchorPoint.offset);
      range.setEnd(focusPoint.node, focusPoint.offset);
    } else {
      range.setStart(focusPoint.node, focusPoint.offset);
      range.setEnd(anchorPoint.node, anchorPoint.offset);
    }

    domSelection.removeAllRanges();
    domSelection.addRange(range);

    // 如果是向后选择，需要反转选区
    if (!selection.isForward) {
      domSelection.extend(anchorPoint.node, anchorPoint.offset);
    }
  }

  /**
   * 写入跨块选区
   */
  private writeCrossBlockToDOM(
    selection: CrossBlockSelection,
    domSelection: globalThis.Selection,
    doc: Document
  ): void {
    const anchorPoint = this.textPointToDOMPoint(selection.anchor, doc);
    const focusPoint = this.textPointToDOMPoint(selection.focus, doc);

    if (!anchorPoint || !focusPoint) return;

    const range = document.createRange();

    if (selection.isForward) {
      range.setStart(anchorPoint.node, anchorPoint.offset);
      range.setEnd(focusPoint.node, focusPoint.offset);
    } else {
      range.setStart(focusPoint.node, focusPoint.offset);
      range.setEnd(anchorPoint.node, anchorPoint.offset);
    }

    domSelection.removeAllRanges();
    domSelection.addRange(range);

    if (!selection.isForward) {
      domSelection.extend(anchorPoint.node, anchorPoint.offset);
    }
  }

  /**
   * DOM 点转换为 TextPoint
   */
  private domPointToTextPoint(
    node: Node | null,
    offset: number,
    doc: Document
  ): TextPoint | null {
    if (!node) return null;

    // 找到包含此节点的块元素
    const blockElement = this.findBlockElement(node);
    if (!blockElement) return null;

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return null;

    const block = DocOps.getBlock(doc, blockId);
    if (!block) return null;

    // 找到可编辑区域
    const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editableElement) return null;

    // 计算在可编辑区域中的偏移
    const absoluteOffset = this.calculateOffset(editableElement, node, offset);
    
    // 转换为 TextPoint
    const content = block.data.content || [];
    return absoluteOffsetToPoint(blockId, absoluteOffset, content);
  }

  /**
   * TextPoint 转换为 DOM 点
   */
  private textPointToDOMPoint(
    point: TextPoint,
    doc: Document
  ): { node: Node; offset: number } | null {
    const block = DocOps.getBlock(doc, point.blockId);
    if (!block) return null;

    const blockElement = this.container.querySelector(
      `[data-block-id="${point.blockId}"]`
    ) as HTMLElement;
    if (!blockElement) return null;

    const editableElement = blockElement.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editableElement) return null;

    const content = block.data.content || [];
    const absoluteOffset = getAbsoluteOffset(point, content);

    return this.findDOMPoint(editableElement, absoluteOffset);
  }

  /**
   * 找到块元素
   */
  private findBlockElement(node: Node): HTMLElement | null {
    let current: Node | null = node;
    
    while (current && current !== this.container) {
      if (current instanceof HTMLElement && current.dataset.blockId) {
        return current;
      }
      current = current.parentNode;
    }
    
    return null;
  }

  /**
   * 计算偏移量
   */
  private calculateOffset(
    container: HTMLElement,
    targetNode: Node,
    targetOffset: number
  ): number {
    let offset = 0;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node = walker.nextNode();
    while (node) {
      if (node === targetNode) {
        return offset + targetOffset;
      }
      offset += node.textContent?.length || 0;
      node = walker.nextNode();
    }

    return offset;
  }

  /**
   * 在 DOM 中找到指定偏移的位置
   */
  private findDOMPoint(
    container: HTMLElement,
    targetOffset: number
  ): { node: Node; offset: number } | null {
    if (container.childNodes.length === 0) {
      return { node: container, offset: 0 };
    }

    let offset = 0;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node = walker.nextNode();
    while (node) {
      const length = node.textContent?.length || 0;
      
      if (offset + length >= targetOffset) {
        return { node, offset: targetOffset - offset };
      }
      
      offset += length;
      node = walker.nextNode();
    }

    // 返回最后一个位置
    const lastChild = container.lastChild;
    if (lastChild) {
      if (lastChild.nodeType === Node.TEXT_NODE) {
        return { node: lastChild, offset: lastChild.textContent?.length || 0 };
      }
    }

    return { node: container, offset: container.childNodes.length };
  }

  /**
   * 判断选区方向
   */
  private isSelectionForward(domSelection: globalThis.Selection): boolean {
    if (!domSelection.anchorNode || !domSelection.focusNode) {
      return true;
    }

    const position = domSelection.anchorNode.compareDocumentPosition(domSelection.focusNode);

    if (position === 0) {
      // 同一节点
      return domSelection.anchorOffset <= domSelection.focusOffset;
    }

    return (position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  }

  /**
   * 比较两个点
   */
  private pointsEqual(a: TextPoint, b: TextPoint): boolean {
    return (
      a.blockId === b.blockId &&
      a.itemIndex === b.itemIndex &&
      a.charOffset === b.charOffset
    );
  }

  /**
   * 更新容器
   */
  setContainer(container: HTMLElement): void {
    this.container = container;
  }
}

/**
 * 创建 DOM 选区桥接器
 */
export function createDOMSelectionBridge(container: HTMLElement): DOMSelectionBridge {
  return new DOMSelectionBridge(container);
}


