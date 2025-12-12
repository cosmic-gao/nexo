/**
 * Nexo Block Editor - 库导出
 * 跨平台编译器架构
 */

// Model Layer - 导出命名空间避免冲突
export * as Model from './model';

// Logic Layer
export * as Logic from './logic';

// Renderer Layer
export * as Renderer from './renderer';

// Selection Layer (新增)
export * as Selection from './selection';

// VDOM (新增)
export * as VDOM from './renderer/vdom';

// Plugins
export * from './plugins';

// 便捷导出常用类型和函数
export { EditorController } from './logic/EditorController';
export type { EditorControllerConfig } from './logic/EditorController';
export { DOMCompiler } from './renderer/dom/DOMCompiler';
export { createDocument, getBlock, updateBlock, deleteBlock } from './model/Document';
export type { Document, Block, BlockType, BlockData, RichText } from './model/types';
