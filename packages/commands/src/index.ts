import type { CommandFactory } from "@nexo/cli-core";
import { initCommand } from "./init";

export const commandFactories: CommandFactory[] = [initCommand];

