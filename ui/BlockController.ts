/**
 * Headless UI - 块控制器
 * 负责处理用户交互，但不直接操作DOM
 * Headless UI 设计：控制器通过数据模型更新，视图自动响应
 */
import { IBlockStore, IController, IPosition, ITodoBlock, BlockType } from '../types';
import { IRenderer } from '../types';
import { BlockRegistry } from '../models/BlockRegistry';

interface ICommand {
    type: BlockType;
    label: string;
    icon: string;
}

interface IContextMenuItem {
    label: string;
    icon: string;
    hasArrow?: boolean;
    shortcut?: string;
    action: () => void;
    type?: 'divider';
}

export class BlockController implements IController {
    private blockStore: IBlockStore;
    private renderer: IRenderer;
    private container: HTMLElement | null = null;
    private currentBlockId: string | null = null;
    private commandMenuVisible: boolean = false;
    private commandMenuPosition: IPosition = { x: 0, y: 0 };
    private contextMenuVisible: boolean = false;
    private formatToolbarVisible: boolean = false;
    private selectedText: string = '';
    private draggingBlockId: string | null = null;

    constructor(blockStore: IBlockStore, renderer: IRenderer) {
        this.blockStore = blockStore;
        this.renderer = renderer;
    }

    // 初始化事件监听
    public init(container: HTMLElement): void {
        this.container = container;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        if (!this.container) return;

        // 输入事件
        this.container.addEventListener('input', (e) => this.handleInput(e));
        
        // 键盘事件
        this.container.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // 点击事件
        this.container.addEventListener('click', (e) => this.handleClick(e));
        
        // 焦点事件
        this.container.addEventListener('focusin', (e) => this.handleFocusIn(e));
        this.container.addEventListener('focusout', (e) => this.handleFocusOut(e));

        // 鼠标选择事件
        this.container.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        document.addEventListener('selectionchange', () => this.handleSelectionChange());

        // 鼠标悬停事件
        this.container.addEventListener('mouseenter', (e) => this.handleMouseEnter(e), true);
        this.container.addEventListener('mouseleave', (e) => this.handleMouseLeave(e), true);

        // 右键菜单
        this.container.addEventListener('contextmenu', (e) => this.handleContextMenu(e));

        // 链接点击处理
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'A' && target.closest('.block-content')) {
                if (!e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    const url = (target as HTMLAnchorElement).href;
                    if (url && confirm(`打开链接: ${url}?`)) {
                        window.open(url, '_blank');
                    }
                }
            }
        }, true);

        // 拖拽事件
        this.setupDragListeners();
    }

    private handleInput(e: Event): void {
        const target = e.target as HTMLElement;
        const contentElement = target.closest('.block-content') as HTMLElement;
        if (!contentElement) return;

        const blockElement = contentElement.closest('.block') as HTMLElement;
        if (!blockElement) return;

        const blockId = blockElement.dataset.blockId;
        if (!blockId) return;
        
        // 获取HTML内容，但清理不必要的格式
        let content = contentElement.innerHTML;
        
        // 清理空标签
        content = this.sanitizeHTML(content);
        
        // 更新块内容 - Headless UI：通过数据模型更新
        this.blockStore.updateBlock(blockId, { content });
    }

    // 清理HTML，移除不必要的标签
    private sanitizeHTML(html: string): string {
        html = html.replace(/<b><\/b>/gi, '');
        html = html.replace(/<strong><\/strong>/gi, '');
        html = html.replace(/<i><\/i>/gi, '');
        html = html.replace(/<em><\/em>/gi, '');
        html = html.replace(/<u><\/u>/gi, '');
        html = html.replace(/<s><\/s>/gi, '');
        html = html.replace(/<strike><\/strike>/gi, '');
        html = html.replace(/<code><\/code>/gi, '');
        return html;
    }

    private handleKeyDown(e: KeyboardEvent): void {
        const target = e.target as HTMLElement;
        const contentElement = target.closest('.block-content') as HTMLElement;
        if (!contentElement) return;

        const blockElement = contentElement.closest('.block') as HTMLElement;
        if (!blockElement) return;

        const blockId = blockElement.dataset.blockId;
        if (!blockId) return;
        const block = this.blockStore.getBlock(blockId);
        if (!block) return;

        // Enter键 - 创建新块
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.createNewBlock(blockId, contentElement);
            return;
        }

        // Backspace键 - 删除空块
        if (e.key === 'Backspace') {
            const plainText = this.getPlainTextFromElement(contentElement);
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const cursorPosition = range.startOffset;
                if (!plainText && cursorPosition === 0 && this.blockStore.getRootBlocks().length > 1) {
                    e.preventDefault();
                    this.deleteBlock(blockId);
                    return;
                }
            }
        }

        // 键盘快捷键
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'b') {
                e.preventDefault();
                this.formatText('bold');
                return;
            }
            if (e.key === 'i') {
                e.preventDefault();
                this.formatText('italic');
                return;
            }
            if (e.key === 'u') {
                e.preventDefault();
                this.formatText('underline');
                return;
            }
            if (e.key === 'k') {
                e.preventDefault();
                this.insertLink();
                return;
            }
            if (e.key === 'e') {
                e.preventDefault();
                this.formatText('code');
                return;
            }
        }

        // 斜杠命令菜单
        const plainText = this.getPlainTextFromElement(contentElement);
        if (e.key === '/' && !plainText) {
            e.preventDefault();
            this.showCommandMenu(blockElement);
            return;
        }

        // 隐藏命令菜单
        if (this.commandMenuVisible && (e.key === 'Escape' || e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            this.hideCommandMenu();
        }
    }

    private handleClick(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        
        // 操作按钮
        if (target.classList.contains('block-action-button')) {
            e.preventDefault();
            e.stopPropagation();
            const blockId = target.dataset.blockId;
            if (blockId) {
                this.showContextMenu(blockId, e);
            }
            return;
        }

        // 待办事项复选框
        if (target.classList.contains('todo-checkbox')) {
            e.preventDefault();
            e.stopPropagation();
            const blockId = target.dataset.blockId;
            if (blockId) {
                const block = this.blockStore.getBlock(blockId);
                if (block && block.type === 'todo') {
                    const todoBlock = block as ITodoBlock;
                    if (todoBlock.setChecked) {
                        todoBlock.setChecked((target as HTMLInputElement).checked);
                    } else {
                        todoBlock.checked = (target as HTMLInputElement).checked;
                        todoBlock.updatedAt = Date.now();
                    }
                    // Headless UI：通过数据模型更新触发视图更新
                    (this.blockStore as any).notify();
                }
            }
            return;
        }

        const blockElement = target.closest('.block') as HTMLElement;
        if (blockElement) {
            this.currentBlockId = blockElement.dataset.blockId || null;
        }
    }

    private handleFocusIn(e: FocusEvent): void {
        const target = e.target as HTMLElement;
        const contentElement = target.closest('.block-content') as HTMLElement;
        if (!contentElement) return;

        const blockElement = contentElement.closest('.block') as HTMLElement;
        if (blockElement) {
            blockElement.classList.add('focused');
            this.currentBlockId = blockElement.dataset.blockId || null;
        }
    }

    private handleFocusOut(e: FocusEvent): void {
        const target = e.target as HTMLElement;
        const contentElement = target.closest('.block-content') as HTMLElement;
        if (!contentElement) return;

        const blockElement = contentElement.closest('.block') as HTMLElement;
        if (blockElement) {
            blockElement.classList.remove('focused');
        }
    }

    private handleMouseEnter(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        const wrapper = target.closest('.block-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.classList.add('hovered');
        }
    }

    private handleMouseLeave(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        const wrapper = target.closest('.block-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.classList.remove('hovered');
        }
    }

    private handleContextMenu(e: MouseEvent): void {
        const target = e.target as HTMLElement;
        const blockElement = target.closest('.block') as HTMLElement;
        if (blockElement) {
            e.preventDefault();
            const blockId = blockElement.dataset.blockId;
            if (blockId) {
                this.showContextMenu(blockId, e);
            }
        }
    }

    private handleMouseUp(e: MouseEvent): void {
        setTimeout(() => this.handleSelectionChange(), 0);
    }

    private handleSelectionChange(): void {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            this.selectedText = selection.toString();
            if (this.selectedText) {
                this.showFormatToolbar(range);
            }
        } else {
            this.hideFormatToolbar();
        }
    }

    // 创建新块
    private createNewBlock(afterBlockId: string, currentElement: HTMLElement): void {
        const afterBlock = this.blockStore.getBlock(afterBlockId);
        if (!afterBlock) return;

        const rootBlocks = this.blockStore.getRootBlocks();
        const currentIndex = rootBlocks.findIndex(b => b.id === afterBlockId);
        
        const newBlock = BlockRegistry.create('paragraph');
        this.blockStore.addBlock(newBlock, currentIndex + 1);
        
        // 聚焦新块
        setTimeout(() => {
            this.renderer.focusBlock(newBlock.id);
        }, 0);
    }

    // 删除块
    private deleteBlock(blockId: string): void {
        const rootBlocks = this.blockStore.getRootBlocks();
        const currentIndex = rootBlocks.findIndex(b => b.id === blockId);
        
        if (currentIndex > 0) {
            this.blockStore.removeBlock(blockId);
            // 聚焦前一个块
            const prevBlock = rootBlocks[currentIndex - 1];
            if (prevBlock) {
                setTimeout(() => {
                    this.renderer.focusBlock(prevBlock.id);
                }, 0);
            }
        }
    }

    // 显示命令菜单
    private showCommandMenu(blockElement: HTMLElement): void {
        this.commandMenuVisible = true;
        const rect = blockElement.getBoundingClientRect();
        this.commandMenuPosition = {
            x: rect.left,
            y: rect.top + rect.height
        };
        this.renderCommandMenu();
    }

    // 隐藏命令菜单
    private hideCommandMenu(): void {
        this.commandMenuVisible = false;
        const menu = document.getElementById('command-menu');
        if (menu) {
            menu.remove();
        }
    }

    // 渲染命令菜单
    private renderCommandMenu(): void {
        this.hideCommandMenu();

        const menu = document.createElement('div');
        menu.id = 'command-menu';
        menu.className = 'command-menu';
        menu.style.left = this.commandMenuPosition.x + 'px';
        menu.style.top = this.commandMenuPosition.y + 'px';

        const commands: ICommand[] = [
            { type: 'paragraph', label: '文本', icon: '📝' },
            { type: 'heading1', label: '标题 1', icon: '📄' },
            { type: 'heading2', label: '标题 2', icon: '📄' },
            { type: 'heading3', label: '标题 3', icon: '📄' },
            { type: 'bulleted-list', label: '无序列表', icon: '•' },
            { type: 'numbered-list', label: '有序列表', icon: '1.' },
            { type: 'todo', label: '待办事项', icon: '☐' }
        ];

        commands.forEach(cmd => {
            const item = document.createElement('div');
            item.className = 'command-item';
            item.innerHTML = `<span class="command-icon">${cmd.icon}</span><span class="command-label">${cmd.label}</span>`;
            item.addEventListener('click', () => {
                this.selectCommand(cmd.type);
            });
            menu.appendChild(item);
        });

        document.body.appendChild(menu);

        // 点击外部关闭
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('#command-menu')) {
                    this.hideCommandMenu();
                }
            }, { once: true });
        }, 0);
    }

    private selectCommand(type: BlockType): void {
        if (this.currentBlockId) {
            this.blockStore.updateBlock(this.currentBlockId, { type });
            this.hideCommandMenu();
            setTimeout(() => {
                this.renderer.focusBlock(this.currentBlockId!);
            }, 0);
        }
    }

    // 显示上下文菜单
    private showContextMenu(blockId: string, e: MouseEvent): void {
        this.contextMenuVisible = true;
        this.currentBlockId = blockId;
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        this.renderContextMenu(blockId, {
            x: rect.left,
            y: rect.top + rect.height
        });
    }

    // 渲染上下文菜单
    private renderContextMenu(blockId: string, position: IPosition): void {
        const existingMenu = document.getElementById('context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.className = 'context-menu';
        menu.style.left = position.x + 'px';
        menu.style.top = position.y + 'px';

        const block = this.blockStore.getBlock(blockId);
        if (!block) return;

        const menuItems: IContextMenuItem[] = [
            {
                label: '转换成',
                icon: '↻',
                hasArrow: true,
                action: () => this.showConvertMenu(blockId)
            },
            {
                label: '颜色',
                icon: '🎨',
                hasArrow: true,
                action: () => this.showColorMenu(blockId)
            },
            { type: 'divider', label: '', icon: '', action: () => {} },
            {
                label: '拷贝区块链接',
                icon: '🔗',
                shortcut: 'Alt + ↑ + L',
                action: () => this.copyBlockLink(blockId)
            },
            {
                label: '创建副本',
                icon: '📋',
                shortcut: 'Ctrl + D',
                action: () => this.duplicateBlock(blockId)
            },
            {
                label: '移动到',
                icon: '→',
                shortcut: 'Ctrl + ↑ + P',
                action: () => this.moveBlock(blockId)
            },
            {
                label: '删除',
                icon: '🗑️',
                shortcut: 'Del',
                action: () => this.deleteBlock(blockId)
            }
        ];

        menuItems.forEach(item => {
            if (item.type === 'divider') {
                const divider = document.createElement('div');
                divider.className = 'context-menu-divider';
                menu.appendChild(divider);
            } else {
                const menuItem = document.createElement('div');
                menuItem.className = 'context-menu-item';
                menuItem.innerHTML = `
                    <span class="context-menu-icon">${item.icon}</span>
                    <span class="context-menu-label">${item.label}</span>
                    ${item.hasArrow ? '<span class="context-menu-arrow">→</span>' : ''}
                    ${item.shortcut ? `<span class="context-menu-shortcut">${item.shortcut}</span>` : ''}
                `;
                menuItem.addEventListener('click', () => {
                    item.action();
                    this.hideContextMenu();
                });
                menu.appendChild(menuItem);
            }
        });

        document.body.appendChild(menu);

        setTimeout(() => {
            document.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                if (!target.closest('#context-menu')) {
                    this.hideContextMenu();
                }
            }, { once: true });
        }, 0);
    }

    private hideContextMenu(): void {
        this.contextMenuVisible = false;
        const menu = document.getElementById('context-menu');
        if (menu) {
            menu.remove();
        }
    }

    // 显示格式化工具栏
    private showFormatToolbar(range: Range): void {
        this.formatToolbarVisible = true;
        const rect = range.getBoundingClientRect();
        this.renderFormatToolbar({
            x: rect.left + rect.width / 2,
            y: rect.top - 10
        });
    }

    // 渲染格式化工具栏
    private renderFormatToolbar(position: IPosition): void {
        const existingToolbar = document.getElementById('format-toolbar');
        if (existingToolbar) {
            existingToolbar.remove();
        }

        const toolbar = document.createElement('div');
        toolbar.id = 'format-toolbar';
        toolbar.className = 'format-toolbar';
        toolbar.style.left = (position.x - 150) + 'px';
        toolbar.style.top = position.y + 'px';

        const formatButtons: Array<
            | { type: 'divider' }
            | { label: string; action: () => void; title: string; icon: string }
        > = [
            { label: 'B', action: () => this.formatText('bold'), title: '粗体 (Ctrl+B)', icon: 'B' },
            { label: 'I', action: () => this.formatText('italic'), title: '斜体 (Ctrl+I)', icon: 'I' },
            { label: 'U', action: () => this.formatText('underline'), title: '下划线 (Ctrl+U)', icon: 'U' },
            { label: 'S', action: () => this.formatText('strikethrough'), title: '删除线', icon: 'S' },
            { type: 'divider' },
            { label: '🔗', action: () => this.insertLink(), title: '链接 (Ctrl+K)', icon: '🔗' },
            { label: '</>', action: () => this.formatText('code'), title: '代码 (Ctrl+E)', icon: '</>' }
        ];

        formatButtons.forEach(btn => {
            if ('type' in btn && btn.type === 'divider') {
                const divider = document.createElement('div');
                divider.className = 'format-toolbar-divider';
                toolbar.appendChild(divider);
            } else if ('action' in btn) {
                const button = document.createElement('button');
                button.className = 'format-button';
                button.innerHTML = btn.icon || btn.label;
                button.title = btn.title;
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    btn.action();
                });
                toolbar.appendChild(button);
            }
        });

        document.body.appendChild(toolbar);
    }

    private hideFormatToolbar(): void {
        this.formatToolbarVisible = false;
        const toolbar = document.getElementById('format-toolbar');
        if (toolbar) {
            toolbar.remove();
        }
    }

    // 格式化文字
    private formatText(format: string): void {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return;
        }

        if (format === 'code') {
            const range = selection.getRangeAt(0);
            const selectedText = selection.toString();
            if (selectedText) {
                const codeParent = (range.commonAncestorContainer as HTMLElement).closest?.('code');
                if (codeParent) {
                    const text = codeParent.textContent || '';
                    const textNode = document.createTextNode(text);
                    codeParent.parentNode?.replaceChild(textNode, codeParent);
                    range.selectNodeContents(textNode);
                    selection.removeAllRanges();
                    selection.addRange(range);
                } else {
                    const codeElement = document.createElement('code');
                    try {
                        range.surroundContents(codeElement);
                    } catch (e) {
                        const contents = range.extractContents();
                        codeElement.appendChild(contents);
                        range.insertNode(codeElement);
                    }
                    const newRange = document.createRange();
                    newRange.selectNodeContents(codeElement);
                    selection.removeAllRanges();
                    selection.addRange(newRange);
                }
            }
        } else {
            // @ts-ignore - execCommand is deprecated but still widely supported for rich text formatting
            document.execCommand(format, false, undefined);
        }
        
        this.hideFormatToolbar();
        
        const contentElement = document.activeElement?.closest('.block-content') as HTMLElement;
        if (contentElement) {
            contentElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }

    // 插入链接
    private insertLink(): void {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        if (!selection.isCollapsed) {
            const url = prompt('输入链接地址:', 'https://');
            if (url) {
                // @ts-ignore - execCommand is deprecated but still widely supported
                document.execCommand('createLink', false, url);
                this.hideFormatToolbar();
                const contentElement = document.activeElement?.closest('.block-content') as HTMLElement;
                if (contentElement) {
                    contentElement.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        } else {
            const url = prompt('输入链接地址:', 'https://');
            if (url) {
                const linkText = prompt('输入链接文本:', url);
                if (linkText) {
                    const link = document.createElement('a');
                    link.href = url;
                    link.textContent = linkText;
                    const range = selection.getRangeAt(0);
                    range.insertNode(link);
                    this.hideFormatToolbar();
                    const contentElement = document.activeElement?.closest('.block-content') as HTMLElement;
                    if (contentElement) {
                        contentElement.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            }
        }
    }

    // 上下文菜单操作
    private showConvertMenu(blockId: string): void {
        const block = this.blockStore.getBlock(blockId);
        if (block) {
            const blockElement = document.querySelector(`[data-block-id="${blockId}"] .block`) as HTMLElement;
            if (blockElement) {
                this.showCommandMenu(blockElement);
            }
        }
    }

    private showColorMenu(blockId: string): void {
        const colors = [
            { name: '灰色', value: '#f1f1ef' },
            { name: '棕色', value: '#f4f1e9' },
            { name: '橙色', value: '#faf4e6' },
            { name: '黄色', value: '#fbf3db' },
            { name: '绿色', value: '#edf3ec' },
            { name: '蓝色', value: '#e7f3f8' },
            { name: '紫色', value: '#f4f0f7' },
            { name: '粉色', value: '#fce8e6' },
            { name: '红色', value: '#fce8e6' }
        ];

        const menu = document.getElementById('context-menu');
        if (menu) {
            const colorMenu = document.createElement('div');
            colorMenu.className = 'color-menu';
            colorMenu.style.left = (menu.offsetWidth) + 'px';
            colorMenu.style.top = '0px';

            colors.forEach(color => {
                const item = document.createElement('div');
                item.className = 'color-menu-item';
                item.style.backgroundColor = color.value;
                item.title = color.name;
                item.addEventListener('click', () => {
                    this.blockStore.updateBlock(blockId, { backgroundColor: color.value });
                    this.hideContextMenu();
                });
                colorMenu.appendChild(item);
            });

            menu.appendChild(colorMenu);
        }
    }

    private copyBlockLink(blockId: string): void {
        const link = `${window.location.href}#${blockId}`;
        navigator.clipboard.writeText(link).then(() => {
            console.log('区块链接已复制');
        });
    }

    private duplicateBlock(blockId: string): void {
        const block = this.blockStore.getBlock(blockId);
        if (block) {
            const rootBlocks = this.blockStore.getRootBlocks();
            const currentIndex = rootBlocks.findIndex(b => b.id === blockId);
            const newBlock = BlockRegistry.fromJSON(block.toJSON());
            (newBlock as any).id = (newBlock as any).generateId();
            this.blockStore.addBlock(newBlock, currentIndex + 1);
        }
    }

    private moveBlock(blockId: string): void {
        console.log('移动到功能');
    }

    // 设置拖拽监听
    private setupDragListeners(): void {
        if (!this.container) return;

        let dragStartY = 0;
        let draggedBlockId: string | null = null;

        this.container.addEventListener('mousedown', (e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('block-drag-handle')) {
                e.preventDefault();
                draggedBlockId = target.dataset.blockId || null;
                if (!draggedBlockId) return;
                
                dragStartY = e.clientY;
                this.draggingBlockId = draggedBlockId;
                
                const wrapper = target.closest('.block-wrapper') as HTMLElement;
                if (wrapper) {
                    wrapper.classList.add('dragging');
                }

                const handleMouseMove = (moveEvent: MouseEvent) => {
                    // 可以在这里添加拖拽时的视觉反馈
                };

                const handleMouseUp = (upEvent: MouseEvent) => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                    
                    const wrapper = document.querySelector(`[data-block-id="${draggedBlockId}"]`) as HTMLElement;
                    if (wrapper) {
                        wrapper.classList.remove('dragging');
                    }

                    const targetElement = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                    const targetWrapper = targetElement?.closest('.block-wrapper') as HTMLElement;
                    
                    if (targetWrapper && targetWrapper.dataset.blockId !== draggedBlockId) {
                        const targetBlockId = targetWrapper.dataset.blockId;
                        if (targetBlockId && draggedBlockId) {
                            const rootBlocks = this.blockStore.getRootBlocks();
                            const sourceIndex = rootBlocks.findIndex(b => b.id === draggedBlockId);
                            const targetIndex = rootBlocks.findIndex(b => b.id === targetBlockId);
                            
                            if (sourceIndex !== -1 && targetIndex !== -1) {
                                this.blockStore.moveBlock(draggedBlockId, targetIndex);
                            }
                        }
                    }

                    this.draggingBlockId = null;
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            }
        });
    }

    // 从元素获取纯文本
    private getPlainTextFromElement(element: HTMLElement): string {
        if (!element) return '';
        const div = document.createElement('div');
        div.innerHTML = element.innerHTML;
        return div.textContent || div.innerText || '';
    }
}

