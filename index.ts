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

  // 4. 添加初始内容（演示所有功能）
  const initialBlocks = [
    // ========== 欢迎区域 ==========
    { type: 'heading1' as const, data: { text: '🚀 Nexo Block Editor' } },
    { type: 'paragraph' as const, data: { text: '一个现代化的块编辑器，采用跨平台编译器架构，支持虚拟 DOM 增量渲染、块级懒加载、多块选择等特性。' } },
    
    { type: 'divider' as const, data: {} },
    
    // ========== 快捷键指南 ==========
    { type: 'heading2' as const, data: { text: '⌨️ 快捷键' } },
    
    { type: 'heading3' as const, data: { text: '编辑操作' } },
    { type: 'bulletList' as const, data: { text: 'Enter - 创建新块' } },
    { type: 'bulletList' as const, data: { text: 'Backspace - 删除/合并块' } },
    { type: 'bulletList' as const, data: { text: 'Tab - 缩进块（嵌套）' } },
    { type: 'bulletList' as const, data: { text: 'Shift + Tab - 取消缩进' } },
    { type: 'bulletList' as const, data: { text: 'Ctrl + Z - 撤销' } },
    { type: 'bulletList' as const, data: { text: 'Ctrl + Shift + Z - 重做' } },
    
    { type: 'heading3' as const, data: { text: '富文本格式' } },
    { type: 'bulletList' as const, data: { text: 'Ctrl + B - 加粗' } },
    { type: 'bulletList' as const, data: { text: 'Ctrl + I - 斜体' } },
    { type: 'bulletList' as const, data: { text: 'Ctrl + U - 下划线' } },
    { type: 'bulletList' as const, data: { text: 'Ctrl + Shift + S - 删除线' } },
    
    { type: 'heading3' as const, data: { text: '多块选择' } },
    { type: 'bulletList' as const, data: { text: 'Ctrl + 点击 - 切换选择单个块' } },
    { type: 'bulletList' as const, data: { text: 'Shift + 点击 - 选择范围内的块' } },
    { type: 'bulletList' as const, data: { text: 'Ctrl + A - 全选所有块' } },
    { type: 'bulletList' as const, data: { text: 'Delete / Backspace - 删除选中块' } },
    { type: 'bulletList' as const, data: { text: 'Ctrl + C / X - 复制/剪切选中块' } },
    
    { type: 'divider' as const, data: {} },
    
    // ========== Markdown 快捷输入 ==========
    { type: 'heading2' as const, data: { text: '✨ Markdown 快捷输入' } },
    { type: 'paragraph' as const, data: { text: '在空行输入以下内容后按空格，自动转换为对应块类型：' } },
    
    { type: 'quote' as const, data: { text: '# 一级标题 | ## 二级标题 | ### 三级标题' } },
    { type: 'quote' as const, data: { text: '- 或 * 无序列表 | 1. 有序列表 | [] 待办事项' } },
    { type: 'quote' as const, data: { text: '> 引用 | ``` 代码块 | --- 分割线' } },
    
    { type: 'divider' as const, data: {} },
    
    // ========== 块类型展示 ==========
    { type: 'heading2' as const, data: { text: '📦 支持的块类型' } },
    
    { type: 'heading3' as const, data: { text: '标题' } },
    { type: 'heading1' as const, data: { text: '这是一级标题 (H1)' } },
    { type: 'heading2' as const, data: { text: '这是二级标题 (H2)' } },
    { type: 'heading3' as const, data: { text: '这是三级标题 (H3)' } },
    
    { type: 'heading3' as const, data: { text: '列表' } },
    { type: 'bulletList' as const, data: { text: '无序列表项 1' } },
    { type: 'bulletList' as const, data: { text: '无序列表项 2' } },
    { type: 'bulletList' as const, data: { text: '无序列表项 3' } },
    
    { type: 'numberedList' as const, data: { text: '有序列表项 1' } },
    { type: 'numberedList' as const, data: { text: '有序列表项 2' } },
    { type: 'numberedList' as const, data: { text: '有序列表项 3' } },
    
    { type: 'heading3' as const, data: { text: '待办事项' } },
    { type: 'todoList' as const, data: { text: '已完成的任务', checked: true } },
    { type: 'todoList' as const, data: { text: '进行中的任务', checked: false } },
    { type: 'todoList' as const, data: { text: '待办任务', checked: false } },
    
    { type: 'heading3' as const, data: { text: '引用' } },
    { type: 'quote' as const, data: { text: '这是一段引用文本。好的设计是尽可能少的设计。—— Dieter Rams' } },
    
    { type: 'heading3' as const, data: { text: '代码块' } },
    { type: 'code' as const, data: { text: '// JavaScript 示例\nfunction greet(name) {\n  console.log(`Hello, ${name}!`);\n}\n\ngreet("Nexo");', language: 'javascript' } },
    
    { type: 'divider' as const, data: {} },
    
    // ========== 嵌套结构演示 ==========
    { type: 'heading2' as const, data: { text: '🌲 嵌套结构' } },
    { type: 'paragraph' as const, data: { text: '使用 Tab 键可以创建嵌套块结构，支持无限层级嵌套。试试选中下面的块按 Tab：' } },
    
    { type: 'bulletList' as const, data: { text: '父级项目 A' } },
    { type: 'bulletList' as const, data: { text: '可以按 Tab 变成子项' } },
    { type: 'bulletList' as const, data: { text: '父级项目 B' } },
    { type: 'bulletList' as const, data: { text: '另一个可嵌套的项' } },
    
    { type: 'divider' as const, data: {} },
    
    // ========== 拖拽排序 ==========
    { type: 'heading2' as const, data: { text: '🔀 拖拽排序' } },
    { type: 'paragraph' as const, data: { text: '鼠标悬停在块左侧会显示拖拽手柄 ⋮⋮，拖动可以重新排列块的顺序。' } },
    { type: 'paragraph' as const, data: { text: '多选块后拖拽，所有选中的块会一起移动。' } },
    
    { type: 'divider' as const, data: {} },
    
    // ========== 斜杠命令 ==========
    { type: 'heading2' as const, data: { text: '/ 斜杠命令' } },
    { type: 'paragraph' as const, data: { text: '在空行输入 / 可以打开命令菜单，快速插入各种块类型。' } },
    
    { type: 'divider' as const, data: {} },
    
    // ========== 架构特性 ==========
    { type: 'heading2' as const, data: { text: '🏗️ 架构特性' } },
    
    { type: 'heading3' as const, data: { text: 'Model 层' } },
    { type: 'bulletList' as const, data: { text: '树形块结构 (parentId / childrenIds)' } },
    { type: 'bulletList' as const, data: { text: '富文本内容模型 (RichText[])' } },
    { type: 'bulletList' as const, data: { text: 'Operation-based 变更系统' } },
    { type: 'bulletList' as const, data: { text: '不可变数据结构' } },
    
    { type: 'heading3' as const, data: { text: 'Logic 层' } },
    { type: 'bulletList' as const, data: { text: 'EditorController - 核心控制器' } },
    { type: 'bulletList' as const, data: { text: 'CommandManager - 撤销/重做系统' } },
    { type: 'bulletList' as const, data: { text: 'EventBus - 事件通信' } },
    { type: 'bulletList' as const, data: { text: 'SelectionManager - 选区管理' } },
    
    { type: 'heading3' as const, data: { text: 'Renderer 层' } },
    { type: 'bulletList' as const, data: { text: '虚拟 DOM (h / diff / patch)' } },
    { type: 'bulletList' as const, data: { text: '增量更新 (只更新变化的部分)' } },
    { type: 'bulletList' as const, data: { text: '块级懒加载 (50+ 块自动启用)' } },
    { type: 'bulletList' as const, data: { text: '渲染缓存 (BlockRenderCache)' } },
    
    { type: 'divider' as const, data: {} },
    
    // ========== 控制台调试 ==========
    { type: 'heading2' as const, data: { text: '🔧 控制台调试' } },
    { type: 'paragraph' as const, data: { text: '打开浏览器开发者工具，可以使用以下命令：' } },
    { type: 'code' as const, data: { text: '// 查看文档结构\nnexo.controller.getDocument()\n\n// 查看所有块\nnexo.controller.getBlocks()\n\n// 创建测试块\nnexo.controller.createBlock("paragraph", { text: "测试" })\n\n// 测试懒加载（添加100个块）\nfor (let i = 0; i < 100; i++) {\n  nexo.controller.createBlock("paragraph", { text: `测试块 ${i+1}` })\n}\n\n// 启用懒加载调试模式\ndocument.querySelector(".nexo-editor").classList.add("nexo-lazy-debug")', language: 'javascript' } },
    
    { type: 'divider' as const, data: {} },
    
    // ========== 空白区域供输入 ==========
    { type: 'heading2' as const, data: { text: '✍️ 开始编辑' } },
    { type: 'paragraph' as const, data: { text: '在下方输入内容，或按 / 打开命令菜单...' } },
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
