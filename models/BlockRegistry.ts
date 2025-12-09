/**
 * 块注册表
 * 管理所有块类型的注册和创建
 * Headless UI 设计：纯数据层，不包含视图逻辑
 */
import { IBlock, IBlockData, BlockType, IBlockConstructor } from '../types';
import { ParagraphBlock } from './blocks/ParagraphBlock';
import { Heading1Block, Heading2Block, Heading3Block } from './blocks/HeadingBlock';
import { BulletedListBlock, NumberedListBlock } from './blocks/ListBlock';
import { TodoBlock } from './blocks/TodoBlock';

export class BlockRegistry {
    private static blocks: Map<BlockType, IBlockConstructor> = new Map();

    // 注册块类型
    public static register(type: BlockType, blockClass: IBlockConstructor): void {
        this.blocks.set(type, blockClass);
    }

    // 根据类型创建块
    public static create(type: BlockType, id: string | null = null, content: string = ''): IBlock {
        const BlockClass = this.blocks.get(type);
        if (!BlockClass) {
            throw new Error(`Unknown block type: ${type}`);
        }
        if (id) {
            return new BlockClass(id, content);
        }
        return BlockClass.createDefault();
    }

    // 从JSON反序列化
    public static fromJSON(json: IBlockData): IBlock {
        const BlockClass = this.blocks.get(json.type);
        if (!BlockClass) {
            throw new Error(`Unknown block type: ${json.type}`);
        }
        return BlockClass.fromJSON(json);
    }

    // 获取所有注册的类型
    public static getTypes(): BlockType[] {
        return Array.from(this.blocks.keys());
    }

    // 检查类型是否存在
    public static hasType(type: BlockType): boolean {
        return this.blocks.has(type);
    }
}

// 注册所有块类型
BlockRegistry.register('paragraph', ParagraphBlock);
BlockRegistry.register('heading1', Heading1Block);
BlockRegistry.register('heading2', Heading2Block);
BlockRegistry.register('heading3', Heading3Block);
BlockRegistry.register('bulleted-list', BulletedListBlock);
BlockRegistry.register('numbered-list', NumberedListBlock);
BlockRegistry.register('todo', TodoBlock);

