/**
 * DOM Renderer - ParagraphRenderer
 */

import type { Block } from '../../../model/types';
import type { RenderContext } from '../../types';
import { BaseBlockRenderer } from '../BaseBlockRenderer';

export class ParagraphRenderer extends BaseBlockRenderer {
  type = 'paragraph' as const;

  render(block: Block, _context: RenderContext<HTMLElement>): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    const content = this.createEditableElement(block, 'p');
    wrapper.appendChild(content);
    return wrapper;
  }
}


