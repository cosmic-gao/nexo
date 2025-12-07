import { blue, cyan, green, red, yellow } from "kolorist";

export type Logger = {
  info: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string) => void;
  success: (msg: string) => void;
  debug: (msg: string) => void;
};

export function createLogger(debugEnabled = false): Logger {
  return {
    info: (msg) => console.log(blue("info"), msg),
    warn: (msg) => console.warn(yellow("warn"), msg),
    error: (msg) => console.error(red("error"), msg),
    success: (msg) => console.log(green("done"), msg),
    debug: (msg) => {
      if (debugEnabled) console.log(cyan("debug"), msg);
    }
  };
}

