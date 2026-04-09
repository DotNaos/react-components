export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export type LogFn = {
  (message: string, data?: unknown): void;
  (event: string, message: string, data?: unknown): void;
};

export interface Logger {
  trace: LogFn;
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
  fatal: LogFn;
  child: (subChannel: string) => Logger;
}

function createLogFn(channel: string, level: LogLevel): LogFn {
  return (eventOrMessage: string, messageOrData?: string | unknown, maybeData?: unknown) => {
    let event: string | undefined;
    let message: string;
    let data: unknown;

    if (typeof messageOrData === "string") {
      event = eventOrMessage;
      message = messageOrData;
      data = maybeData;
    } else {
      message = eventOrMessage;
      data = messageOrData;
    }

    const prefix = event
      ? `[${level.toUpperCase()}] [${channel}:${event}]`
      : `[${level.toUpperCase()}] [${channel}]`;

    if (data !== undefined) {
      console.log(`${prefix} ${message}`, data);
      return;
    }

    console.log(`${prefix} ${message}`);
  };
}

export function createLogger(channel: string): Logger {
  return {
    trace: createLogFn(channel, "trace"),
    debug: createLogFn(channel, "debug"),
    info: createLogFn(channel, "info"),
    warn: createLogFn(channel, "warn"),
    error: createLogFn(channel, "error"),
    fatal: createLogFn(channel, "fatal"),
    child: (subChannel: string) => createLogger(`${channel}.${subChannel}`)
  };
}
