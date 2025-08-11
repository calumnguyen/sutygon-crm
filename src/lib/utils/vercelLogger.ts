/**
 * Vercel Logger - Ensures all logs are properly captured by Vercel's logging system
 *
 * Vercel automatically captures console.log, console.error, console.warn, and console.info
 * This utility ensures consistent logging format and proper log levels for Vercel
 */

export interface VercelLogData {
  requestId: string;
  operation: string;
  timestamp: string;
  duration?: number;
  user?: {
    id?: number;
    name?: string;
    role?: string;
  };
  [key: string]: unknown;
}

export class VercelLogger {
  private requestId: string;

  constructor(requestId: string) {
    this.requestId = requestId;
  }

  /**
   * Log info messages (console.log)
   */
  info(operation: string, data: Partial<VercelLogData> = {}) {
    const logData: VercelLogData = {
      requestId: this.requestId,
      operation,
      timestamp: new Date().toISOString(),
      ...data,
    };
    console.log(`[${this.requestId}] ℹ️ ${operation}`, logData);
  }

  /**
   * Log success messages (console.log)
   */
  success(operation: string, data: Partial<VercelLogData> = {}) {
    const logData: VercelLogData = {
      requestId: this.requestId,
      operation,
      timestamp: new Date().toISOString(),
      ...data,
    };
    console.log(`[${this.requestId}] ✅ ${operation}`, logData);
  }

  /**
   * Log warning messages (console.warn)
   */
  warn(operation: string, data: Partial<VercelLogData> = {}) {
    const logData: VercelLogData = {
      requestId: this.requestId,
      operation,
      timestamp: new Date().toISOString(),
      ...data,
    };
    console.warn(`[${this.requestId}] ⚠️ ${operation}`, logData);
  }

  /**
   * Log error messages (console.error)
   */
  error(operation: string, error: Error | string, data: Partial<VercelLogData> = {}) {
    const logData: VercelLogData = {
      requestId: this.requestId,
      operation,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...data,
    };
    console.error(`[${this.requestId}] ❌ ${operation}`, logData);
  }

  /**
   * Log database operations
   */
  db(operation: string, data: Partial<VercelLogData> = {}) {
    this.info(`DB: ${operation}`, data);
  }

  /**
   * Log authentication operations
   */
  auth(operation: string, data: Partial<VercelLogData> = {}) {
    this.info(`AUTH: ${operation}`, data);
  }

  /**
   * Log inventory operations
   */
  inventory(operation: string, data: Partial<VercelLogData> = {}) {
    this.info(`INVENTORY: ${operation}`, data);
  }

  /**
   * Log session operations
   */
  session(operation: string, data: Partial<VercelLogData> = {}) {
    this.info(`SESSION: ${operation}`, data);
  }

  /**
   * Log connection operations
   */
  connection(operation: string, data: Partial<VercelLogData> = {}) {
    this.info(`CONNECTION: ${operation}`, data);
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, duration: number, data: Partial<VercelLogData> = {}) {
    const logData: VercelLogData = {
      requestId: this.requestId,
      operation,
      timestamp: new Date().toISOString(),
      duration,
      ...data,
    };

    // Use different log levels based on performance
    if (duration > 5000) {
      console.error(`[${this.requestId}] 🐌 SLOW OPERATION: ${operation} (${duration}ms)`, logData);
    } else if (duration > 1000) {
      console.warn(`[${this.requestId}] ⏱️ SLOW OPERATION: ${operation} (${duration}ms)`, logData);
    } else {
      console.log(`[${this.requestId}] ⚡ ${operation} (${duration}ms)`, logData);
    }
  }

  /**
   * Start timing an operation
   */
  startTimer(operation: string): () => void {
    const startTime = Date.now();
    this.info(`START: ${operation}`);

    return () => {
      const duration = Date.now() - startTime;
      this.performance(`END: ${operation}`, duration);
    };
  }
}

/**
 * Create a logger instance for a specific request
 */
export function createLogger(requestId: string): VercelLogger {
  return new VercelLogger(requestId);
}

/**
 * Utility function to ensure logs are captured by Vercel
 */
export function logToVercel(
  level: 'log' | 'warn' | 'error' | 'info',
  message: string,
  data?: Record<string, unknown>
) {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    ...data,
  };

  switch (level) {
    case 'error':
      console.error(message, logData);
      break;
    case 'warn':
      console.warn(message, logData);
      break;
    case 'info':
      console.info(message, logData);
      break;
    default:
      console.log(message, logData);
  }
}
