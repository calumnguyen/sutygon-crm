import { useCallback } from 'react';

interface LoggerOptions {
  component: string;
}

interface LogContext {
  [key: string]: string | number | boolean | null | undefined;
}

interface Logger {
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
}

export const useLogger = (options: LoggerOptions): Logger => {
  const { component } = options;

  const formatMessage = useCallback(
    (level: string, message: string, context?: LogContext): string => {
      const timestamp = new Date().toISOString();
      const contextStr = context ? ` ${JSON.stringify(context)}` : '';
      return `[${timestamp}] [${level}] [${component}] ${message}${contextStr}`;
    },
    [component]
  );

  const info = useCallback(
    (message: string, context?: LogContext) => {
      console.info(formatMessage('INFO', message, context));
    },
    [formatMessage]
  );

  const warn = useCallback(
    (message: string, context?: LogContext) => {
      console.warn(formatMessage('WARN', message, context));
    },
    [formatMessage]
  );

  const error = useCallback(
    (message: string, context?: LogContext) => {
      console.error(formatMessage('ERROR', message, context));
    },
    [formatMessage]
  );

  const debug = useCallback(
    (message: string, context?: LogContext) => {
      console.debug(formatMessage('DEBUG', message, context));
    },
    [formatMessage]
  );

  return {
    info,
    warn,
    error,
    debug,
  };
};
