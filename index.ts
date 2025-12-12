/**
 * Nexo Block Editor - 入口文件
 * 跨平台编译器架构示例
 */

// Model
import { createBlock as createBlockData } from './src/model';

// Logic
import { EditorController } from './src/logic/EditorController';

// Renderer - 支持两种编译器
import { DOMCompiler } from './src/renderer/dom/DOMCompiler';
import { VDOMCompiler } from './src/renderer/dom/VDOMCompiler';
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
// 配置：选择编译器
// ============================================
const USE_VDOM_COMPILER = true; // 设为 true 使用虚拟 DOM 编译器

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
  let compiler: DOMCompiler | VDOMCompiler;
  
  if (USE_VDOM_COMPILER) {
    // 使用虚拟 DOM 编译器（增量更新）
    compiler = new VDOMCompiler();
    console.log('🚀 Using VDOMCompiler (Virtual DOM with diff/patch)');
  } else {
    // 使用传统 DOM 编译器
    compiler = new DOMCompiler();
    console.log('📦 Using DOMCompiler (Direct DOM manipulation)');
    
    // 传统编译器需要注册块渲染器
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
  }

  // 3. 初始化编译器
  compiler.init(container, controller);

  // 4. 添加初始内容
  const initialBlocks = [
    { type: 'heading1' as const, data: { text: '欢迎使用 Nexo Editor' } },
    { type: 'paragraph' as const, data: { text: '这是一个采用跨平台编译器架构的块编辑器。' } },
    { type: 'heading2' as const, data: { text: '🎯 快捷操作' } },
    { type: 'paragraph' as const, data: { text: '输入 # 空格 创建标题，输入 - 空格 创建列表' } },
    { type: 'paragraph' as const, data: { text: '选中文字后按 Ctrl+B 加粗，Ctrl+I 斜体' } },
    { type: 'paragraph' as const, data: { text: '按 Tab 缩进，Shift+Tab 取消缩进' } },
    { type: 'divider' as const, data: {} },
    { type: 'heading2' as const, data: { text: '📐 架构特性' } },
    { type: 'bulletList' as const, data: { text: 'Model 层 - 树形块结构 + 富文本模型' } },
    { type: 'bulletList' as const, data: { text: 'Logic 层 - Operation-based 变更系统' } },
    { type: 'bulletList' as const, data: { text: 'Renderer 层 - 虚拟 DOM 增量更新' } },
    { type: 'divider' as const, data: {} },
    { type: 'heading3' as const, data: { text: '✨ 试试 Markdown 快捷输入' } },
    { type: 'todoList' as const, data: { text: '# 标题 / ## 二级标题 / ### 三级标题', checked: true } },
    { type: 'todoList' as const, data: { text: '- 或 * 无序列表', checked: true } },
    { type: 'todoList' as const, data: { text: '1. 有序列表', checked: true } },
    { type: 'todoList' as const, data: { text: '[] 待办事项', checked: true } },
    { type: 'todoList' as const, data: { text: '> 引用块', checked: true } },
    { type: 'todoList' as const, data: { text: '``` 代码块', checked: true } },
    { type: 'todoList' as const, data: { text: '--- 分割线', checked: true } },
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

  // 5. 渲染文档
  compiler.render(controller.getDocument());

  // 6. 初始化插件
  const pluginContext = { controller, compiler };

  const slashMenu = new SlashMenuPlugin();
  const toolbar = new ToolbarPlugin();
  const dragHandle = new DragHandlePlugin();

  slashMenu.init(pluginContext);
  toolbar.init(pluginContext);
  dragHandle.init(pluginContext);

  // 7. 监听文档变化
  controller.on('document:changed', () => {
    localStorage.setItem('nexo-editor-content', JSON.stringify(controller.toJSON()));
  });

  // 8. 自动聚焦
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
    // 切换编译器的方法
    switchCompiler: (useVDOM: boolean) => {
      console.log('请修改 index.ts 中的 USE_VDOM_COMPILER 常量并刷新页面');
    },
  };

  console.log('✅ Nexo Editor initialized');
  console.log('   - Tree structure: ✓');
  console.log('   - Rich text model: ✓');
  console.log('   - Virtual DOM: ✓');
  console.log('   - Markdown shortcuts: ✓');
  console.log('   - Format hotkeys: ✓');
});

// 导出
export { EditorController } from './src/logic/EditorController';
export { DOMCompiler } from './src/renderer/dom/DOMCompiler';
export { VDOMCompiler } from './src/renderer/dom/VDOMCompiler';
export * from './src/model/types';
export * from './src/plugins';
