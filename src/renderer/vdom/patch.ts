/**
 * Virtual DOM - Patch 应用
 * 将 Patch 应用到真实 DOM
 */

import type { VNode, VElement, VText, Patch, VNodeProps } from './types';
import { isVElement, isVText } from './h';

/**
 * 应用所有 Patch 到 DOM
 */
export function applyPatches(patches: Patch[], container?: Node): void {
  for (const patch of patches) {
    applyPatch(patch, container);
  }
}

/**
 * 应用单个 Patch
 */
function applyPatch(patch: Patch, container?: Node): void {
  switch (patch.type) {
    case 'CREATE':
      applyCreate(patch.newNode, container, patch.index);
      break;

    case 'REMOVE':
      applyRemove(patch.element);
      break;

    case 'REPLACE':
      applyReplace(patch.element, patch.newNode);
      break;

    case 'UPDATE':
      applyUpdate(patch.element, patch.props, patch.children);
      break;

    case 'REORDER':
      applyReorder(patch.element, patch.moves);
      break;
  }
}

/**
 * 创建 DOM 节点
 */
export function createElement(vnode: VNode): Node | null {
  if (vnode === null) {
    return null;
  }

  if (isVText(vnode)) {
    return document.createTextNode(vnode.content);
  }

  if (vnode.type === 'component') {
    // 渲染组件
    const rendered = vnode.component(vnode.props);
    return createElement(rendered);
  }

  if (isVElement(vnode)) {
    // Fragment 处理
    if (vnode.tag === 'fragment') {
      const fragment = document.createDocumentFragment();
      vnode.children.forEach(child => {
        const childEl = createElement(child);
        if (childEl) {
          fragment.appendChild(childEl);
        }
      });
      return fragment;
    }

    const element = document.createElement(vnode.tag);

    // 设置属性
    setProps(element, vnode.props);

    // 创建子节点
    vnode.children.forEach(child => {
      const childEl = createElement(child);
      if (childEl) {
        element.appendChild(childEl);
      }
    });

    return element;
  }

  return null;
}

/**
 * 设置元素属性
 */
function setProps(element: HTMLElement, props: VNodeProps): void {
  for (const key in props) {
    if (key === 'children' || key === 'key') continue;
    setProp(element, key, props[key]);
  }
}

/**
 * 设置单个属性
 */
function setProp(element: HTMLElement, key: string, value: unknown): void {
  if (key.startsWith('on') && typeof value === 'function') {
    // 事件处理
    const eventName = key.slice(2).toLowerCase();
    element.addEventListener(eventName, value as EventListener);
    // 存储事件处理器以便后续移除
    (element as any)[`__${key}`] = value;
  } else if (key === 'className') {
    element.className = value as string;
  } else if (key === 'style') {
    if (typeof value === 'string') {
      element.style.cssText = value;
    } else if (typeof value === 'object' && value !== null) {
      Object.assign(element.style, value);
    }
  } else if (key === 'contentEditable') {
    element.contentEditable = value === true || value === 'true' ? 'true' : 'false';
  } else if (key.startsWith('data-')) {
    element.setAttribute(key, String(value));
  } else if (key in element) {
    (element as any)[key] = value;
  } else {
    element.setAttribute(key, String(value));
  }
}

/**
 * 移除属性
 */
function removeProp(element: HTMLElement, key: string): void {
  if (key.startsWith('on')) {
    const eventName = key.slice(2).toLowerCase();
    const handler = (element as any)[`__${key}`];
    if (handler) {
      element.removeEventListener(eventName, handler);
      delete (element as any)[`__${key}`];
    }
  } else if (key === 'className') {
    element.className = '';
  } else if (key === 'style') {
    element.style.cssText = '';
  } else if (key.startsWith('data-')) {
    element.removeAttribute(key);
  } else {
    element.removeAttribute(key);
  }
}

/**
 * 应用创建操作
 */
function applyCreate(vnode: VNode, container?: Node, index?: number): Node | null {
  const element = createElement(vnode);
  if (!element || !container) return element;

  if (index !== undefined && index < container.childNodes.length) {
    container.insertBefore(element, container.childNodes[index]);
  } else {
    container.appendChild(element);
  }

  return element;
}

/**
 * 应用删除操作
 */
function applyRemove(element: Node): void {
  element.parentNode?.removeChild(element);
}

/**
 * 应用替换操作
 */
function applyReplace(oldElement: Node, newVNode: VNode): Node | null {
  const newElement = createElement(newVNode);
  if (newElement && oldElement.parentNode) {
    oldElement.parentNode.replaceChild(newElement, oldElement);
  }
  return newElement;
}

/**
 * 应用更新操作
 */
function applyUpdate(
  element: HTMLElement,
  props: { add: VNodeProps; remove: string[]; update: VNodeProps },
  childPatches: Patch[]
): void {
  // 移除属性
  props.remove.forEach(key => removeProp(element, key));

  // 添加新属性
  for (const key in props.add) {
    setProp(element, key, props.add[key]);
  }

  // 更新属性
  for (const key in props.update) {
    setProp(element, key, props.update[key]);
  }

  // 应用子节点 patch
  applyPatches(childPatches, element);
}

/**
 * 应用重排序操作
 */
function applyReorder(
  element: HTMLElement,
  moves: Array<{
    type: 'INSERT' | 'REMOVE';
    index: number;
    element?: Node;
    newNode?: VNode;
  }>
): void {
  moves.forEach(move => {
    if (move.type === 'REMOVE' && move.element) {
      element.removeChild(move.element);
    } else if (move.type === 'INSERT' && move.newNode) {
      const newEl = createElement(move.newNode);
      if (newEl) {
        if (move.index < element.childNodes.length) {
          element.insertBefore(newEl, element.childNodes[move.index]);
        } else {
          element.appendChild(newEl);
        }
      }
    }
  });
}


