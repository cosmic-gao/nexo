/**
 * 待办事项块
 */
import { BaseBlock } from '../BaseBlock';
import { IBlock, IBlockData, ITodoBlock, ITodoBlockData } from '../../types';
import { BlockRegistry } from '../BlockRegistry';

export class TodoBlock extends BaseBlock implements ITodoBlock {
    public checked: boolean;

    constructor(id?: string | null, content: string = '', children: IBlock[] = [], checked: boolean = false) {
        super(id, 'todo', content, children);
        this.checked = checked || false;
    }

    public getPlaceholder(): string {
        return '待办事项';
    }

    public toggle(): boolean {
        this.checked = !this.checked;
        this.updatedAt = Date.now();
        return this.checked;
    }

    public setChecked(checked: boolean): void {
        this.checked = checked;
        this.updatedAt = Date.now();
    }

    public toJSON(): ITodoBlockData {
        const json = super.toJSON() as ITodoBlockData;
        json.checked = this.checked;
        return json;
    }

    public static fromJSON(json: IBlockData): ITodoBlock {
        const block = new TodoBlock(json.id, json.content, [], (json as ITodoBlockData).checked || false);
        block.parentId = json.parentId;
        block.backgroundColor = json.backgroundColor || null;
        block.createdAt = json.createdAt;
        block.updatedAt = json.updatedAt;
        block.children = json.children.map(child => BlockRegistry.fromJSON(child));
        return block;
    }

    public static createDefault(): ITodoBlock {
        return new TodoBlock();
    }
}

