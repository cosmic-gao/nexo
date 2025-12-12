/**
 * Model Layer - Document 文档模型（增强版）
 * 不可变数据结构，树形块结构
 */

import type {
  Document,
  Block,
  BlockType,
  BlockData,
  RichText,
  DocumentMeta,
} from './types';
import { generateId, createBlock as createBlockUtil, plainTextToRichText } from './types';

// ============================================
// Document 创建和基础操作
// ============================================

export function createDocument(title: string = 'Untitled'): Document {
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

function updateMeta(meta: DocumentMeta): DocumentMeta {
  return {
    ...meta,
    updatedAt: Date.now(),
    version: meta.version + 1,
  };
}

// ============================================
// Block 查询
// ============================================

export function getBlock(doc: Document, blockId: string): Block | undefined {
  return doc.blocks[blockId];
}

export function getRootBlocks(doc: Document): Block[] {
  return doc.rootIds
    .map(id => doc.blocks[id])
    .filter((b): b is Block => b !== undefined);
}

export function getChildren(doc: Document, blockId: string): Block[] {
  const block = doc.blocks[blockId];
  if (!block) return [];
  return block.childrenIds
    .map(id => doc.blocks[id])
    .filter((b): b is Block => b !== undefined);
}

export function getParent(doc: Document, blockId: string): Block | undefined {
  const block = doc.blocks[blockId];
  if (!block || !block.parentId) return undefined;
  return doc.blocks[block.parentId];
}

export function getAncestors(doc: Document, blockId: string): Block[] {
  const ancestors: Block[] = [];
  let current = doc.blocks[blockId];
  
  while (current && current.parentId) {
    const parent = doc.blocks[current.parentId];
    if (parent) {
      ancestors.push(parent);
      current = parent;
    } else {
      break;
    }
  }
  
  return ancestors;
}

export function getDescendants(doc: Document, blockId: string): Block[] {
  const descendants: Block[] = [];
  const block = doc.blocks[blockId];
  if (!block) return descendants;

  function collectDescendants(id: string) {
    const b = doc.blocks[id];
    if (!b) return;
    descendants.push(b);
    b.childrenIds.forEach(collectDescendants);
  }

  block.childrenIds.forEach(collectDescendants);
  return descendants;
}

export function getSiblings(doc: Document, blockId: string): Block[] {
  const block = doc.blocks[blockId];
  if (!block) return [];

  const siblingIds = block.parentId
    ? doc.blocks[block.parentId]?.childrenIds || []
    : doc.rootIds;

  return siblingIds
    .filter(id => id !== blockId)
    .map(id => doc.blocks[id])
    .filter((b): b is Block => b !== undefined);
}

export function getBlockIndex(doc: Document, blockId: string): number {
  const block = doc.blocks[blockId];
  if (!block) return -1;

  const list = block.parentId
    ? doc.blocks[block.parentId]?.childrenIds || []
    : doc.rootIds;

  return list.indexOf(blockId);
}

export function getPreviousSibling(doc: Document, blockId: string): Block | undefined {
  const index = getBlockIndex(doc, blockId);
  if (index <= 0) return undefined;

  const block = doc.blocks[blockId];
  const list = block?.parentId
    ? doc.blocks[block.parentId]?.childrenIds || []
    : doc.rootIds;

  return doc.blocks[list[index - 1]];
}

export function getNextSibling(doc: Document, blockId: string): Block | undefined {
  const index = getBlockIndex(doc, blockId);
  if (index < 0) return undefined;

  const block = doc.blocks[blockId];
  const list = block?.parentId
    ? doc.blocks[block.parentId]?.childrenIds || []
    : doc.rootIds;

  if (index >= list.length - 1) return undefined;
  return doc.blocks[list[index + 1]];
}

// 获取文档中块的平铺顺序（深度优先遍历）
export function getFlattenedBlocks(doc: Document): Block[] {
  const result: Block[] = [];

  function traverse(blockId: string) {
    const block = doc.blocks[blockId];
    if (!block) return;
    result.push(block);
    block.childrenIds.forEach(traverse);
  }

  doc.rootIds.forEach(traverse);
  return result;
}

// 获取块的深度级别（根级为 0）
export function getBlockDepth(doc: Document, blockId: string): number {
  return getAncestors(doc, blockId).length;
}

// ============================================
// Block 插入
// ============================================

export function insertBlock(
  doc: Document,
  block: Block,
  parentId: string | null = null,
  index?: number
): Document {
  const newBlocks = { ...doc.blocks, [block.id]: { ...block, parentId } };

  if (parentId) {
    // 插入为子块
    const parent = doc.blocks[parentId];
    if (!parent) return doc;

    const newChildrenIds = [...parent.childrenIds];
    const insertIndex = index !== undefined ? index : newChildrenIds.length;
    newChildrenIds.splice(insertIndex, 0, block.id);

    newBlocks[parentId] = { ...parent, childrenIds: newChildrenIds };

    return {
      ...doc,
      blocks: newBlocks,
      meta: updateMeta(doc.meta),
    };
  } else {
    // 插入为根级块
    const newRootIds = [...doc.rootIds];
    const insertIndex = index !== undefined ? index : newRootIds.length;
    newRootIds.splice(insertIndex, 0, block.id);

    return {
      ...doc,
      blocks: newBlocks,
      rootIds: newRootIds,
      meta: updateMeta(doc.meta),
    };
  }
}

export function insertBlockAfter(
  doc: Document,
  block: Block,
  afterBlockId: string
): Document {
  const afterBlock = doc.blocks[afterBlockId];
  if (!afterBlock) return insertBlock(doc, block);

  const parentId = afterBlock.parentId;
  const list = parentId
    ? doc.blocks[parentId]?.childrenIds || []
    : doc.rootIds;
  const index = list.indexOf(afterBlockId);

  return insertBlock(doc, block, parentId, index + 1);
}

export function insertBlockBefore(
  doc: Document,
  block: Block,
  beforeBlockId: string
): Document {
  const beforeBlock = doc.blocks[beforeBlockId];
  if (!beforeBlock) return insertBlock(doc, block);

  const parentId = beforeBlock.parentId;
  const list = parentId
    ? doc.blocks[parentId]?.childrenIds || []
    : doc.rootIds;
  const index = list.indexOf(beforeBlockId);

  return insertBlock(doc, block, parentId, Math.max(0, index));
}

// 创建并插入块
export function createBlock(
  doc: Document,
  type: BlockType,
  data: Partial<BlockData> = {},
  parentId: string | null = null,
  index?: number
): { doc: Document; block: Block } {
  const block = createBlockUtil(type, data, parentId);
  const newDoc = insertBlock(doc, block, parentId, index);
  return { doc: newDoc, block };
}

// 在指定块后创建块
export function createBlockAfter(
  doc: Document,
  type: BlockType,
  data: Partial<BlockData> = {},
  afterBlockId: string
): { doc: Document; block: Block } {
  const afterBlock = doc.blocks[afterBlockId];
  const block = createBlockUtil(type, data, afterBlock?.parentId || null);
  const newDoc = insertBlockAfter(doc, block, afterBlockId);
  return { doc: newDoc, block };
}

// ============================================
// Block 更新
// ============================================

export function updateBlock(
  doc: Document,
  blockId: string,
  updates: Partial<BlockData>
): Document {
  const block = doc.blocks[blockId];
  if (!block) return doc;

  const updatedBlock: Block = {
    ...block,
    data: { ...block.data, ...updates },
    meta: {
      ...block.meta!,
      updatedAt: Date.now(),
      version: (block.meta?.version || 0) + 1,
    },
  };

  return {
    ...doc,
    blocks: { ...doc.blocks, [blockId]: updatedBlock },
    meta: updateMeta(doc.meta),
  };
}

export function setBlockContent(
  doc: Document,
  blockId: string,
  content: RichText
): Document {
  return updateBlock(doc, blockId, { content });
}

export function changeBlockType(
  doc: Document,
  blockId: string,
  newType: BlockType
): Document {
  const block = doc.blocks[blockId];
  if (!block) return doc;

  const updatedBlock: Block = {
    ...block,
    type: newType,
    meta: {
      ...block.meta!,
      updatedAt: Date.now(),
      version: (block.meta?.version || 0) + 1,
    },
  };

  return {
    ...doc,
    blocks: { ...doc.blocks, [blockId]: updatedBlock },
    meta: updateMeta(doc.meta),
  };
}

// ============================================
// Block 删除
// ============================================

export function deleteBlock(doc: Document, blockId: string): Document {
  const block = doc.blocks[blockId];
  if (!block) return doc;

  // 收集所有要删除的块（包括子孙）
  const toDelete = new Set<string>([blockId]);
  function collectDescendants(id: string) {
    const b = doc.blocks[id];
    if (b) {
      toDelete.add(id);
      b.childrenIds.forEach(collectDescendants);
    }
  }
  block.childrenIds.forEach(collectDescendants);

  // 从索引中删除
  const newBlocks = { ...doc.blocks };
  toDelete.forEach(id => delete newBlocks[id]);

  // 从父级的 children 或 rootIds 中移除
  let newRootIds = doc.rootIds;
  if (block.parentId) {
    const parent = newBlocks[block.parentId];
    if (parent) {
      newBlocks[block.parentId] = {
        ...parent,
        childrenIds: parent.childrenIds.filter(id => id !== blockId),
      };
    }
  } else {
    newRootIds = doc.rootIds.filter(id => id !== blockId);
  }

  // 确保至少有一个块
  if (newRootIds.length === 0 && Object.keys(newBlocks).length === 0) {
    const defaultBlock = createBlockUtil('paragraph', {}, null);
    newBlocks[defaultBlock.id] = defaultBlock;
    newRootIds = [defaultBlock.id];
  }

  return {
    ...doc,
    blocks: newBlocks,
    rootIds: newRootIds,
    meta: updateMeta(doc.meta),
  };
}

// ============================================
// Block 移动
// ============================================

export function moveBlock(
  doc: Document,
  blockId: string,
  newParentId: string | null,
  newIndex: number
): Document {
  const block = doc.blocks[blockId];
  if (!block) return doc;

  // 不能移动到自己的子孙下
  if (newParentId) {
    const descendants = getDescendants(doc, blockId);
    if (descendants.some(d => d.id === newParentId)) {
      return doc;
    }
  }

  const newBlocks = { ...doc.blocks };
  let newRootIds = [...doc.rootIds];

  // 从旧位置移除
  if (block.parentId) {
    const oldParent = newBlocks[block.parentId];
    if (oldParent) {
      newBlocks[block.parentId] = {
        ...oldParent,
        childrenIds: oldParent.childrenIds.filter(id => id !== blockId),
      };
    }
  } else {
    newRootIds = newRootIds.filter(id => id !== blockId);
  }

  // 添加到新位置
  if (newParentId) {
    const newParent = newBlocks[newParentId];
    if (newParent) {
      const newChildrenIds = [...newParent.childrenIds];
      newChildrenIds.splice(newIndex, 0, blockId);
      newBlocks[newParentId] = { ...newParent, childrenIds: newChildrenIds };
    }
  } else {
    newRootIds.splice(newIndex, 0, blockId);
  }

  // 更新块的 parentId
  newBlocks[blockId] = { ...block, parentId: newParentId };

  return {
    ...doc,
    blocks: newBlocks,
    rootIds: newRootIds,
    meta: updateMeta(doc.meta),
  };
}

// 缩进块（变成前一个兄弟的子块）
export function indentBlock(doc: Document, blockId: string): Document {
  const prevSibling = getPreviousSibling(doc, blockId);
  if (!prevSibling) return doc;

  const block = doc.blocks[blockId];
  if (!block) return doc;

  return moveBlock(doc, blockId, prevSibling.id, prevSibling.childrenIds.length);
}

// 取消缩进块（变成父级的下一个兄弟）
export function outdentBlock(doc: Document, blockId: string): Document {
  const block = doc.blocks[blockId];
  if (!block || !block.parentId) return doc;

  const parent = doc.blocks[block.parentId];
  if (!parent) return doc;

  const parentIndex = getBlockIndex(doc, parent.id);
  return moveBlock(doc, blockId, parent.parentId, parentIndex + 1);
}

// ============================================
// Block 合并和分割
// ============================================

export function mergeBlocks(
  doc: Document,
  sourceBlockId: string,
  targetBlockId: string
): Document {
  const sourceBlock = doc.blocks[sourceBlockId];
  const targetBlock = doc.blocks[targetBlockId];

  if (!sourceBlock || !targetBlock) return doc;

  // 合并内容
  const targetContent = targetBlock.data.content || [];
  const sourceContent = sourceBlock.data.content || [];
  const mergedContent = [...targetContent, ...sourceContent];

  // 更新目标块
  let newDoc = updateBlock(doc, targetBlockId, { content: mergedContent });

  // 将源块的子块移动到目标块
  const sourceChildren = [...sourceBlock.childrenIds];
  sourceChildren.forEach((childId, index) => {
    newDoc = moveBlock(newDoc, childId, targetBlockId, targetBlock.childrenIds.length + index);
  });

  // 删除源块
  newDoc = deleteBlock(newDoc, sourceBlockId);

  return newDoc;
}

export function splitBlock(
  doc: Document,
  blockId: string,
  offset: number
): { doc: Document; newBlock: Block | null } {
  const block = doc.blocks[blockId];
  if (!block) return { doc, newBlock: null };

  const content = block.data.content || [];
  
  // 计算分割点
  let currentOffset = 0;
  let splitItemIndex = 0;
  let splitCharOffset = 0;

  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    const itemLength = item.type === 'text' ? item.text.length : 1;
    
    if (currentOffset + itemLength >= offset) {
      splitItemIndex = i;
      splitCharOffset = offset - currentOffset;
      break;
    }
    currentOffset += itemLength;
  }

  // 分割内容
  const beforeContent: RichText = [];
  const afterContent: RichText = [];

  content.forEach((item, index) => {
    if (index < splitItemIndex) {
      beforeContent.push(item);
    } else if (index > splitItemIndex) {
      afterContent.push(item);
    } else {
      // 分割当前项
      if (item.type === 'text') {
        if (splitCharOffset > 0) {
          beforeContent.push({ ...item, text: item.text.slice(0, splitCharOffset) });
        }
        if (splitCharOffset < item.text.length) {
          afterContent.push({ ...item, text: item.text.slice(splitCharOffset) });
        }
      } else {
        // mention 或 equation 不分割
        beforeContent.push(item);
      }
    }
  });

  // 更新当前块
  let newDoc = updateBlock(doc, blockId, { content: beforeContent });

  // 创建新块
  const result = createBlockAfter(newDoc, 'paragraph', { content: afterContent }, blockId);

  return { doc: result.doc, newBlock: result.block };
}

// ============================================
// 序列化
// ============================================

export function serializeDocument(doc: Document): string {
  return JSON.stringify(doc);
}

export function deserializeDocument(json: string): Document {
  return JSON.parse(json) as Document;
}

// ============================================
// 兼容性：获取块的纯文本
// ============================================

export function getBlockPlainText(doc: Document, blockId: string): string {
  const block = doc.blocks[blockId];
  if (!block) return '';

  // 优先使用 content
  if (block.data.content && block.data.content.length > 0) {
    return block.data.content.map(item => {
      switch (item.type) {
        case 'text': return item.text;
        case 'mention': return `@${item.id}`;
        case 'equation': return item.expression;
      }
    }).join('');
  }

  // 兼容旧的 text 字段
  return block.data.text || '';
}
