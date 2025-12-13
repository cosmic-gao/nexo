/**
 * DOM 文本处理工具函数
 */

/**
 * 从 DOM 元素中提取文本，正确处理 <br> 为换行符
 * 这比 innerText 更可靠，避免换行符累积问题
 * 
 * 注意：contenteditable 中最后一个 <br> 通常是占位符，不代表实际换行
 */
export function extractTextFromElement(element: HTMLElement): string {
  const parts: string[] = [];
  
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parts.push(node.textContent || '');
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();
      
      // <br> 转换为换行符
      if (tagName === 'br') {
        parts.push('\n');
        return;
      }
      
      // 递归处理子节点
      for (const child of Array.from(node.childNodes)) {
        walk(child);
      }
      
      // 块级元素后添加换行（如果有内容且不以换行结尾）
      if (['div', 'p'].includes(tagName) && parts.length > 0) {
        const last = parts[parts.length - 1];
        if (last && !last.endsWith('\n')) {
          parts.push('\n');
        }
      }
    }
  };
  
  walk(element);
  
  let result = parts.join('');
  
  // 处理末尾的换行符
  // 1. 如果最后一个子节点是 <br>，这通常是浏览器的占位符，移除最后一个换行
  // 2. 如果末尾有由块级元素添加的换行，也移除
  if (result.endsWith('\n')) {
    const lastChild = element.lastChild;
    if (lastChild) {
      // 检查最后一个元素是否是 BR（占位符）
      if (lastChild.nodeName === 'BR') {
        result = result.slice(0, -1);
      }
      // 或者是块级元素添加的换行
      else if (lastChild.nodeType === Node.ELEMENT_NODE) {
        const tagName = (lastChild as HTMLElement).tagName?.toLowerCase();
        if (['div', 'p'].includes(tagName)) {
          result = result.slice(0, -1);
        }
      }
    }
  }
  
  return result;
}

