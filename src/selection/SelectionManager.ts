/**
 * Selection Layer - 选区管理器
 * 管理抽象选区状态
 */

import type {
  Selection,
  SelectionState,
  SelectionEvent,
  SelectionEventType,
  SelectionAction,
  TextPoint,
  CaretSelection,
  TextRangeSelection,
  BlockSelection,
  CrossBlockSelection,
  SelectionRange,
  SelectionContent,
} from './types';
import type { Document, Block, RichText } from '../model/types';
import * as DocOps from '../model/Document';

type SelectionListener = (event: SelectionEvent) => void;

/**
 * 选区管理器
 */
export class SelectionManager {
  private state: SelectionState = {
    selection: null,
    isActive: false,
    previousSelection: null,
  };

  private listeners: SelectionListener[] = [];

  /**
   * 获取当前选区
   */
  getSelection(): Selection | null {
    return this.state.selection;
  }

  /**
   * 获取选区状态
   */
  getState(): SelectionState {
    return { ...this.state };
  }

  /**
   * 设置选区
   */
  setSelection(selection: Selection | null): void {
    if (this.selectionsEqual(this.state.selection, selection)) {
      return;
    }

    const previousSelection = this.state.selection;
    this.state = {
      ...this.state,
      selection,
      previousSelection,
    };

    this.emit({
      type: 'selection:change',
      selection,
      previousSelection,
      timestamp: Date.now(),
    });
  }

  /**
   * 应用选区操作
   */
  applyAction(action: SelectionAction, doc: Document): void {
    switch (action.type) {
      case 'set':
        this.setSelection(action.selection);
        break;

      case 'collapse':
        this.collapse(action.to);
        break;

      case 'extend':
        this.extend(action.direction, action.unit, doc);
        break;

      case 'selectAll':
        this.selectAll(action.scope, doc);
        break;

      case 'selectBlock':
        this.selectBlock(action.blockId);
        break;

      case 'selectBlocks':
        this.selectBlocks(action.blockIds);
        break;

      case 'clear':
        this.clear();
        break;
    }
  }

  /**
   * 创建光标选区
   */
  createCaret(blockId: string, itemIndex: number = 0, charOffset: number = 0): CaretSelection {
    return {
      type: 'caret',
      point: { blockId, itemIndex, charOffset },
    };
  }

  /**
   * 创建文本范围选区
   */
  createTextRange(
    anchor: TextPoint,
    focus: TextPoint
  ): TextRangeSelection | CaretSelection {
    if (this.pointsEqual(anchor, focus)) {
      return { type: 'caret', point: anchor };
    }

    const isForward = this.comparePoints(anchor, focus) < 0;
    return {
      type: 'text-range',
      anchor,
      focus,
      isForward,
    };
  }

  /**
   * 创建块选区
   */
  createBlockSelection(blockIds: string[]): BlockSelection {
    return {
      type: 'block',
      blockIds: [...blockIds],
    };
  }

