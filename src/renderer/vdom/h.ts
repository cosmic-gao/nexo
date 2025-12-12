/**
 * Virtual DOM - h 函数（创建虚拟节点）
 * 类似 React.createElement
 */

import type { VNode, VElement, VText, VNodeProps, ComponentFunction } from './types';

/**
 * 创建虚拟元素节点
 */
export function h(
  tag: string | ComponentFunction,
  props?: VNodeProps | null,
  ...children: Array<VNode | string | number | boolean | null | undefined | Array<VNode | string>>
): VNode {
  const flatChildren = flattenChildren(children);
  const normalizedProps = props || {};

  if (typeof tag === 'function') {
    // 组件
    return {
      type: 'component',
      component: tag,
      props: { ...normalizedProps, children: flatChildren },
      key: normalizedProps.key,
    };
  }

  return {
    type: 'element',
    tag,
    props: normalizedProps,
    children: flatChildren,
    key: normalizedProps.key,
  };
}

/**
 * 创建文本节点
 */
export function text(content: string): VText {
  return {
    type: 'text',
    content,
  };
}

/**
 * 展平和标准化子节点
 */
function flattenChildren(
  children: Array<VNode | string | number | boolean | null | undefined | Array<VNode | string>>
): VNode[] {
  const result: VNode[] = [];

  for (const child of children) {
    if (child === null || child === undefined || typeof child === 'boolean') {
      continue;
    }

    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else if (typeof child === 'string' || typeof child === 'number') {
      result.push(text(String(child)));
    } else {
      result.push(child);
    }
  }

  return result;
}

/**
 * Fragment - 无包装容器
 */
export function Fragment(props: VNodeProps): VNode {
  const children = props.children || [];
  if (children.length === 0) return null;
  if (children.length === 1) return children[0];
  
  // 返回一个虚拟的 fragment 元素
  return {
    type: 'element',
    tag: 'fragment',
    props: {},
    children,
  };
}

// ============================================
// 辅助函数
// ============================================

/**
 * 检查是否是 VElement
 */
export function isVElement(node: VNode): node is VElement {
  return node !== null && node.type === 'element';
}

/**
 * 检查是否是 VText
 */
export function isVText(node: VNode): node is VText {
  return node !== null && node.type === 'text';
}

/**
 * 获取节点的 key
 */
export function getKey(node: VNode): string | number | undefined {
  if (node === null) return undefined;
  if (node.type === 'element' || node.type === 'component') {
    return node.key;
  }
  return undefined;
}


