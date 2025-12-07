import { Command } from "commander";
import type { CommandContext, CommandFactory } from "./types";
import type { CliPlugin } from "./types";

export type CreateCliAppOptions = {
  name?: string;
  version?: string;
  description?: string;
};

export type CliApp = {
  program: Command;
  use: (plugin: CliPlugin) => void;
  register: (factories: CommandFactory[]) => void;
  parse: (argv?: string[]) => Promise<void>;
};

export function createCliApp(ctx: CommandContext, opts: CreateCliAppOptions = {}): CliApp {
  const program = new Command();
  if (opts.name) program.name(opts.name);
  if (opts.version) program.version(opts.version);
  if (opts.description) program.description(opts.description);

  const plugins: CliPlugin[] = [];
  const setupDone = new Set<string>();

  const use = (plugin: CliPlugin) => {
    if (!plugin || !plugin.name) return;
    plugins.push(plugin);
  };

  const runSetupIfNeeded = async () => {
    for (const plugin of plugins) {
      if (setupDone.has(plugin.name)) continue;
      if (plugin.setup) await plugin.setup(ctx);
      setupDone.add(plugin.name);
    }
  };

  const attachHooks = (cmd: Command) => {
    cmd.hook("preAction", async () => {
      for (const plugin of plugins) {
        if (plugin.beforeCommand) {
          await plugin.beforeCommand(cmd.name(), ctx);
        }
      }
    });

    cmd.hook("postAction", async (thisCommand) => {
      for (const plugin of plugins) {
        if (plugin.afterCommand) {
          await plugin.afterCommand(thisCommand.name(), ctx);
        }
      }
    });
  };

  const register = (factories: CommandFactory[]) => {
    factories.forEach((factory) => {
      const cmd = factory(ctx);
      attachHooks(cmd);
      program.addCommand(cmd);
    });
  };

  const parse = async (argv?: string[]) => {
    try {
      await runSetupIfNeeded();
      await program.parseAsync(argv ?? process.argv);
    } catch (err) {
      for (const plugin of plugins) {
        if (plugin.onError) {
          await plugin.onError(program.args?.[0], ctx, err as Error);
        }
      }
      throw err;
    }
  };

  return { program, use, register, parse };
}

