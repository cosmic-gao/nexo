import { init, parse } from "es-module-lexer";

const staticImportRe = /import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
const dynamicImportRe = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * 提取源码中的模块导入 specifier，去重后返回。
 * 优先使用 es-module-lexer，失败则回退正则。
 * @param code 源码
 * @returns 去重后的 specifier 列表
 */
export async function extractSpecifiers(code: string): Promise<string[]> {
  await init;

  const specs: string[] = [];

  try {
    const [imports] = parse(code);
    for (const item of imports) {
      const s = code.slice(item.s, item.e);
      if (s) specs.push(s);
    }
  } catch {
    for (const m of code.matchAll(staticImportRe)) {
      if (m[1]) specs.push(m[1]);
    }
  }

  for (const d of extractDynamicImports(code)) specs.push(d);

  return Array.from(new Set(specs));
}

/**
 * 提取动态 import('...') 的 specifier
 * @param code 源码
 * @returns 动态导入 specifier 列表
 */
function extractDynamicImports(code: string): string[] {
  const specs: string[] = [];
  for (const m of code.matchAll(dynamicImportRe)) {
    if (m[1]) specs.push(m[1]);
  }
  return specs;
}

/**
 * 从 specifier 提取包名（去除子路径/虚拟/相对/内置等）
 * @param specifier 形如 lodash、lodash/fp、@scope/pkg/sub
 * @returns 包名或 null（相对、虚拟、内置时返回 null）
 */
export function parsePackageName(specifier: string): string | null {
  const clean = specifier.split(/[?#]/, 1)[0];

  if (
    clean.startsWith(".") ||
    clean.startsWith("/") ||
    clean.startsWith("\0") ||
    clean.startsWith("virtual:") ||
    clean.startsWith("data:") ||
    clean.startsWith("node:") ||
    clean.startsWith("@/")
  ) {
    return null;
  }

  if (clean.startsWith("@")) {
    const parts = clean.split("/");
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }

  return clean.split("/", 1)[0];
}
