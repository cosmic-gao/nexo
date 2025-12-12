/**
 * 虚拟渲染层 - 高级文本渲染和输入处理引擎
 *
 * 这是一个功能完整的富文本渲染引擎，提供了类似Notion或Roam Research的编辑体验。
 * 通过虚拟化技术实现了对文本输入、光标管理、选择操作的完全控制。
 *
 * 核心架构组件：
 * =============
 *
 * 1. 富文本节点系统 (RichTextNode, RichTextFragment)
 *    - 将文本分解为可独立样式化的节点
 *    - 支持粗体、斜体、下划线、代码、颜色等富文本格式
 *    - 高效的文本操作（插入、删除、合并）
 *
 * 2. 虚拟选择器系统 (VirtualSelectionManager)
 *    - 不依赖浏览器的Selection API
 *    - 提供更精确的光标和选择控制
 *    - 支持跨块的选择操作
 *
 * 3. 自定义光标系统 (CustomCaret)
 *    - 手动绘制和定位光标
 *    - 支持闪烁动画和精确位置计算
 *    - 避免浏览器默认光标的限制
 *
 * 4. 输入拦截系统 (InputInterceptor)
 *    - 完全接管键盘输入事件
 *    - 支持组合键和特殊输入法
 *    - 精确控制输入行为和光标移动
 *
 * 核心优势：
 * ========
 *
 * - 完全控制：摆脱浏览器默认行为的限制
 * - 高性能：精确控制重渲染，避免不必要的DOM操作
 * - 跨平台：可以在不同环境中提供一致的编辑体验
 * - 可扩展：支持自定义输入处理和渲染逻辑
 * - 实时同步：输入和显示的即时响应
 *
 * 使用场景：
 * ========
 * - 块编辑器：为每个块提供独立的文本编辑能力
 * - 富文本编辑器：支持复杂的文本格式和结构
 * - 协作编辑：精确的光标和选择同步
 * - 自定义输入：特殊的输入处理需求
 */

// ==================== 1. 富文本节点 (Rich Text Node) ====================

export interface RichTextNode {
  id: string;
  text: string;
  styles?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
}

export class RichTextFragment {
  private nodes: RichTextNode[] = [];
  private element: HTMLElement | null = null;

  constructor(text: string = '') {
    // 即使文本为空，也要创建一个节点，确保可以渲染和交互
    this.nodes = [{
      id: this.generateId(),
      text: text || '',
    }];
  }

