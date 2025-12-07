import path from "node:path";
import prompts from "prompts";
import {
  Command,
  copyTemplate,
  ensureDirEmptyOrCreate,
  listTemplates,
  resolveTemplate,
  rewritePackageName
} from "@nexo/cli-core";
import type { CommandContext } from "@nexo/cli-core";

type InitOptions = {
  template?: string;
  dir?: string;
  force?: boolean;
  name?: string;
};

export function initCommand(ctx: CommandContext) {
  const cmd = new Command("init");
  cmd
    .description("基于 template/* 初始化项目")
    .option("-t, --template <name>", "模板名，默认 react")
    .option("-d, --dir <dir>", "目标目录，默认使用项目名")
    .option("--name <name>", "项目名，用于 package.json name")
    .option("--force", "当目录非空时强制覆盖", false)
    .action(async (opts: InitOptions) => {
      const templates = await listTemplates(ctx.templatesRoot);
      if (templates.length === 0) {
        ctx.logger.error(`未找到任何模板目录：${ctx.templatesRoot}`);
        process.exitCode = 1;
        return;
      }

      const answers = await prompts(
        [
          {
            type: () => (opts.name ? null : "text"),
            name: "name",
            message: "项目名",
            initial: "nexo-app"
          },
          {
            type: () => (opts.template ? null : "select"),
            name: "template",
            message: "选择模板",
            choices: templates.map((t: string) => ({ title: t, value: t })),
            initial: templates.indexOf("react") >= 0 ? templates.indexOf("react") : 0
          },
          {
            type: () => (opts.dir ? null : "text"),
            name: "dir",
            message: "目标目录",
            initial: (prev: { name?: string }) => prev.name || opts.name || "nexo-app"
          }
        ],
        {
          onCancel: () => {
            ctx.logger.warn("已取消");
            process.exit(1);
          }
        }
      );

      const projectName = opts.name || (answers as any).name || "nexo-app";
      const templateName = opts.template || (answers as any).template || "react";
      const targetDir = path.resolve(
        ctx.cwd,
        opts.dir || (answers as any).dir || projectName
      );

      if (!templates.includes(templateName)) {
        ctx.logger.error(`模板 ${templateName} 不存在，可选：${templates.join(", ")}`);
        process.exitCode = 1;
        return;
      }

      const templateDir = resolveTemplate(ctx.templatesRoot, templateName);
      if (!templateDir) {
        ctx.logger.error(`无法定位模板目录：${templateName}`);
        process.exitCode = 1;
        return;
      }

      if (!opts.force) {
        try {
          await ensureDirEmptyOrCreate(targetDir);
        } catch (err) {
          ctx.logger.error((err as Error).message);
          process.exitCode = 1;
          return;
        }
      }

      await copyTemplate(templateDir, targetDir);
      await rewritePackageName(targetDir, projectName);

      ctx.logger.success(`已创建项目：${targetDir}`);
      ctx.logger.info("后续步骤：");
      ctx.logger.info(`  1) cd ${path.relative(ctx.cwd, targetDir) || "."}`);
      ctx.logger.info("  2) pnpm install");
      ctx.logger.info("  3) pnpm dev");
    });

  return cmd;
}

