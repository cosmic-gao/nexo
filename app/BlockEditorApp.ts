/**
 * 块编辑器主应用
 * 连接数据模型、Headless UI和用户界面
 * Headless UI 设计：模型层和视图层完全分离
 */
import { BlockStore } from '../models/BlockStore';
import { BlockRenderer } from '../ui/BlockRenderer';
import { BlockController } from '../ui/BlockController';
import { BlockRegistry } from '../models/BlockRegistry';
import { IBlock } from '../types';

export class BlockEditorApp {
    private blockStore: BlockStore;
    private renderer: BlockRenderer;
    private controller: BlockController;

    constructor() {
        const container = document.getElementById('block-editor');
        if (!container) {
            throw new Error('Block editor container not found');
        }

        this.blockStore = new BlockStore();
        this.renderer = new BlockRenderer(container);
        this.controller = new BlockController(this.blockStore, this.renderer);
        
        this.init();
    }

    private init(): void {
        // 订阅数据变化 - Headless UI：视图响应模型变化
        this.blockStore.subscribe((blocks) => {
            this.renderer.render(blocks);
        });

        // 初始化控制器
        const container = document.getElementById('block-editor');
        if (container) {
            this.controller.init(container);
        }

        // 创建初始块
        this.createInitialBlocks();

        // 加载示例数据（可选）
        // this.loadExampleData();
    }

    private createInitialBlocks(): void {
        const initialBlock = BlockRegistry.create('paragraph');
        this.blockStore.addBlock(initialBlock);
    }

    public loadExampleData(): void {
        // 使用BlockRegistry创建块实例
        const exampleBlocks: IBlock[] = [
            BlockRegistry.create('heading1', null, '欢迎使用块编辑器'),
            BlockRegistry.create('paragraph', null, '这是一个类似 <strong>Notion</strong> 的块编辑器，使用原生 <code>TypeScript</code> 构建。'),
            BlockRegistry.create('heading2', null, '特性'),
            BlockRegistry.create('bulleted-list', null, '<strong>数据模型</strong>和 <em>UI 分离</em>'),
            BlockRegistry.create('bulleted-list', null, 'Headless UI 设计思想'),
            BlockRegistry.create('bulleted-list', null, '支持多种块类型和<u>富文本格式</u>'),
            BlockRegistry.create('heading2', null, '使用方法'),
            BlockRegistry.create('paragraph', null, '输入 <code>/</code> 来插入不同类型的块'),
            BlockRegistry.create('paragraph', null, '按 <strong>Enter</strong> 创建新块'),
            BlockRegistry.create('paragraph', null, '按 <strong>Backspace</strong> 删除空块'),
            BlockRegistry.create('paragraph', null, '选中文字后使用格式化工具栏，或使用快捷键：<strong>Ctrl+B</strong> 粗体，<strong>Ctrl+I</strong> 斜体，<strong>Ctrl+K</strong> 链接'),
            BlockRegistry.create('todo', null, '体验富文本编辑功能'),
            BlockRegistry.create('todo', null, '尝试添加链接和代码格式')
        ];

        exampleBlocks.forEach(block => {
            this.blockStore.addBlock(block);
        });
    }

    // 导出数据
    public exportData(): { blocks: any[]; exportedAt: number } {
        return this.blockStore.export();
    }

    // 导入数据
    public importData(data: { blocks: any[] }): void {
        this.blockStore.import(data);
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    (window as any).blockEditorApp = new BlockEditorApp();
});

