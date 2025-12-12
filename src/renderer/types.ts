/**
 * Renderer Layer - 类型定义
 * 定义编译器接口和渲染上下文
 */

import type { Block, BlockType, Document } from '../model/types';
import type { EditorController } from '../logic/EditorController';
import type { SimpleSelection, SelectionPoint } from '../logic/SelectionManager';

// ============================================
// Compiler Interface - 编译器接口
// ============================================

/**
 * 渲染上下文 - 传递给块渲染器的信息
 */
export interface RenderContext<TElement = unknown> {
  /** 编辑器控制器 */
  controller: EditorController;
  /** 当前选区 */
  selection: SimpleSelection | null;
  /** 父元素 */
  parent?: TElement;
  /** 块索引 */
  index?: number;
  /** 是否只读 */
  readOnly?: boolean;
}

/**
 * 块渲染器接口 - 每种块类型的渲染器
 */
export interface BlockRenderer<TElement = unknown> {
  /** 块类型 */
  type: BlockType;
  
  /** 渲染块 */
  render(block: Block, context: RenderContext<TElement>): TElement;
  
  /** 更新块 */
  update(element: TElement, block: Block, context: RenderContext<TElement>): void;
  
  /** 销毁块 */
  destroy(element: TElement): void;
}

/**
 * 编译器接口 - 平台特定的渲染实现
 */
export interface Compiler<TElement = unknown, TContainer = unknown> {
  /** 编译器名称 */
  name: string;
  
  /** 初始化编译器 */
  init(container: TContainer, controller: EditorController): void;
  
  /** 渲染整个文档 */
  render(doc: Document): void;
  
  /** 渲染单个块 */
  renderBlock(block: Block, context: RenderContext<TElement>): TElement;
  
  /** 更新单个块 */
  updateBlock(blockId: string, block: Block): void;
  
  /** 删除块元素 */
  removeBlock(blockId: string): void;
  
  /** 获取块元素 */
  getBlockElement(blockId: string): TElement | null;
  
  /** 注册块渲染器 */
  registerRenderer(renderer: BlockRenderer<TElement>): void;
  
  /** 聚焦到块 */
  focus(blockId: string): void;
  
  /** 销毁编译器 */
  destroy(): void;
}

/**
 * 选区适配器接口 - 平台特定的选区处理
 */
export interface SelectionAdapter {
  /** 从平台选区同步到模型 */
  syncFromPlatform(): SimpleSelection | null;
  
  /** 从模型同步到平台选区 */
  syncToPlatform(selection: SimpleSelection): void;
  
  /** 聚焦到块 */
  focusBlock(blockId: string): void;
  
  /** 设置光标位置 */
  setCursor(blockId: string, offset: number): void;
}

/**
 * 输入适配器接口 - 平台特定的输入处理
 */
export interface InputAdapter {
  /** 绑定输入事件 */
  bind(container: unknown): void;
  
  /** 解绑输入事件 */
  unbind(): void;
}

// ============================================
// Plugin Interface for Renderer
// ============================================

/**
 * 渲染器插件接口
 */
export interface RendererPlugin<TElement = unknown> {
  name: string;
  init(compiler: Compiler<TElement>): void;
  destroy(): void;
}
