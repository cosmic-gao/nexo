/**
 * HeadingRenderer - 标题渲染器
 */

import type { Block, RenderContext, BlockType } from '../core/types';
import { BaseRenderer } from './BaseRenderer';

export class Heading1Renderer extends BaseRenderer {
  type = 'heading1' as const;

  render(block: Block, _context: RenderContext): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-heading1');
    const content = this.createEditableElement(block, 'h1');
    wrapper.appendChild(content);
    return wrapper;
  }
}

export class Heading2Renderer extends BaseRenderer {
  type = 'heading2' as const;

  render(block: Block, _context: RenderContext): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-heading2');
    const content = this.createEditableElement(block, 'h2');
    wrapper.appendChild(content);
    return wrapper;
  }
}

export class Heading3Renderer extends BaseRenderer {
  type = 'heading3' as const;

  render(block: Block, _context: RenderContext): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-heading3');
    const content = this.createEditableElement(block, 'h3');
    wrapper.appendChild(content);
    return wrapper;
  }
}

// 通用标题渲染器工厂
export function createHeadingRenderer(level: 1 | 2 | 3): BaseRenderer {
  const renderers = {
    1: new Heading1Renderer(),
    2: new Heading2Renderer(),
    3: new Heading3Renderer(),
  };
  return renderers[level];
}

