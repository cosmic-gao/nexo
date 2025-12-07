import fs from "node:fs";
import path from "node:path";

export async function ensureDirEmptyOrCreate(dir: string) {
  await fs.promises.mkdir(dir, { recursive: true });
  const files = await fs.promises.readdir(dir);
  if (files.length > 0) {
    throw new Error(`目标目录已存在且非空：${dir}`);
  }
}

export function resolveRepoRoot(from: string) {
  return path.resolve(from, "../../..");
}

