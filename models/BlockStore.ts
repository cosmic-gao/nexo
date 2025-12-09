/**
 * 块存储管理
 * 管理所有块的增删改查操作
 * Headless UI 设计：纯数据层，不包含视图逻辑
 */
import { IBlock, IBlockStore, IBlockUpdate, IBlockData } from '../types';
import { BlockRegistry } from './BlockRegistry';

export class BlockStore implements IBlockStore {
    private blocks: IBlock[] = [];
    private listeners: Array<(blocks: IBlock[]) => void> = [];

    // 订阅变化
    public subscribe(listener: (blocks: IBlock[]) => void): () => void {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    // 通知所有监听器
    private notify(): void {
        this.listeners.forEach(listener => listener(this.blocks));
    }

    // 添加块
    public addBlock(block: IBlock, index: number | null = null): IBlock {
        if (index !== null && index >= 0 && index <= this.blocks.length) {
            this.blocks.splice(index, 0, block);
        } else {
            this.blocks.push(block);
        }
        this.notify();
        return block;
    }

    // 根据ID获取块
    public getBlock(id: string): IBlock | null {
        return this.findBlockRecursive(this.blocks, id);
    }

    private findBlockRecursive(blocks: IBlock[], id: string): IBlock | null {
        for (const block of blocks) {
            if (block.id === id) {
                return block;
            }
            if (block.children.length > 0) {
                const found = this.findBlockRecursive(block.children, id);
                if (found) return found;
            }
        }
        return null;
    }

    // 更新块
    public updateBlock(id: string, updates: IBlockUpdate): IBlock | null {
        const block = this.getBlock(id);
        if (block) {
            if (updates.content !== undefined) {
                block.updateContent(updates.content);
            }
            if (updates.type !== undefined) {
                // 如果类型改变，需要创建新的块实例
                const oldType = block.type;
                if (oldType !== updates.type) {
                    // 使用BlockRegistry创建新类型的块
                    const newBlock = BlockRegistry.create(updates.type, block.id, block.content);
                    newBlock.parentId = block.parentId;
                    newBlock.backgroundColor = block.backgroundColor;
                    newBlock.createdAt = block.createdAt;
                    newBlock.updatedAt = Date.now();
                    newBlock.children = block.children;
                    
                    // 如果是待办事项，保留checked状态
                    if (oldType === 'todo' && updates.type === 'todo' && 'checked' in block) {
                        (newBlock as any).checked = (block as any).checked;
                    }
                    
                    // 替换块
                    this.replaceBlock(id, newBlock);
                    this.notify();
                    return newBlock;
                }
            }
            if (updates.backgroundColor !== undefined) {
                block.backgroundColor = updates.backgroundColor;
                block.updatedAt = Date.now();
            }
            this.notify();
            return block;
        }
        return null;
    }

    // 替换块
    private replaceBlock(oldId: string, newBlock: IBlock): boolean {
        const replaced = this.replaceBlockRecursive(this.blocks, oldId, newBlock);
        if (replaced) {
            this.notify();
        }
        return replaced;
    }

    private replaceBlockRecursive(blocks: IBlock[], oldId: string, newBlock: IBlock): boolean {
        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].id === oldId) {
                blocks[i] = newBlock;
                return true;
            }
            if (blocks[i].children.length > 0) {
                const replaced = this.replaceBlockRecursive(blocks[i].children, oldId, newBlock);
                if (replaced) return true;
            }
        }
        return false;
    }

    // 删除块
    public removeBlock(id: string): IBlock | null {
        const removed = this.removeBlockRecursive(this.blocks, id);
        if (removed) {
            this.notify();
        }
        return removed;
    }

    private removeBlockRecursive(blocks: IBlock[], id: string): IBlock | null {
        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].id === id) {
                return blocks.splice(i, 1)[0];
            }
            if (blocks[i].children.length > 0) {
                const removed = this.removeBlockRecursive(blocks[i].children, id);
                if (removed) return removed;
            }
        }
        return null;
    }

    // 移动块
    public moveBlock(id: string, newIndex: number): IBlock | null {
        const block = this.removeBlockRecursive(this.blocks, id);
        if (block) {
            this.blocks.splice(newIndex, 0, block);
            this.notify();
            return block;
        }
        return null;
    }

    // 获取所有根块
    public getRootBlocks(): IBlock[] {
        return this.blocks;
    }

    // 清空所有块
    public clear(): void {
        this.blocks = [];
        this.notify();
    }

    // 导出数据
    public export(): { blocks: IBlockData[]; exportedAt: number } {
        return {
            blocks: this.blocks.map(block => block.toJSON()),
            exportedAt: Date.now()
        };
    }

    // 导入数据
    public import(data: { blocks: IBlockData[] }): void {
        // 使用BlockRegistry来反序列化
        this.blocks = data.blocks.map(blockJson => {
            try {
                return BlockRegistry.fromJSON(blockJson);
            } catch (e) {
                console.error('Failed to deserialize block:', e);
                throw e;
            }
        });
        this.notify();
    }
}

