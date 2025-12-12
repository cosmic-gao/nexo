/**
 * Virtual DOM - 渲染器
 * 管理虚拟 DOM 的渲染和更新
 */

import type { VNode, VDOMContext } from './types';
import { diff } from './diff';
import { applyPatches, createElement } from './patch';

/**
 * VDOM 渲染器类
 */
export class VDOMRenderer {
  private container: HTMLElement;
  private currentTree: VNode = null;
  private context: VDOMContext;
  private isFirstRender: boolean = true;
  private pendingRender: VNode | null = null;
  private renderScheduled: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.context = {
      nodeToElement: new WeakMap<object, Node>(),
      elementToNode: new WeakMap<Node, VNode>(),
      prevTree: null,
    };
  }

  /**
   * 渲染虚拟树
   */
  render(vnode: VNode): void {
    if (this.isFirstRender) {
      // 首次渲染：直接创建 DOM
      this.container.innerHTML = '';
      const element = createElement(vnode);
      if (element) {
        this.container.appendChild(element);
      }
      this.currentTree = vnode;
      this.isFirstRender = false;
    } else {
      // 增量更新：diff + patch
      const patches = diff(this.currentTree, vnode, this.container.firstChild);
      applyPatches(patches, this.container);
      this.currentTree = vnode;
    }

    this.context.prevTree = vnode;
  }

  /**
   * 异步批量渲染（避免频繁更新）
   */
  scheduleRender(vnode: VNode): void {
    this.pendingRender = vnode;

    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        if (this.pendingRender) {
          this.render(this.pendingRender);
          this.pendingRender = null;
        }
        this.renderScheduled = false;
      });
    }
  }

  /**
   * 获取当前虚拟树
   */
  getCurrentTree(): VNode {
    return this.currentTree;
  }

  /**
   * 获取容器
   */
  getContainer(): HTMLElement {
    return this.container;
  }

  /**
   * 销毁渲染器
   */
  destroy(): void {
    this.container.innerHTML = '';
    this.currentTree = null;
    this.isFirstRender = true;
  }
}

/**
 * 创建渲染器实例
 */
export function createRenderer(container: HTMLElement): VDOMRenderer {
  return new VDOMRenderer(container);
}

