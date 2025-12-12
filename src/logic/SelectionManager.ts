/**
 * Logic Layer - SelectionManager 选区管理器
 * 平台无关的选区状态管理（兼容层）
 */

import type { Document, Block } from '../model/types';
import type { 
  Selection as AbstractSelection, 
  TextPoint,
  CaretSelection,
} from '../selection/types';
import { EventBus } from './EventBus';
import * as DocOps from '../model/Document';

// 简化的选区点（兼容旧代码）
export interface SelectionPoint {
  blockId: string;
  offset: number;
}

// 简化的选区（兼容旧代码）
export interface SimpleSelection {
  anchor: SelectionPoint;
  focus: SelectionPoint;
  isCollapsed: boolean;
}

export interface SelectionContext {
  getDocument: () => Document;
  eventBus: EventBus;
}

export class SelectionManager {
  private selection: SimpleSelection | null = null;
  private context: SelectionContext;

  constructor(context: SelectionContext) {
    this.context = context;
  }

  /**
   * 获取当前选区
   */
  getSelection(): SimpleSelection | null {
    return this.selection;
  }

  /**
   * 设置选区
   */
  setSelection(selection: SimpleSelection | null): void {
    const previous = this.selection;
    this.selection = selection;
    
    if (this.hasSelectionChanged(previous, selection)) {
      this.context.eventBus.emit('selection:changed', {
        previous,
        current: selection,
      });
    }
  }

  /**
   * 设置光标位置（折叠选区）
   */
  setCursor(blockId: string, offset: number): void {
    this.setSelection({
      anchor: { blockId, offset },
      focus: { blockId, offset },
      isCollapsed: true,
    });
  }

  /**
   * 设置光标到块开头
   */
  setCursorToStart(blockId: string): void {
    this.setCursor(blockId, 0);
  }

  /**
   * 设置光标到块末尾
   */
  setCursorToEnd(blockId: string): void {
    const doc = this.context.getDocument();
    const block = DocOps.getBlock(doc, blockId);
    const textLength = DocOps.getBlockPlainText(doc, blockId).length;
    this.setCursor(blockId, textLength);
  }

  /**
   * 扩展选区
   */
  extendSelection(focus: SelectionPoint): void {
    if (!this.selection) return;

    this.setSelection({
      anchor: this.selection.anchor,
      focus,
      isCollapsed: 
        this.selection.anchor.blockId === focus.blockId &&
        this.selection.anchor.offset === focus.offset,
    });
  }

  /**
   * 是否在块开头
   */
  isAtBlockStart(): boolean {
    if (!this.selection || !this.selection.isCollapsed) return false;
    return this.selection.anchor.offset === 0;
  }

  /**
   * 是否在块末尾
   */
  isAtBlockEnd(): boolean {
    if (!this.selection || !this.selection.isCollapsed) return false;
    
    const doc = this.context.getDocument();
    const textLength = DocOps.getBlockPlainText(doc, this.selection.anchor.blockId).length;
    
    return this.selection.anchor.offset === textLength;
  }

  /**
   * 获取当前块 ID
   */
  getCurrentBlockId(): string | null {
    return this.selection?.anchor.blockId || null;
  }

  /**
   * 移动到上一个块
   */
  moveToPreviousBlock(): boolean {
    if (!this.selection) return false;

    const doc = this.context.getDocument();
    const prevBlock = DocOps.getPreviousSibling(doc, this.selection.anchor.blockId);
    
    if (prevBlock) {
      this.setCursorToEnd(prevBlock.id);
      return true;
    }
    return false;
  }

  /**
   * 移动到下一个块
   */
  moveToNextBlock(): boolean {
    if (!this.selection) return false;

    const doc = this.context.getDocument();
    const nextBlock = DocOps.getNextSibling(doc, this.selection.anchor.blockId);
    
    if (nextBlock) {
      this.setCursorToStart(nextBlock.id);
      return true;
    }
    return false;
  }

  /**
   * 清除选区
   */
  clear(): void {
    this.setSelection(null);
  }

  /**
   * 转换为抽象选区
   */
  toAbstractSelection(): AbstractSelection | null {
    if (!this.selection) return null;

    if (this.selection.isCollapsed) {
      return {
        type: 'caret',
        point: {
          blockId: this.selection.anchor.blockId,
          itemIndex: 0,
          charOffset: this.selection.anchor.offset,
        },
      };
    }

    return {
      type: 'text-range',
      anchor: {
        blockId: this.selection.anchor.blockId,
        itemIndex: 0,
        charOffset: this.selection.anchor.offset,
      },
      focus: {
        blockId: this.selection.focus.blockId,
        itemIndex: 0,
        charOffset: this.selection.focus.offset,
      },
      isForward: true,
    };
  }

  /**
   * 从抽象选区设置
   */
  fromAbstractSelection(sel: AbstractSelection | null): void {
    if (!sel) {
      this.setSelection(null);
      return;
    }

    switch (sel.type) {
      case 'caret':
        this.setCursor(sel.point.blockId, sel.point.charOffset);
        break;
      case 'text-range':
        this.setSelection({
          anchor: { blockId: sel.anchor.blockId, offset: sel.anchor.charOffset },
          focus: { blockId: sel.focus.blockId, offset: sel.focus.charOffset },
          isCollapsed: false,
        });
        break;
      case 'cross-block':
        this.setSelection({
          anchor: { blockId: sel.anchor.blockId, offset: sel.anchor.charOffset },
          focus: { blockId: sel.focus.blockId, offset: sel.focus.charOffset },
          isCollapsed: false,
        });
        break;
      case 'block':
        if (sel.blockIds.length > 0) {
          this.setCursor(sel.blockIds[0], 0);
        }
        break;
    }
  }

  /**
   * 检查选区是否改变
   */
  private hasSelectionChanged(a: SimpleSelection | null, b: SimpleSelection | null): boolean {
    if (a === b) return false;
    if (!a || !b) return true;
    
    return (
      a.anchor.blockId !== b.anchor.blockId ||
      a.anchor.offset !== b.anchor.offset ||
      a.focus.blockId !== b.focus.blockId ||
      a.focus.offset !== b.focus.offset
    );
  }
}
