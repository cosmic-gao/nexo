import path from "node:path";
import type { Plugin } from "vite";
import {
  ImportCache,
  extractSpecifiers,
  parsePackageName,
  isInstalled as resolverIsInstalled,
  installPackages,
  installTypes,
  getTypesPackageName,
  loadPackageJson
} from "../core";

type PluginOptions = {
  cacheTtl?: number;
  root?: string;
};

export default function autoInstall(opts: PluginOptions = {}): Plugin {
  let rootDir = opts.root ? path.resolve(opts.root) : process.cwd();
  let announced = false;

  const parseCache = new ImportCache<string[]>(opts.cacheTtl ?? 0);

  const installed = new Set<string>();
  const installedTypes = new Set<string>();
  const installing = new Set<string>();

  const getMissingTypes = (pkg: string, from?: string): string | null => {
    const typesPkg = getTypesPackageName(pkg);
    if (!typesPkg) return null;
    if (installedTypes.has(typesPkg)) return null;
    if (resolverIsInstalled(typesPkg, rootDir, from)) {
      installedTypes.add(typesPkg);
      return null;
    }
    const pkgJson = loadPackageJson(pkg);
    if (pkgJson && (pkgJson.types || pkgJson.typings)) return null;
    return typesPkg;
  };

  const isSupportedFile = (id: string) => {
    const clean = id.split("?", 1)[0];
    return /\.(mjs|cjs|js|ts|jsx|tsx)$/.test(clean) && !clean.includes("node_modules");
  };

  /**
   * 分析源码并批量安装缺失依赖（含类型包）
   */
  const analyzeInstall = async (code: string, id: string) => {
    if (!isSupportedFile(id)) return;

    const clean = id.split("?", 1)[0];
    const isTsFile = /\.tsx?$/.test(clean);

    // consult cache
    const cached = parseCache.get(id, code);
    let specs: string[];
    if (cached) {
      specs = cached;
    } else {
      try {
        specs = await extractSpecifiers(code);
      } catch (err) {
        specs = [];
      }
      parseCache.set(id, code, specs);
    }

    if (specs.length === 0) return;

    // parse to package names, filter builtins/relative
    const pkgsNeeded: string[] = [];
    const typesNeeded: string[] = [];

    for (const s of specs) {
      const pkg = parsePackageName(s);
      if (!pkg) continue;
      if (pkg.startsWith("node:")) continue;

      if (installed.has(pkg) || resolverIsInstalled(pkg, rootDir, clean)) {
        installed.add(pkg);
        if (isTsFile) {
          const t = getMissingTypes(pkg, clean);
          if (t) typesNeeded.push(t);
        }
        continue;
      }

      if (!pkgsNeeded.includes(pkg) && !installing.has(pkg)) {
        pkgsNeeded.push(pkg);
      }
    }

    // 如果无需安装主包且不是 TS 文件，可提前返回
    if (!isTsFile && pkgsNeeded.length === 0) return;

    // mark installing
    for (const p of pkgsNeeded) installing.add(p);

    let installSucceeded = true;
    try {
      await installPackages(pkgsNeeded, rootDir, isTsFile);
    } catch {
      installSucceeded = false;
    } finally {
      pkgsNeeded.forEach((p) => installing.delete(p));
    }

    if (installSucceeded) {
      for (const p of pkgsNeeded) {
        installed.add(p);
        if (isTsFile) {
          const t = getMissingTypes(p, clean);
          if (t) typesNeeded.push(t);
        }
      }
    }

    if (isTsFile) {
      const uniqueTypes = Array.from(
        new Set(typesNeeded.filter((t) => !installedTypes.has(t)))
      ).filter((t) => !resolverIsInstalled(t, rootDir, clean));

      if (uniqueTypes.length) {
        await installTypes(uniqueTypes, rootDir).catch(() => { });
        uniqueTypes.forEach((t) => installedTypes.add(t));
      }
    }
  };

  return {
    name: "nexo:auto-install",
    apply: "serve",
    enforce: "pre",

    configResolved(config) {
      rootDir = config.root ? path.resolve(config.root) : rootDir;
      if (!announced) {
        announced = true;
      }
    },

    async transform(code, id) {
      await analyzeInstall(code, id).catch(() => { });
      return null;
    },

    async handleHotUpdate(ctx) {
      const code = await ctx.read();
      await analyzeInstall(code, ctx.file).catch(() => { });
    }
  };
}
