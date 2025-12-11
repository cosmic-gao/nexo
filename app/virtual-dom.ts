/**
 * 虚拟 DOM 系统 - 类似 React 的虚拟 DOM
 * 
 * 这个系统实现了一个轻量级的虚拟 DOM，核心思想是：
 * 1. 用 JavaScript 对象（VNode）描述 DOM 结构，而不是直接操作 DOM
 * 2. 通过 Diff 算法找出新旧虚拟节点的差异
 * 3. 只更新有变化的部分，而不是重新渲染整个 DOM
 * 
 * 核心概念：
 * 1. VNode - 虚拟节点：用 JS 对象描述 DOM 节点
 * 2. Diff 算法 - 比较新旧虚拟节点，找出差异
 * 3. Patch - 将差异应用到真实 DOM，只更新变化的部分
 * 4. 组件系统 - 支持组件化开发，每个组件返回虚拟节点
 * 
 * 优势：
 * - 性能优化：只更新变化的部分，减少 DOM 操作
 * - 声明式编程：用 JSX/h() 函数声明式描述 UI
 * - 易于测试：虚拟节点可以轻松序列化和测试
 * - 跨平台：虚拟节点可以渲染到不同平台（DOM、Canvas、Native）
 */

// ==================== 1. 虚拟节点类型定义 ====================

/**
 * 虚拟节点的类型
 * - string: HTML 标签名，如 'div', 'span'
 * - Function: 组件构造函数
 * - Component: 组件实例
 */
export type VNodeType = string | Function | Component;

/**
 * 虚拟节点的属性
 * - 可以包含任意属性（HTML 属性、事件处理器、样式等）
 * - children: 子节点数组
 * - key: 用于优化列表渲染的唯一标识
 */
export interface VNodeProps {
  [key: string]: any;
  children?: VNode[];
  key?: string | number;
}

/**
 * 虚拟节点（Virtual Node）
 * 
 * 这是整个虚拟 DOM 系统的核心数据结构。
 * 每个虚拟节点代表一个 DOM 节点或组件。
 * 
 * 示例：
 * {
 *   type: 'div',
 *   props: { className: 'container', onClick: handleClick },
 *   children: [
 *     { type: 'span', props: {}, children: ['Hello'] }
 *   ],
 *   dom: <实际的 DOM 元素>,
 *   key: 'unique-key'
 * }
 */
export interface VNode {
  type: VNodeType;              // 节点类型：标签名、组件类或组件实例
  props: VNodeProps;            // 节点属性：HTML 属性、事件、样式等
  children?: VNode[];           // 子节点数组
  key?: string | number;        // 唯一标识，用于列表渲染优化
  dom?: HTMLElement | Text;     // 对应的真实 DOM 节点（渲染后填充）
  component?: Component;        // 如果是组件节点，保存组件实例
}

/**
 * 组件接口
 * 
 * 所有组件必须实现这个接口。
 * 组件是一个可以返回虚拟节点的函数或类。
 */
export interface Component {
  render(): VNode;              // 渲染方法：返回描述组件 UI 的虚拟节点
  props?: VNodeProps;           // 组件接收的属性
  state?: any;                  // 组件内部状态
  update?(): void;              // 更新方法：当状态改变时调用
}

// ==================== 2. 虚拟节点创建函数 ====================

/**
 * 创建虚拟节点（类似 React.createElement 或 JSX）
 * 
 * 这是创建虚拟节点的核心函数，类似于 React 的 createElement。
 * 
 * @param type - 节点类型：HTML 标签名（如 'div'）或组件类
 * @param props - 节点属性：HTML 属性、事件处理器、样式等
 * @param children - 子节点：可以是字符串、数字、虚拟节点或数组
 * 
 * @returns 虚拟节点对象
 * 
 * 使用示例：
 * // 创建简单的 div
 * h('div', { className: 'container' }, 'Hello')
 * 
 * // 创建带子元素的节点
 * h('div', { onClick: handleClick },
 *   h('span', {}, 'Hello'),
 *   h('span', {}, 'World')
 * )
 * 
 * // 创建组件
 * h(MyComponent, { prop1: 'value' }, 'children')
 */
