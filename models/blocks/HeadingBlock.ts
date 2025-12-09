/**
 * 标题块基类
 */
import { BaseBlock } from '../BaseBlock';
import { IBlock, IBlockData, BlockType } from '../../types';
import { BlockRegistry } from '../BlockRegistry';

export abstract class HeadingBlock extends BaseBlock {
    public level: number;

    constructor(id: string | null | undefined, level: number, content: string = '', children: IBlock[] = []) {
        const type: BlockType = `heading${level}` as BlockType;
        super(id, type, content, children);
        this.level = level;
    }

    public getPlaceholder(): string {
        return `标题 ${this.level}`;
    }

    // 注意：抽象类的 fromJSON 不应该被直接调用
    // 子类应该实现自己的 fromJSON 方法
}

/**
 * 一级标题
 */
export class Heading1Block extends HeadingBlock {
    constructor(id?: string | null, content: string = '', children: IBlock[] = []) {
        super(id, 1, content, children);
    }

    public static fromJSON(json: IBlockData): IBlock {
        const block = new Heading1Block(json.id, json.content);
        block.parentId = json.parentId;
        block.backgroundColor = json.backgroundColor || null;
        block.createdAt = json.createdAt;
        block.updatedAt = json.updatedAt;
        block.children = json.children.map(child => BlockRegistry.fromJSON(child));
        return block;
    }

    public static createDefault(): IBlock {
        return new Heading1Block();
    }
}

/**
 * 二级标题
 */
export class Heading2Block extends HeadingBlock {
    constructor(id?: string | null, content: string = '', children: IBlock[] = []) {
        super(id, 2, content, children);
    }

    public static fromJSON(json: IBlockData): IBlock {
        const block = new Heading2Block(json.id, json.content);
        block.parentId = json.parentId;
        block.backgroundColor = json.backgroundColor || null;
        block.createdAt = json.createdAt;
        block.updatedAt = json.updatedAt;
        block.children = json.children.map(child => BlockRegistry.fromJSON(child));
        return block;
    }

    public static createDefault(): IBlock {
        return new Heading2Block();
    }
}

/**
 * 三级标题
 */
export class Heading3Block extends HeadingBlock {
    constructor(id?: string | null, content: string = '', children: IBlock[] = []) {
        super(id, 3, content, children);
    }

    public static fromJSON(json: IBlockData): IBlock {
        const block = new Heading3Block(json.id, json.content);
        block.parentId = json.parentId;
        block.backgroundColor = json.backgroundColor || null;
        block.createdAt = json.createdAt;
        block.updatedAt = json.updatedAt;
        block.children = json.children.map(child => BlockRegistry.fromJSON(child));
        return block;
    }

    public static createDefault(): IBlock {
        return new Heading3Block();
    }
}

