/**
 * Production-safe logger utility
 * Automatically disables logging in production builds
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabledInProduction: boolean;
  enabledInDevelopment: boolean;
  sanitizeSensitiveData: boolean;
}

class ProductionSafeLogger {
  private config: LoggerConfig;
  private isProduction: boolean;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabledInProduction: false,
      enabledInDevelopment: true,
      sanitizeSensitiveData: true,
      ...config,
    };
    this.isProduction = import.meta.env.PROD;
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isProduction) {
      return this.config.enabledInProduction && level === 'error';
    }
    return this.config.enabledInDevelopment;
  }

  private sanitizeData(data: any): any {
    if (!this.config.sanitizeSensitiveData) {
      return data;
    }

    if (typeof data === 'string') {
      // Remove potential API keys, tokens, emails, and other sensitive data
      return data
        .replace(/AIza[0-9A-Za-z_-]{35}/g, '[API_KEY_REDACTED]')
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]')
        .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [TOKEN_REDACTED]')
        .replace(/access_token['":\s]*[A-Za-z0-9._-]+/g, 'access_token: [TOKEN_REDACTED]')
        .replace(/token['":\s]*[A-Za-z0-9._-]{20,}/g, 'token: [TOKEN_REDACTED]');
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      
      // Sanitize common sensitive fields
      const sensitiveFields = [
        'access_token', 'refresh_token', 'token', 'password', 'email',
        'session', 'authorization', 'api_key', 'secret', 'key'
      ];

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      }

      return sanitized;
    }

    return data;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const sanitizedArgs = args.map(arg => this.sanitizeData(arg));
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...sanitizedArgs);
        break;
      case 'info':
        console.info(prefix, message, ...sanitizedArgs);
        break;
      case 'warn':
        console.warn(prefix, message, ...sanitizedArgs);
        break;
      case 'error':
        console.error(prefix, message, ...sanitizedArgs);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    this.formatMessage('debug', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.formatMessage('info', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.formatMessage('warn', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.formatMessage('error', message, ...args);
  }

  // Legacy console.log replacement
  log(message: string, ...args: any[]): void {
    this.formatMessage('debug', message, ...args);
  }
}

// Create and export the default logger instance
export const logger = new ProductionSafeLogger();

// Export the class for custom configurations
export { ProductionSafeLogger };

// Development helper to check if logging is enabled
export const isLoggingEnabled = () => {
  return !import.meta.env.PROD;
};
