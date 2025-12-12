/**
 * Nexo Block Editor - 入口文件
 * 跨平台编译器架构示例
 */

// Model
import { createBlock as createBlockData } from './src/model';

// Logic
import { EditorController } from './src/logic/EditorController';

// Renderer
import { DOMCompiler } from './src/renderer/dom/DOMCompiler';
import {
  ParagraphRenderer,
  Heading1Renderer,
  Heading2Renderer,
  Heading3Renderer,
  BulletListRenderer,
  NumberedListRenderer,
  TodoListRenderer,
  QuoteRenderer,
  CodeRenderer,
  DividerRenderer,
  ImageRenderer,
} from './src/renderer/dom/renderers';

// Plugins
import { SlashMenuPlugin } from './src/plugins/SlashMenuPlugin';
import { ToolbarPlugin } from './src/plugins/ToolbarPlugin';
import { DragHandlePlugin } from './src/plugins/DragHandlePlugin';

// Styles
import './src/styles/index.css';

// ============================================
// 初始化编辑器
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('editor');
  if (!container) {
    console.error('Editor container not found');
    return;
  }

  // 1. 创建控制器（Logic Layer）
  const controller = new EditorController();

  // 2. 创建编译器（Renderer Layer）
  const compiler = new DOMCompiler();

  // 3. 注册块渲染器
  compiler.registerRenderer(new ParagraphRenderer());
  compiler.registerRenderer(new Heading1Renderer());
  compiler.registerRenderer(new Heading2Renderer());
  compiler.registerRenderer(new Heading3Renderer());
  compiler.registerRenderer(new BulletListRenderer());
  compiler.registerRenderer(new NumberedListRenderer());
  compiler.registerRenderer(new TodoListRenderer());
  compiler.registerRenderer(new QuoteRenderer());
  compiler.registerRenderer(new CodeRenderer());
  compiler.registerRenderer(new DividerRenderer());
  compiler.registerRenderer(new ImageRenderer());

  // 4. 初始化编译器
  compiler.init(container, controller);

  // 5. 添加初始内容
  const initialBlocks = [
    { type: 'heading1' as const, data: { text: '欢迎使用 Nexo Editor' } },
    { type: 'paragraph' as const, data: { text: '这是一个采用跨平台编译器架构的块编辑器。' } },
    { type: 'heading2' as const, data: { text: '📐 三层架构' } },
    { type: 'bulletList' as const, data: { text: 'Model 层 - 纯数据结构，与平台无关' } },
    { type: 'bulletList' as const, data: { text: 'Logic 层 - 业务逻辑，与平台无关' } },
    { type: 'bulletList' as const, data: { text: 'Renderer 层 - 编译器实现，平台特定' } },
    { type: 'divider' as const, data: {} },
    { type: 'heading3' as const, data: { text: '✨ 特性' } },
    { type: 'todoList' as const, data: { text: '多种块类型支持', checked: true } },
    { type: 'todoList' as const, data: { text: '斜杠命令菜单', checked: true } },
    { type: 'todoList' as const, data: { text: '浮动工具栏', checked: true } },
    { type: 'todoList' as const, data: { text: '拖拽排序', checked: true } },
    { type: 'todoList' as const, data: { text: '撤销/重做', checked: true } },
    { type: 'paragraph' as const, data: { text: '' } },
  ];

  // 添加初始块
  let lastBlockId: string | undefined;
  initialBlocks.forEach(({ type, data }) => {
    const block = controller.createBlock(type, data, lastBlockId);
    if (block) {
      lastBlockId = block.id;
    }
  });

  // 6. 渲染文档
  compiler.render(controller.getDocument());

  // 7. 初始化插件
  const pluginContext = { controller, compiler };

  const slashMenu = new SlashMenuPlugin();
  const toolbar = new ToolbarPlugin();
  const dragHandle = new DragHandlePlugin();

  slashMenu.init(pluginContext);
  toolbar.init(pluginContext);
  dragHandle.init(pluginContext);

  // 8. 监听文档变化
  controller.on('document:changed', () => {
    console.log('Document changed');
    localStorage.setItem('nexo-editor-content', JSON.stringify(controller.toJSON()));
  });

  // 9. 自动聚焦
  setTimeout(() => {
    const blocks = controller.getBlocks();
    const emptyBlock = blocks.find(b => !b.data.text);
    if (emptyBlock) {
      compiler.focus(emptyBlock.id);
    }
  }, 100);

  // 暴露到全局方便调试
  (window as any).nexo = {
    controller,
    compiler,
    plugins: { slashMenu, toolbar, dragHandle },
  };

  console.log('Nexo Editor initialized with cross-platform architecture');
});

// 导出
export { EditorController } from './src/logic/EditorController';
export { DOMCompiler } from './src/renderer/dom/DOMCompiler';
export * from './src/model/types';
export * from './src/plugins';
