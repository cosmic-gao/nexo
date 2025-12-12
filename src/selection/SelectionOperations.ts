/**
 * Selection Layer - 选区操作
 * 提供选区相关的高级操作
 */

import type {
  Selection,
  TextPoint,
  CaretSelection,
  TextRangeSelection,
  CrossBlockSelection,
  BlockSelection,
  SelectionRange,
} from './types';
import type { Document, Block, RichText, RichTextItem } from '../model/types';
import * as DocOps from '../model/Document';

// ============================================
// 选区导航
// ============================================

/**
 * 移动光标
 */
export function moveCaret(
  point: TextPoint,
  direction: 'forward' | 'backward' | 'up' | 'down',
  unit: 'character' | 'word' | 'line' | 'block',
  doc: Document
): TextPoint {
  const block = DocOps.getBlock(doc, point.blockId);
  if (!block) return point;

  const content = block.data.content || [];
  const plainText = DocOps.getBlockPlainText(doc, point.blockId);

  switch (unit) {
    case 'character':
      return moveByCharacter(point, direction, content, plainText, doc);
    case 'word':
      return moveByWord(point, direction, plainText, doc);
    case 'line':
      return moveByLine(point, direction, doc);
    case 'block':
      return moveByBlock(point, direction, doc);
    default:
      return point;
  }
}

function moveByCharacter(
  point: TextPoint,
  direction: 'forward' | 'backward' | 'up' | 'down',
  content: RichText,
  plainText: string,
  doc: Document
): TextPoint {
  // 计算在纯文本中的绝对偏移
  let absoluteOffset = getAbsoluteOffset(point, content);

  if (direction === 'forward') {
    absoluteOffset++;
    if (absoluteOffset > plainText.length) {
      // 移动到下一个块
      const nextBlock = getNextTextBlock(point.blockId, doc);
      if (nextBlock) {
        return { blockId: nextBlock.id, itemIndex: 0, charOffset: 0 };
      }
      absoluteOffset = plainText.length;
    }
  } else if (direction === 'backward') {
    absoluteOffset--;
    if (absoluteOffset < 0) {
      // 移动到上一个块
      const prevBlock = getPreviousTextBlock(point.blockId, doc);
      if (prevBlock) {
        const prevText = DocOps.getBlockPlainText(doc, prevBlock.id);
        return absoluteOffsetToPoint(prevBlock.id, prevText.length, prevBlock.data.content || []);
      }
      absoluteOffset = 0;
    }
  }

  return absoluteOffsetToPoint(point.blockId, absoluteOffset, content);
}

