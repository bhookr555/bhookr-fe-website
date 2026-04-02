/**
 * Error Logging Service
 * Centralized error handling and logging
 * For production, integrate with services like Sentry, LogRocket, or DataDog
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
  stack?: string;
  userId?: string;
  requestId?: string;
}

class Logger {
  private isDevelopment: boolean;
  private isProduction: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  private formatLog(entry: LogEntry): string {
    const { timestamp, level, message, context, userId, requestId } = entry;
    
    const parts = [
      `[${timestamp}]`,
      `[${level.toUpperCase()}]`,
      requestId && `[${requestId}]`,
      userId && `[User: ${userId}]`,
      message,
      context && Object.keys(context).length > 0 && JSON.stringify(context),
    ].filter(Boolean);
    
    return parts.join(' ');
  }

  /**
   * Send log to external service (Sentry, LogRocket, etc.)
   */
  private async sendToExternalService(_entry: LogEntry): Promise<void> {
    // In production, integrate with error tracking service
    if (this.isProduction) {
      try {
        // Example: Sentry integration
        // if (_entry.level === 'error' || _entry.level === 'fatal') {
        //   Sentry.captureException(_entry.error || new Error(_entry.message), {
        //     level: _entry.level,
        //     contexts: { custom: _entry.context },
        //     user: _entry.userId ? { id: _entry.userId } : undefined,
        //   });
        // }
        
        // Example: Custom logging endpoint
        // await fetch('/api/logs', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(_entry),
        // });
      } catch (error) {
        console.error('[Logger] Failed to send log to external service:', error);
      }
    }
  }

  /**
   * Create log entry
   */
  private createEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
      stack: error?.stack,
    };
  }

  private log(entry: LogEntry): void {
    const formatted = this.formatLog(entry);
    const shouldLog = this.isDevelopment || ['error', 'fatal'].includes(entry.level);

    if (shouldLog) {
      const consoleMethod = entry.level === 'debug' ? console.debug :
                           entry.level === 'info' ? console.info :
                           entry.level === 'warn' ? console.warn :
                           console.error;
      
      consoleMethod(formatted);
      if (entry.stack) console.error(entry.stack);
    }

    this.sendToExternalService(entry);
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.log(this.createEntry('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(this.createEntry('info', message, context));
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(this.createEntry('warn', message, context));
  }

  error(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(this.createEntry('error', message, context, error));
  }

  fatal(message: string, error?: Error, context?: Record<string, any>): void {
    this.log(this.createEntry('fatal', message, context, error));
  }

  apiRequest(method: string, path: string, context?: Record<string, any>): void {
    this.info(`API Request: ${method} ${path}`, context);
  }

  apiResponse(method: string, path: string, status: number, duration: number, context?: Record<string, any>): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    this.log(this.createEntry(level, `API Response: ${method} ${path} - ${status} (${duration}ms)`, context));
  }

  auth(event: string, userId?: string, context?: Record<string, any>): void {
    this.info(`Auth: ${event}`, { ...context, userId });
  }

  database(operation: string, collection: string, context?: Record<string, any>): void {
    this.debug(`Database: ${operation} on ${collection}`, context);
  }

  security(event: string, context?: Record<string, any>): void {
    this.warn(`Security: ${event}`, context);
  }
}

const logger = new Logger();

export default logger;

const createBoundMethod = <T extends keyof Logger>(method: T) => logger[method].bind(logger);

export const debug = createBoundMethod('debug');
export const info = createBoundMethod('info');
export const warn = createBoundMethod('warn');
export const error = createBoundMethod('error');
export const fatal = createBoundMethod('fatal');
export const apiRequest = createBoundMethod('apiRequest');
export const apiResponse = createBoundMethod('apiResponse');
export const auth = createBoundMethod('auth');
export const database = createBoundMethod('database');
export const security = createBoundMethod('security');

/**
 * Error handler wrapper for async functions
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (err) {
      const errorMessage = context 
        ? `Error in ${context}: ${err instanceof Error ? err.message : 'Unknown error'}`
        : err instanceof Error ? err.message : 'Unknown error';
      
      logger.error(errorMessage, err instanceof Error ? err : undefined);
      throw err;
    }
  }) as T;
}

/**
 * Create a request-scoped logger with requestId
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return {
    debug: (message: string, context?: Record<string, any>) =>
      logger.debug(message, { ...context, requestId, userId }),
    info: (message: string, context?: Record<string, any>) =>
      logger.info(message, { ...context, requestId, userId }),
    warn: (message: string, context?: Record<string, any>) =>
      logger.warn(message, { ...context, requestId, userId }),
    error: (message: string, error?: Error, context?: Record<string, any>) =>
      logger.error(message, error, { ...context, requestId, userId }),
  };
}

