/**
 * BlockModel - 块数据模型管理
 * 管理所有块的状态和操作
 */

import type { Block, BlockType, BlockData } from './types';
import { generateId } from './types';
import { EventEmitter } from './EventEmitter';

export class BlockModel {
  private blocks: Map<string, Block> = new Map();
  private blockOrder: string[] = [];
  private events: EventEmitter;

  constructor(events: EventEmitter, initialBlocks: Block[] = []) {
    this.events = events;
    
    if (initialBlocks.length === 0) {
      // 创建默认空段落
      const defaultBlock = this.createBlockData('paragraph');
      this.blocks.set(defaultBlock.id, defaultBlock);
      this.blockOrder.push(defaultBlock.id);
    } else {
      initialBlocks.forEach(block => {
        this.blocks.set(block.id, block);
        this.blockOrder.push(block.id);
      });
    }
  }

  private createBlockData(type: BlockType, data: BlockData = {}): Block {
    return {
      id: generateId(),
      type,
      data: { text: '', ...data },
    };
  }

  getBlock(id: string): Block | undefined {
    return this.blocks.get(id);
  }

  getBlocks(): Block[] {
    return this.blockOrder.map(id => this.blocks.get(id)!);
  }

  getBlockIndex(id: string): number {
    return this.blockOrder.indexOf(id);
  }

  getBlockAt(index: number): Block | undefined {
    const id = this.blockOrder[index];
    return id ? this.blocks.get(id) : undefined;
  }

  getNextBlock(id: string): Block | undefined {
    const index = this.getBlockIndex(id);
    return index >= 0 ? this.getBlockAt(index + 1) : undefined;
  }

  getPreviousBlock(id: string): Block | undefined {
    const index = this.getBlockIndex(id);
    return index > 0 ? this.getBlockAt(index - 1) : undefined;
  }

  createBlock(type: BlockType, data: BlockData = {}, afterId?: string): Block {
    const block = this.createBlockData(type, data);
    this.blocks.set(block.id, block);

    if (afterId) {
      const afterIndex = this.blockOrder.indexOf(afterId);
      if (afterIndex >= 0) {
        this.blockOrder.splice(afterIndex + 1, 0, block.id);
      } else {
        this.blockOrder.push(block.id);
      }
    } else {
      this.blockOrder.push(block.id);
    }

    this.events.emit('block:created', { block });
    this.events.emit('content:changed', { blocks: this.getBlocks() });

    return block;
  }

  updateBlock(id: string, data: Partial<BlockData>): void {
    const block = this.blocks.get(id);
    if (!block) return;

    const updatedBlock: Block = {
      ...block,
      data: { ...block.data, ...data },
    };
    this.blocks.set(id, updatedBlock);

    this.events.emit('block:updated', { block: updatedBlock, previousData: block.data });
    this.events.emit('content:changed', { blocks: this.getBlocks() });
  }

  changeBlockType(id: string, newType: BlockType): void {
    const block = this.blocks.get(id);
    if (!block) return;

    const updatedBlock: Block = {
      ...block,
      type: newType,
    };
    this.blocks.set(id, updatedBlock);

    this.events.emit('block:updated', { block: updatedBlock });
    this.events.emit('content:changed', { blocks: this.getBlocks() });
  }

  deleteBlock(id: string): Block | undefined {
    const block = this.blocks.get(id);
    if (!block) return undefined;

    // 至少保留一个块
    if (this.blockOrder.length <= 1) {
      this.updateBlock(id, { text: '' });
      return undefined;
    }

    this.blocks.delete(id);
    const index = this.blockOrder.indexOf(id);
    if (index >= 0) {
      this.blockOrder.splice(index, 1);
    }

    this.events.emit('block:deleted', { block, index });
    this.events.emit('content:changed', { blocks: this.getBlocks() });

    return block;
  }

  moveBlock(id: string, targetId: string, position: 'before' | 'after'): void {
    const sourceIndex = this.blockOrder.indexOf(id);
    const targetIndex = this.blockOrder.indexOf(targetId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    // 先移除
    this.blockOrder.splice(sourceIndex, 1);

    // 计算新位置
    let newIndex = this.blockOrder.indexOf(targetId);
    if (position === 'after') {
      newIndex += 1;
    }

    // 插入
    this.blockOrder.splice(newIndex, 0, id);

    this.events.emit('block:moved', { blockId: id, fromIndex: sourceIndex, toIndex: newIndex });
    this.events.emit('content:changed', { blocks: this.getBlocks() });
  }

  mergeBlocks(sourceId: string, targetId: string): void {
    const sourceBlock = this.blocks.get(sourceId);
    const targetBlock = this.blocks.get(targetId);

    if (!sourceBlock || !targetBlock) return;

    const mergedText = (targetBlock.data.text || '') + (sourceBlock.data.text || '');
    this.updateBlock(targetId, { text: mergedText });
    this.deleteBlock(sourceId);
  }

  splitBlock(id: string, offset: number): Block | undefined {
    const block = this.blocks.get(id);
    if (!block || block.data.text === undefined) return undefined;

    const text = block.data.text;
    const beforeText = text.slice(0, offset);
    const afterText = text.slice(offset);

    // 更新当前块
    this.updateBlock(id, { text: beforeText });

    // 创建新块
    const newBlock = this.createBlock('paragraph', { text: afterText }, id);

    return newBlock;
  }

  clear(): void {
    this.blocks.clear();
    this.blockOrder = [];
    
    const defaultBlock = this.createBlockData('paragraph');
    this.blocks.set(defaultBlock.id, defaultBlock);
    this.blockOrder.push(defaultBlock.id);

    this.events.emit('content:changed', { blocks: this.getBlocks() });
  }

  toJSON(): Block[] {
    return this.getBlocks();
  }

  fromJSON(blocks: Block[]): void {
    this.blocks.clear();
    this.blockOrder = [];

    blocks.forEach(block => {
      this.blocks.set(block.id, block);
      this.blockOrder.push(block.id);
    });

    this.events.emit('content:changed', { blocks: this.getBlocks() });
  }
}

