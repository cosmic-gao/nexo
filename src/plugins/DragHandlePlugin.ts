/**
 * Plugin - DragHandle 拖拽手柄
 */

import type { Plugin, PluginContext } from './types';

export class DragHandlePlugin implements Plugin {
  name = 'drag-handle';

  private context: PluginContext | null = null;
  private handleElement: HTMLElement | null = null;
  private currentBlockId: string | null = null;
  private isDragging: boolean = false;
  private draggedElement: HTMLElement | null = null;
  private dropIndicator: HTMLElement | null = null;
  private dragSourceId: string | null = null;

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
    this.dragSourceId = this.currentBlockId;

    this.draggedElement = this.context.compiler.getBlockElement(this.currentBlockId);
    if (this.draggedElement) {
      this.draggedElement.style.opacity = '0.4';
      this.draggedElement.style.transition = 'opacity 100ms ease';
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

  private handleDrag(e: MouseEvent): void {
    if (!this.isDragging || !this.context || !this.dropIndicator || !this.dragSourceId) return;

    const container = this.context.compiler.getContainer();
    if (!container) return;

    const blocks = container.querySelectorAll('.nexo-block');

    let closestBlock: HTMLElement | null = null;
    let insertPosition = 'after' as 'before' | 'after';
    let minDistance = Infinity;

    blocks.forEach(block => {
      const el = block as HTMLElement;
      const blockId = el.dataset.blockId;
      if (blockId === this.dragSourceId) return;

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

    if (!this.isDragging || !this.context || !this.dragSourceId) {
      this.resetDragState();
      return;
    }

    if (this.draggedElement) {
      this.draggedElement.style.opacity = '';
      this.draggedElement.style.transition = '';
    }

    if (this.handleElement) {
      this.handleElement.style.cursor = 'grab';
      this.handleElement.style.backgroundColor = 'var(--nexo-bg-secondary, #252525)';
      this.handleElement.style.color = 'var(--nexo-text-muted, #6b6b6b)';
    }

    if (this.dropIndicator) {
      const targetId = (this.dropIndicator as any)._targetId;
      const position = (this.dropIndicator as any)._position;

      if (targetId && position && targetId !== this.dragSourceId) {
        this.context.controller.moveBlockRelative(this.dragSourceId, targetId, position);

        // 重新排序 DOM
        const blocks = this.context.controller.getBlocks();
        const container = this.context.compiler.getContainer();

        if (container) {
          blocks.forEach(block => {
            const element = this.context!.compiler.getBlockElement(block.id);
            if (element) {
              container.appendChild(element);
            }
          });
        }
      }

      this.dropIndicator.style.display = 'none';
      (this.dropIndicator as any)._targetId = null;
      (this.dropIndicator as any)._position = null;
    }

    this.resetDragState();
  }

  private resetDragState(): void {
    this.isDragging = false;
    this.dragSourceId = null;
    this.draggedElement = null;
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