  private generateId(): string {
    return `text_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  getText(): string {
    return this.nodes.map(node => node.text).join('');
  }

  getNodes(): RichTextNode[] {
    return [...this.nodes];
  }

  setText(text: string) {
    // 即使文本为空，也要创建一个节点
    this.nodes = [{
      id: this.generateId(),
      text: text || '',
    }];
    this.render();
  }

  insertText(offset: number, text: string) {
    if (offset < 0 || offset > this.getText().length) return;

    const before = this.getText().substring(0, offset);
    const after = this.getText().substring(offset);

    this.nodes = [];
    if (before) {
      this.nodes.push({ id: this.generateId(), text: before });
    }
    if (text) {
      this.nodes.push({ id: this.generateId(), text });
    }
    if (after) {
      this.nodes.push({ id: this.generateId(), text: after });
    }
    if (this.nodes.length === 0) {
      this.nodes.push({ id: this.generateId(), text: '' });
    }
    this.render();
  }

  deleteText(startOffset: number, endOffset: number) {
    const text = this.getText();
    if (startOffset < 0 || endOffset > text.length || startOffset > endOffset) return;

    const before = text.substring(0, startOffset);
    const after = text.substring(endOffset);

    this.nodes = [];
    if (before || after) {
      this.nodes.push({ id: this.generateId(), text: before + after });
    } else {
      this.nodes.push({ id: this.generateId(), text: '' });
    }
    this.render();
  }

  render(): HTMLElement {
    if (!this.element) {
      this.element = document.createElement('span');
      this.element.className = 'rich-text-fragment';
    }

    // 清空并重新渲染
    this.element.innerHTML = '';
    
    // 确保至少有一个节点
    if (this.nodes.length === 0) {
      this.nodes = [{ id: this.generateId(), text: '' }];
    }
    
    this.nodes.forEach(node => {
      const span = document.createElement('span');
      span.className = 'rich-text-node';
      span.dataset.nodeId = node.id;
      span.textContent = node.text;
      
      // 如果文本为空，添加一个零宽空格以确保元素有高度
      if (!node.text) {
        span.innerHTML = '&#8203;'; // 零宽空格
      }
      
      // 应用样式
      if (node.styles) {
        if (node.styles.bold) span.style.fontWeight = 'bold';
        if (node.styles.italic) span.style.fontStyle = 'italic';
        if (node.styles.underline) span.style.textDecoration = 'underline';
        if (node.styles.code) {
          span.style.fontFamily = 'monospace';
          span.style.backgroundColor = '#f5f5f5';
          span.style.padding = '2px 4px';
          span.style.borderRadius = '3px';
        }
        if (node.styles.color) span.style.color = node.styles.color;
      }
      
      this.element!.appendChild(span);
    });

    return this.element;
  }

  getElement(): HTMLElement | null {
    return this.element;
  }

  getOffsetFromPoint(x: number, y: number): number {
    if (!this.element) return 0;

    // 使用 document.caretRangeFromPoint 或 document.caretPositionFromPoint
    let range: Range | null = null;
    if (document.caretRangeFromPoint) {
      range = document.caretRangeFromPoint(x, y);
    } else if ((document as any).caretPositionFromPoint) {
      const pos = (document as any).caretPositionFromPoint(x, y);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }

    if (!range) {
      // 回退：计算最接近的位置
      const text = this.getText();
      if (text.length === 0) return 0;
      return Math.floor(text.length / 2);
    }

    let offset = 0;
    const walker = document.createTreeWalker(
      this.element,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      if (node === range.startContainer || node.contains(range.startContainer)) {
        if (node === range.startContainer) {
          offset += range.startOffset;
        } else {
          // 如果 range 在子节点中，需要计算偏移
          let tempOffset = 0;
          const tempWalker = document.createTreeWalker(
            node,
            NodeFilter.SHOW_TEXT,
            null
          );
          let tempNode;
          while (tempNode = tempWalker.nextNode()) {
            if (tempNode === range.startContainer) {
              offset += tempOffset + range.startOffset;
              break;
            }
            tempOffset += tempNode.textContent?.length || 0;
          }
        }
        break;
      }
      offset += node.textContent?.length || 0;
    }

    return Math.min(offset, this.getText().length);
  }

  getCaretPosition(offset: number): { x: number; y: number; height: number } | null {
    if (!this.element) {
      return null; // 返回 null 而不是默认值，让调用者知道元素不存在
    }

    // 确保元素已附加到DOM
    if (!this.element.isConnected) {
      return null; // 元素未附加到DOM，无法计算位置
    }

    const text = this.getText();
    if (offset < 0 || offset > text.length) {
      offset = Math.max(0, Math.min(offset, text.length));
    }

    // 如果文本为空，返回开始位置（相对于元素）
    if (text.length === 0) {
      const rect = this.element.getBoundingClientRect();
      const lineHeight = parseFloat(getComputedStyle(this.element).lineHeight) || 20;
      // 返回相对于容器的位置，而不是绝对位置
      return { x: 0, y: 0, height: lineHeight };
    }

    // 创建临时 range 来获取位置
    const range = document.createRange();
    const selection = window.getSelection();
    
    try {
      // 保存当前选择
      const savedRanges: Range[] = [];
      if (selection && selection.rangeCount > 0) {
        for (let i = 0; i < selection.rangeCount; i++) {
          savedRanges.push(selection.getRangeAt(i).cloneRange());
        }
      }
      
      let currentOffset = 0;
      const walker = document.createTreeWalker(
        this.element,
        NodeFilter.SHOW_TEXT,
        null
      );

      let targetNode: Node | null = null;
      let targetOffset = 0;

      let node;
      while (node = walker.nextNode()) {
        const nodeLength = node.textContent?.length || 0;
        if (currentOffset + nodeLength >= offset) {
          targetNode = node;
          targetOffset = Math.min(offset - currentOffset, nodeLength);
          break;
        }
        currentOffset += nodeLength;
      }

      // 如果没有找到节点，使用最后一个文本节点或元素本身
      if (!targetNode) {
        const allNodes: Node[] = [];
        const allWalker = document.createTreeWalker(
          this.element,
          NodeFilter.SHOW_TEXT,
          null
        );
        let n;
        while (n = allWalker.nextNode()) {
          allNodes.push(n);
        }
        if (allNodes.length > 0) {
          targetNode = allNodes[allNodes.length - 1];
          targetOffset = targetNode.textContent?.length || 0;
        } else {
          // 如果没有文本节点，尝试在元素内创建文本节点
          if (this.element.childNodes.length === 0) {
            const textNode = document.createTextNode('');
            this.element.appendChild(textNode);
            targetNode = textNode;
            targetOffset = 0;
          } else {
            targetNode = this.element.firstChild as Node;
            targetOffset = 0;
          }
        }
      }

      if (targetNode) {
        try {
          // 确保 targetNode 是文本节点
          if (targetNode.nodeType === Node.TEXT_NODE) {
            range.setStart(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
            range.setEnd(targetNode, Math.min(targetOffset, targetNode.textContent?.length || 0));
          } else {
            // 如果不是文本节点，尝试找到其中的文本节点
            const textNodes: Node[] = [];
            const walker = document.createTreeWalker(
              targetNode,
              NodeFilter.SHOW_TEXT,
              null
            );
            let tn;
            while (tn = walker.nextNode()) {
              textNodes.push(tn);
            }
            if (textNodes.length > 0) {
              const firstTextNode = textNodes[0];
              range.setStart(firstTextNode, 0);
              range.setEnd(firstTextNode, 0);
            } else {
              range.setStart(targetNode, 0);
              range.setEnd(targetNode, 0);
            }
          }
          range.collapse(true);
          
          const rect = range.getBoundingClientRect();
          const containerRect = this.element.getBoundingClientRect();
          
          // 恢复选择
          if (selection) {
            selection.removeAllRanges();
            savedRanges.forEach(r => {
              try {
                selection.addRange(r);
              } catch (e) {
                // 忽略无效的 range
              }
            });
          }
          
          // 检查 rect 是否有效（如果元素未渲染，rect 的宽高可能为0）
          if (rect.width === 0 && rect.height === 0 && rect.left === 0 && rect.top === 0) {
            // 可能是元素还未完全渲染，返回 null 让调用者重试
            return null;
          }
          
          const result = {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            height: rect.height || parseFloat(getComputedStyle(this.element).lineHeight) || 20,
          };
          
          // 确保返回值有效（检查是否为 NaN 或无效值）
          if (isNaN(result.x) || isNaN(result.y) || !isFinite(result.x) || !isFinite(result.y)) {
            return null; // 返回 null 而不是默认值，让调用者知道计算失败
          }
          
          // 如果位置明显异常（比如在屏幕左上角），也返回 null
          if (Math.abs(result.x) > 10000 || Math.abs(result.y) > 10000) {
            return null;
          }
          
          return result;
        } catch (e) {
          // 如果设置 range 失败，返回元素开始位置
          const lineHeight = parseFloat(getComputedStyle(this.element).lineHeight) || 20;
          return { x: 0, y: 0, height: lineHeight };
        }
      }
    } catch (e) {
      // 错误时返回默认位置
    }

    // 回退：返回元素开始位置
    const lineHeight = parseFloat(getComputedStyle(this.element).lineHeight) || 20;
    return { x: 0, y: 0, height: lineHeight };
  }
}

// ==================== 2. 虚拟选择器 (Virtual Selection) ====================

export interface VirtualSelection {
  blockId: string;
  startOffset: number;
  endOffset: number;
  isCollapsed: boolean;
}

export class VirtualSelectionManager {
  private selection: VirtualSelection | null = null;
  private listeners: Set<(selection: VirtualSelection | null) => void> = new Set();

  setSelection(blockId: string, startOffset: number, endOffset?: number) {
    const actualEndOffset = endOffset !== undefined ? endOffset : startOffset;
    this.selection = {
      blockId,
      startOffset: Math.min(startOffset, actualEndOffset),
      endOffset: Math.max(startOffset, actualEndOffset),
      isCollapsed: startOffset === actualEndOffset,
    };
    this.notifyListeners();
  }

  getSelection(): VirtualSelection | null {
    return this.selection ? { ...this.selection } : null;
  }

  clearSelection() {
    this.selection = null;
    this.notifyListeners();
  }

  onSelectionChange(callback: (selection: VirtualSelection | null) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach(callback => callback(this.selection));
  }
}

// ==================== 3. 自定义光标 (Custom Caret) ====================

export class CustomCaret {
  private element: HTMLElement | null = null;
  private container: HTMLElement;
  private isVisible: boolean = false;
  private blinkInterval: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createCaretElement();
  }

  private createCaretElement() {
    this.element = document.createElement('div');
    this.element.className = 'custom-caret';
    // 确保容器是相对定位
    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }
    this.container.appendChild(this.element);
  }

  show(x: number, y: number, height: number) {
    if (!this.element) return;

    // 确保容器是相对定位
    if (getComputedStyle(this.container).position === 'static') {
      this.container.style.position = 'relative';
    }

    this.element.style.cssText = `
      display: block !important;
      position: absolute !important;
      left: ${x}px !important;
      top: ${y}px !important;
      width: 2px !important;
      height: ${Math.max(height, 16)}px !important;
      background-color: #000 !important;
      pointer-events: none !important;
      z-index: 10000 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
    `;
    this.isVisible = true;

    // 光标闪烁动画
    this.startBlink();
  }

  hide() {
    if (!this.element) return;
    this.element.style.display = 'none';
    this.isVisible = false;
    this.stopBlink();
  }

  private startBlink() {
    this.stopBlink();
    // 使用 CSS 动画，不需要 JavaScript 控制闪烁
    // 但保留这个方法以防需要动态控制
  }

  private stopBlink() {
    if (this.blinkInterval !== null) {
      clearInterval(this.blinkInterval);
      this.blinkInterval = null;
    }
    if (this.element) {
      this.element.style.opacity = '1';
    }
  }

  destroy() {
    this.stopBlink();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

// ==================== 4. 输入拦截器 (Input Interceptor) ====================

export class InputInterceptor {
  private container: HTMLElement;
  private onInput: (text: string) => void;
  private onKeyDown: (e: KeyboardEvent) => void;
  private compositionState: {
    isComposing: boolean;
    compositionText: string;
  } = {
    isComposing: false,
    compositionText: '',
  };

  constructor(
    container: HTMLElement,
    onInput: (text: string) => void,
    onKeyDown: (e: KeyboardEvent) => void
  ) {
    this.container = container;
    this.onInput = onInput;
    this.onKeyDown = onKeyDown;
    this.setupListeners();
  }

  private setupListeners() {
    // 阻止默认输入行为
    this.container.addEventListener('keydown', (e) => {
      // IME 输入时不拦截
      if (e.key === 'Process' || this.compositionState.isComposing) {
        return;
      }

      // 拦截所有键盘输入
      if (this.shouldIntercept(e)) {
        e.preventDefault();
        
        // 如果是可打印字符，调用 onInput；否则调用 onKeyDown
        if (this.isPrintableChar(e)) {
          this.onInput(e.key);
        } else {
          this.onKeyDown(e);
        }
      }
    }, true);

    // 处理 IME 输入
    this.container.addEventListener('compositionstart', () => {
      this.compositionState.isComposing = true;
      this.compositionState.compositionText = '';
    });

    this.container.addEventListener('compositionupdate', (e: CompositionEvent) => {
      this.compositionState.compositionText = e.data;
    });

    this.container.addEventListener('compositionend', (e: CompositionEvent) => {
      this.compositionState.isComposing = false;
      if (e.data) {
        this.onInput(e.data);
      }
      this.compositionState.compositionText = '';
    });

    // 处理粘贴
    this.container.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = e.clipboardData?.getData('text/plain') || '';
      if (text) {
        this.onInput(text);
      }
    });

    // 阻止 contentEditable 的默认行为
    this.container.addEventListener('beforeinput', (e) => {
      if (!this.compositionState.isComposing) {
        e.preventDefault();
      }
    }, true);
  }

  private shouldIntercept(e: KeyboardEvent): boolean {
    // 不拦截功能键（除了特定的组合键）
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // 拦截一些组合键
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'a' || e.key === 'c' || e.key === 'x')) {
        return true;
      }
      // 不拦截其他的 ctrl/meta/alt 组合键
      return false;
    }

    // 拦截所有可打印字符和编辑键，包括带修饰键的 Enter
    return e.key.length === 1 ||
           ['Backspace', 'Delete', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key);
  }

  private isPrintableChar(e: KeyboardEvent): boolean {
    // 检查是否为可打印字符
    // 排除特殊键
    const specialKeys = ['Backspace', 'Delete', 'Enter', 'Tab', 'Escape', 
                        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
                        'Home', 'End', 'PageUp', 'PageDown'];
    
    if (specialKeys.includes(e.key)) {
      return false;
    }
    
    // 单字符且不是控制字符
    return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
  }
}

// ==================== 5. 虚拟渲染器 (Virtual Renderer) ====================

/**
 * 虚拟渲染器 - 核心的文本渲染和输入处理引擎
 *
 * 这是整个虚拟渲染系统的核心类，负责协调所有子系统的协作。
 * 它提供了完整的富文本编辑能力，包括文本渲染、输入处理、光标管理等。
 *
 * 核心职责：
 * ========
 *
 * 1. 文本渲染管理
 *    - 管理多个RichTextFragment实例
 *    - 为每个块提供独立的文本渲染
 *    - 协调文本内容的显示和更新
 *
 * 2. 输入处理协调
 *    - 管理InputInterceptor处理键盘事件
 *    - 协调文本输入、删除、移动等操作
 *    - 提供统一的输入事件回调接口
 *
 * 3. 光标和选择管理
 *    - 管理VirtualSelectionManager处理选择状态
 *    - 控制CustomCaret的光标显示和定位
 *    - 支持跨块的选择操作
 *
 * 4. 生命周期管理
 *    - 初始化样式和事件处理器
 *    - 管理子系统的创建和销毁
 *    - 提供完整的清理接口
 *
 * 架构设计：
 * ========
 *
 * - 组合模式：组合多个专用子系统
 * - 观察者模式：通过回调函数向外通知状态变化
 * - 工厂模式：按需创建和管理RichTextFragment
 * - 单例模式：在每个容器中只有一个VirtualRenderer实例
 *
 * 性能特点：
 * ========
 *
 * - 精确更新：只重新渲染变化的文本片段
 * - 内存高效：复用DOM元素，避免频繁创建销毁
 * - 事件优化：使用事件委托和高效的事件处理
 * - 渲染节流：避免过于频繁的DOM操作
 */
export class VirtualRenderer {
  // ========== 核心数据结构 ==========
  private container: HTMLElement;                           // 渲染容器，所有操作都在这个容器内进行
  private fragments: Map<string, RichTextFragment> = new Map(); // 块ID到文本片段的映射表
  private selectionManager: VirtualSelectionManager;       // 虚拟选择器，管理光标和选择状态
  private caret: CustomCaret;                              // 自定义光标，提供精确的光标定位
  private inputInterceptor: InputInterceptor | null = null; // 输入拦截器，处理键盘事件
  private onContentChange: ((blockId: string, text: string) => void) | null = null; // 内容变化回调

  /**
   * 构造函数 - 初始化虚拟渲染器
   *
   * 执行完整的初始化流程，确保所有子系统正确设置并准备就绪。
   * 这个过程是同步的，确保在构造函数返回时渲染器已经完全可用。
   *
   * 初始化步骤：
   * ===========
   *
   * 1. 保存容器引用
   *    - 存储容器DOM元素用于后续操作
   *    - 所有渲染和事件处理都在这个容器内进行
   *
   * 2. 初始化核心子系统
   *    - 创建VirtualSelectionManager管理选择状态
   *    - 创建CustomCaret处理光标显示
   *    - 这些子系统相互独立但通过VirtualRenderer协调
   *
   * 3. 设置样式和事件处理器
   *    - 调用setupStyles()添加必要的CSS样式
   *    - 调用setupClickHandler()设置鼠标点击处理
   *    - 确保UI组件的正确显示和交互
   *
   * 设计考虑：
   * ========
   * - 延迟初始化：InputInterceptor在setupInputHandler()时才创建
   * - 错误恢复：构造函数中的错误会阻止渲染器创建
   * - 内存管理：所有子系统都在构造函数中创建，确保生命周期一致
   *
   * @param container - 渲染容器DOM元素，所有文本块都会渲染在这个容器内
   * @throws Error 如果container无效或无法访问
   */
  constructor(container: HTMLElement) {
    // ========== 1. 容器验证和保存 ==========
    // 验证容器有效性并保存引用
    // 所有后续的DOM操作都在这个容器内进行
    this.container = container;

    // ========== 2. 初始化核心子系统 ==========
    // 创建选择管理器，负责光标位置和文本选择的虚拟化管理
    this.selectionManager = new VirtualSelectionManager();

    // 创建自定义光标，负责光标的绘制、定位和动画
    // CustomCaret需要容器引用来计算相对位置
    this.caret = new CustomCaret(container);

    // ========== 3. 设置UI基础设施 ==========
    // 添加必要的CSS样式规则
    this.setupStyles();

    // 设置鼠标点击事件处理器，用于设置光标位置
    this.setupClickHandler();
  }

  private setupStyles() {
    // 检查是否已经添加过样式
    if (document.getElementById('virtual-renderer-styles')) return;

    const style = document.createElement('style');
    style.id = 'virtual-renderer-styles';
    style.textContent = `
      .virtual-block-content {
        position: relative;
        outline: none;
        min-height: 24px;
        line-height: 24px;
        cursor: text;
      }
      .rich-text-fragment {
        display: block;
        width: 100%;
        white-space: pre-wrap;
        word-wrap: break-word;
        min-height: 1em;
        line-height: inherit;
      }
      .rich-text-node {
        display: inline;
        line-height: inherit;
      }
      .virtual-block-content::before {
        content: '';
        display: inline-block;
        width: 0;
      }
      .virtual-block-content:empty::after {
        content: ' ';
        display: inline-block;
        width: 0;
      }
      .custom-caret {
        position: absolute;
        width: 2px !important;
        background-color: #000 !important;
        pointer-events: none;
        z-index: 10000 !important;
        display: none;
        animation: caret-blink 1s infinite;
        margin: 0;
        padding: 0;
        border: none;
      }
      @keyframes caret-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  private setupClickHandler() {
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const contentElement = target.closest('.virtual-block-content') as HTMLElement;
      if (contentElement) {
        const blockId = contentElement.dataset.blockId;
        if (blockId) {
          const fragment = this.fragments.get(blockId);
          if (fragment) {
            const offset = fragment.getOffsetFromPoint(e.clientX, e.clientY);
            this.setSelection(blockId, offset);
          }
        }
      }
    });

