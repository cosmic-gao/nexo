/**
 * 列表块基类
 */
import { BaseBlock } from '../BaseBlock';
import { IBlock, IBlockData, BlockType } from '../../types';
import { BlockRegistry } from '../BlockRegistry';

export abstract class ListBlock extends BaseBlock {
    constructor(id: string | null | undefined, type: BlockType, content: string = '', children: IBlock[] = []) {
        super(id, type, content, children);
    }

    public getPlaceholder(): string {
        return '列表项';
    }
}

/**
 * 无序列表块
 */
export class BulletedListBlock extends ListBlock {
    constructor(id?: string | null, content: string = '', children: IBlock[] = []) {
        super(id, 'bulleted-list', content, children);
    }

    public static fromJSON(json: IBlockData): IBlock {
        const block = new BulletedListBlock(json.id, json.content);
        block.parentId = json.parentId;
        block.backgroundColor = json.backgroundColor || null;
        block.createdAt = json.createdAt;
        block.updatedAt = json.updatedAt;
        block.children = json.children.map(child => BlockRegistry.fromJSON(child));
        return block;
    }

    public static createDefault(): IBlock {
        return new BulletedListBlock();
    }
}

/**
 * 有序列表块
 */
export class NumberedListBlock extends ListBlock {
    constructor(id?: string | null, content: string = '', children: IBlock[] = []) {
        super(id, 'numbered-list', content, children);
    }

    public static fromJSON(json: IBlockData): IBlock {
        const block = new NumberedListBlock(json.id, json.content);
        block.parentId = json.parentId;
        block.backgroundColor = json.backgroundColor || null;
        block.createdAt = json.createdAt;
        block.updatedAt = json.updatedAt;
        block.children = json.children.map(child => BlockRegistry.fromJSON(child));
        return block;
    }

    public static createDefault(): IBlock {
        return new NumberedListBlock();
    }
}

