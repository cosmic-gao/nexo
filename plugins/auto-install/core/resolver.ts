import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const requireFromEsm = createRequire(import.meta.url);
const typesCache = new Map<string, string | null>();
const installCache = new Map<string, boolean>();
const pkgJsonCache = new Map<string, unknown>();
const resolvePathsCache = new Map<string, string[]>();

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
 * - 会同时尝试：来源文件所在目录、rootDir、cwd，兼容 workspace / 多层 node_modules
 * - 缓存 key 带上来源目录，避免不同子包间的结果互相污染
 * @param pkg 包名，例如 lodash、@scope/pkg
 * @param rootDir 项目根路径，用于默认 resolve 路径
 * @param from 可选，触发检查的文件路径，优先使用其所在目录作为 resolve 基准
 * @returns 是否已安装
 */
export function isInstalled(pkg: string, rootDir: string, from?: string): boolean {
  if (isBuiltin(pkg)) return true;

  // 缓存键加入调用方路径，避免不同子包/工作区的结果互相污染
  const resolveBase = from ? path.dirname(from) : rootDir;
  const key = `${resolveBase}::${pkg}`;
  const cached = installCache.get(key);
  if (cached !== undefined) return cached;

  const resolveCacheKey = `${resolveBase}|${rootDir}|${process.cwd()}`;
  let resolvePaths = resolvePathsCache.get(resolveCacheKey);
  if (!resolvePaths) {
    resolvePaths = Array.from(
      new Set(
        [resolveBase, rootDir, process.cwd()]
          .filter(Boolean)
          .map((p) => path.resolve(p as string))
      )
    );
    resolvePathsCache.set(resolveCacheKey, resolvePaths);
  }

  try {
    requireFromEsm.resolve(pkg, { paths: resolvePaths });
    installCache.set(key, true);
    return true;
  } catch {
    // @types/* 等纯类型包没有 JS 入口，require.resolve(pkg) 会失败；
    // 回退：定位 package.json 并确认类型入口文件存在，再判定为已安装。
    const pkgJsonPath = tryResolvePackageJson(pkg, resolvePaths);
    if (pkgJsonPath && hasTypeEntry(pkgJsonPath)) {
      installCache.set(key, true);
      return true;
    }

    installCache.set(key, false);
    return false;
  }
}

function tryResolvePackageJson(pkg: string, paths: string[]): string | null {
  try {
    return requireFromEsm.resolve(`${pkg}/package.json`, { paths });
  } catch {
    return null;
  }
}

function hasTypeEntry(pkgJsonPath: string): boolean {
  try {
    const json = requireFromEsm(pkgJsonPath) as { types?: string; typings?: string };
    const baseDir = path.dirname(pkgJsonPath);
    const candidates = [
      json.types,
      json.typings,
      "index.d.ts",
      "index.d.mts",
      "index.d.cts"
    ].filter(Boolean) as string[];

    return candidates.some((rel) => fs.existsSync(path.resolve(baseDir, rel)));
  } catch {
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
