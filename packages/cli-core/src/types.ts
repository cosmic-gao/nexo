import type { Command } from "commander";
import type { Logger } from "./utils/logger";

export type CommandContext = {
  cwd: string;
  repoRoot: string;
  templatesRoot: string;
  logger: Logger;
};

export type CommandFactory = (ctx: CommandContext) => Command;

export type CliPlugin = {
  name: string;
  setup?: (ctx: CommandContext) => void | Promise<void>;
  beforeCommand?: (commandName: string, ctx: CommandContext) => void | Promise<void>;
  afterCommand?: (commandName: string, ctx: CommandContext) => void | Promise<void>;
  onError?: (commandName: string | undefined, ctx: CommandContext, error: Error) => void | Promise<void>;
};

