export type LogEvent = {
    level?: "info" | "warn" | "error";
    event: string;
  timestamp?: string;
    payload?: Record<string, unknown>;
  };
  
  export const log = (ev: LogEvent) => {
    const out = {
      timestamp: new Date().toISOString(),
      level: ev.level ?? "info",
      event: ev.event,
      payload: ev.payload ?? {}
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(out));
  };
  
  export const logInfo = (event: string, payload?: Record<string, unknown>) =>
    log({ event, payload, level: "info" });
  
  export const logWarn = (event: string, payload?: Record<string, unknown>) =>
    log({ event, payload, level: "warn" });
  
  export const logError = (event: string, payload?: Record<string, unknown>) =>
    log({ event, payload, level: "error" });