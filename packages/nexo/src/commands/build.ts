import { build } from "vite";
import type { CommandModule } from "../core/command-runner";

export const buildCommand: CommandModule = {
  name: "build",
  description: "构建生产产物",
  run: async ({ templatePath, config }) => {
    await build({
      ...config,
      root: templatePath,
    });

    console.log(`[nexo] build finished`);
  },
};

