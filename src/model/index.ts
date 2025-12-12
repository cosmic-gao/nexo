/**
 * Model Layer - 导出
 * 纯数据模型，与平台无关
 */

export * from './types';
export {
  createDocument,
  getBlock,
  getRootBlocks,
  getChildren,
  getParent,
  getAncestors,
  getDescendants,
  getSiblings,
  getBlockIndex,
  getPreviousSibling,
  getNextSibling,
  getFlattenedBlocks,
  getBlockDepth,
  insertBlock,
  insertBlockAfter,
  insertBlockBefore,
  createBlock,
  createBlockAfter,
  updateBlock,
  setBlockContent,
  changeBlockType,
  deleteBlock,
  moveBlock,
  indentBlock,
  outdentBlock,
  mergeBlocks,
  splitBlock,
  serializeDocument,
  deserializeDocument,
  getBlockPlainText,
} from './Document';
export * from './Operations';