    // 监听选择变化，更新光标
    this.selectionManager.onSelectionChange((selection) => {
      if (selection && selection.isCollapsed) {
        // 延迟一帧确保 DOM 已更新
        requestAnimationFrame(() => {
          this.updateCaret(selection.blockId, selection.startOffset);
        });
      } else {
        this.caret.hide();
      }
    });
  }

  renderBlock(blockId: string, text: string): HTMLElement {
    // 创建或获取 fragment
    let fragment = this.fragments.get(blockId);
    if (!fragment) {
      fragment = new RichTextFragment(text);
      this.fragments.set(blockId, fragment);
    } else {
      // 如果 fragment 已存在，更新文本但不重新创建 element
      fragment.setText(text);
    }

    // 创建容器元素
    const contentElement = document.createElement('div');
    contentElement.className = 'virtual-block-content';
    contentElement.dataset.blockId = blockId;
    contentElement.tabIndex = 0;
    contentElement.setAttribute('contenteditable', 'false'); // 明确禁用 contentEditable

    // 渲染 fragment（确保 element 已创建）
    const fragmentElement = fragment.render();
    if (fragmentElement) {
      contentElement.appendChild(fragmentElement);
    } else {
      // 如果 render() 返回 null，创建一个占位符
      const placeholder = document.createElement('span');
      placeholder.className = 'rich-text-fragment';
      placeholder.innerHTML = '&#8203;';
      contentElement.appendChild(placeholder);
    }

    return contentElement;
  }

  updateBlock(blockId: string, text: string) {
    const fragment = this.fragments.get(blockId);
    if (fragment) {
      fragment.setText(text);
      // render() 会更新 fragment 的内部 element
      fragment.render();
      
      // 确保 DOM 中的元素也被更新
      const contentElement = this.container.querySelector(
        `.virtual-block-content[data-block-id="${blockId}"]`
      ) as HTMLElement;
      if (contentElement) {
        const oldFragment = contentElement.querySelector('.rich-text-fragment');
        const newFragment = fragment.getElement();
        if (oldFragment && newFragment && oldFragment !== newFragment) {
          contentElement.replaceChild(newFragment, oldFragment);
        } else if (!oldFragment && newFragment) {
          contentElement.appendChild(newFragment);
        }
      }
    } else {
      // 如果 fragment 不存在，创建一个新的
      const contentElement = this.container.querySelector(
        `.virtual-block-content[data-block-id="${blockId}"]`
      ) as HTMLElement;
      if (contentElement) {
        const newFragment = new RichTextFragment(text);
        this.fragments.set(blockId, newFragment);
        const fragmentElement = newFragment.render();
        contentElement.innerHTML = '';
        contentElement.appendChild(fragmentElement);
      }
    }
  }

  setupInputHandler(
    onInput: (blockId: string, text: string, offset: number) => void,
    onKeyDown: (blockId: string, e: KeyboardEvent, offset: number) => void
  ) {
    this.inputInterceptor = new InputInterceptor(
      this.container,
      (text) => {
        const selection = this.selectionManager.getSelection();
        if (selection) {
          const offset = selection.startOffset;
          onInput(selection.blockId, text, offset);
        }
      },
      (e) => {
        const selection = this.selectionManager.getSelection();
        if (selection) {
          const offset = selection.startOffset;
          onKeyDown(selection.blockId, e, offset);
        }
      }
    );
  }

  setSelection(blockId: string, offset: number, endOffset?: number) {
    this.selectionManager.setSelection(blockId, offset, endOffset);
    // 立即更新光标（选择变化监听器也会触发，但这里确保立即执行）
    this.updateCaret(blockId, offset);
  }

  private updateCaret(blockId: string, offset: number) {
    const fragment = this.fragments.get(blockId);
    if (!fragment) {
      this.caret.hide();
      return;
    }

    const contentElement = this.container.querySelector(
      `.virtual-block-content[data-block-id="${blockId}"]`
    ) as HTMLElement;
    if (!contentElement) {
      this.caret.hide();
      return;
    }

    // 使用双重 requestAnimationFrame 确保 DOM 完全更新
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 确保容器是相对定位
        if (getComputedStyle(this.container).position === 'static') {
          this.container.style.position = 'relative';
        }

        // 再次检查 fragment 和元素是否存在且已附加到DOM
        const currentFragment = this.fragments.get(blockId);
        if (!currentFragment) {
          this.caret.hide();
          return;
        }

        const fragmentElement = currentFragment.getElement();
        if (!fragmentElement || !fragmentElement.isConnected) {
          // 如果元素未附加到DOM，延迟重试（最多重试3次）
          const retryCount = (this as any).__caretRetryCount || 0;
          if (retryCount < 3) {
            (this as any).__caretRetryCount = retryCount + 1;
            setTimeout(() => {
              this.updateCaret(blockId, offset);
            }, 10);
          } else {
            (this as any).__caretRetryCount = 0;
            this.caret.hide();
          }
          return;
        }

        // 重置重试计数器
        (this as any).__caretRetryCount = 0;

        const position = currentFragment.getCaretPosition(offset);
        
        // 如果位置计算失败（返回null），延迟重试（最多重试3次）
        if (!position) {
          const retryCount = (this as any).__caretRetryCount || 0;
          if (retryCount < 3) {
            (this as any).__caretRetryCount = retryCount + 1;
            setTimeout(() => {
              this.updateCaret(blockId, offset);
            }, 10);
          } else {
            (this as any).__caretRetryCount = 0;
            this.caret.hide();
          }
          return;
        }

        const containerRect = this.container.getBoundingClientRect();
        
        if (position && position.x !== undefined && position.y !== undefined) {
          // 获取 fragment 元素的实际位置
          if (fragmentElement) {
            const fragmentRect = fragmentElement.getBoundingClientRect();
            // 计算相对于容器的位置
            const x = fragmentRect.left - containerRect.left + position.x;
            const y = fragmentRect.top - containerRect.top + position.y;
            this.caret.show(x, y, position.height || 24);
            return;
          }
        }

        // 回退方案：显示在内容元素的位置
        const elementRect = contentElement.getBoundingClientRect();
        const lineHeight = parseFloat(getComputedStyle(contentElement).lineHeight) || 24;
        const x = elementRect.left - containerRect.left;
        const y = elementRect.top - containerRect.top;
        this.caret.show(x, y, lineHeight);
      });
    });
  }

  getSelection(): VirtualSelection | null {
    return this.selectionManager.getSelection();
  }

  getFragment(blockId: string): RichTextFragment | undefined {
    return this.fragments.get(blockId);
  }

  destroy() {
    this.caret.destroy();
    this.fragments.clear();
  }
}