  /**
   * 创建跨块选区
   */
  createCrossBlockSelection(
    anchor: TextPoint,
    focus: TextPoint,
    doc: Document
  ): CrossBlockSelection | TextRangeSelection | CaretSelection {
    if (anchor.blockId === focus.blockId) {
      return this.createTextRange(anchor, focus);
    }

    const flatBlocks = DocOps.getFlattenedBlocks(doc);
    const blockIds = flatBlocks.map(b => b.id);
    
    const anchorIndex = blockIds.indexOf(anchor.blockId);
    const focusIndex = blockIds.indexOf(focus.blockId);

    if (anchorIndex === -1 || focusIndex === -1) {
      return { type: 'caret', point: anchor };
    }

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
   * 折叠选区
   */
  collapse(to: 'anchor' | 'focus' | 'start' | 'end'): void {
    const sel = this.state.selection;
    if (!sel) return;

    let point: TextPoint;

    switch (sel.type) {
      case 'caret':
        return; // 已经折叠

      case 'text-range':
        if (to === 'anchor' || to === 'start') {
          point = sel.isForward ? sel.anchor : sel.focus;
        } else {
          point = sel.isForward ? sel.focus : sel.anchor;
        }
        this.setSelection({ type: 'caret', point });
        break;

      case 'cross-block':
        if (to === 'anchor' || to === 'start') {
          point = sel.isForward ? sel.anchor : sel.focus;
        } else {
          point = sel.isForward ? sel.focus : sel.anchor;
        }
        this.setSelection({ type: 'caret', point });
        break;

      case 'block':
        // 块选区折叠到第一个或最后一个块
        const blockId = to === 'start' || to === 'anchor'
          ? sel.blockIds[0]
          : sel.blockIds[sel.blockIds.length - 1];
        this.setSelection({
          type: 'caret',
          point: { blockId, itemIndex: 0, charOffset: 0 },
        });
        break;
    }
  }

  /**
   * 扩展选区
   */
  extend(
    direction: 'forward' | 'backward' | 'up' | 'down',
    unit: 'character' | 'word' | 'line' | 'block' | 'all',
    doc: Document
  ): void {
    const sel = this.state.selection;
    if (!sel) return;

    // TODO: 实现完整的扩展逻辑
    // 这里只是基础实现
  }

  /**
   * 全选
   */
  selectAll(scope: 'block' | 'document', doc: Document): void {
    const sel = this.state.selection;

    if (scope === 'document') {
      const flatBlocks = DocOps.getFlattenedBlocks(doc);
      if (flatBlocks.length === 0) return;

      if (flatBlocks.length === 1) {
        const block = flatBlocks[0];
        const content = block.data.content || [];
        const lastItem = content.length - 1;
        const lastOffset = content[lastItem]?.type === 'text' 
          ? content[lastItem].text.length 
          : 1;

        this.setSelection({
          type: 'text-range',
          anchor: { blockId: block.id, itemIndex: 0, charOffset: 0 },
          focus: { blockId: block.id, itemIndex: Math.max(0, lastItem), charOffset: lastOffset },
          isForward: true,
        });
      } else {
        // 多块全选
        this.setSelection({
          type: 'block',
          blockIds: flatBlocks.map(b => b.id),
        });
      }
    } else if (scope === 'block' && sel) {
      // 选择当前块的全部内容
      const blockId = this.getAnchorBlockId(sel);
      if (!blockId) return;

      const block = DocOps.getBlock(doc, blockId);
      if (!block) return;

      const content = block.data.content || [];
      const lastItem = content.length - 1;
      const lastOffset = content[lastItem]?.type === 'text'
        ? content[lastItem].text.length
        : 1;

      this.setSelection({
        type: 'text-range',
        anchor: { blockId, itemIndex: 0, charOffset: 0 },
        focus: { blockId, itemIndex: Math.max(0, lastItem), charOffset: lastOffset },
        isForward: true,
      });
    }
  }

  /**
   * 选择单个块
   */
  selectBlock(blockId: string): void {
    this.setSelection({
      type: 'block',
      blockIds: [blockId],
    });
  }

  /**
   * 选择多个块
   */
  selectBlocks(blockIds: string[]): void {
    this.setSelection({
      type: 'block',
      blockIds: [...blockIds],
    });
  }

  /**
   * 添加块到选区
   */
  addBlockToSelection(blockId: string): void {
    const sel = this.state.selection;
    
    if (!sel || sel.type !== 'block') {
      this.selectBlock(blockId);
      return;
    }

    if (!sel.blockIds.includes(blockId)) {
      this.setSelection({
        type: 'block',
        blockIds: [...sel.blockIds, blockId],
      });
    }
  }

  /**
   * 从选区移除块
   */
  removeBlockFromSelection(blockId: string): void {
    const sel = this.state.selection;
    
    if (!sel || sel.type !== 'block') return;

    const newBlockIds = sel.blockIds.filter(id => id !== blockId);
    if (newBlockIds.length === 0) {
      this.clear();
    } else {
      this.setSelection({
        type: 'block',
        blockIds: newBlockIds,
      });
    }
  }

  /**
   * 切换块选择状态
   */
  toggleBlockSelection(blockId: string): void {
    const sel = this.state.selection;
    
    if (!sel || sel.type !== 'block') {
      this.selectBlock(blockId);
      return;
    }

    if (sel.blockIds.includes(blockId)) {
      this.removeBlockFromSelection(blockId);
    } else {
      this.addBlockToSelection(blockId);
    }
  }

  /**
   * 清除选区
   */
  clear(): void {
    if (this.state.selection !== null) {
      this.setSelection(null);
      this.emit({
        type: 'selection:clear',
        selection: null,
        previousSelection: this.state.previousSelection,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 设置激活状态
   */
  setActive(isActive: boolean): void {
    this.state.isActive = isActive;
  }

  /**
   * 检查选区是否折叠
   */
  isCollapsed(): boolean {
    const sel = this.state.selection;
    return sel !== null && sel.type === 'caret';
  }

  /**
   * 检查是否有选中内容
   */
  hasSelection(): boolean {
    return this.state.selection !== null && this.state.selection.type !== 'caret';
  }

  /**
   * 检查块是否在选区中
   */
  isBlockSelected(blockId: string): boolean {
    const sel = this.state.selection;
    if (!sel) return false;

    switch (sel.type) {
      case 'caret':
        return sel.point.blockId === blockId;
      case 'text-range':
        return sel.anchor.blockId === blockId;
      case 'block':
        return sel.blockIds.includes(blockId);
      case 'cross-block':
        return (
          sel.anchor.blockId === blockId ||
          sel.focus.blockId === blockId ||
          sel.middleBlockIds.includes(blockId)
        );
      default:
        return false;
    }
  }

  /**
   * 获取选区范围信息
   */
  getRange(doc: Document): SelectionRange | null {
    const sel = this.state.selection;
    if (!sel) return null;

    switch (sel.type) {
      case 'caret':
        return {
          startBlockId: sel.point.blockId,
          startOffset: sel.point.charOffset,
          endBlockId: sel.point.blockId,
          endOffset: sel.point.charOffset,
          blockIds: [sel.point.blockId],
          isCollapsed: true,
        };

      case 'text-range': {
        const [start, end] = sel.isForward
          ? [sel.anchor, sel.focus]
          : [sel.focus, sel.anchor];
        return {
          startBlockId: start.blockId,
          startOffset: start.charOffset,
          endBlockId: end.blockId,
          endOffset: end.charOffset,
          blockIds: [start.blockId],
          isCollapsed: false,
        };
      }

      case 'block':
        return {
          startBlockId: sel.blockIds[0],
          startOffset: 0,
          endBlockId: sel.blockIds[sel.blockIds.length - 1],
          endOffset: 0,
          blockIds: sel.blockIds,
          isCollapsed: false,
        };

      case 'cross-block': {
        const [start, end] = sel.isForward
          ? [sel.anchor, sel.focus]
          : [sel.focus, sel.anchor];
        return {
          startBlockId: start.blockId,
          startOffset: start.charOffset,
          endBlockId: end.blockId,
          endOffset: end.charOffset,
          blockIds: [start.blockId, ...sel.middleBlockIds, end.blockId],
          isCollapsed: false,
        };
      }

      default:
        return null;
    }
  }

  /**
   * 获取选中内容
   */
  getContent(doc: Document): SelectionContent | null {
    const sel = this.state.selection;
    if (!sel) return null;

    const range = this.getRange(doc);
    if (!range) return null;

    const content: SelectionContent = {
      plainText: '',
      richText: new Map(),
      blocks: [],
      isMultiBlock: range.blockIds.length > 1,
    };

    // 收集内容
    range.blockIds.forEach(blockId => {
      const block = DocOps.getBlock(doc, blockId);
      if (!block) return;

      const blockContent = block.data.content || [];
      
      if (sel.type === 'block') {
        // 块选区：完整内容
        content.richText.set(blockId, blockContent);
        content.blocks.push(blockId);
        content.plainText += DocOps.getBlockPlainText(doc, blockId) + '\n';
      } else if (sel.type === 'caret') {
        // 光标：无内容
      } else {
        // 文本/跨块选区：部分内容
        const text = DocOps.getBlockPlainText(doc, blockId);
        
        if (blockId === range.startBlockId && blockId === range.endBlockId) {
          // 同一块
          content.plainText = text.slice(range.startOffset, range.endOffset);
        } else if (blockId === range.startBlockId) {
          content.plainText += text.slice(range.startOffset) + '\n';
        } else if (blockId === range.endBlockId) {
          content.plainText += text.slice(0, range.endOffset);
        } else {
          content.plainText += text + '\n';
        }
      }
    });

    return content;
  }

  /**
   * 订阅选区变化
   */
  subscribe(listener: SelectionListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * 发送事件
   */
  private emit(event: SelectionEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Selection listener error:', error);
      }
    });
  }

  /**
   * 获取锚点块 ID
   */
  private getAnchorBlockId(sel: Selection): string | null {
    switch (sel.type) {
      case 'caret':
        return sel.point.blockId;
      case 'text-range':
      case 'cross-block':
        return sel.anchor.blockId;
      case 'block':
        return sel.blockIds[0] || null;
      default:
        return null;
    }
  }

  /**
   * 比较两个点是否相等
   */
  private pointsEqual(a: TextPoint, b: TextPoint): boolean {
    return (
      a.blockId === b.blockId &&
      a.itemIndex === b.itemIndex &&
      a.charOffset === b.charOffset
    );
  }

  /**
   * 比较两个点的顺序
   */
  private comparePoints(a: TextPoint, b: TextPoint): number {
    if (a.blockId !== b.blockId) {
      // 需要文档上下文来比较不同块的顺序
      return 0;
    }
    if (a.itemIndex !== b.itemIndex) {
      return a.itemIndex - b.itemIndex;
    }
    return a.charOffset - b.charOffset;
  }

  /**
   * 比较两个选区是否相等
   */
  private selectionsEqual(a: Selection | null, b: Selection | null): boolean {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.type !== b.type) return false;

    switch (a.type) {
      case 'caret':
        return this.pointsEqual(a.point, (b as CaretSelection).point);

      case 'text-range': {
        const bRange = b as TextRangeSelection;
        return (
          this.pointsEqual(a.anchor, bRange.anchor) &&
          this.pointsEqual(a.focus, bRange.focus)
        );
      }

      case 'block': {
        const bBlock = b as BlockSelection;
        return (
          a.blockIds.length === bBlock.blockIds.length &&
          a.blockIds.every((id, i) => id === bBlock.blockIds[i])
        );
      }

      case 'cross-block': {
        const bCross = b as CrossBlockSelection;
        return (
          this.pointsEqual(a.anchor, bCross.anchor) &&
          this.pointsEqual(a.focus, bCross.focus) &&
          a.middleBlockIds.length === bCross.middleBlockIds.length &&
          a.middleBlockIds.every((id, i) => id === bCross.middleBlockIds[i])
        );
      }

      default:
        return false;
    }
  }
}

/**
 * 创建选区管理器
 */
export function createSelectionManager(): SelectionManager {
  return new SelectionManager();
}


