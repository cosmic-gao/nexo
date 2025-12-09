/**
 * 段落块
 */
import { BaseBlock } from '../BaseBlock';
import { IBlock, IBlockData } from '../../types';
import { BlockRegistry } from '../BlockRegistry';

export class ParagraphBlock extends BaseBlock {
    constructor(id?: string | null, content: string = '', children: IBlock[] = []) {
        super(id, 'paragraph', content, children);
    }

    public getPlaceholder(): string {
        return '输入 / 来插入块...';
    }

    public static fromJSON(json: IBlockData): IBlock {
        const block = new ParagraphBlock(json.id, json.content);
        block.parentId = json.parentId;
        block.backgroundColor = json.backgroundColor || null;
        block.createdAt = json.createdAt;
        block.updatedAt = json.updatedAt;
        // 通过BlockRegistry递归解析children
        block.children = json.children.map(child => BlockRegistry.fromJSON(child));
        return block;
    }

    public static createDefault(): IBlock {
        return new ParagraphBlock();
    }
}

