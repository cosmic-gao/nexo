/**
 * Headless UI - 块渲染器
 * 负责将块数据模型渲染为DOM元素，但不包含交互逻辑
 * 视图层：纯渲染逻辑，与模型层完全分离
 */
import { IBlock, IRenderer, BlockType, ITodoBlock } from '../types';

export class BlockRenderer implements IRenderer {
    private container: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
    }

    // 渲染所有块
    public render(blocks: IBlock[]): void {
        this.container.innerHTML = '';
        // 重置计数器
        this.container.style.counterReset = 'list-counter';
        blocks.forEach(block => {
            const element = this.renderBlock(block);
            this.container.appendChild(element);
        });
    }

    // 渲染单个块
    public renderBlock(block: IBlock): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'block-wrapper';
        wrapper.dataset.blockId = block.id;
        wrapper.dataset.blockType = block.type;

        // 创建内容容器
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'block-wrapper-content';

        // 添加拖拽手柄
        const dragHandle = document.createElement('div');
        dragHandle.className = 'block-drag-handle';
        dragHandle.textContent = ':::';
        dragHandle.dataset.blockId = block.id;
        contentWrapper.appendChild(dragHandle);

        // 添加操作按钮
        const actionButton = document.createElement('div');
        actionButton.className = 'block-action-button';
        actionButton.innerHTML = '⋮';
        actionButton.dataset.blockId = block.id;
        contentWrapper.appendChild(actionButton);

        const blockElement = this.createBlockElement(block);
        contentWrapper.appendChild(blockElement);
        wrapper.appendChild(contentWrapper);

        // 渲染子块
        if (block.children && block.children.length > 0) {
            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'block-children';
            block.children.forEach(child => {
                childrenContainer.appendChild(this.renderBlock(child));
            });
            wrapper.appendChild(childrenContainer);
        }

        return wrapper;
    }

    // 创建块元素
    private createBlockElement(block: IBlock): HTMLElement {
        const element = document.createElement('div');
        element.className = `block block-${block.type}`;
        element.contentEditable = 'true';
        element.dataset.blockId = block.id;

        // 根据类型设置不同的标签和样式
        const tagMap: Record<BlockType, string> = {
            'paragraph': 'p',
            'heading1': 'h1',
            'heading2': 'h2',
            'heading3': 'h3',
            'bulleted-list': 'li',
            'numbered-list': 'li',
            'todo': 'div'
        };

        const tag = tagMap[block.type] || 'div';
        const contentElement = document.createElement(tag);
        contentElement.className = 'block-content';
        
        // 支持富文本HTML内容
        if (block.content) {
            contentElement.innerHTML = block.content;
        } else {
            contentElement.innerHTML = '';
        }

        // 特殊处理
        if (block.type === 'bulleted-list') {
            element.classList.add('list-item', 'bulleted');
            const bullet = document.createElement('span');
            bullet.className = 'list-bullet';
            bullet.textContent = '•';
            element.appendChild(bullet);
        } else if (block.type === 'numbered-list') {
            element.classList.add('list-item', 'numbered');
            const number = document.createElement('span');
            number.className = 'list-number';
            element.appendChild(number);
        } else if (block.type === 'todo') {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            const todoBlock = block as ITodoBlock;
            checkbox.checked = todoBlock.checked || false;
            checkbox.dataset.blockId = block.id;
            element.appendChild(checkbox);
        }

        element.appendChild(contentElement);

        // 应用背景色
        if (block.backgroundColor) {
            element.style.backgroundColor = block.backgroundColor;
            element.classList.add('has-background');
        }

        // 添加占位符
        const plainText = this.getPlainText(block.content);
        if (!plainText || plainText.trim() === '') {
            contentElement.classList.add('placeholder');
            const placeholder = this.getPlaceholder(block.type);
            contentElement.setAttribute('data-placeholder', placeholder);
        }

        return element;
    }

    // 获取占位符文本
    private getPlaceholder(type: BlockType): string {
        const placeholders: Record<BlockType, string> = {
            'paragraph': '输入 / 来插入块...',
            'heading1': '标题 1',
            'heading2': '标题 2',
            'heading3': '标题 3',
            'bulleted-list': '列表项',
            'numbered-list': '列表项',
            'todo': '待办事项'
        };
        return placeholders[type] || '输入内容...';
    }

    // 从HTML获取纯文本
    private getPlainText(html: string): string {
        if (!html) return '';
        const div = document.createElement('div');
        div.innerHTML = html;
        return div.textContent || div.innerText || '';
    }

    // 更新单个块
    public updateBlock(blockId: string, block: IBlock): void {
        const wrapper = this.container.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
        if (wrapper) {
            const newWrapper = this.renderBlock(block);
            wrapper.replaceWith(newWrapper);
        }
    }

    // 插入块
    public insertBlock(block: IBlock, index: number): void {
        const newElement = this.renderBlock(block);
        const children = Array.from(this.container.children);
        if (index >= 0 && index < children.length) {
            this.container.insertBefore(newElement, children[index]);
        } else {
            this.container.appendChild(newElement);
        }
    }

    // 移除块
    public removeBlock(blockId: string): void {
        const wrapper = this.container.querySelector(`[data-block-id="${blockId}"]`) as HTMLElement;
        if (wrapper) {
            wrapper.remove();
        }
    }

    // 聚焦块
    public focusBlock(blockId: string): void {
        const blockElement = this.container.querySelector(`[data-block-id="${blockId}"] .block-content`) as HTMLElement;
        if (blockElement) {
            blockElement.focus();
            // 将光标移到末尾
            const range = document.createRange();
            const selection = window.getSelection();
            if (selection) {
                range.selectNodeContents(blockElement);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    }
}

