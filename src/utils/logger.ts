/**
 * Production-Safe Logging Utility
 *
 * Provides controlled logging that:
 * - Only logs in development mode
 * - Sanitizes sensitive data in production
 * - Can be configured to send logs to external services
 *
 * @example
 * import { logger } from '../utils/logger';
 *
 * logger.log('User logged in');
 * logger.error('Login failed', error);
 * logger.warn('Token expiring soon');
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  enabledInProduction: boolean;
  logToService?: (level: LogLevel, message: string, data?: any) => void;
}

class Logger {
  private config: LoggerConfig = {
    enabledInProduction: false,
  };

  /**
   * Configure logger behavior
   */
  configure(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if logging is enabled
   */
  private get isEnabled(): boolean {
    return __DEV__ || this.config.enabledInProduction;
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitize(data: any): any {
    if (!data) return data;

    if (typeof data === 'string') {
      // Redact potential sensitive patterns
      return data
        .replace(/Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/gi, 'Bearer [REDACTED]')
        .replace(/password["':\s]+["'][^"']+["']/gi, 'password: "[REDACTED]"')
        .replace(/token["':\s]+["'][^"']+["']/gi, 'token: "[REDACTED]"')
        .replace(/api[_-]?key["':\s]+["'][^"']+["']/gi, 'api_key: "[REDACTED]"');
    }

    if (typeof data === 'object') {
      const sanitized = Array.isArray(data) ? [...data] : { ...data };

      // Redact known sensitive fields
      const sensitiveKeys = [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'apiKey',
        'api_key',
        'secretKey',
        'secret_key',
        'privateKey',
        'private_key',
        'authToken',
        'auth_token',
        'creditCard',
        'credit_card',
        'ssn',
        'socialSecurity',
      ];

      for (const key in sanitized) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sk => lowerKey.includes(sk.toLowerCase()))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof sanitized[key] === 'object') {
          sanitized[key] = this.sanitize(sanitized[key]);
        }
      }

      return sanitized;
    }

    return data;
  }

  /**
   * Format log message
   */
  private format(level: LogLevel, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (data) {
      const sanitizedData = this.sanitize(data);
      return `${prefix} ${message} ${JSON.stringify(sanitizedData, null, 2)}`;
    }

    return `${prefix} ${message}`;
  }

  /**
   * Send log to external service
   */
  private sendToService(level: LogLevel, message: string, data?: any) {
    if (this.config.logToService && !__DEV__) {
      try {
        const sanitizedData = this.sanitize(data);
        this.config.logToService(level, message, sanitizedData);
      } catch (error) {
        // Fail silently - don't want logging to break the app
      }
    }
  }

  /**
   * Log general information
   */
  log(message: string, data?: any) {
    if (this.isEnabled) {
      console.log(this.format('log', message, data));
    }
    this.sendToService('log', message, data);
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: any) {
    if (this.isEnabled) {
      console.info(this.format('info', message, data));
    }
    this.sendToService('info', message, data);
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: any) {
    if (this.isEnabled) {
      console.warn(this.format('warn', message, data));
    }
    this.sendToService('warn', message, data);
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | any) {
    if (this.isEnabled) {
      const errorData = error instanceof Error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : error;

      console.error(this.format('error', message, errorData));
    }
    this.sendToService('error', message, error);
  }

  /**
   * Log debug information (only in development)
   */
  debug(message: string, data?: any) {
    if (__DEV__) {
      console.debug(this.format('debug', message, data));
    }
  }

  /**
   * Create a scoped logger with a prefix
   */
  scope(scopeName: string) {
    return {
      log: (message: string, data?: any) => this.log(`[${scopeName}] ${message}`, data),
      info: (message: string, data?: any) => this.info(`[${scopeName}] ${message}`, data),
      warn: (message: string, data?: any) => this.warn(`[${scopeName}] ${message}`, data),
      error: (message: string, error?: Error | any) => this.error(`[${scopeName}] ${message}`, error),
      debug: (message: string, data?: any) => this.debug(`[${scopeName}] ${message}`, data),
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for configuration
export type { LogLevel, LoggerConfig };

// Example usage in App.tsx:
// import { logger } from './utils/logger';
//
// Production configuration (optional):
// logger.configure({
//   enabledInProduction: false,
//   logToService: (level, message, data) => {
//     // Send to Sentry, LogRocket, etc.
//     Sentry.captureMessage(message, { level, extra: data });
//   },
// });
