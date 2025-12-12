/**
 * Plugin Layer - 类型定义
 */

import type { EditorController } from '../logic/EditorController';
import type { Compiler } from '../renderer/types';

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
 * 使用通用 Compiler 接口，支持 DOMCompiler 和 VDOMCompiler
 */
export interface PluginContext {
  controller: EditorController;
  compiler: Compiler<HTMLElement, HTMLElement>;
}
