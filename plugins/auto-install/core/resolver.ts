import { createRequire } from "node:module";

const requireFromEsm = createRequire(import.meta.url);

export function isBuiltin(pkg: string): boolean {
    return pkg.startsWith("node:");
}

export function isInstalled(pkg: string, rootDir: string): boolean {
  try {
    requireFromEsm.resolve(pkg, { paths: [rootDir] });
    return true;
  } catch {
    return false;
  }
}

export function loadPackageJson(pkg: string, rootDir: string) {
  try {
    return requireFromEsm(`${pkg}/package.json`);
  } catch {
    return null;
  }
}

export function getTypesPackageName(pkg: string): string | null {
  if (pkg.startsWith("@types/")) return null;
  if (pkg.startsWith("@")) {
    const parts = pkg.slice(1).split("/");
    if (parts.length >= 2) {
      // @scope/pkg -> @types/scope__pkg
      return `@types/${parts[0]}__${parts[1]}`;
    }
    return null;
  }
  return `@types/${pkg}`;
}
