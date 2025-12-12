/**
 * DOM Renderer - HeadingRenderer
 */

import type { Block } from '../../../model/types';
import type { RenderContext } from '../../types';
import { BaseBlockRenderer } from '../BaseBlockRenderer';

export class Heading1Renderer extends BaseBlockRenderer {
  type = 'heading1' as const;

  render(block: Block, _context: RenderContext<HTMLElement>): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-heading1');
    const content = this.createEditableElement(block, 'h1');
    wrapper.appendChild(content);
    return wrapper;
  }
}

export class Heading2Renderer extends BaseBlockRenderer {
  type = 'heading2' as const;

  render(block: Block, _context: RenderContext<HTMLElement>): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-heading2');
    const content = this.createEditableElement(block, 'h2');
    wrapper.appendChild(content);
    return wrapper;
  }
}

export class Heading3Renderer extends BaseBlockRenderer {
  type = 'heading3' as const;

  render(block: Block, _context: RenderContext<HTMLElement>): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-heading3');
    const content = this.createEditableElement(block, 'h3');
    wrapper.appendChild(content);
    return wrapper;
  }
}