export function h(
  type: VNodeType,
  props: VNodeProps | null,
  ...children: (VNode | string | number | null | undefined)[]
): VNode {
  // 规范化属性：如果 props 为 null，使用空对象
  const normalizedProps: VNodeProps = props || {};
  
  // 规范化子节点：将各种类型的子节点统一转换为 VNode 数组
  const normalizedChildren: VNode[] = [];
  children.forEach(child => {
    // 跳过 null 和 undefined
    if (child === null || child === undefined) {
      return;
    }
    
    // 字符串和数字转换为文本节点
    if (typeof child === 'string' || typeof child === 'number') {
      normalizedChildren.push({
        type: '#text',                    // 文本节点的特殊类型标识
        props: { nodeValue: String(child) },
        children: [],
      });
    } 
    // 数组：展开并过滤掉 falsy 值
    else if (Array.isArray(child)) {
      normalizedChildren.push(...child.filter(Boolean) as VNode[]);
    } 
    // 已经是 VNode，直接添加
    else {
      normalizedChildren.push(child);
    }
  });

  // 返回虚拟节点对象
  return {
    type,
    props: normalizedProps,
    children: normalizedChildren.length > 0 ? normalizedChildren : undefined,
    key: normalizedProps.key,  // 从 props 中提取 key
  };
}

/**
 * 创建文本节点的便捷函数
 * 
 * @param value - 文本内容（字符串或数字）
 * @returns 文本虚拟节点
 * 
 * 使用示例：
 * text('Hello World')  // 创建文本节点
 */
export function text(value: string | number): VNode {
  return {
    type: '#text',                    // 文本节点的特殊类型
    props: { nodeValue: String(value) },
    children: [],
  };
}

// ==================== 3. 渲染器 - 将虚拟节点转换为真实 DOM ====================

/**
 * 将虚拟节点渲染为真实 DOM
 * 
 * 这是虚拟 DOM 到真实 DOM 的转换函数。
 * 递归地将虚拟节点树转换为真实的 DOM 树。
 * 
 * @param vnode - 要渲染的虚拟节点
 * @param container - 容器元素（用于查找父元素）
 * @returns 渲染后的真实 DOM 节点
 * 
 * 渲染流程：
 * 1. 检查节点类型（文本/组件/元素）
 * 2. 创建对应的真实 DOM 节点
 * 3. 设置属性和事件
 * 4. 递归渲染子节点
 * 5. 建立虚拟节点和真实 DOM 的映射关系
 */
export function render(vnode: VNode | null, container: HTMLElement): HTMLElement | Text | null {
  // 空节点直接返回 null
  if (!vnode) {
    return null;
  }

  let dom: HTMLElement | Text | null = null;

  // ========== 处理文本节点 ==========
  // 文本节点是叶子节点，直接创建文本 DOM 节点
  if (vnode.type === '#text') {
    dom = document.createTextNode(vnode.props.nodeValue || '');
    vnode.dom = dom;  // 建立映射关系，后续 diff 时需要用到
    return dom;
  }

  // ========== 处理组件节点 ==========
  // 组件节点需要先实例化组件，然后渲染组件返回的虚拟节点
  if (typeof vnode.type === 'function') {
    // 实例化组件（传入 props）
    const ComponentClass = vnode.type as any;
    const component = new ComponentClass(vnode.props);
    vnode.component = component;  // 保存组件实例到虚拟节点
    
    // 调用组件的 render 方法，获取组件返回的虚拟节点
    const childVNode = component.render();
    
    // 递归渲染组件返回的虚拟节点
    dom = render(childVNode, container) as HTMLElement;
    
    if (dom) {
      vnode.dom = dom;  // 建立映射关系
      
      // 保存组件实例到 DOM 元素（用于后续更新）
      // 这样当组件状态改变时，可以找到对应的 DOM 进行更新
      (dom as any).__component = component;
      (component as any)._vnode = childVNode;
      (component as any)._dom = dom;
    }
    return dom;
  }

  // ========== 处理普通 HTML 元素节点 ==========
  if (typeof vnode.type === 'string') {
    // 创建真实的 DOM 元素
    dom = document.createElement(vnode.type);
    vnode.dom = dom;  // 建立映射关系

    // 设置元素的属性（包括 HTML 属性、事件、样式等）
    setProps(dom as HTMLElement, vnode.props);

    // 递归渲染子节点
    if (vnode.children) {
      vnode.children.forEach(child => {
        const childDom = render(child, container);
        if (childDom) {
          // 将子节点添加到当前元素
          (dom as HTMLElement).appendChild(childDom);
        }
      });
    }
  }

  return dom;
}

