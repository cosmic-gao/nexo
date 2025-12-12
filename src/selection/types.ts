/**
 * Selection Layer - 类型定义
 * 抽象选区模型，支持多块和跨块选择
 */

import type { RichText, TextAnnotations } from '../model/types';

// ============================================
// 基础点位类型
// ============================================

/**
 * 文本点位 - 在富文本中的精确位置
 */
export interface TextPoint {
  /** 块 ID */
  blockId: string;
  /** 在 RichText 数组中的索引 */
  itemIndex: number;
  /** 在文本项内的字符偏移 */
  charOffset: number;
}

/**
 * 块点位 - 块级别的位置
 */
export interface BlockPoint {
  /** 块 ID */
  blockId: string;
  /** 位置类型：块的开头、结尾或整个块 */
  position: 'start' | 'end' | 'whole';
}

/**
 * 通用点位
 */
export type Point = TextPoint | BlockPoint;

// ============================================
// 选区类型
// ============================================

/**
 * 光标选区 - 无选中内容，只有插入点
 */
export interface CaretSelection {
  type: 'caret';
  /** 光标位置 */
  point: TextPoint;
}

/**
 * 文本范围选区 - 在单个块内选择文本
 */
export interface TextRangeSelection {
  type: 'text-range';
  /** 锚点（选择开始位置） */
  anchor: TextPoint;
  /** 焦点（选择结束位置，可能在锚点之前） */
  focus: TextPoint;
  /** 是否是向后选择 */
  isForward: boolean;
}

/**
 * 块选区 - 选择整个块
 */
export interface BlockSelection {
  type: 'block';
  /** 选中的块 ID 列表（有序） */
  blockIds: string[];
}

/**
 * 跨块选区 - 跨越多个块的文本选择
 */
export interface CrossBlockSelection {
  type: 'cross-block';
  /** 起始点 */
  anchor: TextPoint;
  /** 结束点 */
  focus: TextPoint;
  /** 中间完全选中的块 ID */
  middleBlockIds: string[];
  /** 是否是向后选择 */
  isForward: boolean;
}

/**
 * 表格单元格选区
 */
export interface TableCellSelection {
  type: 'table-cell';
  /** 表格块 ID */
  tableBlockId: string;
  /** 起始单元格 [row, col] */
  startCell: [number, number];
  /** 结束单元格 [row, col] */
  endCell: [number, number];
}

/**
 * 所有选区类型的联合
 */
export type Selection = 
  | CaretSelection 
  | TextRangeSelection 
  | BlockSelection 
  | CrossBlockSelection 
  | TableCellSelection;

// ============================================
// 选区状态
// ============================================

export interface SelectionState {
  /** 当前选区 */
  selection: Selection | null;
  /** 选区是否激活（编辑器是否聚焦） */
  isActive: boolean;
  /** 上一次的选区（用于比较变化） */
  previousSelection: Selection | null;
}

// ============================================
// 选区事件
// ============================================

export type SelectionEventType = 
  | 'selection:change'
  | 'selection:collapse'
  | 'selection:expand'
  | 'selection:clear';

export interface SelectionEvent {
  type: SelectionEventType;
  selection: Selection | null;
  previousSelection: Selection | null;
  timestamp: number;
}

// ============================================
// 选区操作
// ============================================

export type SelectionActionType =
  | 'set'           // 设置选区
  | 'collapse'      // 折叠到点
  | 'extend'        // 扩展选区
  | 'selectAll'     // 全选
  | 'selectBlock'   // 选择块
  | 'selectBlocks'  // 选择多个块
  | 'clear';        // 清除选区

export interface SetSelectionAction {
  type: 'set';
  selection: Selection;
}

export interface CollapseSelectionAction {
  type: 'collapse';
  to: 'anchor' | 'focus' | 'start' | 'end';
}

export interface ExtendSelectionAction {
  type: 'extend';
  direction: 'forward' | 'backward' | 'up' | 'down';
  unit: 'character' | 'word' | 'line' | 'block' | 'all';
}

export interface SelectAllAction {
  type: 'selectAll';
  scope: 'block' | 'document';
}

export interface SelectBlockAction {
  type: 'selectBlock';
  blockId: string;
}

export interface SelectBlocksAction {
  type: 'selectBlocks';
  blockIds: string[];
}

export interface ClearSelectionAction {
  type: 'clear';
}

export type SelectionAction = 
  | SetSelectionAction
  | CollapseSelectionAction
  | ExtendSelectionAction
  | SelectAllAction
  | SelectBlockAction
  | SelectBlocksAction
  | ClearSelectionAction;

// ============================================
// 选区范围信息
// ============================================

export interface SelectionRange {
  /** 开始块 ID */
  startBlockId: string;
  /** 开始偏移 */
  startOffset: number;
  /** 结束块 ID */
  endBlockId: string;
  /** 结束偏移 */
  endOffset: number;
  /** 涉及的所有块 ID */
  blockIds: string[];
  /** 是否折叠 */
  isCollapsed: boolean;
}

// ============================================
// 选区内容信息
// ============================================

export interface SelectionContent {
  /** 纯文本内容 */
  plainText: string;
  /** 富文本内容（按块组织） */
  richText: Map<string, RichText>;
  /** 选中的完整块 */
  blocks: string[];
  /** 是否包含多个块 */
  isMultiBlock: boolean;
}

// ============================================
// 选区样式信息
// ============================================

export interface SelectionStyles {
  /** 选区内的文本样式 */
  annotations: Partial<TextAnnotations>;
  /** 样式是否一致 */
  isConsistent: boolean;
}


