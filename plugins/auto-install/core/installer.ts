import { spawn } from "node:child_process";
import {
  getTypesPackageName,
  isInstalled,
  loadPackageJson
} from "./resolver";
import { logInfo, logError } from "./logger";

export async function installPackages(
  pkgs: string[],
  rootDir: string,
  isTsFile: boolean
): Promise<void> {
  if (!pkgs.length) return;

  const unique = Array.from(new Set(pkgs));

  try {
    await runPnpmAdd(unique, rootDir, false);
    logInfo("install", { packages: unique });
  } catch (err) {
    logError("install_failed", { packages: unique, message: String(err) });
    for (const pkg of unique) {
      try {
        await runPnpmAdd([pkg], rootDir, false);
        logInfo("install", { packages: [pkg] });
      } catch (e) {
        logError("install_failed_single", { package: pkg, message: String(e) });
      }
    }
  }

  if (!isTsFile) return;

  const typesToInstall: string[] = [];

  for (const pkg of unique) {
    const typesPkg = getTypesPackageName(pkg);
    if (!typesPkg) continue;
    if (isInstalled(typesPkg, rootDir)) continue;

    const pkgJson = loadPackageJson(pkg, rootDir);
    if (pkgJson && (pkgJson.types || pkgJson.typings)) continue;

    typesToInstall.push(typesPkg);
  }

  if (!typesToInstall.length) return;

  await installTypes(typesToInstall, rootDir);
}

export async function installTypes(pkgs: string[], rootDir: string): Promise<void> {
  if (!pkgs.length) return;
  const unique = Array.from(new Set(pkgs));
  try {
    await runPnpmAdd(unique, rootDir, true);
    logInfo("install_types", { packages: unique });
  } catch (e) {
    logError("install_types_failed", { packages: unique, message: String(e) });
  }
}

function runPnpmAdd(pkgs: string[], cwd: string, dev = false) {
  return new Promise<void>((resolve, reject) => {
    const args = ["add", ...pkgs];
    if (dev) args.push("-D");

    logInfo("run_pnpm", { cmd: `pnpm ${args.join(" ")}`, cwd });

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
