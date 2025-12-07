import fs from "node:fs";
import path from "node:path";
import fse from "fs-extra";

const SKIP_DIRS = new Set(["node_modules", ".git"]);

export async function listTemplates(root: string): Promise<string[]> {
  const entries = await fs.promises.readdir(root, { withFileTypes: true }).catch(() => []);
  return entries.filter((d) => d.isDirectory()).map((d) => d.name);
}

export function resolveTemplate(root: string, name: string): string | null {
  const target = path.join(root, name);
  return fs.existsSync(target) ? target : null;
}

export async function copyTemplate(templateDir: string, targetDir: string) {
  await fse.copy(templateDir, targetDir, {
    filter: (src: string) => {
      const base = path.basename(src);
      if (SKIP_DIRS.has(base)) return false;
      return true;
    }
  });
}

export async function rewritePackageName(targetDir: string, name: string) {
  const pkgPath = path.join(targetDir, "package.json");
  if (!fs.existsSync(pkgPath)) return;
  const json = JSON.parse(await fs.promises.readFile(pkgPath, "utf-8")) as Record<string, unknown>;
  json.name = name;
  await fs.promises.writeFile(pkgPath, `${JSON.stringify(json, null, 2)}\n`, "utf-8");
}

