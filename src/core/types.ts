/**
 * Nexo Block Editor - Core Type Definitions
 * 核心类型定义
 */

// ============================================
// Block Types - 块类型定义
// ============================================

export type BlockType = 
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'numberedList'
  | 'todoList'
  | 'quote'
  | 'code'
  | 'divider'
  | 'image';

export interface BlockData {
  text?: string;
  checked?: boolean;
  language?: string;
  url?: string;
  level?: number;
}

export interface Block {
  id: string;
  type: BlockType;
  data: BlockData;
  children?: Block[];
  parentId?: string;
}

// ============================================
// Selection Types - 选区类型定义
// ============================================

export interface SelectionState {
  blockId: string;
  offset: number;
  length: number;
}

export interface BlockSelection {
  anchorBlockId: string;
  anchorOffset: number;
  focusBlockId: string;
  focusOffset: number;
}

// ============================================
// Command Types - 命令类型定义
// ============================================

export interface Command<T = unknown> {
  type: string;
  payload: T;
  execute(): void;
  undo(): void;
}

export interface CommandHistory {
  past: Command[];
  future: Command[];
}

// ============================================
// Event Types - 事件类型定义
// ============================================

export type EditorEventType = 
  | 'block:created'
  | 'block:updated'
  | 'block:deleted'
  | 'block:moved'
  | 'selection:changed'
  | 'focus:changed'
  | 'content:changed';

export interface EditorEvent<T = unknown> {
  type: EditorEventType;
  payload: T;
  timestamp: number;
}

export type EventHandler<T = unknown> = (event: EditorEvent<T>) => void;

// ============================================
// Renderer Types - 渲染器类型定义
// ============================================

export interface BlockRenderer {
  type: BlockType;
  render(block: Block, context: RenderContext): HTMLElement;
  update(element: HTMLElement, block: Block, context: RenderContext): void;
  destroy(element: HTMLElement): void;
}

export interface RenderContext {
  editor: EditorInterface;
  selection: SelectionState | null;
}

// ============================================
// Editor Interface - 编辑器接口
// ============================================

export interface EditorInterface {
  // Block operations
  getBlock(id: string): Block | undefined;
  getBlocks(): Block[];
  createBlock(type: BlockType, data?: BlockData, afterId?: string): Block;
  updateBlock(id: string, data: Partial<BlockData>): void;
  deleteBlock(id: string): void;
  moveBlock(id: string, targetId: string, position: 'before' | 'after'): void;
  
  // Selection
  getSelection(): BlockSelection | null;
  setSelection(selection: BlockSelection): void;
  
  // Focus
  focus(blockId?: string): void;
  blur(): void;
  
  // Commands
  execute(command: Command): void;
  undo(): void;
  redo(): void;
  
  // Events
  on<T>(type: EditorEventType, handler: EventHandler<T>): void;
  off<T>(type: EditorEventType, handler: EventHandler<T>): void;
  emit<T>(type: EditorEventType, payload: T): void;
  
  // DOM
  getContainer(): HTMLElement;
  getBlockElement(id: string): HTMLElement | null;
}

// ============================================
// Plugin Types - 插件类型定义
// ============================================

export interface Plugin {
  name: string;
  init(editor: EditorInterface): void;
  destroy(): void;
}

// ============================================
// Config Types - 配置类型定义
// ============================================

export interface EditorConfig {
  container: HTMLElement | string;
  initialBlocks?: Block[];
  placeholder?: string;
  readOnly?: boolean;
  plugins?: Plugin[];
}

// ============================================
// Utility Types - 工具类型
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function generateId(): string {
  return `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createBlock(type: BlockType, data: BlockData = {}): Block {
  return {
    id: generateId(),
    type,
    data: { text: '', ...data },
  };
}

