/**
 * ParagraphRenderer - 段落渲染器
 */

import type { Block, RenderContext } from '../core/types';
import { BaseRenderer } from './BaseRenderer';

export class ParagraphRenderer extends BaseRenderer {
  type = 'paragraph' as const;

  render(block: Block, _context: RenderContext): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    const content = this.createEditableElement(block, 'p');
    wrapper.appendChild(content);
    return wrapper;
  }
}

