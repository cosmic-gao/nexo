/**
 * Logic Layer - SelectionManager 选区管理器
 * 平台无关的选区状态管理
 */

import type { Selection, SelectionPoint, Document } from '../model/types';
import { EventBus } from './EventBus';
import * as DocOps from '../model/Document';

export interface SelectionContext {
  getDocument: () => Document;
  eventBus: EventBus;
}

export class SelectionManager {
  private selection: Selection | null = null;
  private context: SelectionContext;

  constructor(context: SelectionContext) {
    this.context = context;
  }

  /**
   * 获取当前选区
   */
  getSelection(): Selection | null {
    return this.selection;
  }

  /**
   * 设置选区
   */
  setSelection(selection: Selection | null): void {
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
    const textLength = block?.data.text?.length || 0;
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
    const block = DocOps.getBlock(doc, this.selection.anchor.blockId);
    const textLength = block?.data.text?.length || 0;
    
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
    const prevBlock = DocOps.getPreviousBlock(doc, this.selection.anchor.blockId);
    
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
    const nextBlock = DocOps.getNextBlock(doc, this.selection.anchor.blockId);
    
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
   * 检查选区是否改变
   */
  private hasSelectionChanged(a: Selection | null, b: Selection | null): boolean {
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


