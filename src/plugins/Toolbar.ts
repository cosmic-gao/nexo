/**
 * Toolbar - 浮动工具栏插件
 * 选中文本时显示格式化工具
 */

import type { EditorInterface, Plugin, BlockType } from '../core/types';

interface ToolbarItem {
  id: string;
  icon: string;
  title: string;
  action: (editor: EditorInterface) => void;
  isActive?: (editor: EditorInterface) => boolean;
}

const defaultToolbarItems: ToolbarItem[] = [
  {
    id: 'bold',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>`,
    title: '粗体',
    action: () => document.execCommand('bold', false),
  },
  {
    id: 'italic',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
    title: '斜体',
    action: () => document.execCommand('italic', false),
  },
  {
    id: 'underline',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" y1="20" x2="20" y2="20"/></svg>`,
    title: '下划线',
    action: () => document.execCommand('underline', false),
  },
  {
    id: 'strikethrough',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.3 4.9c-2.3-.6-4.4-1-6.2-.9-2.7 0-5.3.7-5.3 3.6 0 1.5 1.8 3.3 5.4 3.3"/><path d="M4 12h16"/><path d="M6.7 19.1c2.3.6 4.4 1 6.2.9 2.7 0 5.3-.7 5.3-3.6 0-1.5-1.8-3.3-5.4-3.3"/></svg>`,
    title: '删除线',
    action: () => document.execCommand('strikeThrough', false),
  },
  {
    id: 'separator1',
    icon: '',
    title: '',
    action: () => {},
  },
  {
    id: 'code',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    title: '行内代码',
    action: () => {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const selectedText = range.toString();
        if (selectedText) {
          const code = document.createElement('code');
          code.style.cssText = 'background: var(--nexo-bg-tertiary); padding: 2px 6px; border-radius: 4px; font-family: var(--nexo-font-mono); font-size: 0.9em;';
          code.textContent = selectedText;
          range.deleteContents();
          range.insertNode(code);
          selection.removeAllRanges();
        }
      }
    },
  },
  {
    id: 'link',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    title: '链接',
    action: () => {
      const url = prompt('输入链接地址:', 'https://');
      if (url) {
        document.execCommand('createLink', false, url);
      }
    },
  },
  {
    id: 'separator2',
    icon: '',
    title: '',
    action: () => {},
  },
  {
    id: 'heading1',
    icon: `<span style="font-weight: 600; font-size: 14px;">H1</span>`,
    title: '标题 1',
    action: (editor) => {
      const selection = editor.getSelection();
      if (selection) {
        (editor as any).changeBlockType(selection.anchorBlockId, 'heading1');
      }
    },
  },
  {
    id: 'heading2',
    icon: `<span style="font-weight: 600; font-size: 13px;">H2</span>`,
    title: '标题 2',
    action: (editor) => {
      const selection = editor.getSelection();
      if (selection) {
        (editor as any).changeBlockType(selection.anchorBlockId, 'heading2');
      }
    },
  },
  {
    id: 'quote',
    icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3"/></svg>`,
    title: '引用',
    action: (editor) => {
      const selection = editor.getSelection();
      if (selection) {
        (editor as any).changeBlockType(selection.anchorBlockId, 'quote');
      }
    },
  },
];

export class Toolbar implements Plugin {
  name = 'toolbar';

  private editor: EditorInterface | null = null;
  private toolbarElement: HTMLElement | null = null;
  private items: ToolbarItem[] = defaultToolbarItems;
  private isVisible: boolean = false;

  private boundHandleSelectionChange: () => void;
  private boundHandleMouseUp: () => void;
  private boundHandleScroll: () => void;

  constructor() {
    this.boundHandleSelectionChange = this.debounce(this.handleSelectionChange.bind(this), 100);
    this.boundHandleMouseUp = this.debounce(this.handleMouseUp.bind(this), 50);
    this.boundHandleScroll = this.hide.bind(this);
  }

