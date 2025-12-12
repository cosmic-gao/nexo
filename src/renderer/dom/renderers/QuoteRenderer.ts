/**
 * DOM Renderer - QuoteRenderer
 */

import type { Block } from '../../../model/types';
import type { RenderContext } from '../../types';
import { BaseBlockRenderer } from '../BaseBlockRenderer';

export class QuoteRenderer extends BaseBlockRenderer {
  type = 'quote' as const;

  render(block: Block, _context: RenderContext<HTMLElement>): HTMLElement {
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


