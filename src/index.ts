/**
 * Nexo Block Editor - 库导出
 * 跨平台编译器架构
 */

// ============================================
// 核心模块
// ============================================

export * as Core from './core';

// ============================================
// 分层架构导出
// ============================================

// Model Layer - 数据模型
export * as Model from './model';

// Logic Layer - 业务逻辑
export * as Logic from './logic';

// Renderer Layer - 渲染器
export * as Renderer from './renderer';

// Selection Layer - 选区
export * as Selection from './selection';

// VDOM - 虚拟 DOM
export * as VDOM from './renderer/vdom';

// Plugins - 插件
export * as Plugins from './plugins';

// ============================================
// 便捷导出（常用类型和函数）
// ============================================

// 控制器
export { EditorController } from './logic/EditorController';
export type { EditorControllerConfig } from './logic/EditorController';

// 编译器
export { DOMCompiler } from './renderer/dom/DOMCompiler';
export { VDOMCompiler } from './renderer/dom/VDOMCompiler';
export { VDOMCompilerRefactored } from './renderer/dom/VDOMCompilerRefactored';

// 文档操作
export { createDocument, getBlock, updateBlock, deleteBlock } from './model/Document';

// 类型
export type { Document, Block, BlockType, BlockData, RichText } from './model/types';
export type { Compiler, BlockRenderer, RenderContext } from './renderer/types';
export type { Plugin, PluginContext } from './plugins/types';

// 工具
export { generateId, debounce, throttle, deepClone, deepEqual } from './core';
