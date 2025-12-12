/**
 * Virtual DOM - Diff 算法
 * 比较新旧虚拟树，生成 Patch 列表
 */

import type { VNode, VElement, VText, Patch, VNodeProps } from './types';
import { isVElement, isVText, getKey } from './h';

/**
 * 比较两个虚拟树，返回需要应用的变更
 */
export function diff(
  oldNode: VNode,
  newNode: VNode,
  element: Node | null
): Patch[] {
  const patches: Patch[] = [];

  diffNode(oldNode, newNode, element, patches);

  return patches;
}

function diffNode(
  oldNode: VNode,
  newNode: VNode,
  element: Node | null,
  patches: Patch[]
): void {
  // 两者都为空
  if (oldNode === null && newNode === null) {
    return;
  }

  // 新增节点
  if (oldNode === null && newNode !== null) {
    patches.push({
      type: 'CREATE',
      newNode,
    });
    return;
  }

  // 删除节点
  if (oldNode !== null && newNode === null) {
    if (element) {
      patches.push({
        type: 'REMOVE',
        element,
      });
    }
    return;
  }

  // 此时 oldNode 和 newNode 都不为 null
  const old = oldNode!;
  const next = newNode!;

  // 类型不同，替换
  if (old.type !== next.type) {
    if (element) {
      patches.push({
        type: 'REPLACE',
        element,
        newNode: next,
      });
    }
    return;
  }

  // 文本节点
  if (isVText(old) && isVText(next)) {
    if (old.content !== next.content && element) {
      patches.push({
        type: 'REPLACE',
        element,
        newNode: next,
      });
    }
    return;
  }

  // 元素节点
  if (isVElement(old) && isVElement(next)) {
    // 标签不同，替换
    if (old.tag !== next.tag) {
      if (element) {
        patches.push({
          type: 'REPLACE',
          element,
          newNode: next,
        });
      }
      return;
    }

    // 比较属性和子节点
    if (element && element instanceof HTMLElement) {
      const propsPatch = diffProps(old.props, next.props);
      const childPatches = diffChildren(old.children, next.children, element);

      if (propsPatch.add || propsPatch.remove.length > 0 || propsPatch.update || childPatches.length > 0) {
        patches.push({
          type: 'UPDATE',
          element,
          props: propsPatch,
          children: childPatches,
        });
      }
    }
    return;
  }

  // 组件节点：展开后比较
  if (old.type === 'component' && next.type === 'component') {
    // 相同组件，比较 props
    if (old.component === next.component) {
      // 组件 props 变化，需要重新渲染组件
      const oldRendered = old.component(old.props);
      const newRendered = next.component(next.props);
      diffNode(oldRendered, newRendered, element, patches);
    } else {
      // 不同组件，替换
      if (element) {
        patches.push({
          type: 'REPLACE',
          element,
          newNode: next,
        });
      }
    }
  }
}

/**
 * 比较属性
 */
function diffProps(
  oldProps: VNodeProps,
  newProps: VNodeProps
): { add: VNodeProps; remove: string[]; update: VNodeProps } {
  const add: VNodeProps = {};
  const remove: string[] = [];
  const update: VNodeProps = {};

  // 检查新增和更新的属性
  for (const key in newProps) {
    if (key === 'children' || key === 'key') continue;

    if (!(key in oldProps)) {
      add[key] = newProps[key];
    } else if (oldProps[key] !== newProps[key]) {
      update[key] = newProps[key];
    }
  }

  // 检查删除的属性
  for (const key in oldProps) {
    if (key === 'children' || key === 'key') continue;

    if (!(key in newProps)) {
      remove.push(key);
    }
  }

  return { add, remove, update };
}

/**
 * 比较子节点（带 key 的优化）
 */
function diffChildren(
  oldChildren: VNode[],
  newChildren: VNode[],
  parentElement: HTMLElement
): Patch[] {
  const patches: Patch[] = [];

  // 构建旧子节点的 key -> index 映射
  const oldKeyedMap = new Map<string | number, { node: VNode; index: number }>();
  const oldUnkeyed: Array<{ node: VNode; index: number }> = [];

  oldChildren.forEach((child, index) => {
    const key = getKey(child);
    if (key !== undefined) {
      oldKeyedMap.set(key, { node: child, index });
    } else {
      oldUnkeyed.push({ node: child, index });
    }
  });

  // 遍历新子节点
  let unkeyedIndex = 0;
  const childElements = Array.from(parentElement.childNodes);

  newChildren.forEach((newChild, newIndex) => {
    const key = getKey(newChild);
    let oldChild: VNode = null;
    let oldElement: Node | null = null;

    if (key !== undefined && oldKeyedMap.has(key)) {
      const old = oldKeyedMap.get(key)!;
      oldChild = old.node;
      oldElement = childElements[old.index] || null;
      oldKeyedMap.delete(key);
    } else if (unkeyedIndex < oldUnkeyed.length) {
      const old = oldUnkeyed[unkeyedIndex++];
      oldChild = old.node;
      oldElement = childElements[old.index] || null;
    }

    // 递归 diff
    diffNode(oldChild, newChild, oldElement, patches);
  });

  // 删除多余的旧节点
  oldKeyedMap.forEach(({ index }) => {
    const element = childElements[index];
    if (element) {
      patches.push({
        type: 'REMOVE',
        element,
      });
    }
  });

  for (let i = unkeyedIndex; i < oldUnkeyed.length; i++) {
    const element = childElements[oldUnkeyed[i].index];
    if (element) {
      patches.push({
        type: 'REMOVE',
        element,
      });
    }
  }

  return patches;
}


