/**
 * DOM Renderer - DividerRenderer
 */

import type { Block } from '../../../model/types';
import type { RenderContext } from '../../types';
import { BaseBlockRenderer } from '../BaseBlockRenderer';

export class DividerRenderer extends BaseBlockRenderer {
  type = 'divider' as const;

  render(block: Block, _context: RenderContext<HTMLElement>): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-divider');
    wrapper.setAttribute('tabindex', '0');

    const hr = document.createElement('hr');
    hr.className = 'nexo-divider';

    wrapper.appendChild(hr);

    return wrapper;
  }

  update(_element: HTMLElement, _block: Block, _context: RenderContext<HTMLElement>): void {
    // 分割线没有可更新的内容
  }
}


