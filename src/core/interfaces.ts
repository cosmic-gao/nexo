/**
 * Core Interfaces - 核心抽象接口
 * 定义系统中所有组件的通用契约
 */

// ============================================
// 基础类型
// ============================================

export type Disposable = { dispose(): void };
export type Unsubscribe = () => void;

// ============================================
// 事件系统
// ============================================

export interface EventEmitter<TEvents extends Record<string, unknown>> {
  on<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): Unsubscribe;
  off<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): void;
  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void;
  once<K extends keyof TEvents>(event: K, handler: (data: TEvents[K]) => void): Unsubscribe;
}

// ============================================
// 命令系统
// ============================================

export interface Command<TState> {
  readonly id: string;
  readonly name: string;
  execute(state: TState): TState;
  undo(state: TState): TState;
}

export interface CommandExecutor<TState> {
  execute(command: Command<TState>): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

// ============================================
// 选区系统
// ============================================

export interface SelectionPoint {
  blockId: string;
  offset: number;
}

export interface SelectionRange {
  anchor: SelectionPoint;
  focus: SelectionPoint;
  isCollapsed: boolean;
  isBackward: boolean;
}

export interface SelectionController {
  getSelection(): SelectionRange | null;
  setSelection(range: SelectionRange | null): void;
  collapse(to: 'start' | 'end'): void;
  selectAll(): void;
}

// ============================================
// 块系统
// ============================================

export interface BlockData {
  text?: string;
  [key: string]: unknown;
}

export interface BlockNode {
  readonly id: string;
  readonly type: string;
  readonly data: BlockData;
  readonly parentId: string | null;
  readonly childrenIds: readonly string[];
}

export interface BlockOperations {
  getBlock(id: string): BlockNode | undefined;
  getBlocks(): BlockNode[];
  createBlock(type: string, data?: BlockData, afterId?: string): BlockNode | null;
  updateBlock(id: string, data: Partial<BlockData>): void;
  deleteBlock(id: string): void;
  moveBlock(id: string, targetId: string, position: 'before' | 'after'): void;
}

// ============================================
// 渲染系统
// ============================================

export interface RenderNode<T = unknown> {
  element: T;
  blockId: string;
  children: RenderNode<T>[];
}

export interface Renderer<TElement = unknown, TContainer = unknown> extends Disposable {
  readonly name: string;
  mount(container: TContainer): void;
  unmount(): void;
  render(): void;
  getElement(blockId: string): TElement | null;
  focus(blockId: string): void;
}

// ============================================
// 插件系统
// ============================================

export interface PluginHost {
  getController(): BlockOperations & SelectionController;
  getRenderer(): Renderer;
  on(event: string, handler: (...args: unknown[]) => void): Unsubscribe;
}

export interface PluginDefinition extends Disposable {
  readonly name: string;
  readonly version?: string;
  initialize(host: PluginHost): void;
}

// ============================================
// 输入处理
// ============================================

export interface InputHandler extends Disposable {
  readonly name: string;
  bind(container: unknown): void;
  unbind(): void;
}

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  when?: () => boolean;
}

export interface ShortcutManager {
  register(shortcut: KeyboardShortcut): Unsubscribe;
  unregister(key: string): void;
  handle(event: KeyboardEvent): boolean;
}

// ============================================
// 状态管理
// ============================================

export interface Store<TState> {
  getState(): TState;
  setState(state: TState): void;
  subscribe(listener: (state: TState, prevState: TState) => void): Unsubscribe;
}

export interface Reducer<TState, TAction> {
  (state: TState, action: TAction): TState;
}

// ============================================
// 工具类型
// ============================================

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends object ? PartialDeep<T[P]> : T[P];
};

