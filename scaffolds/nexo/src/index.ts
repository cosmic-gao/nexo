import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, createCliApp, resolveRepoRoot } from "@nexo/cli-core";
import { commandFactories } from "@nexo/cli-commands";
import pkg from "../package.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoRoot = resolveRepoRoot(__dirname);
const templatesRoot = path.join(repoRoot, "template");
const logger = createLogger(process.env.NEXO_DEBUG === "1");

const ctx = {
  cwd: process.cwd(),
  repoRoot,
  templatesRoot,
  logger
};

const app = createCliApp(ctx, {
  name: "nexo",
  description: "Nexo 脚手架",
  version: (pkg as any).version || "0.0.0"
});

app.register(commandFactories);

app.parse().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});

