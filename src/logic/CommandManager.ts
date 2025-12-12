/**
 * Logic Layer - CommandManager 命令管理器
 * 实现撤销/重做功能，平台无关
 */

import type { Document, Operation, Command } from '../model/types';
import { generateId } from '../model/types';
import * as DocOps from '../model/Document';
import { EventBus } from './EventBus';

export interface CommandContext {
  getDocument: () => Document;
  setDocument: (doc: Document) => void;
  eventBus: EventBus;
}

export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
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
    
    const command: Command = {
      id: generateId(),
      type,
      operations: [], // 可扩展为详细操作记录
      inverseOperations: [],
      timestamp: Date.now(),
    };

    // 存储执行和逆操作的闭包
    (command as any)._execute = execute;
    (command as any)._inverse = createInverse(beforeDoc, afterDoc);

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

    const inverse = (command as any)._inverse;
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

    const execute = (command as any)._execute;
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
  updateBlock(blockId: string, data: Partial<import('../model/types').BlockData>) {
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
    type: import('../model/types').BlockType,
    data: import('../model/types').BlockData = {},
    afterBlockId?: string
  ) {
    let createdBlockId: string | null = null;
    
    return {
      type: 'CREATE_BLOCK',
      execute: (doc: Document) => {
        const result = DocOps.createBlock(doc, type, data, afterBlockId);
        createdBlockId = result.block.id;
        return result.doc;
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
    let deletedBlock: import('../model/types').Block | null = null;
    let deletedIndex: number = -1;

    return {
      type: 'DELETE_BLOCK',
      execute: (doc: Document) => {
        deletedBlock = doc.blocks[blockId] || null;
        deletedIndex = doc.rootBlockIds.indexOf(blockId);
        return DocOps.deleteBlock(doc, blockId);
      },
      createInverse: (beforeDoc: Document) => {
        return (doc: Document) => {
          if (deletedBlock) {
            const afterBlockId = deletedIndex > 0 
              ? doc.rootBlockIds[deletedIndex - 1] 
              : undefined;
            return DocOps.insertBlock(doc, deletedBlock, afterBlockId);
          }
          return doc;
        };
      },
    };
  },

  /**
   * 改变块类型
   */
  changeBlockType(blockId: string, newType: import('../model/types').BlockType) {
    let originalType: import('../model/types').BlockType | null = null;

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
  moveBlock(blockId: string, targetBlockId: string, position: 'before' | 'after') {
    let originalIndex: number = -1;

    return {
      type: 'MOVE_BLOCK',
      execute: (doc: Document) => {
        originalIndex = doc.rootBlockIds.indexOf(blockId);
        return DocOps.moveBlock(doc, blockId, targetBlockId, position);
      },
      createInverse: (beforeDoc: Document) => {
        return (doc: Document) => {
          if (originalIndex >= 0 && originalIndex < doc.rootBlockIds.length) {
            const targetId = doc.rootBlockIds[originalIndex];
            if (targetId && targetId !== blockId) {
              return DocOps.moveBlock(doc, blockId, targetId, 'before');
            }
          }
          return doc;
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
        const originalText = beforeDoc.blocks[blockId]?.data.text || '';
        return (doc: Document) => {
          let newDoc = DocOps.updateBlock(doc, blockId, { text: originalText });
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
    let sourceBlock: import('../model/types').Block | null = null;
    let sourceIndex: number = -1;

    return {
      type: 'MERGE_BLOCKS',
      execute: (doc: Document) => {
        sourceBlock = doc.blocks[sourceBlockId] || null;
        sourceIndex = doc.rootBlockIds.indexOf(sourceBlockId);
        return DocOps.mergeBlocks(doc, sourceBlockId, targetBlockId);
      },
      createInverse: (beforeDoc: Document) => {
        const targetText = beforeDoc.blocks[targetBlockId]?.data.text || '';
        return (doc: Document) => {
          let newDoc = DocOps.updateBlock(doc, targetBlockId, { text: targetText });
          if (sourceBlock) {
            const afterBlockId = targetBlockId;
            newDoc = DocOps.insertBlock(newDoc, sourceBlock, afterBlockId);
          }
          return newDoc;
        };
      },
    };
  },
};