function moveByWord(
  point: TextPoint,
  direction: 'forward' | 'backward' | 'up' | 'down',
  plainText: string,
  doc: Document
): TextPoint {
  const block = DocOps.getBlock(doc, point.blockId);
  if (!block) return point;

  const content = block.data.content || [];
  let absoluteOffset = getAbsoluteOffset(point, content);

  // 简单的单词边界：空格、标点
  const wordBoundary = /[\s.,!?;:'"()\[\]{}]/;

  if (direction === 'forward') {
    // 跳过当前非空白字符
    while (absoluteOffset < plainText.length && !wordBoundary.test(plainText[absoluteOffset])) {
      absoluteOffset++;
    }
    // 跳过空白字符
    while (absoluteOffset < plainText.length && wordBoundary.test(plainText[absoluteOffset])) {
      absoluteOffset++;
    }
  } else if (direction === 'backward') {
    // 跳过空白字符
    while (absoluteOffset > 0 && wordBoundary.test(plainText[absoluteOffset - 1])) {
      absoluteOffset--;
    }
    // 跳过非空白字符
    while (absoluteOffset > 0 && !wordBoundary.test(plainText[absoluteOffset - 1])) {
      absoluteOffset--;
    }
  }

  return absoluteOffsetToPoint(point.blockId, absoluteOffset, content);
}

function moveByLine(
  point: TextPoint,
  direction: 'forward' | 'backward' | 'up' | 'down',
  doc: Document
): TextPoint {
  // 行移动需要 DOM 信息，这里返回块的开头或结尾
  const block = DocOps.getBlock(doc, point.blockId);
  if (!block) return point;

  if (direction === 'up' || direction === 'backward') {
    const prevBlock = getPreviousTextBlock(point.blockId, doc);
    if (prevBlock) {
      const prevText = DocOps.getBlockPlainText(doc, prevBlock.id);
      return absoluteOffsetToPoint(prevBlock.id, prevText.length, prevBlock.data.content || []);
    }
    return { blockId: point.blockId, itemIndex: 0, charOffset: 0 };
  } else {
    const nextBlock = getNextTextBlock(point.blockId, doc);
    if (nextBlock) {
      return { blockId: nextBlock.id, itemIndex: 0, charOffset: 0 };
    }
    const text = DocOps.getBlockPlainText(doc, point.blockId);
    return absoluteOffsetToPoint(point.blockId, text.length, block.data.content || []);
  }
}

function moveByBlock(
  point: TextPoint,
  direction: 'forward' | 'backward' | 'up' | 'down',
  doc: Document
): TextPoint {
  if (direction === 'up' || direction === 'backward') {
    const prevBlock = getPreviousTextBlock(point.blockId, doc);
    if (prevBlock) {
      return { blockId: prevBlock.id, itemIndex: 0, charOffset: 0 };
    }
  } else {
    const nextBlock = getNextTextBlock(point.blockId, doc);
    if (nextBlock) {
      return { blockId: nextBlock.id, itemIndex: 0, charOffset: 0 };
    }
  }
  return point;
}

// ============================================
// 选区扩展
// ============================================

/**
 * 扩展选区
 */
export function extendSelection(
  selection: Selection,
  direction: 'forward' | 'backward' | 'up' | 'down',
  unit: 'character' | 'word' | 'line' | 'block',
  doc: Document
): Selection {
  let focus: TextPoint;

  switch (selection.type) {
    case 'caret':
      focus = selection.point;
      break;
    case 'text-range':
    case 'cross-block':
      focus = selection.focus;
      break;
    case 'block':
      // 块选区扩展
      return extendBlockSelection(selection, direction, doc);
    default:
      return selection;
  }

  const newFocus = moveCaret(focus, direction, unit, doc);
  const anchor = selection.type === 'caret' 
    ? selection.point 
    : (selection as TextRangeSelection | CrossBlockSelection).anchor;

  if (anchor.blockId === newFocus.blockId) {
    // 同一块内
    if (pointsEqual(anchor, newFocus)) {
      return { type: 'caret', point: anchor };
    }
    return {
      type: 'text-range',
      anchor,
      focus: newFocus,
      isForward: comparePoints(anchor, newFocus, doc) < 0,
    };
  } else {
    // 跨块
    const flatBlocks = DocOps.getFlattenedBlocks(doc);
    const blockIds = flatBlocks.map(b => b.id);
    const anchorIndex = blockIds.indexOf(anchor.blockId);
    const focusIndex = blockIds.indexOf(newFocus.blockId);
    const isForward = anchorIndex < focusIndex;
    const [startIndex, endIndex] = isForward
      ? [anchorIndex, focusIndex]
      : [focusIndex, anchorIndex];
    const middleBlockIds = blockIds.slice(startIndex + 1, endIndex);

    return {
      type: 'cross-block',
      anchor,
      focus: newFocus,
      middleBlockIds,
      isForward,
    };
  }
}

function extendBlockSelection(
  selection: BlockSelection,
  direction: 'forward' | 'backward' | 'up' | 'down',
  doc: Document
): BlockSelection {
  const flatBlocks = DocOps.getFlattenedBlocks(doc);
  const blockIds = flatBlocks.map(b => b.id);

  const firstSelected = selection.blockIds[0];
  const lastSelected = selection.blockIds[selection.blockIds.length - 1];

  const firstIndex = blockIds.indexOf(firstSelected);
  const lastIndex = blockIds.indexOf(lastSelected);

  let newBlockIds = [...selection.blockIds];

  if (direction === 'forward' || direction === 'down') {
    // 向下扩展
    if (lastIndex < blockIds.length - 1) {
      const nextBlockId = blockIds[lastIndex + 1];
      if (!newBlockIds.includes(nextBlockId)) {
        newBlockIds.push(nextBlockId);
      }
    }
  } else {
    // 向上扩展
    if (firstIndex > 0) {
      const prevBlockId = blockIds[firstIndex - 1];
      if (!newBlockIds.includes(prevBlockId)) {
        newBlockIds.unshift(prevBlockId);
      }
    }
  }

  return {
    type: 'block',
    blockIds: newBlockIds,
  };
}

// ============================================
// 选区修改
// ============================================

/**
 * 删除选中内容
 */
export function deleteSelection(
  selection: Selection,
  doc: Document
): { doc: Document; newSelection: CaretSelection } {
  switch (selection.type) {
    case 'caret':
      return { doc, newSelection: selection };

    case 'text-range':
      return deleteTextRange(selection, doc);

    case 'block':
      return deleteBlocks(selection, doc);

    case 'cross-block':
      return deleteCrossBlock(selection, doc);

    default:
      return { doc, newSelection: { type: 'caret', point: { blockId: '', itemIndex: 0, charOffset: 0 } } };
  }
}

function deleteTextRange(
  selection: TextRangeSelection,
  doc: Document
): { doc: Document; newSelection: CaretSelection } {
  const block = DocOps.getBlock(doc, selection.anchor.blockId);
  if (!block) {
    return { doc, newSelection: { type: 'caret', point: selection.anchor } };
  }

  const content = block.data.content || [];
  const [start, end] = selection.isForward
    ? [selection.anchor, selection.focus]
    : [selection.focus, selection.anchor];

  const startOffset = getAbsoluteOffset(start, content);
  const endOffset = getAbsoluteOffset(end, content);

  const plainText = DocOps.getBlockPlainText(doc, block.id);
  const newText = plainText.slice(0, startOffset) + plainText.slice(endOffset);

  const newDoc = DocOps.updateBlock(doc, block.id, {
    content: [{ type: 'text', text: newText, annotations: {
      bold: false, italic: false, underline: false, strikethrough: false,
      code: false, color: 'default', backgroundColor: 'default',
    }}],
  });

  return {
    doc: newDoc,
    newSelection: { type: 'caret', point: start },
  };
}

function deleteBlocks(
  selection: BlockSelection,
  doc: Document
): { doc: Document; newSelection: CaretSelection } {
  let newDoc = doc;
  const flatBlocks = DocOps.getFlattenedBlocks(doc);
  const firstBlockId = selection.blockIds[0];
  const firstIndex = flatBlocks.findIndex(b => b.id === firstBlockId);
  
  // 删除所有选中的块
  for (const blockId of selection.blockIds) {
    newDoc = DocOps.deleteBlock(newDoc, blockId);
  }

  // 确定新的光标位置
  const newFlatBlocks = DocOps.getFlattenedBlocks(newDoc);
  let newBlockId: string;
  
  if (newFlatBlocks.length === 0) {
    // 文档为空，创建一个新块
    const result = DocOps.createBlock(newDoc, 'paragraph', {});
    newDoc = result.doc;
    newBlockId = result.block.id;
  } else if (firstIndex < newFlatBlocks.length) {
    newBlockId = newFlatBlocks[firstIndex].id;
  } else {
    newBlockId = newFlatBlocks[newFlatBlocks.length - 1].id;
  }

  return {
    doc: newDoc,
    newSelection: { type: 'caret', point: { blockId: newBlockId, itemIndex: 0, charOffset: 0 } },
  };
}

function deleteCrossBlock(
  selection: CrossBlockSelection,
  doc: Document
): { doc: Document; newSelection: CaretSelection } {
  const [start, end] = selection.isForward
    ? [selection.anchor, selection.focus]
    : [selection.focus, selection.anchor];

  let newDoc = doc;

  // 删除中间的完整块
  for (const blockId of selection.middleBlockIds) {
    newDoc = DocOps.deleteBlock(newDoc, blockId);
  }

  // 处理起始块：保留起始位置之前的内容
  const startBlock = DocOps.getBlock(newDoc, start.blockId);
  if (startBlock) {
    const startText = DocOps.getBlockPlainText(newDoc, start.blockId);
    const startOffset = getAbsoluteOffset(start, startBlock.data.content || []);
    const keepStart = startText.slice(0, startOffset);

    newDoc = DocOps.updateBlock(newDoc, start.blockId, {
      content: [{ type: 'text', text: keepStart, annotations: {
        bold: false, italic: false, underline: false, strikethrough: false,
        code: false, color: 'default', backgroundColor: 'default',
      }}],
    });
  }

  // 处理结束块：保留结束位置之后的内容，并与起始块合并
  const endBlock = DocOps.getBlock(newDoc, end.blockId);
  if (endBlock && end.blockId !== start.blockId) {
    const endText = DocOps.getBlockPlainText(newDoc, end.blockId);
    const endOffset = getAbsoluteOffset(end, endBlock.data.content || []);
    const keepEnd = endText.slice(endOffset);

    // 将结束块的剩余内容追加到起始块
    const startBlock2 = DocOps.getBlock(newDoc, start.blockId);
    if (startBlock2) {
      const currentText = DocOps.getBlockPlainText(newDoc, start.blockId);
      newDoc = DocOps.updateBlock(newDoc, start.blockId, {
        content: [{ type: 'text', text: currentText + keepEnd, annotations: {
          bold: false, italic: false, underline: false, strikethrough: false,
          code: false, color: 'default', backgroundColor: 'default',
        }}],
      });
    }

    // 删除结束块
    newDoc = DocOps.deleteBlock(newDoc, end.blockId);
  }

  return {
    doc: newDoc,
    newSelection: { type: 'caret', point: start },
  };
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取绝对偏移量（在纯文本中的位置）
 */
export function getAbsoluteOffset(point: TextPoint, content: RichText): number {
  let offset = 0;
  for (let i = 0; i < point.itemIndex && i < content.length; i++) {
    const item = content[i];
    offset += item.type === 'text' ? item.text.length : 1;
  }
  return offset + point.charOffset;
}

/**
 * 从绝对偏移量转换为 TextPoint
 */
export function absoluteOffsetToPoint(
  blockId: string,
  absoluteOffset: number,
  content: RichText
): TextPoint {
  if (content.length === 0) {
    return { blockId, itemIndex: 0, charOffset: absoluteOffset };
  }

  let remaining = absoluteOffset;
  for (let i = 0; i < content.length; i++) {
    const item = content[i];
    const itemLength = item.type === 'text' ? item.text.length : 1;
    
    if (remaining <= itemLength) {
      return { blockId, itemIndex: i, charOffset: remaining };
    }
    remaining -= itemLength;
  }

  // 超出范围，返回最后位置
  const lastIndex = content.length - 1;
  const lastItem = content[lastIndex];
  const lastLength = lastItem.type === 'text' ? lastItem.text.length : 1;
  return { blockId, itemIndex: lastIndex, charOffset: lastLength };
}

/**
 * 获取下一个可编辑块
 */
function getNextTextBlock(blockId: string, doc: Document): Block | undefined {
  const flatBlocks = DocOps.getFlattenedBlocks(doc);
  const index = flatBlocks.findIndex(b => b.id === blockId);
  
  for (let i = index + 1; i < flatBlocks.length; i++) {
    const block = flatBlocks[i];
    if (isEditableBlock(block)) {
      return block;
    }
  }
  return undefined;
}

/**
 * 获取上一个可编辑块
 */
function getPreviousTextBlock(blockId: string, doc: Document): Block | undefined {
  const flatBlocks = DocOps.getFlattenedBlocks(doc);
  const index = flatBlocks.findIndex(b => b.id === blockId);
  
  for (let i = index - 1; i >= 0; i--) {
    const block = flatBlocks[i];
    if (isEditableBlock(block)) {
      return block;
    }
  }
  return undefined;
}

/**
 * 检查块是否可编辑
 */
function isEditableBlock(block: Block): boolean {
  return block.type !== 'divider' && block.type !== 'image';
}

/**
 * 比较两个点是否相等
 */
function pointsEqual(a: TextPoint, b: TextPoint): boolean {
  return (
    a.blockId === b.blockId &&
    a.itemIndex === b.itemIndex &&
    a.charOffset === b.charOffset
  );
}

/**
 * 比较两个点的顺序
 */
function comparePoints(a: TextPoint, b: TextPoint, doc: Document): number {
  if (a.blockId === b.blockId) {
    if (a.itemIndex !== b.itemIndex) {
      return a.itemIndex - b.itemIndex;
    }
    return a.charOffset - b.charOffset;
  }

  const flatBlocks = DocOps.getFlattenedBlocks(doc);
  const aIndex = flatBlocks.findIndex(block => block.id === a.blockId);
  const bIndex = flatBlocks.findIndex(block => block.id === b.blockId);
  return aIndex - bIndex;
}


