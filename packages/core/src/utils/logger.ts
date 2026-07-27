export interface DyrectedLogger {
  info(obj: unknown, msg?: string): void;
  warn(obj: unknown, msg?: string): void;
  error(obj: unknown, msg?: string): void;
  debug(obj: unknown, msg?: string): void;
  child(bindings: Record<string, unknown>): DyrectedLogger;
}

export function createBrowserLogger(component = "core"): DyrectedLogger {
  const prefix = `[dyrected:${component}]`;
  return {
    info: (obj, msg) => console.info(prefix, msg ?? obj, msg ? obj : ""),
    warn: (obj, msg) => console.warn(prefix, msg ?? obj, msg ? obj : ""),
    error: (obj, msg) => console.error(prefix, msg ?? obj, msg ? obj : ""),
    debug: (obj, msg) => console.debug(prefix, msg ?? obj, msg ? obj : ""),
    child: (bindings) => createBrowserLogger(`${component}:${String(bindings.component ?? "")}`),
  };
}
