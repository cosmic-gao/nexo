/**
 * Renderer Layer - BaseBlockRenderer
 * DOM 块渲染器基类
 */

import type { Block, BlockType } from '../../model/types';
import type { BlockRenderer, RenderContext } from '../types';

export abstract class BaseBlockRenderer implements BlockRenderer<HTMLElement> {
  abstract type: BlockType;

  abstract render(block: Block, context: RenderContext<HTMLElement>): HTMLElement;

  update(element: HTMLElement, block: Block, context: RenderContext<HTMLElement>): void {
    const editableElement = element.querySelector('[contenteditable="true"]') as HTMLElement;
    if (editableElement && block.data.text !== undefined) {
      // 只在内容真正不同时更新，避免打断用户输入
      if (editableElement.textContent !== block.data.text) {
        editableElement.textContent = block.data.text;
      }
    }
  }

  destroy(element: HTMLElement): void {
    element.remove();
  }

  protected createBlockWrapper(block: Block): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'nexo-block';
    wrapper.dataset.blockId = block.id;
    wrapper.dataset.blockType = block.type;
    return wrapper;
  }

  protected createEditableElement(block: Block, tag: string = 'div'): HTMLElement {
    const element = document.createElement(tag);
    element.className = 'nexo-block-content';
    element.contentEditable = 'true';
    element.dataset.placeholder = this.getPlaceholder(block.type);
    element.textContent = block.data.text || '';
    element.style.outline = 'none';
    return element;
  }

  protected getPlaceholder(type: BlockType): string {
    const placeholders: Record<BlockType, string> = {
      paragraph: "输入 '/' 使用命令...",
      heading1: '标题 1',
      heading2: '标题 2',
      heading3: '标题 3',
      bulletList: '列表',
      numberedList: '列表',
      todoList: '待办事项',
      quote: '引用',
      code: '代码',
      divider: '',
      image: '',
      toggle: '折叠块',
      callout: '提示',
      table: '',
      column: '',
      columnItem: '',
    };
    return placeholders[type] || '';
  }
}


