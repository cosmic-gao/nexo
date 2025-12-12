/**
 * DOM Renderer - ImageRenderer
 */

import type { Block } from '../../../model/types';
import type { RenderContext } from '../../types';
import { BaseBlockRenderer } from '../BaseBlockRenderer';

export class ImageRenderer extends BaseBlockRenderer {
  type = 'image' as const;

  render(block: Block, context: RenderContext<HTMLElement>): HTMLElement {
    const wrapper = this.createBlockWrapper(block);
    wrapper.classList.add('nexo-block-image');
    wrapper.setAttribute('tabindex', '0');

    if (block.data.url) {
      const imageContainer = document.createElement('div');
      imageContainer.className = 'nexo-image-container';

      const img = document.createElement('img');
      img.className = 'nexo-image';
      img.src = block.data.url;
      img.alt = block.data.text || '';

      imageContainer.appendChild(img);
      wrapper.appendChild(imageContainer);
    } else {
      const placeholder = this.createUploadPlaceholder(block, context);
      wrapper.appendChild(placeholder);
    }

    return wrapper;
  }

  private createUploadPlaceholder(block: Block, context: RenderContext<HTMLElement>): HTMLElement {
    const placeholder = document.createElement('div');
    placeholder.className = 'nexo-image-placeholder';

    const icon = document.createElement('span');
    icon.className = 'nexo-image-icon';
    icon.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    `;

    const text = document.createElement('span');
    text.className = 'nexo-image-text';
    text.textContent = '点击上传图片或粘贴链接';

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.className = 'nexo-image-input';
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const url = await this.readFileAsDataURL(file);
        context.controller.updateBlock(block.id, { url });
      }
    });

    placeholder.addEventListener('click', () => {
      input.click();
    });

    placeholder.appendChild(icon);
    placeholder.appendChild(text);
    placeholder.appendChild(input);

    return placeholder;
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  update(element: HTMLElement, block: Block, context: RenderContext<HTMLElement>): void {
    const existingImg = element.querySelector('.nexo-image') as HTMLImageElement;

    if (block.data.url && !existingImg) {
      element.innerHTML = '';
      const imageContainer = document.createElement('div');
      imageContainer.className = 'nexo-image-container';

      const img = document.createElement('img');
      img.className = 'nexo-image';
      img.src = block.data.url;
      img.alt = block.data.text || '';

      imageContainer.appendChild(img);
      element.appendChild(imageContainer);
    } else if (existingImg && block.data.url) {
      existingImg.src = block.data.url;
      existingImg.alt = block.data.text || '';
    }
  }
}


