/**
 * 类型定义
 * Headless UI 设计：视图和模型分离
 */

// 块类型枚举
export type BlockType = 
    | 'paragraph' 
    | 'heading1' 
    | 'heading2' 
    | 'heading3' 
    | 'bulleted-list' 
    | 'numbered-list' 
    | 'todo';

// 块数据接口
export interface IBlockData {
    id: string;
    type: BlockType;
    content: string;
    children: IBlockData[];
    parentId: string | null;
    backgroundColor: string | null;
    createdAt: number;
    updatedAt: number;
}

// 待办事项块数据接口
export interface ITodoBlockData extends IBlockData {
    checked: boolean;
}

// 块更新接口
export interface IBlockUpdate {
    content?: string;
    type?: BlockType;
    backgroundColor?: string | null;
}

// 块基类接口
export interface IBlock {
    id: string;
    type: BlockType;
    content: string;
    children: IBlock[];
    parentId: string | null;
    backgroundColor: string | null;
    createdAt: number;
    updatedAt: number;
    
    updateContent(content: string): void;
    getPlainText(): string;
    addChild(child: IBlock): IBlock;
    removeChild(childId: string): boolean;
    getPlaceholder(): string;
    validate(): boolean;
    toJSON(): IBlockData;
}

// 待办事项块接口
export interface ITodoBlock extends IBlock {
    checked: boolean;
    toggle(): boolean;
    setChecked(checked: boolean): void;
}

// 块类构造函数接口
export interface IBlockConstructor {
    new (id?: string | null, content?: string, children?: IBlock[]): IBlock;
    fromJSON(json: IBlockData): IBlock;
    createDefault(): IBlock;
}

// 视图层接口 - Headless UI 设计
export interface IRenderer {
    render(blocks: IBlock[]): void;
    renderBlock(block: IBlock): HTMLElement;
    updateBlock(blockId: string, block: IBlock): void;
    insertBlock(block: IBlock, index: number): void;
    removeBlock(blockId: string): void;
    focusBlock(blockId: string): void;
}

// 控制器接口 - Headless UI 设计
export interface IController {
    init(container: HTMLElement): void;
}

// 存储接口
export interface IBlockStore {
    subscribe(listener: (blocks: IBlock[]) => void): () => void;
    addBlock(block: IBlock, index?: number | null): IBlock;
    getBlock(id: string): IBlock | null;
    updateBlock(id: string, updates: IBlockUpdate): IBlock | null;
    removeBlock(id: string): IBlock | null;
    moveBlock(id: string, newIndex: number): IBlock | null;
    getRootBlocks(): IBlock[];
    clear(): void;
    export(): { blocks: IBlockData[]; exportedAt: number };
    import(data: { blocks: IBlockData[] }): void;
}

// 位置接口
export interface IPosition {
    x: number;
    y: number;
}

