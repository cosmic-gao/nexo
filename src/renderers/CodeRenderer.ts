/**
 * CodeRenderer - 代码块渲染器
 */

import type { Block, RenderContext } from '../core/types';
import { BaseRenderer } from './BaseRenderer';

export class CodeRenderer extends BaseRenderer {
  type = 'code' as const;

  render(block: Block, _context: RenderContext): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-code');

    const codeContainer = document.createElement('div');
    codeContainer.className = 'nexo-code-container';

    // 语言选择器
    const languageSelector = document.createElement('div');
    languageSelector.className = 'nexo-code-language';
    languageSelector.textContent = block.data.language || 'plain text';

    // 代码内容区域
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

  update(element: HTMLElement, block: Block, _context: RenderContext): void {
    const codeElement = element.querySelector('.nexo-code-content') as HTMLElement;
    const languageElement = element.querySelector('.nexo-code-language');
    
    if (codeElement && block.data.text !== undefined) {
      if (codeElement.textContent !== block.data.text) {
        codeElement.textContent = block.data.text;
      }
    }
    
    if (languageElement) {
      languageElement.textContent = block.data.language || 'plain text';
    }
  }
}

