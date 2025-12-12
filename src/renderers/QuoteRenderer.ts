/**
 * QuoteRenderer - 引用块渲染器
 */

import type { Block, RenderContext } from '../core/types';
import { BaseRenderer } from './BaseRenderer';

export class QuoteRenderer extends BaseRenderer {
  type = 'quote' as const;

  render(block: Block, _context: RenderContext): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-quote');

    const quoteContainer = document.createElement('blockquote');
    quoteContainer.className = 'nexo-quote-container';

    const content = this.createEditableElement(block, 'div');
    quoteContainer.appendChild(content);
    wrapper.appendChild(quoteContainer);

    return wrapper;
  }
}

