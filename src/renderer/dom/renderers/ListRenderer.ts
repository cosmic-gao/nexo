/**
 * DOM Renderer - ListRenderer
 */

import type { Block } from '../../../model/types';
import type { RenderContext } from '../../types';
import { BaseBlockRenderer } from '../BaseBlockRenderer';

export class BulletListRenderer extends BaseBlockRenderer {
  type = 'bulletList' as const;

  render(block: Block, _context: RenderContext<HTMLElement>): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-list', 'nexo-block-bullet-list');

    const listContainer = document.createElement('div');
    listContainer.className = 'nexo-list-container';

    const bullet = document.createElement('span');
    bullet.className = 'nexo-list-bullet';
    bullet.textContent = '•';

    const content = this.createEditableElement(block, 'div');
    content.classList.add('nexo-list-content');

    listContainer.appendChild(bullet);
    listContainer.appendChild(content);
    wrapper.appendChild(listContainer);

    return wrapper;
  }
}

export class NumberedListRenderer extends BaseBlockRenderer {
  type = 'numberedList' as const;

  render(block: Block, context: RenderContext<HTMLElement>): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-list', 'nexo-block-numbered-list');

    const listContainer = document.createElement('div');
    listContainer.className = 'nexo-list-container';

    const number = document.createElement('span');
    number.className = 'nexo-list-number';
    const index = this.calculateListIndex(block, context);
    number.textContent = `${index}.`;

    const content = this.createEditableElement(block, 'div');
    content.classList.add('nexo-list-content');

    listContainer.appendChild(number);
    listContainer.appendChild(content);
    wrapper.appendChild(listContainer);

    return wrapper;
  }

  private calculateListIndex(block: Block, context: RenderContext<HTMLElement>): number {
    const blocks = context.controller.getBlocks();
    let index = 1;

    for (const b of blocks) {
      if (b.id === block.id) break;
      if (b.type === 'numberedList') {
        index++;
      } else {
        index = 1;
      }
    }

    return index;
  }

  update(element: HTMLElement, block: Block, context: RenderContext<HTMLElement>): void {
    super.update(element, block, context);

    const numberElement = element.querySelector('.nexo-list-number');
    if (numberElement) {
      const index = this.calculateListIndex(block, context);
      numberElement.textContent = `${index}.`;
    }
  }
}

export class TodoListRenderer extends BaseBlockRenderer {
  type = 'todoList' as const;

  render(block: Block, context: RenderContext<HTMLElement>): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-list', 'nexo-block-todo-list');

    const todoContainer = document.createElement('div');
    todoContainer.className = 'nexo-list-container';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'nexo-todo-checkbox';
    checkbox.checked = block.data.checked || false;

    checkbox.addEventListener('change', () => {
      context.controller.updateBlock(block.id, { checked: checkbox.checked });
    });

    const content = this.createEditableElement(block, 'div');
    content.classList.add('nexo-list-content');
    if (block.data.checked) {
      content.classList.add('nexo-todo-checked');
    }

    todoContainer.appendChild(checkbox);
    todoContainer.appendChild(content);
    wrapper.appendChild(todoContainer);

    return wrapper;
  }

  update(element: HTMLElement, block: Block, context: RenderContext<HTMLElement>): void {
    super.update(element, block, context);

    const checkbox = element.querySelector('.nexo-todo-checkbox') as HTMLInputElement;
    const content = element.querySelector('.nexo-list-content');

    if (checkbox) {
      checkbox.checked = block.data.checked || false;
    }

    if (content) {
      content.classList.toggle('nexo-todo-checked', block.data.checked || false);
    }
  }
}


