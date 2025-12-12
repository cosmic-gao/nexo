/**
 * Plugin Layer - 类型定义
 */

import type { EditorController } from '../logic/EditorController';
import type { DOMCompiler } from '../renderer/dom/DOMCompiler';

/**
 * 插件接口
 */
export interface Plugin {
  name: string;
  init(context: PluginContext): void;
  destroy(): void;
}

/**
 * 插件上下文
 */
export interface PluginContext {
  controller: EditorController;
  compiler: DOMCompiler;
}


