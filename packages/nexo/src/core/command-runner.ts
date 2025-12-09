import type { UserConfig } from "vite";

export type CommandContext = {
  args: string[];
  templatePath: string;
  commandName: string;
  config: UserConfig;
  userConfigPath?: string;
};

export type CommandModule = {
  name: string;
  aliases?: string[];
  description?: string;
  run: (ctx: CommandContext) => Promise<void>;
};

export class CommandRunner {
  private commands = new Map<string, CommandModule>();

  constructor(modules: CommandModule[] = []) {
    modules.forEach((mod) => this.register(mod));
  }

  register(module: CommandModule) {
    this.commands.set(module.name, module);
    module.aliases?.forEach((alias) => this.commands.set(alias, module));
  }

  get(commandName: string): CommandModule | undefined {
    return this.commands.get(commandName);
  }

  list(): CommandModule[] {
    const uniq = new Set<CommandModule>();
    this.commands.forEach((mod) => uniq.add(mod));
    return Array.from(uniq);
  }

  async run(commandName: string, ctx: CommandContext) {
    const command = this.get(commandName);
    if (!command) {
      const available = this.list()
        .map((c) => c.name)
        .join(", ");
      throw new Error(`[nexo] Unknown command: ${commandName}. 可用命令: ${available}`);
    }

    await command.run(ctx);
  }
}