/**
 * 设置 DOM 元素的属性
 * 
 * 将虚拟节点的属性应用到真实 DOM 元素上。
 * 处理各种类型的属性：HTML 属性、事件、样式、特殊属性等。
 * 
 * @param dom - 目标 DOM 元素
 * @param props - 虚拟节点的属性对象
 * 
 * 支持的属性类型：
 * 1. 事件处理器：onClick, onMouseOver 等（以 'on' 开头）
 * 2. className：CSS 类名
 * 3. style：内联样式对象
 * 4. dangerouslySetInnerHTML：直接设置 HTML（类似 React）
 * 5. data-* 属性：HTML5 数据属性
 * 6. 普通 HTML 属性：id, title, href 等
 */
function setProps(dom: HTMLElement, props: VNodeProps) {
  Object.keys(props).forEach(key => {
    // 跳过特殊属性：children 和 key 不是 DOM 属性
    if (key === 'children' || key === 'key') {
      return;
    }

    const value = props[key];

    // ========== 处理事件处理器 ==========
    // 事件属性以 'on' 开头，如 onClick -> click 事件
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase();  // onClick -> click
      dom.addEventListener(eventName, value);
      return;
    }

    // ========== 处理特殊属性 ==========
    
    // className：CSS 类名（React 风格）
    if (key === 'className') {
      dom.className = value;
      return;
    }

    // style：内联样式对象
    // 例如：{ color: 'red', fontSize: '14px' }
    if (key === 'style' && typeof value === 'object') {
      Object.assign(dom.style, value);
      return;
    }

    // dangerouslySetInnerHTML：直接设置 HTML（类似 React）
    // 使用场景：渲染富文本、用户输入等（需要注意 XSS 风险）
    if (key === 'dangerouslySetInnerHTML' && value && value.__html) {
      dom.innerHTML = value.__html;
      return;
    }

    // ========== 处理 HTML5 数据属性 ==========
    // data-* 属性：用于存储自定义数据
    if (key.startsWith('data-')) {
      dom.setAttribute(key, value);
      return;
    }

    // ========== 处理普通 HTML 属性 ==========
    // 如果值为 null/undefined/false，移除属性
    // 否则设置属性值
    if (value === null || value === undefined || value === false) {
      dom.removeAttribute(key);
    } else {
      dom.setAttribute(key, value);
    }
  });
}

// ==================== 4. Diff 算法 - 比较新旧虚拟节点 ====================

/**
 * 补丁（Patch）对象
 * 
 * 描述虚拟节点之间的差异，用于后续更新真实 DOM。
 * 
 * 补丁类型：
 * - CREATE: 创建新节点
 * - UPDATE: 更新现有节点（属性或子节点变化）
 * - DELETE: 删除节点
 * - REPLACE: 替换节点（类型不同）
 * - REORDER: 重新排序子节点（列表渲染优化）
 */
export interface Patch {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'REPLACE' | 'REORDER';
  vnode?: VNode;              // 新虚拟节点
  oldVNode?: VNode;           // 旧虚拟节点
  dom?: HTMLElement | Text;   // 对应的真实 DOM
  patches?: Patch[];          // 子节点的补丁（用于递归更新）
  moves?: any[];              // 列表重排序操作
}

