/**
 * DOM 文本处理工具函数
 */

/**
 * 从 DOM 元素中提取文本，正确处理 <br> 为换行符
 * 这比 innerText 更可靠，避免换行符累积问题
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
  
  // 合并并清理末尾换行
  return parts.join('').replace(/\n+$/, '');
}

