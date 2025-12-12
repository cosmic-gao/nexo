/**
 * SelectionHandler - 选择事件处理器
 * 处理多块选择、拖拽选择等
 */

import type { EditorController } from '../../../logic/EditorController';
import type { Document } from '../../../model/types';

export interface SelectionHandlerDeps {
  getController(): EditorController | null;
  getContainer(): HTMLElement | null;
  findBlockElement(target: HTMLElement): HTMLElement | null;
  getBlockElements(): Map<string, HTMLElement>;
  forceRender(): void;
  focusBlock(blockId: string, offset?: number): void;
}

export class SelectionHandler {
  private deps: SelectionHandlerDeps;
  
  // 多块选择状态
  private selectedBlockIds: Set<string> = new Set();
  private selectionAnchorBlockId: string | null = null;
  private isMouseSelecting: boolean = false;

  constructor(deps: SelectionHandlerDeps) {
    this.deps = deps;
  }

  // ============================================
  // Public API
  // ============================================

  getSelectedBlockIds(): string[] {
    return Array.from(this.selectedBlockIds);
  }

  hasBlockSelection(): boolean {
    return this.selectedBlockIds.size > 0;
  }

  clearBlockSelection(): void {
    this.clearBlockSelectionUI();
    this.selectedBlockIds.clear();
    this.selectionAnchorBlockId = null;
  }

  selectAllBlocks(): void {
    const controller = this.deps.getController();
    if (!controller) return;

    const doc = controller.getDocument();
    const flatBlocks = this.getFlatBlockIds(doc);

    this.clearBlockSelectionUI();
    this.selectedBlockIds.clear();

    for (const blockId of flatBlocks) {
      this.selectedBlockIds.add(blockId);
    }

    if (flatBlocks.length > 0) {
      this.selectionAnchorBlockId = flatBlocks[0];
    }

    this.updateBlockSelectionUI();
  }

  // ============================================
  // Event Handlers
  // ============================================

  handleMouseDown = (e: MouseEvent): void => {
    const controller = this.deps.getController();
    if (!controller) return;

    const target = e.target as HTMLElement;
    const blockElement = this.deps.findBlockElement(target);
    
    if (!blockElement) {
      this.clearBlockSelection();
      return;
    }

    const blockId = blockElement.dataset.blockId;
    if (!blockId) return;

    // Shift + 点击：范围选择
    if (e.shiftKey && this.selectionAnchorBlockId) {
      e.preventDefault();
      this.selectBlockRange(this.selectionAnchorBlockId, blockId);
      return;
    }

    // Ctrl/Cmd + 点击：切换单块选择
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      this.toggleBlockSelected(blockId);
      return;
    }

    // 普通点击
    if (this.selectedBlockIds.size > 0 && !this.selectedBlockIds.has(blockId)) {
      this.clearBlockSelection();
    }

