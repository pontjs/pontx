import colors from "picocolors";
export type LogType = "error" | "warn" | "info";
export type LogLevel = LogType | "silent";

export const LogLevels: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
};

export interface LogOptions {
  timestamp?: boolean;
}

export interface LogErrorOptions extends LogOptions {
  error?: Error | null;
  prefix?: string;
}

export interface Logger {
  info(msg: string, options?: LogOptions): void;
  warn(msg: string, options?: LogOptions): void;
  warnOnce(msg: string, options?: LogOptions): void;
  error(msg: string, options?: LogErrorOptions): void;
  hasErrorLogged(error: Error): boolean;
  hasWarned: boolean;
}

export interface LoggerOptions {
  prefix?: string;
  customLogger?: Logger;
  console?: Console;
}

let timeFormatter: Intl.DateTimeFormat;
function getTimeFormatter() {
  timeFormatter ??= new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  return timeFormatter;
}

export function createLogger(
  level: LogLevel = "info",
  options: LoggerOptions = {}
): Logger {
  if (options.customLogger) {
    return options.customLogger;
  }

  const loggedErrors = new WeakSet<Error>();
  let { prefix = "[pontx]", console = globalThis.console } = options;
  const thresh = LogLevels[level];

  function format(type: LogType, msg: string, options: LogErrorOptions = {}) {
    if (options.timestamp) {
      if (options.prefix) {
        prefix = options.prefix;
      }
      let tag = "";
      if (type === "info") {
        tag = colors.cyan(colors.bold(prefix));
      } else if (type === "warn") {
        tag = colors.yellow(colors.bold(prefix));
      } else {
        tag = colors.red(colors.bold(prefix));
      }

      return `${colors.dim(getTimeFormatter().format(new Date()))} ${tag} ${msg}`;
    } else {
      return msg;
    }
  }

  function output(type: LogType, msg: string, options: LogErrorOptions = {}) {
    if (thresh >= LogLevels[type]) {
      const method = type === "info" ? "log" : type;

      if (options.error) {
        loggedErrors.add(options.error);
      }
      console[method](format(type, msg, options));
    }
  }

  const warnedMessages = new Set<string>();

  const logger: Logger = {
    hasWarned: false,
    info(msg, opts) {
      output("info", msg, opts);
    },
    warn(msg, opts) {
      logger.hasWarned = true;
      output("warn", msg, opts);
    },
    warnOnce(msg, opts) {
      if (warnedMessages.has(msg)) return;
      logger.hasWarned = true;
      output("warn", msg, opts);
      warnedMessages.add(msg);
    },
    error(msg, opts) {
      logger.hasWarned = true;
      output("error", msg, opts);
    },
    hasErrorLogged(error) {
      return loggedErrors.has(error);
    },
  };

  return logger;
}
