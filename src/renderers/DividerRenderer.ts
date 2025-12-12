/**
 * DividerRenderer - 分割线渲染器
 */

import type { Block, RenderContext } from '../core/types';
import { BaseRenderer } from './BaseRenderer';

export class DividerRenderer extends BaseRenderer {
  type = 'divider' as const;

  render(block: Block, _context: RenderContext): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-divider');
    wrapper.setAttribute('tabindex', '0');

    const hr = document.createElement('hr');
    hr.className = 'nexo-divider';

    wrapper.appendChild(hr);

    return wrapper;
  }

  update(_element: HTMLElement, _block: Block, _context: RenderContext): void {
    // 分割线没有可更新的内容
  }
}

