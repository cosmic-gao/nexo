/**
 * DOM Renderer - CodeRenderer
 */

import type { Block } from '../../../model/types';
import type { RenderContext } from '../../types';
import { BaseBlockRenderer } from '../BaseBlockRenderer';

export class CodeRenderer extends BaseBlockRenderer {
  type = 'code' as const;

  render(block: Block, _context: RenderContext<HTMLElement>): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-code');

    const codeContainer = document.createElement('div');
    codeContainer.className = 'nexo-code-container';

    const languageSelector = document.createElement('div');
    languageSelector.className = 'nexo-code-language';
    languageSelector.textContent = block.data.language || 'plain text';

    const pre = document.createElement('pre');
    pre.className = 'nexo-code-pre';

    const code = document.createElement('code');
    code.className = 'nexo-code-content';
    code.contentEditable = 'true';
    code.textContent = block.data.text || '';
    code.dataset.placeholder = '输入代码...';
    code.spellcheck = false;

    pre.appendChild(code);
    codeContainer.appendChild(languageSelector);
    codeContainer.appendChild(pre);
    wrapper.appendChild(codeContainer);

    return wrapper;
  }

  update(element: HTMLElement, block: Block, _context: RenderContext<HTMLElement>): void {
    const codeElement = element.querySelector('.nexo-code-content') as HTMLElement;
    const languageElement = element.querySelector('.nexo-code-language');

    if (codeElement && block.data.text !== undefined) {
      // 使用 innerText 比较和设置，保留换行
      if (codeElement.innerText !== block.data.text) {
        codeElement.innerText = block.data.text;
      }
    }

    if (languageElement) {
      languageElement.textContent = block.data.language || 'plain text';
    }
  }
}


