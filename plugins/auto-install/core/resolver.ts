import { createRequire } from "node:module";

const requireFromEsm = createRequire(import.meta.url);
const typesCache = new Map<string, string | null>();
const installCache = new Map<string, boolean>();
const pkgJsonCache = new Map<string, unknown>();

/**
 * 判定是否为 node: 内置模块
 * @param pkg 模块名，示例：node:fs、lodash
 * @returns 是否为内置模块
 */
export function isBuiltin(pkg: string): boolean {
  return pkg.startsWith("node:");
}

/**
 * 检查包是否已安装（带缓存，减少重复 resolve 开销）
 * @param pkg 包名，例如 lodash、@scope/pkg
 * @param rootDir 项目根路径，用于 resolve 路径查找
 * @returns 是否已安装
 */
export function isInstalled(pkg: string, rootDir: string): boolean {
  const key = `${rootDir}::${pkg}`;
  const cached = installCache.get(key);
  if (cached !== undefined) return cached;

  try {
    requireFromEsm.resolve(pkg, { paths: [rootDir] });
    installCache.set(key, true);
    return true;
  } catch {
    installCache.set(key, false);
    return false;
  }
}

/**
 * 读取 package.json（带缓存，避免重复 I/O）
 * @param pkg 包名，例如 lodash
 * @returns package.json 对象或 null
 */
export function loadPackageJson(pkg: string) {
  if (pkgJsonCache.has(pkg)) return pkgJsonCache.get(pkg) ?? null;

  try {
    const json = requireFromEsm(`${pkg}/package.json`);
    pkgJsonCache.set(pkg, json);
    return json;
  } catch {
    pkgJsonCache.set(pkg, null);
    return null;
  }
}

/**
 * 计算对应的 @types 包名；返回 null 表示无需安装。
 * @param pkg 包名，支持普通、scope、node: 前缀
 * @returns 对应的 @types 包名或 null
 *
 * 示例：
 *  lodash     -> @types/lodash
 *  @scope/pkg -> @types/scope__pkg
 *  node:fs    -> @types/fs
 *  @types/xx  -> null
 */
export function getTypesPackageName(pkg: string): string | null {
  const cached = typesCache.get(pkg);
  if (cached !== undefined) return cached;

  if (!pkg || pkg.startsWith("@types/")) {
    typesCache.set(pkg, null);
    return null;
  }

  const name = pkg.startsWith("node:") ? pkg.slice("node:".length) : pkg;
  if (!name) {
    typesCache.set(pkg, null);
    return null;
  }

  let result: string | null;
  if (name.startsWith("@")) {
    const [scope, lib] = name.slice(1).split("/", 2);
    result = scope && lib ? `@types/${scope}__${lib}` : null;
  } else {
    // strip any accidental subpath (should already be root, but guard)
    const root = name.split("/", 1)[0];
    result = root ? `@types/${root}` : null;
  }

  typesCache.set(pkg, result);
  return result;
}
