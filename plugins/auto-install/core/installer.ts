import { spawn } from "node:child_process";
import {
  getTypesPackageName,
  isInstalled,
  loadPackageJson
} from "./resolver";
export async function installPackages(
  pkgs: string[],
  rootDir: string,
  isTsFile: boolean
): Promise<void> {
  if (!pkgs.length) return;

  const unique = Array.from(new Set(pkgs));

  await runPnpmAdd(unique, rootDir, false).catch(async () => {
    for (const pkg of unique) {
      await runPnpmAdd([pkg], rootDir, false).catch(() => {});
    }
  });

  if (!isTsFile) return;

  const typesToInstall: string[] = [];

  for (const pkg of unique) {
    const typesPkg = getTypesPackageName(pkg);
    if (!typesPkg) continue;
    if (isInstalled(typesPkg, rootDir)) continue;

    const pkgJson = loadPackageJson(pkg);
    if (pkgJson && (pkgJson.types || pkgJson.typings)) continue;

    typesToInstall.push(typesPkg);
  }

  if (!typesToInstall.length) return;

  await installTypes(typesToInstall, rootDir);
}

export async function installTypes(pkgs: string[], rootDir: string): Promise<void> {
  if (!pkgs.length) return;
  const unique = Array.from(new Set(pkgs));
  await runPnpmAdd(unique, rootDir, true).catch(() => {});
}

function runPnpmAdd(pkgs: string[], cwd: string, dev = false) {
  return new Promise<void>((resolve, reject) => {
    const args = ["add", ...pkgs];
    if (dev) args.push("-D");

    const child = spawn("pnpm", args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32"
    });

    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pnpm exited with code ${code}`));
    });

    child.on("error", (err) => reject(err));
  });
}