/**
 * Diff 算法：比较新旧虚拟节点，生成补丁列表
 * 
 * 这是虚拟 DOM 的核心算法，用于找出两个虚拟节点树之间的差异。
 * 通过比较，我们只需要更新变化的部分，而不是重新渲染整个 DOM。
 * 
 * @param oldVNode - 旧的虚拟节点（或 null，表示节点不存在）
 * @param newVNode - 新的虚拟节点（或 null，表示要删除节点）
 * @returns 补丁列表，描述需要进行的 DOM 操作
 * 
 * 算法流程：
 * 1. 如果旧节点不存在，新节点存在 -> CREATE（创建新节点）
 * 2. 如果旧节点存在，新节点不存在 -> DELETE（删除节点）
 * 3. 如果两个节点都存在：
 *    - 如果节点相同（类型和 key 相同）-> UPDATE（更新节点）
 *    - 如果节点不同 -> REPLACE（替换节点）
 * 
 * 性能优化：
 * - 使用 key 来识别相同节点，避免不必要的替换
 * - 递归比较子节点，只更新变化的部分
 */
export function diff(oldVNode: VNode | null, newVNode: VNode | null): Patch[] {
  const patches: Patch[] = [];

  // ========== 情况1：创建新节点 ==========
  // 旧节点不存在，新节点存在 -> 需要创建
  if (!oldVNode && newVNode) {
    patches.push({
      type: 'CREATE',
      vnode: newVNode,
    });
  } 
  // ========== 情况2：删除节点 ==========
  // 旧节点存在，新节点不存在 -> 需要删除
  else if (oldVNode && !newVNode) {
    patches.push({
      type: 'DELETE',
      oldVNode,
    });
  } 
  // ========== 情况3：更新或替换节点 ==========
  // 两个节点都存在，需要判断是更新还是替换
  else if (oldVNode && newVNode) {
    // 判断是否为同一个节点（类型和 key 相同）
    if (isSameVNode(oldVNode, newVNode)) {
      // 相同节点 -> 更新节点
      // 需要比较属性和子节点的差异
      patches.push({
        type: 'UPDATE',
        vnode: newVNode,
        oldVNode,
        // 合并属性差异和子节点差异
        patches: diffProps(oldVNode, newVNode).concat(
          diffChildren(oldVNode, newVNode)
        ),
      });
    } else {
      // 不同节点 -> 替换节点
      // 直接替换整个节点，不进行细粒度比较
      patches.push({
        type: 'REPLACE',
        vnode: newVNode,
        oldVNode,
      });
    }
  }

  return patches;
}

/**
 * 判断两个虚拟节点是否相同
 * 
 * 用于决定是更新节点还是替换节点。
 * 如果类型和 key 都相同，认为是同一个节点，可以进行更新。
 * 否则认为是不同节点，需要替换。
 * 
 * @param oldVNode - 旧虚拟节点
 * @param newVNode - 新虚拟节点
 * @returns 是否为同一个节点
 * 
 * 注意：key 的作用
 * - key 用于在列表渲染时识别节点
 * - 即使类型相同，如果 key 不同，也认为是不同节点
 * - 如果没有 key，只比较类型
 */
function isSameVNode(oldVNode: VNode, newVNode: VNode): boolean {
  return oldVNode.type === newVNode.type && oldVNode.key === newVNode.key;
}

/**
 * 比较属性差异
 * 
 * 比较两个虚拟节点的属性，找出变化的属性。
 * 
 * @param oldVNode - 旧虚拟节点
 * @param newVNode - 新虚拟节点
 * @returns 属性差异的补丁列表
 * 
 * 比较逻辑：
 * 1. 收集所有属性名（旧节点 + 新节点）
 * 2. 逐个比较属性值
 * 3. 如果值不同，生成 UPDATE 补丁
 */
function diffProps(oldVNode: VNode, newVNode: VNode): Patch[] {
  const patches: Patch[] = [];
  const oldProps = oldVNode.props || {};
  const newProps = newVNode.props || {};
  
  // 收集所有属性名（合并新旧节点的所有属性）
  const allProps = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  allProps.forEach(key => {
    // 跳过特殊属性
    if (key === 'children' || key === 'key') {
      return;
    }

    const oldValue = oldProps[key];
    const newValue = newProps[key];

    // 如果属性值发生变化，生成更新补丁
    if (oldValue !== newValue) {
      patches.push({
        type: 'UPDATE',
        vnode: {
          ...newVNode,
          props: { [key]: newValue },
        },
        oldVNode: {
          ...oldVNode,
          props: { [key]: oldValue },
        },
      });
    }
  });

  return patches;
}

