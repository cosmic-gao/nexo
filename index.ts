/**
 * Nexo Block Editor - 入口文件
 * 类 Notion 的块编辑器
 */

import { Editor } from './src/core/Editor';
import { SlashMenu } from './src/plugins/SlashMenu';
import { Toolbar } from './src/plugins/Toolbar';
import { DragHandle } from './src/plugins/DragHandle';
import './src/styles/index.css';

// 等待 DOM 加载
document.addEventListener('DOMContentLoaded', () => {
  // 创建编辑器容器
  const container = document.getElementById('editor');
  if (!container) {
    console.error('Editor container not found');
    return;
  }

  // 初始化插件
  const slashMenu = new SlashMenu();
  const toolbar = new Toolbar();
  const dragHandle = new DragHandle();

  // 创建编辑器实例
  const editor = new Editor({
    container,
    placeholder: "输入 '/' 使用命令...",
    initialBlocks: [
      {
        id: 'block_welcome_1',
        type: 'heading1',
        data: { text: '欢迎使用 Nexo Editor' },
      },
      {
        id: 'block_welcome_2',
        type: 'paragraph',
        data: { text: '这是一个类似 Notion 的块编辑器，使用原生 DOM 和模块化设计。' },
      },
      {
        id: 'block_welcome_3',
        type: 'paragraph',
        data: { text: "输入 '/' 打开命令菜单，选择不同的块类型。" },
      },
      {
        id: 'block_welcome_4',
        type: 'heading2',
        data: { text: '✨ 功能特点' },
      },
      {
        id: 'block_welcome_5',
        type: 'bulletList',
        data: { text: '多种块类型：段落、标题、列表、引用、代码块等' },
      },
      {
        id: 'block_welcome_6',
        type: 'bulletList',
        data: { text: '斜杠命令菜单 - 快速插入内容' },
      },
      {
        id: 'block_welcome_7',
        type: 'bulletList',
        data: { text: '拖拽排序 - 重新组织内容' },
      },
      {
        id: 'block_welcome_8',
        type: 'bulletList',
        data: { text: '撤销/重做 - 完整的编辑历史' },
      },
      {
        id: 'block_welcome_9',
        type: 'divider',
        data: {},
      },
      {
        id: 'block_welcome_10',
        type: 'heading3',
        data: { text: '📝 试试看' },
      },
      {
        id: 'block_welcome_11',
        type: 'todoList',
        data: { text: '在下方输入一些文字', checked: false },
      },
      {
        id: 'block_welcome_12',
        type: 'todoList',
        data: { text: "按 Enter 创建新块", checked: false },
      },
      {
        id: 'block_welcome_13',
        type: 'todoList',
        data: { text: "输入 '/' 打开命令菜单", checked: false },
      },
      {
        id: 'block_welcome_14',
        type: 'paragraph',
        data: { text: '' },
      },
    ],
  });

  // 初始化插件
  slashMenu.init(editor);
  toolbar.init(editor);
  dragHandle.init(editor);

  // 监听内容变化
  editor.on('content:changed', (event) => {
    console.log('Content changed:', event.payload);
    // 可以在这里保存到 localStorage 或发送到服务器
    localStorage.setItem('nexo-editor-content', JSON.stringify(editor.toJSON()));
  });

  // 尝试从 localStorage 恢复内容
  const savedContent = localStorage.getItem('nexo-editor-content');
  if (savedContent) {
    try {
      // 可选：取消注释下面这行来恢复保存的内容
      // editor.fromJSON(JSON.parse(savedContent));
    } catch (e) {
      console.warn('Failed to restore content:', e);
    }
  }

  // 自动聚焦到第一个空块
  setTimeout(() => {
    const blocks = editor.getBlocks();
    const emptyBlock = blocks.find(b => !b.data.text);
    if (emptyBlock) {
      editor.focus(emptyBlock.id);
    } else {
      editor.focus();
    }
  }, 100);

  // 暴露到全局方便调试
  (window as any).nexoEditor = editor;
  
  console.log('Nexo Editor initialized');
});

// 导出类型和类
export { Editor } from './src/core/Editor';
export { SlashMenu } from './src/plugins/SlashMenu';
export type { 
  Block, 
  BlockType, 
  BlockData, 
  EditorConfig,
  EditorInterface,
  Plugin,
} from './src/core/types';

