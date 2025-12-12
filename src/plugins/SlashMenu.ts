/**
 * SlashMenu - 斜杠命令菜单
 * 类似 Notion 的 "/" 命令菜单
 */

import type { EditorInterface, BlockType, Plugin } from '../core/types';

interface SlashMenuItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  type: BlockType;
  keywords: string[];
}

const defaultMenuItems: SlashMenuItem[] = [
  {
    id: 'paragraph',
    label: '文本',
    description: '普通文本段落',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 4v16"/><path d="M17 4v16"/><path d="M19 4H9.5a4.5 4.5 0 0 0 0 9H13"/></svg>`,
    type: 'paragraph',
    keywords: ['text', 'paragraph', '段落', '文本'],
  },
  {
    id: 'heading1',
    label: '标题 1',
    description: '大标题',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>`,
    type: 'heading1',
    keywords: ['h1', 'heading', '标题', '大标题'],
  },
  {
    id: 'heading2',
    label: '标题 2',
    description: '中标题',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>`,
    type: 'heading2',
    keywords: ['h2', 'heading', '标题', '中标题'],
  },
  {
    id: 'heading3',
    label: '标题 3',
    description: '小标题',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg>`,
    type: 'heading3',
    keywords: ['h3', 'heading', '标题', '小标题'],
  },
  {
    id: 'bulletList',
    label: '无序列表',
    description: '使用项目符号创建列表',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/></svg>`,
    type: 'bulletList',
    keywords: ['bullet', 'list', 'ul', '列表', '无序'],
  },
  {
    id: 'numberedList',
    label: '有序列表',
    description: '使用数字创建列表',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>`,
    type: 'numberedList',
    keywords: ['number', 'list', 'ol', '列表', '有序', '数字'],
  },
  {
    id: 'todoList',
    label: '待办事项',
    description: '使用复选框跟踪任务',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><line x1="13" y1="6" x2="21" y2="6"/><line x1="13" y1="12" x2="21" y2="12"/><line x1="13" y1="18" x2="21" y2="18"/></svg>`,
    type: 'todoList',
    keywords: ['todo', 'checkbox', 'task', '待办', '任务', '复选框'],
  },
  {
    id: 'quote',
    label: '引用',
    description: '引用文本块',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3"/></svg>`,
    type: 'quote',
    keywords: ['quote', 'blockquote', '引用', '引述'],
  },
  {
    id: 'code',
    label: '代码块',
    description: '代码片段',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    type: 'code',
    keywords: ['code', 'codeblock', '代码', '程序'],
  },
  {
    id: 'divider',
    label: '分割线',
    description: '水平分割线',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/></svg>`,
    type: 'divider',
    keywords: ['divider', 'hr', 'line', '分割线', '分隔'],
  },
  {
    id: 'image',
    label: '图片',
    description: '上传或嵌入图片',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    type: 'image',
    keywords: ['image', 'picture', 'photo', '图片', '图像'],
  },
];

export class SlashMenu implements Plugin {
  name = 'slash-menu';

  private editor: EditorInterface | null = null;
  private menuElement: HTMLElement | null = null;
  private items: SlashMenuItem[] = defaultMenuItems;
  private filteredItems: SlashMenuItem[] = defaultMenuItems;
  private selectedIndex: number = 0;
  private isVisible: boolean = false;
  private currentBlockId: string | null = null;
  private searchQuery: string = '';

  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleInput: (e: Event) => void;
  private boundHandleClick: (e: MouseEvent) => void;

  constructor() {
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleInput = this.handleInput.bind(this);
    this.boundHandleClick = this.handleClickOutside.bind(this);
  }

  init(editor: EditorInterface): void {
    this.editor = editor;
    this.createMenuElement();
    
    editor.on('focus:changed', (event) => {
      const payload = event.payload as { blockId: string; showSlashMenu?: boolean };
      if (payload.showSlashMenu) {
        this.show(payload.blockId);
      }
    });
  }

  destroy(): void {
    this.hide();
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
    }
    this.editor = null;
  }

  private createMenuElement(): void {
    this.menuElement = document.createElement('div');
    this.menuElement.className = 'nexo-slash-menu';
    this.menuElement.style.display = 'none';
    document.body.appendChild(this.menuElement);
  }

  private renderMenu(): void {
    if (!this.menuElement) return;

    this.menuElement.innerHTML = `
      <div class="nexo-slash-menu-header">
        <span class="nexo-slash-menu-title">基础块</span>
      </div>
      <div class="nexo-slash-menu-items">
        ${this.filteredItems.map((item, index) => `
          <div class="nexo-slash-menu-item ${index === this.selectedIndex ? 'selected' : ''}" data-index="${index}">
            <div class="nexo-slash-menu-item-icon">${item.icon}</div>
            <div class="nexo-slash-menu-item-content">
              <div class="nexo-slash-menu-item-label">${item.label}</div>
              <div class="nexo-slash-menu-item-description">${item.description}</div>
            </div>
          </div>
        `).join('')}
        ${this.filteredItems.length === 0 ? '<div class="nexo-slash-menu-empty">没有找到匹配的命令</div>' : ''}
      </div>
    `;

    // 绑定点击事件
    this.menuElement.querySelectorAll('.nexo-slash-menu-item').forEach((itemEl) => {
      itemEl.addEventListener('click', () => {
        const index = parseInt(itemEl.getAttribute('data-index') || '0', 10);
        this.selectItem(index);
      });

      itemEl.addEventListener('mouseenter', () => {
        const index = parseInt(itemEl.getAttribute('data-index') || '0', 10);
        this.selectedIndex = index;
        this.updateSelection();
      });
    });
  }

  private updateSelection(): void {
    if (!this.menuElement) return;

    this.menuElement.querySelectorAll('.nexo-slash-menu-item').forEach((itemEl, index) => {
      itemEl.classList.toggle('selected', index === this.selectedIndex);
    });

    // 滚动到可见区域
    const selectedEl = this.menuElement.querySelector('.nexo-slash-menu-item.selected');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }

  show(blockId: string): void {
    if (!this.menuElement || !this.editor) return;

    this.currentBlockId = blockId;
    this.isVisible = true;
    this.selectedIndex = 0;
    this.searchQuery = '';
    this.filteredItems = this.items;

    // 定位菜单
    const blockElement = this.editor.getBlockElement(blockId);
    if (blockElement) {
      const rect = blockElement.getBoundingClientRect();
      this.menuElement.style.position = 'fixed';
      this.menuElement.style.top = `${rect.bottom + 4}px`;
      this.menuElement.style.left = `${rect.left}px`;
    }

    this.menuElement.style.display = 'block';
    this.renderMenu();

    // 绑定事件
    document.addEventListener('keydown', this.boundHandleKeyDown, true);
    this.editor.getContainer().addEventListener('input', this.boundHandleInput);
    document.addEventListener('click', this.boundHandleClick);
  }

  hide(): void {
    if (!this.menuElement) return;

    this.isVisible = false;
    this.menuElement.style.display = 'none';

    // 解绑事件
    document.removeEventListener('keydown', this.boundHandleKeyDown, true);
    if (this.editor) {
      this.editor.getContainer().removeEventListener('input', this.boundHandleInput);
    }
    document.removeEventListener('click', this.boundHandleClick);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isVisible) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex = (this.selectedIndex + 1) % this.filteredItems.length;
        this.updateSelection();
        break;

      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex = (this.selectedIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
        this.updateSelection();
        break;

      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        this.selectItem(this.selectedIndex);
        break;

      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.hide();
        // 清除斜杠
        if (this.currentBlockId && this.editor) {
          const block = this.editor.getBlock(this.currentBlockId);
          if (block && block.data.text?.startsWith('/')) {
            this.editor.updateBlock(this.currentBlockId, {
              text: block.data.text.slice(1 + this.searchQuery.length),
            });
          }
        }
        break;
    }
  }

  private handleInput(e: Event): void {
    if (!this.isVisible || !this.currentBlockId || !this.editor) return;

    const block = this.editor.getBlock(this.currentBlockId);
    if (!block) return;

    const text = block.data.text || '';
    
    // 检查是否仍以 "/" 开头
    if (!text.startsWith('/')) {
      this.hide();
      return;
    }

    // 提取搜索关键词
    this.searchQuery = text.slice(1).toLowerCase();
    this.filterItems(this.searchQuery);
  }

  private filterItems(query: string): void {
    if (!query) {
      this.filteredItems = this.items;
    } else {
      this.filteredItems = this.items.filter(item =>
        item.label.toLowerCase().includes(query) ||
        item.keywords.some(kw => kw.toLowerCase().includes(query))
      );
    }

    this.selectedIndex = 0;
    this.renderMenu();
  }

  private selectItem(index: number): void {
    if (!this.editor || !this.currentBlockId) return;

    const item = this.filteredItems[index];
    if (!item) return;

    // 清除斜杠命令文本
    this.editor.updateBlock(this.currentBlockId, { text: '' });

    // 转换块类型
    (this.editor as any).changeBlockType(this.currentBlockId, item.type);

    this.hide();

    // 重新聚焦
    requestAnimationFrame(() => {
      this.editor?.focus(this.currentBlockId!);
    });
  }

  private handleClickOutside(e: MouseEvent): void {
    if (!this.menuElement) return;

    const target = e.target as HTMLElement;
    if (!this.menuElement.contains(target)) {
      this.hide();
    }
  }

  // 公开方法：添加自定义菜单项
  addItem(item: SlashMenuItem): void {
    this.items.push(item);
  }

  // 公开方法：移除菜单项
  removeItem(id: string): void {
    this.items = this.items.filter(item => item.id !== id);
  }
}

