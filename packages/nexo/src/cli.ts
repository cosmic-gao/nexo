import { resolve } from "path";
import { existsSync } from "fs";
import { CommandRunner } from "./core/command-runner";
import { loadNexoConfig } from "./core/config";
import { devCommand } from "./commands/dev";
import { buildCommand } from "./commands/build";

function resolveTemplatePath(templateArg?: string): string {
  const cwd = process.cwd();
  const target = templateArg ? resolve(cwd, templateArg) : cwd;
  return target;
}

function parseCommandArgs(argv: string[], runner: CommandRunner) {
  if (argv.length === 0) return { commandName: "dev", templateArg: undefined, rest: [] };

  const [first, ...rest] = argv;
  const known = runner.get(first);

  if (known) {
    return { commandName: first, templateArg: rest[0], rest: rest.slice(1) };
  }

  return { commandName: "dev", templateArg: first, rest };
}

async function main() {
  const argv = process.argv.slice(2);
  const runner = new CommandRunner([devCommand, buildCommand]);
  const { commandName, templateArg, rest } = parseCommandArgs(argv, runner);

  const templatePath = resolveTemplatePath(templateArg);
  if (!existsSync(templatePath)) {
    console.error(`[nexo] 模板路径不存在: ${templatePath}`);
    process.exit(1);
  }

  try {
    const { config, userConfigPath } = await loadNexoConfig(templatePath);
    const ctx = {
      args: rest,
      templatePath,
      commandName,
      config,
      userConfigPath,
    };

    await runner.run(commandName, ctx);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
