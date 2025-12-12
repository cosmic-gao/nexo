/**
 * Plugin - DragHandle 拖拽手柄
 * 支持多块选择拖拽和嵌套块整体拖拽
 */

import type { Plugin, PluginContext } from './types';
import type { Document } from '../model/types';

export class DragHandlePlugin implements Plugin {
  name = 'drag-handle';

  private context: PluginContext | null = null;
  private handleElement: HTMLElement | null = null;
  private currentBlockId: string | null = null;
  private isDragging: boolean = false;
  private draggedElements: HTMLElement[] = [];
  private dropIndicator: HTMLElement | null = null;
  private dragSourceIds: string[] = []; // 支持多块拖拽

  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseLeave: () => void;
  private boundHandleDrag: (e: MouseEvent) => void;
  private boundHandleDragEnd: (e: MouseEvent) => void;

  constructor() {
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseLeave = this.handleMouseLeave.bind(this);
    this.boundHandleDrag = this.handleDrag.bind(this);
    this.boundHandleDragEnd = this.handleDragEnd.bind(this);
  }

  init(context: PluginContext): void {
    this.context = context;
    this.createHandleElement();
    this.createDropIndicator();

    const container = context.compiler.getContainer();
    if (container) {
      container.addEventListener('mousemove', this.boundHandleMouseMove);
      container.addEventListener('mouseleave', this.boundHandleMouseLeave);
    }
  }

  destroy(): void {
    if (this.handleElement) {
      this.handleElement.remove();
      this.handleElement = null;
    }
    if (this.dropIndicator) {
      this.dropIndicator.remove();
      this.dropIndicator = null;
    }

    if (this.context) {
      const container = this.context.compiler.getContainer();
      if (container) {
        container.removeEventListener('mousemove', this.boundHandleMouseMove);
        container.removeEventListener('mouseleave', this.boundHandleMouseLeave);
      }
    }

    document.removeEventListener('mousemove', this.boundHandleDrag);
    document.removeEventListener('mouseup', this.boundHandleDragEnd);

    this.context = null;
  }

