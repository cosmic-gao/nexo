/**
 * Logic Layer - CommandManager 命令管理器
 * 实现撤销/重做功能，平台无关
 */

import type { Document, Block, BlockType, BlockData } from '../model/types';
import { generateId } from '../model/types';
import * as DocOps from '../model/Document';
import { EventBus } from './EventBus';

// 简化的 Command 接口（逻辑层专用）
export interface LogicCommand {
  id: string;
  type: string;
  timestamp: number;
  _execute?: (doc: Document) => Document;
  _inverse?: (doc: Document) => Document;
}

export interface CommandContext {
  getDocument: () => Document;
  setDocument: (doc: Document) => void;
  eventBus: EventBus;
}

export class CommandManager {
  private undoStack: LogicCommand[] = [];
  private redoStack: LogicCommand[] = [];
  private maxHistory: number;
  private context: CommandContext;

  constructor(context: CommandContext, maxHistory: number = 100) {
    this.context = context;
    this.maxHistory = maxHistory;
  }

  /**
   * 执行命令并记录历史
   */
  execute(
    type: string,
    execute: (doc: Document) => Document,
    createInverse: (beforeDoc: Document, afterDoc: Document) => (doc: Document) => Document
  ): void {
    const beforeDoc = this.context.getDocument();
    const afterDoc = execute(beforeDoc);
    
    const command: LogicCommand = {
      id: generateId(),
      type,
      timestamp: Date.now(),
      _execute: execute,
      _inverse: createInverse(beforeDoc, afterDoc),
    };

    this.context.setDocument(afterDoc);
    
    this.undoStack.push(command);
    this.redoStack = []; // 清空重做栈

    // 限制历史长度
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    this.context.eventBus.emit('command:executed', { command });
  }

  /**
   * 撤销
   */
  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;

    const inverse = command._inverse;
    if (inverse) {
      const currentDoc = this.context.getDocument();
      const restoredDoc = inverse(currentDoc);
      this.context.setDocument(restoredDoc);
    }

    this.redoStack.push(command);
    this.context.eventBus.emit('command:undone', { command });
    
    return true;
  }

  /**
   * 重做
   */
  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;

    const execute = command._execute;
    if (execute) {
      const currentDoc = this.context.getDocument();
      const redoneDoc = execute(currentDoc);
      this.context.setDocument(redoneDoc);
    }

    this.undoStack.push(command);
    this.context.eventBus.emit('command:redone', { command });
    
    return true;
  }

  /**
   * 是否可撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 清空历史
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /**
   * 获取历史长度
   */
  getHistoryLength(): { undo: number; redo: number } {
    return {
      undo: this.undoStack.length,
      redo: this.redoStack.length,
    };
  }
}

// ============================================
// 预定义命令工厂
// ============================================

