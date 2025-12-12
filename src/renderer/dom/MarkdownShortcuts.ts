/**
 * Markdown 快捷输入处理器
 * 检测 Markdown 语法并转换块类型
 */

import type { BlockType } from '../../model/types';

export interface MarkdownMatch {
  type: BlockType;
  pattern: RegExp;
  data?: Record<string, unknown>;
}

/**
 * Markdown 快捷规则
 */
export const markdownShortcuts: MarkdownMatch[] = [
  // 标题
  { type: 'heading1', pattern: /^#\s$/ },
  { type: 'heading2', pattern: /^##\s$/ },
  { type: 'heading3', pattern: /^###\s$/ },
  
  // 列表
  { type: 'bulletList', pattern: /^[-*]\s$/ },
  { type: 'numberedList', pattern: /^1\.\s$/ },
  { type: 'numberedList', pattern: /^\d+\.\s$/ },
  
  // 待办
  { type: 'todoList', pattern: /^\[\]\s$/, data: { checked: false } },
  { type: 'todoList', pattern: /^\[x\]\s$/i, data: { checked: true } },
  { type: 'todoList', pattern: /^-\s?\[\]\s$/, data: { checked: false } },
  { type: 'todoList', pattern: /^-\s?\[x\]\s$/i, data: { checked: true } },
  
  // 引用
  { type: 'quote', pattern: /^>\s$/ },
  { type: 'quote', pattern: /^"\s$/ },
  
  // 代码块
  { type: 'code', pattern: /^```$/ },
  { type: 'code', pattern: /^```\w*$/ },
  
  // 分割线
  { type: 'divider', pattern: /^---$/ },
  { type: 'divider', pattern: /^\*\*\*$/ },
  { type: 'divider', pattern: /^___$/ },
];

/**
 * 行内格式化规则
 */
export interface InlineFormat {
  pattern: RegExp;
  format: 'bold' | 'italic' | 'code' | 'strikethrough';
  wrapper: string;
}

export const inlineFormats: InlineFormat[] = [
  // 加粗 **text** 或 __text__
  { pattern: /\*\*([^*]+)\*\*/, format: 'bold', wrapper: '**' },
  { pattern: /__([^_]+)__/, format: 'bold', wrapper: '__' },
  
  // 斜体 *text* 或 _text_
  { pattern: /(?<!\*)\*([^*]+)\*(?!\*)/, format: 'italic', wrapper: '*' },
  { pattern: /(?<!_)_([^_]+)_(?!_)/, format: 'italic', wrapper: '_' },
  
  // 行内代码 `text`
  { pattern: /`([^`]+)`/, format: 'code', wrapper: '`' },
  
  // 删除线 ~~text~~
  { pattern: /~~([^~]+)~~/, format: 'strikethrough', wrapper: '~~' },
];

/**
 * 检测是否匹配 Markdown 快捷键
 */
export function detectMarkdownShortcut(text: string): MarkdownMatch | null {
  for (const rule of markdownShortcuts) {
    if (rule.pattern.test(text)) {
      return rule;
    }
  }
  return null;
}

/**
 * 检测行内格式化
 */
export function detectInlineFormat(text: string): { format: InlineFormat; match: RegExpMatchArray } | null {
  for (const format of inlineFormats) {
    const match = text.match(format.pattern);
    if (match) {
      return { format, match };
    }
  }
  return null;
}

/**
 * 获取代码块语言（如果有）
 */
export function extractCodeLanguage(text: string): string | null {
  const match = text.match(/^```(\w+)$/);
  return match ? match[1] : null;
}

/**
 * 应用行内格式化并返回新文本
 */
export function applyInlineFormat(
  text: string,
  format: InlineFormat,
  match: RegExpMatchArray
): { text: string; cursorOffset: number } {
  const innerText = match[1];
  const startIndex = match.index || 0;
  const endIndex = startIndex + match[0].length;
  
  // 移除 Markdown 标记，保留内容
  const newText = text.slice(0, startIndex) + innerText + text.slice(endIndex);
  
  // 光标应该在格式化文本的末尾
  const cursorOffset = startIndex + innerText.length;
  
  return { text: newText, cursorOffset };
}

