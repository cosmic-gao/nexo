/**
 * Model Layer - 类型定义
 * 纯数据结构，与平台完全无关
 */

// ============================================
// Block Types - 块类型
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

// ============================================
// Block Data - 块数据
// ============================================

export interface BlockData {
  text?: string;
  checked?: boolean;
  language?: string;
  url?: string;
  level?: number;
  [key: string]: unknown;
}

export interface Block {
  id: string;
  type: BlockType;
  data: BlockData;
  children?: string[]; // 子块 ID 列表
  parentId?: string;
  meta?: BlockMeta;
}

export interface BlockMeta {
  createdAt?: number;
  updatedAt?: number;
  createdBy?: string;
}

// ============================================
// Document - 文档
// ============================================

export interface Document {
  id: string;
  title: string;
  blocks: Record<string, Block>; // 块索引
  rootBlockIds: string[]; // 根级块顺序
  meta?: DocumentMeta;
}

export interface DocumentMeta {
  createdAt?: number;
  updatedAt?: number;
  version?: number;
}

// ============================================
// Selection - 选区（平台无关）
// ============================================

export interface SelectionPoint {
  blockId: string;
  offset: number;
}

export interface Selection {
  anchor: SelectionPoint;
  focus: SelectionPoint;
  isCollapsed: boolean;
}

// ============================================
// Operation - 操作（用于协同编辑）
// ============================================

export type OperationType =
  | 'insert_block'
  | 'delete_block'
  | 'update_block'
  | 'move_block'
  | 'set_selection';

export interface Operation {
  type: OperationType;
  path: string[]; // 操作路径
  data?: unknown;
  timestamp: number;
}

// ============================================
// Command - 命令（可撤销）
// ============================================

export interface Command {
  id: string;
  type: string;
  operations: Operation[];
  inverseOperations: Operation[];
  timestamp: number;
}

// ============================================
// Event - 事件
// ============================================

export type EventType =
  | 'document:changed'
  | 'block:created'
  | 'block:updated'
  | 'block:deleted'
  | 'block:moved'
  | 'selection:changed'
  | 'focus:changed'
  | 'command:executed'
  | 'command:undone'
  | 'command:redone';

export interface EditorEvent<T = unknown> {
  type: EventType;
  payload: T;
  timestamp: number;
  source?: 'user' | 'api' | 'collaboration';
}

// ============================================
// Utility Functions
// ============================================

let idCounter = 0;

export function generateId(): string {
  return `block_${Date.now()}_${(++idCounter).toString(36)}`;
}

export function createBlock(type: BlockType, data: BlockData = {}): Block {
  return {
    id: generateId(),
    type,
    data: { text: '', ...data },
    meta: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
}

export function createDocument(title: string = 'Untitled'): Document {
  return {
    id: generateId(),
    title,
    blocks: {},
    rootBlockIds: [],
    meta: {
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
    },
  };
}

export function cloneBlock(block: Block): Block {
  return {
    ...block,
    id: generateId(),
    data: { ...block.data },
    children: block.children ? [...block.children] : undefined,
    meta: {
      ...block.meta,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
}