export const Commands = {
  /**
   * 更新块内容
   */
  updateBlock(blockId: string, data: Partial<BlockData>) {
    return {
      type: 'UPDATE_BLOCK',
      execute: (doc: Document) => DocOps.updateBlock(doc, blockId, data),
      createInverse: (beforeDoc: Document, _afterDoc: Document) => {
        const originalData = beforeDoc.blocks[blockId]?.data;
        return (doc: Document) => DocOps.updateBlock(doc, blockId, originalData || {});
      },
    };
  },

  /**
   * 创建块
   */
  createBlock(
    type: BlockType,
    data: BlockData = {},
    afterBlockId?: string
  ) {
    let createdBlockId: string | null = null;
    
    return {
      type: 'CREATE_BLOCK',
      execute: (doc: Document) => {
        if (afterBlockId) {
          const result = DocOps.createBlockAfter(doc, type, data, afterBlockId);
          createdBlockId = result.block.id;
          return result.doc;
        } else {
          const result = DocOps.createBlock(doc, type, data);
          createdBlockId = result.block.id;
          return result.doc;
        }
      },
      createInverse: () => {
        return (doc: Document) => {
          if (createdBlockId) {
            return DocOps.deleteBlock(doc, createdBlockId);
          }
          return doc;
        };
      },
      getCreatedBlockId: () => createdBlockId,
    };
  },

  /**
   * 删除块
   */
  deleteBlock(blockId: string) {
    let deletedBlock: Block | null = null;
    let deletedIndex: number = -1;
    let parentId: string | null = null;

    return {
      type: 'DELETE_BLOCK',
      execute: (doc: Document) => {
        deletedBlock = doc.blocks[blockId] || null;
        parentId = deletedBlock?.parentId || null;
        deletedIndex = doc.rootIds.indexOf(blockId);
        return DocOps.deleteBlock(doc, blockId);
      },
      createInverse: (_beforeDoc: Document) => {
        return (doc: Document) => {
          if (deletedBlock) {
            return DocOps.insertBlock(doc, deletedBlock, parentId, deletedIndex);
          }
          return doc;
        };
      },
    };
  },

  /**
   * 改变块类型
   */
  changeBlockType(blockId: string, newType: BlockType) {
    let originalType: BlockType | null = null;

    return {
      type: 'CHANGE_BLOCK_TYPE',
      execute: (doc: Document) => {
        originalType = doc.blocks[blockId]?.type || null;
        return DocOps.changeBlockType(doc, blockId, newType);
      },
      createInverse: () => {
        return (doc: Document) => {
          if (originalType) {
            return DocOps.changeBlockType(doc, blockId, originalType);
          }
          return doc;
        };
      },
    };
  },

  /**
   * 移动块
   */
  moveBlock(blockId: string, newParentId: string | null, newIndex: number) {
    let originalParentId: string | null = null;
    let originalIndex: number = -1;

    return {
      type: 'MOVE_BLOCK',
      execute: (doc: Document) => {
        const block = doc.blocks[blockId];
        originalParentId = block?.parentId || null;
        originalIndex = DocOps.getBlockIndex(doc, blockId);
        return DocOps.moveBlock(doc, blockId, newParentId, newIndex);
      },
      createInverse: (_beforeDoc: Document) => {
        return (doc: Document) => {
          return DocOps.moveBlock(doc, blockId, originalParentId, originalIndex);
        };
      },
    };
  },

  /**
   * 分割块
   */
  splitBlock(blockId: string, offset: number) {
    let newBlockId: string | null = null;

    return {
      type: 'SPLIT_BLOCK',
      execute: (doc: Document) => {
        const result = DocOps.splitBlock(doc, blockId, offset);
        newBlockId = result.newBlock?.id || null;
        return result.doc;
      },
      createInverse: (beforeDoc: Document) => {
        const originalText = DocOps.getBlockPlainText(beforeDoc, blockId);
        return (doc: Document) => {
          let newDoc = DocOps.updateBlock(doc, blockId, { 
            text: originalText,
            content: beforeDoc.blocks[blockId]?.data.content,
          });
          if (newBlockId) {
            newDoc = DocOps.deleteBlock(newDoc, newBlockId);
          }
          return newDoc;
        };
      },
      getNewBlockId: () => newBlockId,
    };
  },

  /**
   * 合并块
   */
  mergeBlocks(sourceBlockId: string, targetBlockId: string) {
    let sourceBlock: Block | null = null;
    let sourceParentId: string | null = null;
    let sourceIndex: number = -1;

    return {
      type: 'MERGE_BLOCKS',
      execute: (doc: Document) => {
        sourceBlock = doc.blocks[sourceBlockId] || null;
        sourceParentId = sourceBlock?.parentId || null;
        sourceIndex = DocOps.getBlockIndex(doc, sourceBlockId);
        return DocOps.mergeBlocks(doc, sourceBlockId, targetBlockId);
      },
      createInverse: (beforeDoc: Document) => {
        const targetContent = beforeDoc.blocks[targetBlockId]?.data.content;
        return (doc: Document) => {
          let newDoc = DocOps.updateBlock(doc, targetBlockId, { content: targetContent });
          if (sourceBlock) {
            newDoc = DocOps.insertBlock(newDoc, sourceBlock, sourceParentId, sourceIndex);
          }
          return newDoc;
        };
      },
    };
  },
};
