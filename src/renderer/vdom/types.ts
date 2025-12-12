/**
 * Virtual DOM - 类型定义
 */

// ============================================
// VNode 虚拟节点
// ============================================

export interface VNodeProps {
  [key: string]: unknown;
  key?: string | number;
  className?: string;
  style?: Partial<CSSStyleDeclaration> | string;
  children?: VNode[];
  // 事件处理
  onClick?: (e: MouseEvent) => void;
  onInput?: (e: Event) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: FocusEvent) => void;
  // 特殊属性
  contentEditable?: boolean | 'true' | 'false';
  'data-block-id'?: string;
  'data-block-type'?: string;
  'data-placeholder'?: string;
}

export interface VElement {
  type: 'element';
  tag: string;
  props: VNodeProps;
  children: VNode[];
  key?: string | number;
}

export interface VText {
  type: 'text';
  content: string;
}

export interface VComponent {
  type: 'component';
  component: ComponentFunction;
  props: VNodeProps;
  key?: string | number;
}

export type VNode = VElement | VText | VComponent | null;

export type ComponentFunction = (props: VNodeProps) => VNode;

// ============================================
// Patch 类型（描述 DOM 变更）
// ============================================

export type PatchType =
  | 'CREATE'      // 创建新节点
  | 'REMOVE'      // 删除节点
  | 'REPLACE'     // 替换节点
  | 'UPDATE'      // 更新属性
  | 'REORDER';    // 重排序子节点

export interface CreatePatch {
  type: 'CREATE';
  newNode: VNode;
  parentElement?: Node;
  index?: number;
}

export interface RemovePatch {
  type: 'REMOVE';
  element: Node;
}

export interface ReplacePatch {
  type: 'REPLACE';
  element: Node;
  newNode: VNode;
}

export interface UpdatePatch {
  type: 'UPDATE';
  element: HTMLElement;
  props: {
    add: VNodeProps;
    remove: string[];
    update: VNodeProps;
  };
  children: Patch[];
}

export interface ReorderPatch {
  type: 'REORDER';
  element: HTMLElement;
  moves: Array<{
    type: 'INSERT' | 'REMOVE';
    index: number;
    element?: Node;
    newNode?: VNode;
  }>;
}

export type Patch = CreatePatch | RemovePatch | ReplacePatch | UpdatePatch | ReorderPatch;

// ============================================
// 渲染上下文
// ============================================

export interface VDOMContext {
  // 节点到 DOM 元素的映射
  nodeToElement: WeakMap<object, Node>;
  // DOM 元素到节点的映射
  elementToNode: WeakMap<Node, VNode>;
  // 上一次渲染的虚拟树
  prevTree: VNode | null;
}

