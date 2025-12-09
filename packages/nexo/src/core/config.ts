import { existsSync } from "fs";
import { resolve } from "path";
import { mergeConfig, type UserConfig } from "vite";
import { loadModule, dynamicImport, toFileUrl } from "../utils/module";
import type { NexoConfig } from "../index";

type LoadedConfig = {
  config: UserConfig;
  userConfigPath?: string;
};

const CONFIG_FILES = [
  "nexo.config.ts",
  "nexo.config.mts",
  "nexo.config.js",
  "nexo.config.mjs",
  "nexo.config.cjs",
];

function findConfigPath(templatePath: string): string | undefined {
  for (const name of CONFIG_FILES) {
    const candidate = resolve(templatePath, name);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

async function loadPlugin(
  name: string,
  lookupPaths: string[]
): Promise<any | null> {
  return loadModule(name, lookupPaths);
}

async function getDefaultConfig(templatePath: string): Promise<UserConfig> {
  const plugins: any[] = [];
  const lookupPaths = [templatePath, process.cwd()];

  const reactPlugin = await loadPlugin("@vitejs/plugin-react", lookupPaths);
  if (reactPlugin) {
    plugins.push(typeof reactPlugin === "function" ? reactPlugin() : reactPlugin);
  }

  const tailwindPlugin = await loadPlugin("@tailwindcss/vite", lookupPaths);
  if (tailwindPlugin) {
    plugins.push(
      typeof tailwindPlugin === "function" ? tailwindPlugin() : tailwindPlugin
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": templatePath,
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;

            const tail = id.split("node_modules/").pop();
            if (!tail) return "vendor";

            const segments = tail.split("/");
            const first = segments[0];

            if (first === ".pnpm") {
              const afterPnpm = tail.split(".pnpm/")[1]?.split("node_modules/").pop();
              if (!afterPnpm) return "vendor";
              const pnpmSegs = afterPnpm.split("/");
              const pkgName = pnpmSegs[0];
              if (!pkgName) return "vendor";
              if (pkgName.startsWith("@")) {
                const scope = pkgName.slice(1);
                const pkg = pnpmSegs[1] ?? "pkg";
                return `${scope}__${pkg}`;
              }
              return pkgName;
            }

            if (first?.startsWith("@")) {
              const scope = first.slice(1);
              const pkg = segments[1] ?? "pkg";
              return `${scope}__${pkg}`;
            }

            return first || "vendor";
          },
        },
      },
      chunkSizeWarningLimit: 400,
    },
  };
}

async function loadUserConfig(
  templatePath: string
): Promise<{ config?: UserConfig; path?: string }> {
  const configPath = findConfigPath(templatePath);
  if (!configPath) return {};

  try {
    const url = `${toFileUrl(configPath)}?t=${Date.now()}`;
    const mod = await dynamicImport(url);
    let cfg: NexoConfig | (() => NexoConfig) | (() => Promise<NexoConfig>) =
      (mod as any).default ?? mod;

    if (typeof cfg === "function") cfg = await cfg();

    if (typeof cfg === "object") {
      return { config: cfg as UserConfig, path: configPath };
    }
  } catch (err) {
    console.error(`[nexo] Failed loading ${configPath}`);
    throw err;
  }

  return {};
}

export async function loadNexoConfig(templatePath: string): Promise<LoadedConfig> {
  const defaultConfig = await getDefaultConfig(templatePath);
  const { config: userConfig, path } = await loadUserConfig(templatePath);
  return {
    config: userConfig ? mergeConfig(defaultConfig, userConfig) : defaultConfig,
    userConfigPath: path,
  };
}