/**
 * 比较子节点差异
 * 
 * 递归比较两个虚拟节点的子节点列表。
 * 这是 diff 算法的核心递归部分。
 * 
 * @param oldVNode - 旧虚拟节点
 * @param newVNode - 新虚拟节点
 * @returns 子节点差异的补丁列表
 * 
 * 比较逻辑：
 * 1. 获取新旧节点的子节点列表
 * 2. 按索引逐个比较对应位置的子节点
 * 3. 递归调用 diff 函数比较每对子节点
 * 4. 收集所有子节点的补丁
 * 
 * 注意：这是简化实现
 * - 实际应用中应该使用 key 来匹配节点，而不是索引
 * - 需要处理节点移动、插入、删除等复杂情况
 */
function diffChildren(oldVNode: VNode, newVNode: VNode): Patch[] {
  const patches: Patch[] = [];
  const oldChildren = oldVNode.children || [];
  const newChildren = newVNode.children || [];
  
  // 取较长的列表长度，确保比较所有子节点
  const maxLength = Math.max(oldChildren.length, newChildren.length);

  // 按索引逐个比较子节点
  for (let i = 0; i < maxLength; i++) {
    const oldChild = oldChildren[i];  // 可能为 undefined（新节点有更多子节点）
    const newChild = newChildren[i];  // 可能为 undefined（旧节点有更多子节点）
    
    // 递归比较子节点，收集补丁
    patches.push(...diff(oldChild, newChild));
  }

  return patches;
}

// ==================== 5. Patch - 将差异应用到真实 DOM ====================

/**
 * 将补丁应用到真实 DOM
 * 
 * 这是虚拟 DOM 更新的最后一步：根据 diff 算法生成的补丁，
 * 实际修改真实 DOM，使其与新的虚拟节点树保持一致。
 * 
 * @param dom - 目标 DOM 节点（通常是根节点）
 * @param patches - 补丁列表（描述需要进行的操作）
 * @returns 更新后的 DOM 节点
 * 
 * 补丁类型处理：
 * 1. CREATE: 创建新节点并插入到 DOM
 * 2. DELETE: 从 DOM 中删除节点
 * 3. UPDATE: 更新节点的属性和子节点
 * 4. REPLACE: 用新节点替换旧节点
 * 
 * 性能优化：
 * - 批量处理补丁，减少重排和重绘
 * - 只更新变化的部分，不重新渲染整个树
 */
export function patch(dom: HTMLElement | Text | null, patches: Patch[]): HTMLElement | Text | null {
  // 如果 DOM 不存在，无法应用补丁
  if (!dom) {
    return null;
  }

  // 逐个处理每个补丁
  patches.forEach(p => {
    switch (p.type) {
      // ========== CREATE: 创建新节点 ==========
      case 'CREATE':
        if (p.vnode) {
          // 渲染新节点为真实 DOM
          const newDom = render(p.vnode, dom.parentElement || document.body);
          if (newDom && dom.parentElement) {
            // 插入到当前节点之前
            dom.parentElement.insertBefore(newDom, dom);
          }
        }
        break;

      // ========== DELETE: 删除节点 ==========
      case 'DELETE':
        if (p.oldVNode?.dom && p.oldVNode.dom.parentElement) {
          // 从父节点中移除
          p.oldVNode.dom.parentElement.removeChild(p.oldVNode.dom);
        }
        break;

      // ========== UPDATE: 更新节点 ==========
      case 'UPDATE':
        if (p.vnode && p.oldVNode && p.oldVNode.dom) {
          // 更新属性
          updateProps(p.oldVNode.dom as HTMLElement, p.oldVNode.props, p.vnode.props);
          
          // 递归处理子节点的补丁
          if (p.patches) {
            patch(p.oldVNode.dom, p.patches);
          }
          
          // 更新虚拟节点的 DOM 引用（保持映射关系）
          p.vnode.dom = p.oldVNode.dom;
        }
        break;

      // ========== REPLACE: 替换节点 ==========
      case 'REPLACE':
        if (p.vnode && p.oldVNode?.dom) {
          // 渲染新节点
          const newDom = render(p.vnode, p.oldVNode.dom.parentElement || document.body);
          if (newDom && p.oldVNode.dom.parentElement) {
            // 用新节点替换旧节点
            p.oldVNode.dom.parentElement.replaceChild(newDom, p.oldVNode.dom);
            // 更新虚拟节点的 DOM 引用
            p.vnode.dom = newDom as HTMLElement;
          }
        }
        break;
    }
  });

  return dom;
}

