/**
 * Model Layer - Document 文档模型
 * 不可变数据结构，所有修改返回新对象
 */

import type { Document, Block, BlockType, BlockData, DocumentMeta } from './types';
import { generateId, createBlock as createBlockUtil } from './types';

/**
 * 创建空文档
 */
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

/**
 * 获取块
 */
export function getBlock(doc: Document, blockId: string): Block | undefined {
  return doc.blocks[blockId];
}

/**
 * 获取所有根级块（有序）
 */
export function getRootBlocks(doc: Document): Block[] {
  return doc.rootBlockIds
    .map(id => doc.blocks[id])
    .filter((block): block is Block => block !== undefined);
}

/**
 * 获取块索引
 */
export function getBlockIndex(doc: Document, blockId: string): number {
  return doc.rootBlockIds.indexOf(blockId);
}

/**
 * 获取前一个块
 */
export function getPreviousBlock(doc: Document, blockId: string): Block | undefined {
  const index = getBlockIndex(doc, blockId);
  if (index <= 0) return undefined;
  return doc.blocks[doc.rootBlockIds[index - 1]];
}

/**
 * 获取后一个块
 */
export function getNextBlock(doc: Document, blockId: string): Block | undefined {
  const index = getBlockIndex(doc, blockId);
  if (index < 0 || index >= doc.rootBlockIds.length - 1) return undefined;
  return doc.blocks[doc.rootBlockIds[index + 1]];
}

/**
 * 插入块
 */
export function insertBlock(
  doc: Document,
  block: Block,
  afterBlockId?: string
): Document {
  const newBlocks = { ...doc.blocks, [block.id]: block };
  let newRootBlockIds: string[];

  if (afterBlockId) {
    const afterIndex = doc.rootBlockIds.indexOf(afterBlockId);
    if (afterIndex >= 0) {
      newRootBlockIds = [
        ...doc.rootBlockIds.slice(0, afterIndex + 1),
        block.id,
        ...doc.rootBlockIds.slice(afterIndex + 1),
      ];
    } else {
      newRootBlockIds = [...doc.rootBlockIds, block.id];
    }
  } else {
    newRootBlockIds = [...doc.rootBlockIds, block.id];
  }

  return {
    ...doc,
    blocks: newBlocks,
    rootBlockIds: newRootBlockIds,
    meta: updateMeta(doc.meta),
  };
}

/**
 * 创建并插入块
 */
export function createBlock(
  doc: Document,
  type: BlockType,
  data: BlockData = {},
  afterBlockId?: string
): { doc: Document; block: Block } {
  const block = createBlockUtil(type, data);
  const newDoc = insertBlock(doc, block, afterBlockId);
  return { doc: newDoc, block };
}

/**
 * 更新块
 */
export function updateBlock(
  doc: Document,
  blockId: string,
  data: Partial<BlockData>
): Document {
  const block = doc.blocks[blockId];
  if (!block) return doc;

  const updatedBlock: Block = {
    ...block,
    data: { ...block.data, ...data },
    meta: {
      ...block.meta,
      updatedAt: Date.now(),
    },
  };

  return {
    ...doc,
    blocks: { ...doc.blocks, [blockId]: updatedBlock },
    meta: updateMeta(doc.meta),
  };
}

/**
 * 更改块类型
 */
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
      ...block.meta,
      updatedAt: Date.now(),
    },
  };

  return {
    ...doc,
    blocks: { ...doc.blocks, [blockId]: updatedBlock },
    meta: updateMeta(doc.meta),
  };
}

/**
 * 删除块
 */
export function deleteBlock(doc: Document, blockId: string): Document {
  // 至少保留一个块
  if (doc.rootBlockIds.length <= 1) {
    return updateBlock(doc, blockId, { text: '' });
  }

  const { [blockId]: _, ...remainingBlocks } = doc.blocks;
  const newRootBlockIds = doc.rootBlockIds.filter(id => id !== blockId);

  return {
    ...doc,
    blocks: remainingBlocks,
    rootBlockIds: newRootBlockIds,
    meta: updateMeta(doc.meta),
  };
}

/**
 * 移动块
 */
export function moveBlock(
  doc: Document,
  blockId: string,
  targetBlockId: string,
  position: 'before' | 'after'
): Document {
  const sourceIndex = doc.rootBlockIds.indexOf(blockId);
  const targetIndex = doc.rootBlockIds.indexOf(targetBlockId);

  if (sourceIndex < 0 || targetIndex < 0 || blockId === targetBlockId) {
    return doc;
  }

  // 移除源块
  const withoutSource = doc.rootBlockIds.filter(id => id !== blockId);

  // 计算新位置
  let newTargetIndex = withoutSource.indexOf(targetBlockId);
  if (position === 'after') {
    newTargetIndex += 1;
  }

  // 插入到新位置
  const newRootBlockIds = [
    ...withoutSource.slice(0, newTargetIndex),
    blockId,
    ...withoutSource.slice(newTargetIndex),
  ];

  return {
    ...doc,
    rootBlockIds: newRootBlockIds,
    meta: updateMeta(doc.meta),
  };
}

/**
 * 合并块
 */
export function mergeBlocks(
  doc: Document,
  sourceBlockId: string,
  targetBlockId: string
): Document {
  const sourceBlock = doc.blocks[sourceBlockId];
  const targetBlock = doc.blocks[targetBlockId];

  if (!sourceBlock || !targetBlock) return doc;

  const mergedText = (targetBlock.data.text || '') + (sourceBlock.data.text || '');
  
  let newDoc = updateBlock(doc, targetBlockId, { text: mergedText });
  newDoc = deleteBlock(newDoc, sourceBlockId);

  return newDoc;
}

/**
 * 分割块
 */
export function splitBlock(
  doc: Document,
  blockId: string,
  offset: number
): { doc: Document; newBlock: Block | null } {
  const block = doc.blocks[blockId];
  if (!block || block.data.text === undefined) {
    return { doc, newBlock: null };
  }

  const text = block.data.text;
  const beforeText = text.slice(0, offset);
  const afterText = text.slice(offset);

  // 更新当前块
  let newDoc = updateBlock(doc, blockId, { text: beforeText });

  // 创建新块
  const result = createBlock(newDoc, 'paragraph', { text: afterText }, blockId);

  return { doc: result.doc, newBlock: result.block };
}

/**
 * 更新文档元数据
 */
function updateMeta(meta?: DocumentMeta): DocumentMeta {
  return {
    ...meta,
    updatedAt: Date.now(),
    version: (meta?.version || 0) + 1,
  };
}

/**
 * 序列化文档
 */
export function serializeDocument(doc: Document): string {
  return JSON.stringify(doc);
}

/**
 * 反序列化文档
 */
export function deserializeDocument(json: string): Document {
  return JSON.parse(json) as Document;
}


