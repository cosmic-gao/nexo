/**
 * Model Layer - Operations 操作系统
 * Operation-based 变更，支持协同和历史
 */

import type {
  Document,
  Block,
  BlockType,
  BlockData,
  RichText,
  TextAnnotations,
  Operation,
  Transaction,
  InsertBlockOperation,
  DeleteBlockOperation,
  MoveBlockOperation,
  SetBlockTypeOperation,
  SetBlockDataOperation,
  InsertTextOperation,
  DeleteTextOperation,
  SetAnnotationOperation,
} from './types';
import { generateId, createBlock as createBlockUtil } from './types';
import * as DocOps from './Document';

// ============================================
// Operation 创建工厂
// ============================================

export const Operations = {
  /**
   * 创建插入块操作
   */
  insertBlock(
    block: Block,
    parentId: string | null,
    index: number
  ): InsertBlockOperation {
    return {
      id: generateId(),
      type: 'insert_block',
      block,
      parentId,
      index,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建删除块操作
   */
  deleteBlock(blockId: string): DeleteBlockOperation {
    return {
      id: generateId(),
      type: 'delete_block',
      blockId,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建移动块操作
   */
  moveBlock(
    blockId: string,
    newParentId: string | null,
    newIndex: number
  ): MoveBlockOperation {
    return {
      id: generateId(),
      type: 'move_block',
      blockId,
      newParentId,
      newIndex,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建设置块类型操作
   */
  setBlockType(blockId: string, newType: BlockType): SetBlockTypeOperation {
    return {
      id: generateId(),
      type: 'set_block_type',
      blockId,
      newType,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建设置块数据操作
   */
  setBlockData(
    blockId: string,
    path: string[],
    value: unknown
  ): SetBlockDataOperation {
    return {
      id: generateId(),
      type: 'set_block_data',
      blockId,
      path,
      value,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建插入文本操作
   */
  insertText(
    blockId: string,
    path: number[],
    offset: number,
    text: string,
    annotations?: Partial<TextAnnotations>
  ): InsertTextOperation {
    return {
      id: generateId(),
      type: 'insert_text',
      blockId,
      path,
      offset,
      text,
      annotations,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建删除文本操作
   */
  deleteText(
    blockId: string,
    path: number[],
    offset: number,
    length: number
  ): DeleteTextOperation {
    return {
      id: generateId(),
      type: 'delete_text',
      blockId,
      path,
      offset,
      length,
      timestamp: Date.now(),
    };
  },

  /**
   * 创建设置文本样式操作
   */
  setAnnotation(
    blockId: string,
    startPath: number[],
    endPath: number[],
    annotation: keyof TextAnnotations,
    value: boolean | string
  ): SetAnnotationOperation {
    return {
      id: generateId(),
      type: 'set_annotation',
      blockId,
      startPath,
      endPath,
      annotation,
      value: value as any,
      timestamp: Date.now(),
    };
  },
};

// ============================================
// Operation 应用
// ============================================

/**
 * 应用单个操作到文档
 */
export function applyOperation(doc: Document, op: Operation): Document {
  switch (op.type) {
    case 'insert_block':
      return applyInsertBlock(doc, op);
    case 'delete_block':
      return applyDeleteBlock(doc, op);
    case 'move_block':
      return applyMoveBlock(doc, op);
    case 'set_block_type':
      return applySetBlockType(doc, op);
    case 'set_block_data':
      return applySetBlockData(doc, op);
    case 'insert_text':
      return applyInsertText(doc, op);
    case 'delete_text':
      return applyDeleteText(doc, op);
    case 'set_annotation':
      return applySetAnnotation(doc, op);
    default:
      return doc;
  }
}

/**
 * 应用事务（多个操作）
 */
export function applyTransaction(doc: Document, transaction: Transaction): Document {
  return transaction.operations.reduce(
    (currentDoc, op) => applyOperation(currentDoc, op),
    doc
  );
}

// ============================================
// 具体操作应用实现
// ============================================

function applyInsertBlock(doc: Document, op: InsertBlockOperation): Document {
  return DocOps.insertBlock(doc, op.block, op.parentId, op.index);
}

function applyDeleteBlock(doc: Document, op: DeleteBlockOperation): Document {
  return DocOps.deleteBlock(doc, op.blockId);
}

function applyMoveBlock(doc: Document, op: MoveBlockOperation): Document {
  return DocOps.moveBlock(doc, op.blockId, op.newParentId, op.newIndex);
}

function applySetBlockType(doc: Document, op: SetBlockTypeOperation): Document {
  return DocOps.changeBlockType(doc, op.blockId, op.newType);
}

function applySetBlockData(doc: Document, op: SetBlockDataOperation): Document {
  const block = doc.blocks[op.blockId];
  if (!block) return doc;

  // 使用路径设置值
  const newData = setValueAtPath(block.data, op.path, op.value);
  return DocOps.updateBlock(doc, op.blockId, newData);
}

function applyInsertText(doc: Document, op: InsertTextOperation): Document {
  const block = doc.blocks[op.blockId];
  if (!block) return doc;

  const content = block.data.content || [];
  const newContent = insertTextInContent(content, op.path, op.offset, op.text, op.annotations);
  
  return DocOps.updateBlock(doc, op.blockId, { content: newContent });
}

function applyDeleteText(doc: Document, op: DeleteTextOperation): Document {
  const block = doc.blocks[op.blockId];
  if (!block) return doc;

  const content = block.data.content || [];
  const newContent = deleteTextInContent(content, op.path, op.offset, op.length);
  
  return DocOps.updateBlock(doc, op.blockId, { content: newContent });
}

function applySetAnnotation(doc: Document, op: SetAnnotationOperation): Document {
  const block = doc.blocks[op.blockId];
  if (!block) return doc;

  const content = block.data.content || [];
  const newContent = setAnnotationInContent(
    content,
    op.startPath,
    op.endPath,
    op.annotation,
    op.value
  );
  
  return DocOps.updateBlock(doc, op.blockId, { content: newContent });
}

// ============================================
// 逆操作生成
// ============================================

/**
 * 生成操作的逆操作
 */
export function invertOperation(doc: Document, op: Operation): Operation {
  switch (op.type) {
    case 'insert_block':
      return invertInsertBlock(op);
    case 'delete_block':
      return invertDeleteBlock(doc, op);
    case 'move_block':
      return invertMoveBlock(doc, op);
    case 'set_block_type':
      return invertSetBlockType(doc, op);
    case 'set_block_data':
      return invertSetBlockData(doc, op);
    case 'insert_text':
      return invertInsertText(op);
    case 'delete_text':
      return invertDeleteText(doc, op);
    case 'set_annotation':
      return invertSetAnnotation(doc, op);
    default:
      return op;
  }
}

/**
 * 生成事务的逆事务
 */
export function invertTransaction(doc: Document, transaction: Transaction): Transaction {
  // 逆操作需要逆序
  const inverseOps: Operation[] = [];
  let currentDoc = doc;

  for (const op of transaction.operations) {
    inverseOps.unshift(invertOperation(currentDoc, op));
    currentDoc = applyOperation(currentDoc, op);
  }

  return {
    id: generateId(),
    operations: inverseOps,
    timestamp: Date.now(),
    description: `Undo: ${transaction.description || 'operation'}`,
  };
}

// 具体逆操作实现
function invertInsertBlock(op: InsertBlockOperation): DeleteBlockOperation {
  return {
    id: generateId(),
    type: 'delete_block',
    blockId: op.block.id,
    timestamp: Date.now(),
  };
}

function invertDeleteBlock(doc: Document, op: DeleteBlockOperation): InsertBlockOperation {
  const block = doc.blocks[op.blockId];
  const index = DocOps.getBlockIndex(doc, op.blockId);
  
  return {
    id: generateId(),
    type: 'insert_block',
    block: block!,
    parentId: block?.parentId || null,
    index,
    timestamp: Date.now(),
  };
}

function invertMoveBlock(doc: Document, op: MoveBlockOperation): MoveBlockOperation {
  const block = doc.blocks[op.blockId];
  const index = DocOps.getBlockIndex(doc, op.blockId);

  return {
    id: generateId(),
    type: 'move_block',
    blockId: op.blockId,
    newParentId: block?.parentId || null,
    newIndex: index,
    timestamp: Date.now(),
  };
}

function invertSetBlockType(doc: Document, op: SetBlockTypeOperation): SetBlockTypeOperation {
  const block = doc.blocks[op.blockId];

  return {
    id: generateId(),
    type: 'set_block_type',
    blockId: op.blockId,
    newType: block?.type || 'paragraph',
    oldType: op.newType,
    timestamp: Date.now(),
  };
}

function invertSetBlockData(doc: Document, op: SetBlockDataOperation): SetBlockDataOperation {
  const block = doc.blocks[op.blockId];
  const oldValue = getValueAtPath(block?.data || {}, op.path);

  return {
    id: generateId(),
    type: 'set_block_data',
    blockId: op.blockId,
    path: op.path,
    value: oldValue,
    oldValue: op.value,
    timestamp: Date.now(),
  };
}

function invertInsertText(op: InsertTextOperation): DeleteTextOperation {
  return {
    id: generateId(),
    type: 'delete_text',
    blockId: op.blockId,
    path: op.path,
    offset: op.offset,
    length: op.text.length,
    deletedText: op.text,
    timestamp: Date.now(),
  };
}

function invertDeleteText(doc: Document, op: DeleteTextOperation): InsertTextOperation {
  const block = doc.blocks[op.blockId];
  const content = block?.data.content || [];
  const deletedText = getTextFromContent(content, op.path, op.offset, op.length);

  return {
    id: generateId(),
    type: 'insert_text',
    blockId: op.blockId,
    path: op.path,
    offset: op.offset,
    text: deletedText,
    timestamp: Date.now(),
  };
}

function invertSetAnnotation(doc: Document, op: SetAnnotationOperation): SetAnnotationOperation {
  // 简化：切换布尔值，或恢复默认
  const invertedValue = typeof op.value === 'boolean' ? !op.value : 'default';

  return {
    id: generateId(),
    type: 'set_annotation',
    blockId: op.blockId,
    startPath: op.startPath,
    endPath: op.endPath,
    annotation: op.annotation,
    value: invertedValue as any,
    timestamp: Date.now(),
  };
}

// ============================================
// Transaction 创建
// ============================================

export function createTransaction(
  operations: Operation[],
  description?: string,
  userId?: string
): Transaction {
  return {
    id: generateId(),
    operations,
    timestamp: Date.now(),
    userId,
    description,
  };
}

// ============================================
// 辅助函数
// ============================================

function setValueAtPath(obj: any, path: string[], value: unknown): any {
  if (path.length === 0) return value;

  const result = { ...obj };
  let current = result;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    current[key] = { ...current[key] };
    current = current[key];
  }

  current[path[path.length - 1]] = value;
  return result;
}

function getValueAtPath(obj: any, path: string[]): unknown {
  let current = obj;
  for (const key of path) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }
  return current;
}

function insertTextInContent(
  content: RichText,
  path: number[],
  offset: number,
  text: string,
  annotations?: Partial<TextAnnotations>
): RichText {
  if (content.length === 0) {
    // 空内容，创建新文本项
    return [{
      type: 'text',
      text,
      annotations: {
        bold: false,
        italic: false,
        underline: false,
        strikethrough: false,
        code: false,
        color: 'default',
        backgroundColor: 'default',
        ...annotations,
      },
    }];
  }

  const itemIndex = path[0] || 0;
  const newContent = [...content];

  if (itemIndex < content.length) {
    const item = content[itemIndex];
    if (item.type === 'text') {
      newContent[itemIndex] = {
        ...item,
        text: item.text.slice(0, offset) + text + item.text.slice(offset),
      };
    }
  }

  return newContent;
}

function deleteTextInContent(
  content: RichText,
  path: number[],
  offset: number,
  length: number
): RichText {
  if (content.length === 0) return content;

  const itemIndex = path[0] || 0;
  const newContent = [...content];

  if (itemIndex < content.length) {
    const item = content[itemIndex];
    if (item.type === 'text') {
      const newText = item.text.slice(0, offset) + item.text.slice(offset + length);
      if (newText.length === 0 && content.length > 1) {
        // 删除空项
        return newContent.filter((_, i) => i !== itemIndex);
      }
      newContent[itemIndex] = { ...item, text: newText };
    }
  }

  return newContent;
}

function setAnnotationInContent(
  content: RichText,
  startPath: number[],
  endPath: number[],
  annotation: keyof TextAnnotations,
  value: boolean | string
): RichText {
  // 简化实现：只处理单个文本项
  const itemIndex = startPath[0] || 0;
  const newContent = [...content];

  if (itemIndex < content.length) {
    const item = content[itemIndex];
    if (item.type === 'text') {
      newContent[itemIndex] = {
        ...item,
        annotations: {
          ...item.annotations,
          [annotation]: value,
        },
      };
    }
  }

  return newContent;
}

function getTextFromContent(
  content: RichText,
  path: number[],
  offset: number,
  length: number
): string {
  const itemIndex = path[0] || 0;
  if (itemIndex < content.length) {
    const item = content[itemIndex];
    if (item.type === 'text') {
      return item.text.slice(offset, offset + length);
    }
  }
  return '';
}


