/**
 * CommandManager - 命令管理器
 * 实现命令模式，支持撤销/重做
 */

import type { Command, CommandHistory } from './types';

export class CommandManager {
  private history: CommandHistory = {
    past: [],
    future: [],
  };

  private maxHistoryLength: number;

  constructor(maxHistoryLength: number = 100) {
    this.maxHistoryLength = maxHistoryLength;
  }

  execute(command: Command): void {
    command.execute();
    
    this.history.past.push(command);
    this.history.future = []; // 清空重做栈

    // 限制历史长度
    if (this.history.past.length > this.maxHistoryLength) {
      this.history.past.shift();
    }
  }

  undo(): boolean {
    const command = this.history.past.pop();
    if (!command) return false;

    command.undo();
    this.history.future.push(command);
    return true;
  }

  redo(): boolean {
    const command = this.history.future.pop();
    if (!command) return false;

    command.execute();
    this.history.past.push(command);
    return true;
  }

  canUndo(): boolean {
    return this.history.past.length > 0;
  }

  canRedo(): boolean {
    return this.history.future.length > 0;
  }

  clear(): void {
    this.history.past = [];
    this.history.future = [];
  }

  getHistoryLength(): number {
    return this.history.past.length;
  }
}

// ============================================
// 具体命令实现
// ============================================

import type { Block, BlockType, BlockData } from './types';
import type { BlockModel } from './BlockModel';

export class UpdateBlockCommand implements Command<{ id: string; data: Partial<BlockData> }> {
  type = 'UPDATE_BLOCK';
  payload: { id: string; data: Partial<BlockData> };
  
  private model: BlockModel;
  private previousData: BlockData | null = null;

  constructor(model: BlockModel, id: string, data: Partial<BlockData>) {
    this.model = model;
    this.payload = { id, data };
  }

  execute(): void {
    const block = this.model.getBlock(this.payload.id);
    if (block) {
      this.previousData = { ...block.data };
      this.model.updateBlock(this.payload.id, this.payload.data);
    }
  }

  undo(): void {
    if (this.previousData) {
      this.model.updateBlock(this.payload.id, this.previousData);
    }
  }
}

export class CreateBlockCommand implements Command<{ type: BlockType; data?: BlockData; afterId?: string }> {
  type = 'CREATE_BLOCK';
  payload: { type: BlockType; data?: BlockData; afterId?: string };

  private model: BlockModel;
  private createdBlockId: string | null = null;

  constructor(model: BlockModel, blockType: BlockType, data?: BlockData, afterId?: string) {
    this.model = model;
    this.payload = { type: blockType, data, afterId };
  }

  execute(): void {
    const block = this.model.createBlock(this.payload.type, this.payload.data, this.payload.afterId);
    this.createdBlockId = block.id;
  }

  undo(): void {
    if (this.createdBlockId) {
      this.model.deleteBlock(this.createdBlockId);
    }
  }

  getCreatedBlockId(): string | null {
    return this.createdBlockId;
  }
}

export class DeleteBlockCommand implements Command<{ id: string }> {
  type = 'DELETE_BLOCK';
  payload: { id: string };

  private model: BlockModel;
  private deletedBlock: Block | null = null;
  private deletedIndex: number = -1;

  constructor(model: BlockModel, id: string) {
    this.model = model;
    this.payload = { id };
  }

  execute(): void {
    const block = this.model.getBlock(this.payload.id);
    if (block) {
      this.deletedBlock = { ...block, data: { ...block.data } };
      this.deletedIndex = this.model.getBlockIndex(this.payload.id);
      this.model.deleteBlock(this.payload.id);
    }
  }

  undo(): void {
    if (this.deletedBlock) {
      // 找到插入位置前的块
      const blocks = this.model.getBlocks();
      const afterId = this.deletedIndex > 0 ? blocks[this.deletedIndex - 1]?.id : undefined;
      
      const restoredBlock = this.model.createBlock(
        this.deletedBlock.type,
        this.deletedBlock.data,
        afterId
      );
      
      // 更新引用以便后续操作
      this.payload.id = restoredBlock.id;
    }
  }
}

export class ChangeBlockTypeCommand implements Command<{ id: string; newType: BlockType }> {
  type = 'CHANGE_BLOCK_TYPE';
  payload: { id: string; newType: BlockType };

  private model: BlockModel;
  private previousType: BlockType | null = null;

  constructor(model: BlockModel, id: string, newType: BlockType) {
    this.model = model;
    this.payload = { id, newType };
  }

  execute(): void {
    const block = this.model.getBlock(this.payload.id);
    if (block) {
      this.previousType = block.type;
      this.model.changeBlockType(this.payload.id, this.payload.newType);
    }
  }

  undo(): void {
    if (this.previousType) {
      this.model.changeBlockType(this.payload.id, this.previousType);
    }
  }
}

export class MoveBlockCommand implements Command<{ id: string; targetId: string; position: 'before' | 'after' }> {
  type = 'MOVE_BLOCK';
  payload: { id: string; targetId: string; position: 'before' | 'after' };

  private model: BlockModel;
  private originalIndex: number = -1;

  constructor(model: BlockModel, id: string, targetId: string, position: 'before' | 'after') {
    this.model = model;
    this.payload = { id, targetId, position };
  }

  execute(): void {
    this.originalIndex = this.model.getBlockIndex(this.payload.id);
    this.model.moveBlock(this.payload.id, this.payload.targetId, this.payload.position);
  }

  undo(): void {
    if (this.originalIndex >= 0) {
      const blocks = this.model.getBlocks();
      const targetBlock = blocks[this.originalIndex];
      if (targetBlock) {
        this.model.moveBlock(this.payload.id, targetBlock.id, 'before');
      }
    }
  }
}

