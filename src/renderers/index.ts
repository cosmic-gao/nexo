/**
 * Renderers - 渲染器注册表
 */

import type { BlockRenderer, BlockType } from '../core/types';
import { ParagraphRenderer } from './ParagraphRenderer';
import { Heading1Renderer, Heading2Renderer, Heading3Renderer } from './HeadingRenderer';
import { BulletListRenderer, NumberedListRenderer, TodoListRenderer } from './ListRenderer';
import { QuoteRenderer } from './QuoteRenderer';
import { CodeRenderer } from './CodeRenderer';
import { DividerRenderer } from './DividerRenderer';
import { ImageRenderer } from './ImageRenderer';

export class RendererRegistry {
  private renderers: Map<BlockType, BlockRenderer> = new Map();

  constructor() {
    this.registerDefaultRenderers();
  }

  private registerDefaultRenderers(): void {
    this.register(new ParagraphRenderer());
    this.register(new Heading1Renderer());
    this.register(new Heading2Renderer());
    this.register(new Heading3Renderer());
    this.register(new BulletListRenderer());
    this.register(new NumberedListRenderer());
    this.register(new TodoListRenderer());
    this.register(new QuoteRenderer());
    this.register(new CodeRenderer());
    this.register(new DividerRenderer());
    this.register(new ImageRenderer());
  }

  register(renderer: BlockRenderer): void {
    this.renderers.set(renderer.type, renderer);
  }

  get(type: BlockType): BlockRenderer | undefined {
    return this.renderers.get(type);
  }

  has(type: BlockType): boolean {
    return this.renderers.has(type);
  }
}

export * from './ParagraphRenderer';
export * from './HeadingRenderer';
export * from './ListRenderer';
export * from './QuoteRenderer';
export * from './CodeRenderer';
export * from './DividerRenderer';
export * from './ImageRenderer';