  private createHandleElement(): void {
    this.handleElement = document.createElement('div');
    this.handleElement.className = 'nexo-drag-handle';
    this.handleElement.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <circle cx="5" cy="3" r="1.5"/>
        <circle cx="11" cy="3" r="1.5"/>
        <circle cx="5" cy="8" r="1.5"/>
        <circle cx="11" cy="8" r="1.5"/>
        <circle cx="5" cy="13" r="1.5"/>
        <circle cx="11" cy="13" r="1.5"/>
      </svg>
    `;
    this.handleElement.style.cssText = `
      position: fixed;
      width: 24px;
      height: 24px;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: grab;
      color: var(--nexo-text-muted, #6b6b6b);
      background: var(--nexo-bg-secondary, #252525);
      border-radius: 4px;
      transition: background-color 100ms ease, color 100ms ease;
      z-index: 100;
      user-select: none;
    `;

    this.handleElement.addEventListener('mouseenter', () => {
      if (this.handleElement && !this.isDragging) {
        this.handleElement.style.backgroundColor = 'var(--nexo-bg-hover, #373737)';
        this.handleElement.style.color = 'var(--nexo-text-secondary, #9b9b9b)';
      }
    });

    this.handleElement.addEventListener('mouseleave', () => {
      if (this.handleElement && !this.isDragging) {
        this.handleElement.style.backgroundColor = 'var(--nexo-bg-secondary, #252525)';
        this.handleElement.style.color = 'var(--nexo-text-muted, #6b6b6b)';
      }
    });

    this.handleElement.addEventListener('mousedown', this.handleDragStart.bind(this));

    document.body.appendChild(this.handleElement);
  }

  private createDropIndicator(): void {
    this.dropIndicator = document.createElement('div');
    this.dropIndicator.className = 'nexo-drag-drop-indicator';
    this.dropIndicator.style.cssText = `
      position: fixed;
      height: 3px;
      background: var(--nexo-accent, #2383e2);
      border-radius: 2px;
      display: none;
      pointer-events: none;
      z-index: 1000;
    `;
    document.body.appendChild(this.dropIndicator);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isDragging || !this.context || !this.handleElement) return;

    const target = e.target as HTMLElement;
    const blockElement = this.findBlockElement(target);

    if (blockElement) {
      const blockId = blockElement.dataset.blockId;
      if (blockId && blockId !== this.currentBlockId) {
        this.currentBlockId = blockId;
        this.showHandle(blockElement);
      }
    }
  }

  private handleMouseLeave(): void {
    if (!this.isDragging) {
      setTimeout(() => {
        if (!this.isDragging && !this.isMouseOverHandle()) {
          this.hideHandle();
        }
      }, 100);
    }
  }

  private isMouseOverHandle(): boolean {
    if (!this.handleElement) return false;
    return this.handleElement.matches(':hover');
  }

  private showHandle(blockElement: HTMLElement): void {
    if (!this.handleElement || !this.context) return;

    const blockRect = blockElement.getBoundingClientRect();

    const handleTop = blockRect.top + (blockRect.height / 2) - 12;
    const handleLeft = blockRect.left - 28;

    this.handleElement.style.display = 'flex';
    this.handleElement.style.top = `${handleTop}px`;
    this.handleElement.style.left = `${Math.max(4, handleLeft)}px`;
  }

  private hideHandle(): void {
    if (this.handleElement && !this.isDragging) {
      this.handleElement.style.display = 'none';
      this.currentBlockId = null;
    }
  }

  private handleDragStart(e: MouseEvent): void {
    if (!this.context || !this.currentBlockId) return;

    e.preventDefault();
    e.stopPropagation();

    this.isDragging = true;
    
    // 确定要拖拽的块
    this.dragSourceIds = this.getDragSourceIds(this.currentBlockId);
    
    // 高亮所有被拖拽的块
    this.draggedElements = [];
    for (const blockId of this.dragSourceIds) {
      const element = this.context.compiler.getBlockElement(blockId);
      if (element) {
        element.style.opacity = '0.4';
        element.style.transition = 'opacity 100ms ease';
        this.draggedElements.push(element);
      }
    }

    if (this.handleElement) {
      this.handleElement.style.cursor = 'grabbing';
      this.handleElement.style.backgroundColor = 'var(--nexo-accent, #2383e2)';
      this.handleElement.style.color = 'white';
    }

    document.addEventListener('mousemove', this.boundHandleDrag);
    document.addEventListener('mouseup', this.boundHandleDragEnd);

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }

  /**
   * 获取要拖拽的块 ID 列表
   * 1. 如果有多块选择，拖拽所有选中的块
   * 2. 否则拖拽当前块及其所有子块
   */
  private getDragSourceIds(blockId: string): string[] {
    if (!this.context) return [blockId];

    // 检查是否有多块选择（通过 VDOMCompiler）
    const compiler = this.context.compiler as any;
    if (compiler.hasBlockSelection && compiler.hasBlockSelection()) {
      const selectedIds = compiler.getSelectedBlockIds();
      if (selectedIds && selectedIds.length > 0) {
        // 确保当前块在选中列表中
        if (selectedIds.includes(blockId)) {
          return this.expandWithDescendants(selectedIds);
        }
      }
    }

    // 单块拖拽：包含所有子块
    return this.getBlockWithDescendants(blockId);
  }

  /**
   * 获取块及其所有后代块
   */
  private getBlockWithDescendants(blockId: string): string[] {
    if (!this.context) return [blockId];

    const doc = this.context.controller.getDocument();
    const result: string[] = [blockId];
    
    const collectDescendants = (id: string) => {
      const block = doc.blocks[id];
      if (block && block.childrenIds) {
        for (const childId of block.childrenIds) {
          result.push(childId);
          collectDescendants(childId);
        }
      }
    };
    
    collectDescendants(blockId);
    return result;
  }

  /**
   * 扩展选中的块以包含所有后代
   */
  private expandWithDescendants(blockIds: string[]): string[] {
    const result = new Set<string>();
    
    for (const blockId of blockIds) {
      const descendants = this.getBlockWithDescendants(blockId);
      for (const id of descendants) {
        result.add(id);
      }
    }
    
    return Array.from(result);
  }

  private handleDrag(e: MouseEvent): void {
    if (!this.isDragging || !this.context || !this.dropIndicator || this.dragSourceIds.length === 0) return;

    const container = this.context.compiler.getContainer();
    if (!container) return;

    const blocks = container.querySelectorAll('.nexo-block');
    const dragSourceSet = new Set(this.dragSourceIds);

    let closestBlock: HTMLElement | null = null;
    let insertPosition = 'after' as 'before' | 'after';
    let minDistance = Infinity;

    blocks.forEach(block => {
      const el = block as HTMLElement;
      const blockId = el.dataset.blockId;
      
      // 跳过正在拖拽的块及其子块
      if (!blockId || dragSourceSet.has(blockId)) return;

      const rect = el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const distance = Math.abs(e.clientY - centerY);

      if (distance < minDistance) {
        minDistance = distance;
        closestBlock = el;
        insertPosition = e.clientY < centerY ? 'before' : 'after';
      }
    });

    if (closestBlock) {
      const rect = (closestBlock as HTMLElement).getBoundingClientRect();

      this.dropIndicator.style.display = 'block';
      this.dropIndicator.style.left = `${rect.left}px`;
      this.dropIndicator.style.width = `${rect.width}px`;
      this.dropIndicator.style.top = insertPosition === 'before' 
        ? `${rect.top - 2}px` 
        : `${rect.bottom - 1}px`;

      (this.dropIndicator as any)._targetId = (closestBlock as HTMLElement).dataset.blockId;
      (this.dropIndicator as any)._position = insertPosition;
    } else {
      this.dropIndicator.style.display = 'none';
    }

    if (this.handleElement) {
      this.handleElement.style.top = `${e.clientY - 12}px`;
    }
  }

  private handleDragEnd(_e: MouseEvent): void {
    document.removeEventListener('mousemove', this.boundHandleDrag);
    document.removeEventListener('mouseup', this.boundHandleDragEnd);

    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    if (!this.isDragging || !this.context || this.dragSourceIds.length === 0) {
      this.resetDragState();
      return;
    }

    // 恢复所有被拖拽元素的样式
    for (const element of this.draggedElements) {
      element.style.opacity = '';
      element.style.transition = '';
    }

    if (this.handleElement) {
      this.handleElement.style.cursor = 'grab';
      this.handleElement.style.backgroundColor = 'var(--nexo-bg-secondary, #252525)';
      this.handleElement.style.color = 'var(--nexo-text-muted, #6b6b6b)';
    }

    if (this.dropIndicator) {
      const targetId = (this.dropIndicator as any)._targetId;
      const position = (this.dropIndicator as any)._position;
      const dragSourceSet = new Set(this.dragSourceIds);

      if (targetId && position && !dragSourceSet.has(targetId)) {
        // 获取顶层块（没有父块在拖拽列表中的块）
        const topLevelBlocks = this.getTopLevelDragBlocks();
        
        // 按文档顺序排序
        const doc = this.context.controller.getDocument();
        const orderedBlocks = this.sortBlocksByDocumentOrder(topLevelBlocks, doc);
        
        // 移动所有顶层块
        // 从后往前移动，保持相对顺序
        for (let i = orderedBlocks.length - 1; i >= 0; i--) {
          const blockId = orderedBlocks[i];
          this.context.controller.moveBlockRelative(blockId, targetId, position);
        }

        // 清除多块选择（如果有）
        const compiler = this.context.compiler as any;
        if (compiler.clearBlockSelection) {
          compiler.clearBlockSelection();
        }

        // 强制重新渲染
        const compilerAny = this.context.compiler as any;
        if (compilerAny.renderCache) {
          compilerAny.renderCache.clear();
        }
        if (compilerAny.isFirstRender !== undefined) {
          compilerAny.isFirstRender = true;
        }
        
        // 触发重新渲染
        const newDoc = this.context.controller.getDocument();
        this.context.compiler.render(newDoc);
      }

      this.dropIndicator.style.display = 'none';
      (this.dropIndicator as any)._targetId = null;
      (this.dropIndicator as any)._position = null;
    }

    this.resetDragState();
  }

  /**
   * 获取顶层拖拽块（父块不在拖拽列表中）
   */
  private getTopLevelDragBlocks(): string[] {
    if (!this.context) return [];

    const doc = this.context.controller.getDocument();
    const dragSourceSet = new Set(this.dragSourceIds);
    const topLevel: string[] = [];

    for (const blockId of this.dragSourceIds) {
      const block = doc.blocks[blockId];
      if (!block) continue;

      // 如果父块不在拖拽列表中，则为顶层块
      if (!block.parentId || !dragSourceSet.has(block.parentId)) {
        topLevel.push(blockId);
      }
    }

    return topLevel;
  }

  /**
   * 按文档顺序排序块
   */
  private sortBlocksByDocumentOrder(blockIds: string[], doc: Document): string[] {
    const flatOrder = this.getFlatBlockOrder(doc);
    const orderMap = new Map<string, number>();
    flatOrder.forEach((id, index) => orderMap.set(id, index));

    return [...blockIds].sort((a, b) => {
      const orderA = orderMap.get(a) ?? Infinity;
      const orderB = orderMap.get(b) ?? Infinity;
      return orderA - orderB;
    });
  }

  /**
   * 获取文档中所有块的扁平顺序
   */
  private getFlatBlockOrder(doc: Document): string[] {
    const result: string[] = [];
    
    const collect = (blockIds: string[]) => {
      for (const blockId of blockIds) {
        result.push(blockId);
        const block = doc.blocks[blockId];
        if (block && block.childrenIds.length > 0) {
          collect(block.childrenIds);
        }
      }
    };
    
    collect(doc.rootIds);
    return result;
  }

  private resetDragState(): void {
    this.isDragging = false;
    this.dragSourceIds = [];
    this.draggedElements = [];
    this.currentBlockId = null;

    if (this.handleElement) {
      this.handleElement.style.display = 'none';
    }
  }

  private findBlockElement(target: HTMLElement): HTMLElement | null {
    let current: HTMLElement | null = target;
    while (current && current !== document.body) {
      if (current.dataset.blockId) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
}