/**
 * 更新 DOM 元素的属性
 * 
 * 比较新旧属性，只更新变化的属性。
 * 这是性能优化的关键：只修改实际变化的属性，而不是全部重新设置。
 * 
 * @param dom - 目标 DOM 元素
 * @param oldProps - 旧属性
 * @param newProps - 新属性
 * 
 * 更新逻辑：
 * 1. 收集所有属性名（旧 + 新）
 * 2. 逐个比较属性值
 * 3. 如果值变化，更新 DOM
 * 4. 特殊处理事件、样式等
 */
function updateProps(dom: HTMLElement, oldProps: VNodeProps, newProps: VNodeProps) {
  // 收集所有属性名（合并新旧属性）
  const allProps = new Set([...Object.keys(oldProps), ...Object.keys(newProps)]);

  allProps.forEach(key => {
    // 跳过特殊属性
    if (key === 'children' || key === 'key') {
      return;
    }

    const oldValue = oldProps[key];
    const newValue = newProps[key];

    // 只更新变化的属性
    if (oldValue !== newValue) {
      // ========== 处理事件监听器 ==========
      // 先移除旧的事件监听器
      if (key.startsWith('on') && typeof oldValue === 'function') {
        const eventName = key.slice(2).toLowerCase();
        dom.removeEventListener(eventName, oldValue);
      }

      // ========== 设置新属性 ==========
      
      // 事件监听器：添加新的事件处理器
      if (key.startsWith('on') && typeof newValue === 'function') {
        const eventName = key.slice(2).toLowerCase();
        dom.addEventListener(eventName, newValue);
      } 
      // className：CSS 类名
      else if (key === 'className') {
        dom.className = newValue || '';
      } 
      // style：内联样式对象
      else if (key === 'style' && typeof newValue === 'object') {
        Object.assign(dom.style, newValue);
      } 
      // 移除属性：如果新值为 null/undefined/false
      else if (newValue === null || newValue === undefined || newValue === false) {
        dom.removeAttribute(key);
      } 
      // 普通属性：设置属性值
      else {
        dom.setAttribute(key, newValue);
      }
    }
  });
}

// ==================== 6. 组件基类 ====================

/**
 * 组件基类
 * 
 * 所有组件都应该继承这个基类。
 * 提供了组件的基本功能：props、state、渲染、更新等。
 * 
 * 组件生命周期：
 * 1. 构造函数：接收 props，初始化 state
 * 2. render：返回描述组件 UI 的虚拟节点
 * 3. setState：更新组件状态，触发重新渲染
 * 4. update：将新的虚拟节点与旧的进行比较，更新 DOM
 * 
 * 使用示例：
 * class MyComponent extends ComponentBase {
 *   render() {
 *     return h('div', {}, `Hello ${this.props.name}`);
 *   }
 * }
 */
export class ComponentBase implements Component {
  props: VNodeProps;                    // 组件接收的属性（外部传入）
  state: any = {};                      // 组件内部状态（可以改变）
  _vnode: VNode | null = null;          // 上次渲染的虚拟节点（用于 diff）
  _dom: HTMLElement | Text | null = null; // 组件对应的真实 DOM（用于更新）

  /**
   * 构造函数
   * @param props - 组件属性
   */
  constructor(props: VNodeProps = {}) {
    this.props = props;
  }

  /**
   * 渲染方法（必须由子类实现）
   * 
   * 返回描述组件 UI 的虚拟节点。
   * 这个方法应该是纯函数：相同的 props 和 state 应该返回相同的虚拟节点。
   * 
   * @returns 虚拟节点
   */
  render(): VNode {
    throw new Error('Component must implement render method');
  }

