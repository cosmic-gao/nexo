/**
 * Model Layer - 类型定义 (Enhanced)
 * 支持树形结构、富文本、Operation-based 变更
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
  | 'image'
  | 'toggle'      // 折叠块
  | 'callout'     // 提示框
  | 'table'       // 表格
  | 'column'      // 分栏容器
  | 'columnItem'; // 分栏项

// ============================================
// Rich Text - 富文本模型
// ============================================

export type TextColor = 
  | 'default' | 'gray' | 'brown' | 'orange' | 'yellow' 
  | 'green' | 'blue' | 'purple' | 'pink' | 'red';

export type BackgroundColor = 
  | 'default' | 'gray_background' | 'brown_background' | 'orange_background'
  | 'yellow_background' | 'green_background' | 'blue_background' 
  | 'purple_background' | 'pink_background' | 'red_background';

export interface TextAnnotations {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  code: boolean;
  color: TextColor;
  backgroundColor: BackgroundColor;
}

export const defaultAnnotations: TextAnnotations = {
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  code: false,
  color: 'default',
  backgroundColor: 'default',
};

export interface TextContent {
  type: 'text';
  text: string;
  annotations: TextAnnotations;
  href?: string; // 链接
}

export interface MentionContent {
  type: 'mention';
  mentionType: 'user' | 'page' | 'date';
  id: string;
  annotations: TextAnnotations;
}

export interface EquationContent {
  type: 'equation';
  expression: string;
  annotations: TextAnnotations;
}

export type RichTextItem = TextContent | MentionContent | EquationContent;

export type RichText = RichTextItem[];

// 富文本工具函数
export function createTextItem(text: string, annotations?: Partial<TextAnnotations>): TextContent {
  return {
    type: 'text',
    text,
    annotations: { ...defaultAnnotations, ...annotations },
  };
}

export function richTextToPlainText(richText: RichText): string {
  return richText.map(item => {
    switch (item.type) {
      case 'text': return item.text;
      case 'mention': return `@${item.id}`;
      case 'equation': return item.expression;
    }
  }).join('');
}

export function plainTextToRichText(text: string): RichText {
  if (!text) return [];
  return [createTextItem(text)];
}

// ============================================
// Block Data - 块数据（增强）
// ============================================

export interface BlockData {
  // 通用
  content?: RichText;        // 富文本内容（替代 text）
  text?: string;             // 兼容：纯文本（将被废弃）
  
  // 待办
  checked?: boolean;
  
  // 代码块
  language?: string;
  
  // 图片
  url?: string;
  caption?: RichText;
  
  // 折叠块
  collapsed?: boolean;
  
  // 提示框
  icon?: string;
  calloutColor?: TextColor;
  
  // 表格
  tableWidth?: number;
  hasColumnHeader?: boolean;
  hasRowHeader?: boolean;
  
  // 扩展数据
  [key: string]: unknown;
}

// ============================================
// Block - 块（树形结构）
// ============================================

export interface Block {
  id: string;
  type: BlockType;
  data: BlockData;
  
  // 树形结构
  parentId: string | null;      // 父块 ID（null 表示根级）
  childrenIds: string[];        // 子块 ID 列表（有序）
  
  // 元数据
  meta?: BlockMeta;
}

export interface BlockMeta {
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  version: number;
}

// ============================================
// Document - 文档
// ============================================

export interface Document {
  id: string;
  title: RichText;
  
  // 块存储（扁平化索引）
  blocks: Record<string, Block>;
  
  // 根级块 ID 列表（有序）
  rootIds: string[];
  
  // 元数据
  meta: DocumentMeta;
}

export interface DocumentMeta {
  createdAt: number;
  updatedAt: number;
  version: number;
  icon?: string;
  cover?: string;
}

// ============================================
// Selection - 选区（增强）
// ============================================

export interface TextPoint {
  blockId: string;
  path: number[];    // 在 RichText 数组中的路径 [itemIndex, charOffset]
}

export interface BlockPoint {
  blockId: string;
}

// 文本选区（在块内选择文本）
export interface TextSelection {
  type: 'text';
  anchor: TextPoint;
  focus: TextPoint;
  isCollapsed: boolean;
}

// 块选区（选择整个块）
export interface BlockSelection {
  type: 'block';
  blockIds: string[];  // 选中的块 ID 列表（有序）
}

// 表格选区（选择单元格区域）
export interface TableSelection {
  type: 'table';
  blockId: string;     // 表格块 ID
  startCell: [number, number];  // [row, col]
  endCell: [number, number];
}

export type Selection = TextSelection | BlockSelection | TableSelection;

// 简化的选区点（兼容旧代码）
export interface SelectionPoint {
  blockId: string;
  offset: number;
}

export interface SimpleSelection {
  anchor: SelectionPoint;
  focus: SelectionPoint;
  isCollapsed: boolean;
}

// ============================================
// Operation - 操作（用于协同和历史）
// ============================================

export type OperationType =
  // 块操作
  | 'insert_block'
  | 'delete_block'
  | 'move_block'
  | 'set_block_type'
  | 'set_block_data'
  | 'set_block_parent'
  
  // 文本操作
  | 'insert_text'
  | 'delete_text'
  | 'set_annotation'
  
  // 选区操作
  | 'set_selection'
  
  // 文档操作
  | 'set_document_title'
  | 'set_document_meta';

export interface BaseOperation {
  id: string;
  type: OperationType;
  timestamp: number;
  userId?: string;
}

// 插入块
export interface InsertBlockOperation extends BaseOperation {
  type: 'insert_block';
  block: Block;
  parentId: string | null;
  index: number;  // 在父级 children 中的位置
}

// 删除块
export interface DeleteBlockOperation extends BaseOperation {
  type: 'delete_block';
  blockId: string;
  // 用于撤销
  deletedBlock?: Block;
  deletedDescendants?: Block[];
}

// 移动块
export interface MoveBlockOperation extends BaseOperation {
  type: 'move_block';
  blockId: string;
  newParentId: string | null;
  newIndex: number;
  // 用于撤销
  oldParentId?: string | null;
  oldIndex?: number;
}

// 设置块类型
export interface SetBlockTypeOperation extends BaseOperation {
  type: 'set_block_type';
  blockId: string;
  newType: BlockType;
  oldType?: BlockType;
}

// 设置块数据
export interface SetBlockDataOperation extends BaseOperation {
  type: 'set_block_data';
  blockId: string;
  path: string[];     // 数据路径，如 ['content', 0, 'text']
  value: unknown;
  oldValue?: unknown;
}

// 设置块父级
export interface SetBlockParentOperation extends BaseOperation {
  type: 'set_block_parent';
  blockId: string;
  newParentId: string | null;
  newIndex: number;
  oldParentId?: string | null;
  oldIndex?: number;
}

// 插入文本
export interface InsertTextOperation extends BaseOperation {
  type: 'insert_text';
  blockId: string;
  path: number[];     // RichText 路径
  offset: number;
  text: string;
  annotations?: Partial<TextAnnotations>;
}

// 删除文本
export interface DeleteTextOperation extends BaseOperation {
  type: 'delete_text';
  blockId: string;
  path: number[];
  offset: number;
  length: number;
  deletedText?: string;
}

// 设置文本样式
export interface SetAnnotationOperation extends BaseOperation {
  type: 'set_annotation';
  blockId: string;
  startPath: number[];
  endPath: number[];
  annotation: keyof TextAnnotations;
  value: boolean | TextColor | BackgroundColor;
  oldValues?: Map<string, boolean | TextColor | BackgroundColor>;
}

// 设置选区
export interface SetSelectionOperation extends BaseOperation {
  type: 'set_selection';
  selection: Selection | null;
  oldSelection?: Selection | null;
}

export type Operation =
  | InsertBlockOperation
  | DeleteBlockOperation
  | MoveBlockOperation
  | SetBlockTypeOperation
  | SetBlockDataOperation
  | SetBlockParentOperation
  | InsertTextOperation
  | DeleteTextOperation
  | SetAnnotationOperation
  | SetSelectionOperation;

// ============================================
// Transaction - 事务（多个操作的原子组）
// ============================================

export interface Transaction {
  id: string;
  operations: Operation[];
  timestamp: number;
  userId?: string;
  description?: string;
}

// ============================================
// Command - 命令（可撤销的事务）
// ============================================

export interface Command {
  id: string;
  type: string;
  transaction: Transaction;
  inverseTransaction: Transaction;
  timestamp: number;
}

// ============================================
// Event Types
// ============================================

export type EventType =
  | 'document:changed'
  | 'block:inserted'
  | 'block:deleted'
  | 'block:updated'
  | 'block:moved'
  | 'selection:changed'
  | 'focus:changed'
  | 'transaction:applied'
  | 'command:executed'
  | 'command:undone'
  | 'command:redone';

export interface EditorEvent<T = unknown> {
  type: EventType;
  payload: T;
  timestamp: number;
  source?: 'user' | 'api' | 'collaboration' | 'history';
}

// ============================================
// Utility Functions
// ============================================

let idCounter = 0;

export function generateId(): string {
  return `${Date.now().toString(36)}_${(++idCounter).toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createBlock(
  type: BlockType,
  data: Partial<BlockData> = {},
  parentId: string | null = null
): Block {
  const now = Date.now();
  return {
    id: generateId(),
    type,
    data: {
      content: data.content || (data.text ? plainTextToRichText(data.text) : []),
      ...data,
    },
    parentId,
    childrenIds: [],
    meta: {
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
  };
}

export function createDocument(title: string = ''): Document {
  const now = Date.now();
  return {
    id: generateId(),
    title: plainTextToRichText(title),
    blocks: {},
    rootIds: [],
    meta: {
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
  };
}

export function cloneBlock(block: Block, newId?: string): Block {
  return {
    ...block,
    id: newId || generateId(),
    data: { ...block.data },
    childrenIds: [...block.childrenIds],
    meta: {
      ...block.meta!,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  };
}