    this.selectionAnchorBlockId = blockId;
    this.isMouseSelecting = true;
  };

  handleMouseMove = (e: MouseEvent): void => {
    if (!this.isMouseSelecting || !this.selectionAnchorBlockId) return;
    if (!e.buttons) {
      this.isMouseSelecting = false;
      return;
    }

    const target = e.target as HTMLElement;
    const blockElement = this.deps.findBlockElement(target);
    if (!blockElement) return;

    const blockId = blockElement.dataset.blockId;
    if (!blockId || blockId === this.selectionAnchorBlockId) return;

    this.selectBlockRange(this.selectionAnchorBlockId, blockId);
  };

  handleMouseUp = (): void => {
    this.isMouseSelecting = false;
  };

  // ============================================
  // Block Operations
  // ============================================

  deleteSelectedBlocks(): void {
    const controller = this.deps.getController();
    if (!controller || this.selectedBlockIds.size === 0) return;

    const blockIds = Array.from(this.selectedBlockIds);
    const doc = controller.getDocument();
    const flatBlocks = this.getFlatBlockIds(doc);

    // 找到删除后要聚焦的块
    let firstSelectedIndex = Infinity;
    for (const blockId of blockIds) {
      const index = flatBlocks.indexOf(blockId);
      if (index !== -1 && index < firstSelectedIndex) {
        firstSelectedIndex = index;
      }
    }

    // 删除所有选中的块
    for (const blockId of blockIds) {
      controller.deleteBlock(blockId);
    }

    this.clearBlockSelection();
    this.deps.forceRender();

    // 聚焦到合适的块
    const newDoc = controller.getDocument();
    const newFlatBlocks = this.getFlatBlockIds(newDoc);
    if (newFlatBlocks.length > 0) {
      const focusIndex = Math.min(firstSelectedIndex, newFlatBlocks.length - 1);
      this.deps.focusBlock(newFlatBlocks[focusIndex], 0);
    }
  }

  copySelectedBlocks(): void {
    const controller = this.deps.getController();
    if (!controller || this.selectedBlockIds.size === 0) return;

    const doc = controller.getDocument();
    const blockIds = Array.from(this.selectedBlockIds);

    // 按文档顺序排序
    const flatBlocks = this.getFlatBlockIds(doc);
    blockIds.sort((a, b) => flatBlocks.indexOf(a) - flatBlocks.indexOf(b));

    // 收集文本内容
    const textContent: string[] = [];
    const blocksData: { type: string; data: Record<string, unknown> }[] = [];

    for (const blockId of blockIds) {
      const block = doc.blocks[blockId];
      if (block) {
        textContent.push(block.data.text || '');
        blocksData.push({
          type: block.type,
          data: { ...block.data },
        });
      }
    }

    // 写入剪贴板
    const text = textContent.join('\n');
    const html = blocksData
      .map(b => `<div data-block-type="${b.type}">${b.data.text || ''}</div>`)
      .join('');

    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      })
    ]).catch(() => {
      navigator.clipboard.writeText(text);
    });
  }

  cutSelectedBlocks(): void {
    this.copySelectedBlocks();
    this.deleteSelectedBlocks();
  }

  // ============================================
  // Private Methods
  // ============================================

  private selectBlockRange(startBlockId: string, endBlockId: string): void {
    const controller = this.deps.getController();
    if (!controller) return;

    const doc = controller.getDocument();
    const flatBlocks = this.getFlatBlockIds(doc);

    const startIndex = flatBlocks.indexOf(startBlockId);
    const endIndex = flatBlocks.indexOf(endBlockId);

    if (startIndex === -1 || endIndex === -1) return;

    const [fromIndex, toIndex] = startIndex <= endIndex
      ? [startIndex, endIndex]
      : [endIndex, startIndex];

    this.clearBlockSelectionUI();
    this.selectedBlockIds.clear();

    for (let i = fromIndex; i <= toIndex; i++) {
      this.selectedBlockIds.add(flatBlocks[i]);
    }

    this.updateBlockSelectionUI();
  }

  private toggleBlockSelected(blockId: string): void {
    if (this.selectedBlockIds.has(blockId)) {
      this.selectedBlockIds.delete(blockId);
    } else {
      this.selectedBlockIds.add(blockId);
      this.selectionAnchorBlockId = blockId;
    }
    this.updateBlockSelectionUI();
  }

  private updateBlockSelectionUI(): void {
    this.deps.getBlockElements().forEach((element, blockId) => {
      if (this.selectedBlockIds.has(blockId)) {
        element.classList.add('nexo-block-selected');
      } else {
        element.classList.remove('nexo-block-selected');
      }
    });
  }

  private clearBlockSelectionUI(): void {
    this.deps.getBlockElements().forEach((element) => {
      element.classList.remove('nexo-block-selected');
    });
  }

  private getFlatBlockIds(doc: Document): string[] {
    const result: string[] = [];

    const collectIds = (blockIds: string[]) => {
      for (const blockId of blockIds) {
        result.push(blockId);
        const block = doc.blocks[blockId];
        if (block && block.childrenIds.length > 0) {
          collectIds(block.childrenIds);
        }
      }
    };

    collectIds(doc.rootIds);
    return result;
  }
}

