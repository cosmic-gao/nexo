/**
 * Logic Layer - EditorController 编辑器控制器
 * 平台无关的编辑器核心逻辑
 */

import type { Document, Block, BlockType, BlockData, Selection } from '../model/types';
import * as DocOps from '../model/Document';
import { EventBus } from './EventBus';
import { CommandManager, Commands } from './CommandManager';
import { SelectionManager } from './SelectionManager';

export interface EditorControllerConfig {
  initialDocument?: Document;
  maxHistory?: number;
}

export class EditorController {
  private document: Document;
  private eventBus: EventBus;
  private commandManager: CommandManager;
  private selectionManager: SelectionManager;

  constructor(config: EditorControllerConfig = {}) {
    this.eventBus = new EventBus();
    
    // 初始化文档
    if (config.initialDocument) {
      this.document = config.initialDocument;
    } else {
      this.document = DocOps.createDocument('Untitled');
      // 创建默认空段落
      const result = DocOps.createBlock(this.document, 'paragraph');
      this.document = result.doc;
    }

    // 初始化命令管理器
    this.commandManager = new CommandManager(
      {
        getDocument: () => this.document,
        setDocument: (doc) => this.setDocument(doc),
        eventBus: this.eventBus,
      },
      config.maxHistory
    );

    // 初始化选区管理器
    this.selectionManager = new SelectionManager({
      getDocument: () => this.document,
      eventBus: this.eventBus,
    });
  }

  // ============================================
  // Document Operations
  // ============================================

  getDocument(): Document {
    return this.document;
  }

  private setDocument(doc: Document): void {
    const previous = this.document;
    this.document = doc;
    this.eventBus.emit('document:changed', { previous, current: doc });
  }

  // ============================================
  // Block Operations (with undo/redo support)
  // ============================================

  getBlock(blockId: string): Block | undefined {
    return DocOps.getBlock(this.document, blockId);
  }

  getBlocks(): Block[] {
    return DocOps.getRootBlocks(this.document);
  }

  createBlock(type: BlockType, data: BlockData = {}, afterBlockId?: string): Block | null {
    const cmd = Commands.createBlock(type, data, afterBlockId);
    this.commandManager.execute(
      cmd.type,
      cmd.execute,
      cmd.createInverse
    );
    
    const blockId = cmd.getCreatedBlockId();
    return blockId ? this.getBlock(blockId) || null : null;
  }

  updateBlock(blockId: string, data: Partial<BlockData>): void {
    const cmd = Commands.updateBlock(blockId, data);
    this.commandManager.execute(
      cmd.type,
      cmd.execute,
      cmd.createInverse
    );
  }

  /**
   * 直接更新块（不记录历史，用于实时输入）
   */
  updateBlockDirect(blockId: string, data: Partial<BlockData>): void {
    this.document = DocOps.updateBlock(this.document, blockId, data);
    this.eventBus.emit('block:updated', { blockId, data });
  }

  deleteBlock(blockId: string): void {
    const cmd = Commands.deleteBlock(blockId);
    this.commandManager.execute(
      cmd.type,
      cmd.execute,
      cmd.createInverse
    );
  }

  changeBlockType(blockId: string, newType: BlockType): void {
    const cmd = Commands.changeBlockType(blockId, newType);
    this.commandManager.execute(
      cmd.type,
      cmd.execute,
      cmd.createInverse
    );
  }

  moveBlock(blockId: string, targetBlockId: string, position: 'before' | 'after'): void {
    const cmd = Commands.moveBlock(blockId, targetBlockId, position);
    this.commandManager.execute(
      cmd.type,
      cmd.execute,
      cmd.createInverse
    );
  }

  splitBlock(blockId: string, offset: number): Block | null {
    const cmd = Commands.splitBlock(blockId, offset);
    this.commandManager.execute(
      cmd.type,
      cmd.execute,
      cmd.createInverse
    );
    
    const newBlockId = cmd.getNewBlockId();
    return newBlockId ? this.getBlock(newBlockId) || null : null;
  }

  mergeBlocks(sourceBlockId: string, targetBlockId: string): void {
    const cmd = Commands.mergeBlocks(sourceBlockId, targetBlockId);
    this.commandManager.execute(
      cmd.type,
      cmd.execute,
      cmd.createInverse
    );
  }

  // ============================================
  // Selection Operations
  // ============================================

  getSelection(): Selection | null {
    return this.selectionManager.getSelection();
  }

  setSelection(selection: Selection): void {
    this.selectionManager.setSelection(selection);
  }

  setCursor(blockId: string, offset: number): void {
    this.selectionManager.setCursor(blockId, offset);
  }

  setCursorToStart(blockId: string): void {
    this.selectionManager.setCursorToStart(blockId);
  }

  setCursorToEnd(blockId: string): void {
    this.selectionManager.setCursorToEnd(blockId);
  }

  isAtBlockStart(): boolean {
    return this.selectionManager.isAtBlockStart();
  }

  isAtBlockEnd(): boolean {
    return this.selectionManager.isAtBlockEnd();
  }

  getCurrentBlockId(): string | null {
    return this.selectionManager.getCurrentBlockId();
  }

  // ============================================
  // History Operations
  // ============================================

  undo(): boolean {
    return this.commandManager.undo();
  }

  redo(): boolean {
    return this.commandManager.redo();
  }

  canUndo(): boolean {
    return this.commandManager.canUndo();
  }

  canRedo(): boolean {
    return this.commandManager.canRedo();
  }

  // ============================================
  // Event Operations
  // ============================================

  on<T>(type: import('../model/types').EventType, handler: (event: import('../model/types').EditorEvent<T>) => void): () => void {
    return this.eventBus.on(type, handler);
  }

  off<T>(type: import('../model/types').EventType, handler: (event: import('../model/types').EditorEvent<T>) => void): void {
    this.eventBus.off(type, handler);
  }

  emit<T>(type: import('../model/types').EventType, payload: T): void {
    this.eventBus.emit(type, payload);
  }

  // ============================================
  // Serialization
  // ============================================

  toJSON(): Document {
    return this.document;
  }

  fromJSON(doc: Document): void {
    this.setDocument(doc);
    this.commandManager.clear();
  }

  // ============================================
  // Cleanup
  // ============================================

  destroy(): void {
    this.eventBus.clear();
    this.commandManager.clear();
  }
}