  /**
   * 更新组件状态
   * 
   * 类似 React 的 setState，用于更新组件内部状态并触发重新渲染。
   * 
   * @param newState - 新的状态对象（会与旧状态合并）
   * 
   * 注意：
   * - 状态更新是异步的（这里简化实现为同步）
   * - 状态更新会触发组件重新渲染
   */
  setState(newState: any) {
    // 合并新状态到旧状态
    this.state = { ...this.state, ...newState };
    // 触发更新
    this.update?.();
  }

  /**
   * 更新组件
   * 
   * 当组件状态或属性改变时调用。
   * 使用 diff 算法找出变化，只更新变化的部分。
   * 
   * 更新流程：
   * 1. 调用 render 生成新的虚拟节点
   * 2. 使用 diff 比较新旧虚拟节点
   * 3. 使用 patch 将差异应用到真实 DOM
   * 4. 更新 _vnode 引用
   */
  update() {
    // 如果没有旧的虚拟节点或 DOM，无法更新
    if (!this._vnode || !this._dom) return;

    // 生成新的虚拟节点
    const newVNode = this.render();
    
    // 比较新旧虚拟节点，生成补丁
    const patches = diff(this._vnode, newVNode);
    
    // 应用补丁到真实 DOM
    patch(this._dom, patches);
    
    // 更新虚拟节点引用
    this._vnode = newVNode;
  }
}

// ==================== 7. 渲染管理器 ====================

/**
 * 虚拟 DOM 渲染管理器
 * 
 * 管理虚拟 DOM 的渲染和更新。
 * 自动处理首次渲染和后续更新的区别。
 * 
 * 工作流程：
 * 1. 首次渲染：直接将虚拟节点渲染为真实 DOM
 * 2. 后续更新：使用 diff + patch 只更新变化的部分
 * 
 * 使用示例：
 * const renderer = new VirtualDOMRenderer(container);
 * renderer.render(h('div', {}, 'Hello'));  // 首次渲染
 * renderer.render(h('div', {}, 'World'));  // 更新（只更新文本）
 */
export class VirtualDOMRenderer {
  private container: HTMLElement;              // 容器元素
  private currentVNode: VNode | null = null;   // 当前渲染的虚拟节点（用于 diff）
  private rootDom: HTMLElement | Text | null = null; // 根 DOM 节点

  /**
   * 构造函数
   * @param container - 容器元素（虚拟节点将渲染到这里）
   */
  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * 渲染虚拟节点到容器
   * 
   * 这是主要的渲染方法。会自动判断是首次渲染还是更新。
   * 
   * @param vnode - 要渲染的虚拟节点
   * 
   * 渲染流程：
   * 1. 如果是首次渲染（currentVNode 为 null）：
   *    - 直接调用 render 函数将虚拟节点转换为真实 DOM
   *    - 将真实 DOM 添加到容器
   * 
   * 2. 如果是更新渲染（currentVNode 不为 null）：
   *    - 使用 diff 比较新旧虚拟节点
   *    - 使用 patch 将差异应用到真实 DOM
   *    - 只更新变化的部分，不重新渲染整个树
   */
  render(vnode: VNode) {
    if (!this.currentVNode) {
      // ========== 首次渲染 ==========
      // 直接将虚拟节点渲染为真实 DOM
      this.rootDom = render(vnode, this.container);
      if (this.rootDom) {
        // 添加到容器
        this.container.appendChild(this.rootDom);
      }
    } else {
      // ========== 更新渲染 ==========
      // 使用 diff 算法找出差异
      const patches = diff(this.currentVNode, vnode);
      
      // 应用补丁到真实 DOM（只更新变化的部分）
      if (this.rootDom) {
        patch(this.rootDom, patches);
      }
    }

    // 保存当前虚拟节点（用于下次 diff）
    this.currentVNode = vnode;
  }

  /**
   * 清空容器
   * 
   * 移除所有渲染的内容，重置状态。
   * 通常在需要完全重新渲染时使用。
   */
  clear() {
    this.container.innerHTML = '';
    this.currentVNode = null;
    this.rootDom = null;
  }
}