  init(editor: EditorInterface): void {
    this.editor = editor;
    this.createToolbarElement();
    
    document.addEventListener('selectionchange', this.boundHandleSelectionChange);
    editor.getContainer().addEventListener('mouseup', this.boundHandleMouseUp);
    window.addEventListener('scroll', this.boundHandleScroll, true);
  }

  destroy(): void {
    this.hide();
    if (this.toolbarElement) {
      this.toolbarElement.remove();
      this.toolbarElement = null;
    }
    
    document.removeEventListener('selectionchange', this.boundHandleSelectionChange);
    if (this.editor) {
      this.editor.getContainer().removeEventListener('mouseup', this.boundHandleMouseUp);
    }
    window.removeEventListener('scroll', this.boundHandleScroll, true);
    
    this.editor = null;
  }

  private createToolbarElement(): void {
    this.toolbarElement = document.createElement('div');
    this.toolbarElement.className = 'nexo-toolbar';
    this.toolbarElement.style.display = 'none';
    
    this.renderToolbar();
    document.body.appendChild(this.toolbarElement);
  }

  private renderToolbar(): void {
    if (!this.toolbarElement) return;

    this.toolbarElement.innerHTML = this.items.map(item => {
      if (item.id.startsWith('separator')) {
        return '<div class="nexo-toolbar-separator"></div>';
      }
      return `
        <button 
          class="nexo-toolbar-button" 
          data-id="${item.id}" 
          title="${item.title}"
        >
          ${item.icon}
        </button>
      `;
    }).join('');

    // 绑定点击事件
    this.toolbarElement.querySelectorAll('.nexo-toolbar-button').forEach(button => {
      button.addEventListener('mousedown', (e) => {
        e.preventDefault(); // 防止失去选区
        e.stopPropagation();
        
        const id = button.getAttribute('data-id');
        const item = this.items.find(i => i.id === id);
        if (item && this.editor) {
          item.action(this.editor);
        }
      });
    });
  }

  private handleSelectionChange(): void {
    if (!this.editor) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      this.hide();
      return;
    }

    // 检查选区是否在编辑器内
    const range = selection.getRangeAt(0);
    const container = this.editor.getContainer();
    if (!container.contains(range.commonAncestorContainer)) {
      this.hide();
      return;
    }

    // 如果有选中文本，显示工具栏
    if (selection.toString().trim()) {
      this.show(range);
    } else {
      this.hide();
    }
  }

  private handleMouseUp(): void {
    // 延迟检查，等待选区稳定
    requestAnimationFrame(() => {
      this.handleSelectionChange();
    });
  }

  private show(range: Range): void {
    if (!this.toolbarElement) return;

    this.isVisible = true;
    this.toolbarElement.style.display = 'flex';

    // 定位工具栏
    const rect = range.getBoundingClientRect();
    const toolbarRect = this.toolbarElement.getBoundingClientRect();
    
    let left = rect.left + (rect.width / 2) - (toolbarRect.width / 2);
    let top = rect.top - toolbarRect.height - 8;

    // 边界检查
    if (left < 8) left = 8;
    if (left + toolbarRect.width > window.innerWidth - 8) {
      left = window.innerWidth - toolbarRect.width - 8;
    }
    if (top < 8) {
      top = rect.bottom + 8;
    }

    this.toolbarElement.style.left = `${left}px`;
    this.toolbarElement.style.top = `${top}px`;
  }

  hide(): void {
    if (!this.toolbarElement) return;
    
    this.isVisible = false;
    this.toolbarElement.style.display = 'none';
  }

  private debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
    let timeoutId: number | undefined;
    return ((...args: any[]) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => fn(...args), delay);
    }) as T;
  }

  // 公开方法：添加自定义工具
  addItem(item: ToolbarItem, position?: number): void {
    if (position !== undefined) {
      this.items.splice(position, 0, item);
    } else {
      this.items.push(item);
    }
    this.renderToolbar();
  }

  // 公开方法：移除工具
  removeItem(id: string): void {
    this.items = this.items.filter(item => item.id !== id);
    this.renderToolbar();
  }
}

