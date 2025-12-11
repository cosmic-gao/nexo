/**
 * 虚拟渲染层 - 类似 Notion 的渲染引擎
 * 
 * 核心特性：
 * 1. 虚拟选择器 (Virtual Selection) - 不依赖 DOM Selection API
 * 2. 自定义光标管理 (Custom Caret) - 手动绘制光标
 * 3. 富文本节点系统 (Rich Text Node) - 每个文本片段都是独立节点
 * 4. 输入拦截和处理 - 完全控制输入流程
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
    // 不拦截功能键
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // 但拦截一些组合键
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'a' || e.key === 'c' || e.key === 'x')) {
        return true;
      }
      return false;
    }

    // 拦截所有可打印字符和编辑键
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

export class VirtualRenderer {
  private container: HTMLElement;
  private fragments: Map<string, RichTextFragment> = new Map();
  private selectionManager: VirtualSelectionManager;
  private caret: CustomCaret;
  private inputInterceptor: InputInterceptor | null = null;
  private onContentChange: ((blockId: string, text: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.selectionManager = new VirtualSelectionManager();
    this.caret = new CustomCaret(container);
    this.setupStyles();
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

