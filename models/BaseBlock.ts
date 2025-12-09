/**
 * 基础块数据模型
 * 所有块类型都继承自此类
 * Headless UI 设计：纯数据模型，不包含视图逻辑
 */
import { IBlock, IBlockData, BlockType } from '../types';

export abstract class BaseBlock implements IBlock {
    public id: string;
    public type: BlockType;
    public content: string;
    public children: IBlock[];
    public parentId: string | null;
    public backgroundColor: string | null;
    public createdAt: number;
    public updatedAt: number;

    constructor(id: string | null | undefined, type: BlockType, content: string = '', children: IBlock[] = []) {
        this.id = id || this.generateId();
        this.type = type;
        this.content = content || '';
        this.children = children || [];
        this.parentId = null;
        this.backgroundColor = null;
        this.createdAt = Date.now();
        this.updatedAt = Date.now();
    }

    protected generateId(): string {
        return 'block_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    public updateContent(newContent: string): void {
        this.content = newContent;
        this.updatedAt = Date.now();
    }

    // 获取纯文本内容（用于搜索等）
    public getPlainText(): string {
        if (!this.content) return '';
        const div = document.createElement('div');
        div.innerHTML = this.content;
        return div.textContent || div.innerText || '';
    }

    public addChild(childBlock: IBlock): IBlock {
        childBlock.parentId = this.id;
        this.children.push(childBlock);
        this.updatedAt = Date.now();
        return childBlock;
    }

    public removeChild(childId: string): boolean {
        const index = this.children.findIndex(child => child.id === childId);
        if (index !== -1) {
            this.children.splice(index, 1);
            this.updatedAt = Date.now();
            return true;
        }
        return false;
    }

    // 获取占位符文本（子类可重写）
    public getPlaceholder(): string {
        return '输入内容...';
    }

    // 验证内容（子类可重写）
    public validate(): boolean {
        return true;
    }

    // 序列化
    public toJSON(): IBlockData {
        return {
            id: this.id,
            type: this.type,
            content: this.content,
            children: this.children.map(child => child.toJSON()),
            parentId: this.parentId,
            backgroundColor: this.backgroundColor,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    // 反序列化（由子类实现）
    public static fromJSON(_json: IBlockData): IBlock {
        throw new Error('fromJSON must be implemented by subclass');
    }

    // 创建默认实例（由子类实现）
    public static createDefault(): IBlock {
        throw new Error('createDefault must be implemented by subclass');
    }
}

