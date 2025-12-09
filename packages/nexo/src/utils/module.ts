import { createRequire } from "module";
import { existsSync } from "fs";
import { pathToFileURL } from "url";
import { resolve } from "path";

/** Convert file path to `file://` URL for ESM import on all platforms. */
export function toFileUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}

/** Dynamic import that tolerates Windows paths by using `file://` URLs. */
export async function dynamicImport(specifier: string) {
  if (/^[a-zA-Z]+:\/\//.test(specifier)) return import(specifier);
  return import(toFileUrl(specifier));
}

/**
 * Try resolving a module from multiple base paths (closest first),
 * falling back to a bare import. Returns `null` when nothing loads.
 */
export async function loadModule(
  specifier: string,
  lookupPaths: string[]
): Promise<any | null> {
  for (const base of lookupPaths) {
    try {
      const pkgPath = resolve(base, "package.json");
      const req = existsSync(pkgPath)
        ? createRequire(pkgPath)
        : createRequire(import.meta.url);
      const modulePath = req.resolve(specifier);
      const mod = await dynamicImport(modulePath);
      return (mod as any).default ?? mod;
    } catch {
      // continue
    }
  }

  try {
    const mod = await dynamicImport(specifier);
    return (mod as any).default ?? mod;
  } catch {
    return null;
  }
}

