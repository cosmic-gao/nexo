import { createServer } from "vite";
import type { CommandModule } from "../core/command-runner";

export const devCommand: CommandModule = {
  name: "dev",
  aliases: ["serve", "start"],
  description: "启动开发服务器",
  run: async ({ templatePath, config }) => {
    const server = await createServer({
      ...config,
      root: templatePath,
    });

    await server.listen();

    console.log(`[nexo] dev server started at:`);
    server.printUrls();

    const shutdown = async () => {
      await server.close();
      process.exit(0);
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  },
};

