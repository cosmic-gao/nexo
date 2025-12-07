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
  loadPackageJson,
  logInfo,
  logWarn,
  logError
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

  const isSupportedFile = (id: string) => {
    const clean = id.split("?", 1)[0];
    return /\.(mjs|cjs|js|ts|jsx|tsx)$/.test(clean) && !clean.includes("node_modules");
  };

  async function analyzeAndInstall(code: string, id: string) {
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
        logWarn("parse_failed", { file: id, error: String(err) });
        specs = [];
      }
      parseCache.set(id, code, specs);
    }

    // parse to package names, filter builtins/relative
    const pkgsNeeded: string[] = [];
    const typesNeeded: string[] = [];

    for (const s of specs) {
      const pkg = parsePackageName(s);
      if (!pkg) continue;
      if (pkg.startsWith("node:")) continue;

      if (installed.has(pkg) || resolverIsInstalled(pkg, rootDir)) {
        installed.add(pkg);
        if (isTsFile) {
          const t = computeMissingTypes(pkg);
          if (t) typesNeeded.push(t);
        }
        continue;
      }

      if (!pkgsNeeded.includes(pkg) && !installing.has(pkg)) {
        pkgsNeeded.push(pkg);
      }
    }

    if (pkgsNeeded.length === 0) return;

    // mark installing
    for (const p of pkgsNeeded) installing.add(p);

    // do batch install for this transform
    try {
      await installPackages(pkgsNeeded, rootDir, isTsFile);
      for (const p of pkgsNeeded) {
        installed.add(p);
        installing.delete(p);
        if (isTsFile) {
          const t = computeMissingTypes(p);
          if (t) typesNeeded.push(t);
        }
      }
    } catch (err) {
      logError("batch_install_error", { packages: pkgsNeeded, error: String(err) });
      for (const p of pkgsNeeded) installing.delete(p);
    }

    if (isTsFile) {
      const uniqueTypes = Array.from(
        new Set(typesNeeded.filter((t) => !installedTypes.has(t)))
      ).filter((t) => !resolverIsInstalled(t, rootDir));

      if (uniqueTypes.length) {
        try {
          await installTypes(uniqueTypes, rootDir);
          uniqueTypes.forEach((t) => installedTypes.add(t));
        } catch (err) {
          logError("install_types_error", { packages: uniqueTypes, error: String(err) });
        }
      }
    }
  }

  function computeMissingTypes(pkg: string): string | null {
    const typesPkg = getTypesPackageName(pkg);
    if (!typesPkg) return null;
    if (installedTypes.has(typesPkg)) return null;
    if (resolverIsInstalled(typesPkg, rootDir)) {
      installedTypes.add(typesPkg);
      return null;
    }
    const pkgJson = loadPackageJson(pkg, rootDir);
    if (pkgJson && (pkgJson.types || pkgJson.typings)) return null;
    return typesPkg;
  }

  return {
    name: "nexo:auto-install",
    apply: "serve",
    enforce: "pre",

    configResolved(config) {
      rootDir = config.root ? path.resolve(config.root) : rootDir;
      if (!announced) {
        logInfo("plugin_enabled", { root: rootDir });
        announced = true;
      }
    },

    async transform(code, id) {
      try {
        await analyzeAndInstall(code, id);
      } catch (err) {
        logWarn("transform_error", { file: id, error: String(err) });
      }
      return null;
    },

    async handleHotUpdate(ctx) {
      try {
        const code = await ctx.read();
        await analyzeAndInstall(code, ctx.file);
      } catch (err) {
        logWarn("hot_update_error", { file: ctx.file, error: String(err) });
      }
    }
  };
}
