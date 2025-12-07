import type { Command } from "commander";
import type { CommandContext, CommandFactory } from "./types";

export function registerCommands(
  program: Command,
  ctx: CommandContext,
  factories: CommandFactory[]
) {
  factories.forEach((factory) => program.addCommand(factory(ctx)));
}

