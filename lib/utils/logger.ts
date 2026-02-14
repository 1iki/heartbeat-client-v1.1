/**
 * Centralized Logger Utility
 * ✅ ISU #12: Standardized logging with structured format
 * 
 * Features:
 * - Log levels: DEBUG, INFO, WARN, ERROR
 * - Structured JSON logging in production
 * - Pretty-print in development
 * - Context object support for better debugging
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogContext {
    [key: string]: any;
}

interface LogEntry {
    level: LogLevel;
    timestamp: string;
    message: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

class Logger {
    private isDevelopment: boolean;
    private minLevel: LogLevel;
    private levelPriority: Record<LogLevel, number> = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
    };

    constructor() {
        this.isDevelopment = process.env.NODE_ENV === 'development';
        // Set minimum log level from environment or default to INFO
        const envLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase() as LogLevel;
        this.minLevel = this.levelPriority[envLevel] !== undefined ? envLevel : 'INFO';
    }

    /**
     * Check if log level should be logged
     */
    private shouldLog(level: LogLevel): boolean {
        return this.levelPriority[level] >= this.levelPriority[this.minLevel];
    }

    /**
     * Format log entry for output
     */
    private formatLog(entry: LogEntry): string {
        if (this.isDevelopment) {
            // Pretty-print for development
            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            const levelIcon = this.getLevelIcon(entry.level);
            const contextStr = entry.context ? ` ${JSON.stringify(entry.context, null, 2)}` : '';
            const errorStr = entry.error ? `\n  Error: ${entry.error.message}\n  Stack: ${entry.error.stack}` : '';
            
            return `${levelIcon} [${timestamp}] ${entry.message}${contextStr}${errorStr}`;
        } else {
            // JSON for production
            return JSON.stringify(entry);
        }
    }

    /**
     * Get emoji icon for log level (development only)
     */
    private getLevelIcon(level: LogLevel): string {
        switch (level) {
            case 'DEBUG': return '🔍';
            case 'INFO': return 'ℹ️';
            case 'WARN': return '⚠️';
            case 'ERROR': return '❌';
            default: return '📝';
        }
    }

    /**
     * Log entry to appropriate console method
     */
    private output(entry: LogEntry): void {
        const formatted = this.formatLog(entry);
        
        switch (entry.level) {
            case 'DEBUG':
            case 'INFO':
                console.log(formatted);
                break;
            case 'WARN':
                console.warn(formatted);
                break;
            case 'ERROR':
                console.error(formatted);
                break;
        }
    }

    /**
     * Create log entry
     */
    private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
        if (!this.shouldLog(level)) {
            return;
        }

        const entry: LogEntry = {
            level,
            timestamp: new Date().toISOString(),
            message,
            context,
        };

        // Add error details if present
        if (error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }

        this.output(entry);
    }

    /**
     * DEBUG level logging
     * Use for detailed diagnostic information
     */
    debug(message: string, context?: LogContext): void {
        this.log('DEBUG', message, context);
    }

    /**
     * INFO level logging
     * Use for general informational messages
     */
    info(message: string, context?: LogContext): void {
        this.log('INFO', message, context);
    }

    /**
     * WARN level logging
     * Use for warning messages that don't prevent operation
     */
    warn(message: string, context?: LogContext): void {
        this.log('WARN', message, context);
    }

    /**
     * ERROR level logging
     * Use for error conditions that need attention
     */
    error(message: string, error?: Error | unknown, context?: LogContext): void {
        // Handle unknown error type
        const errorObj = error instanceof Error ? error : undefined;
        const errorContext = error && !(error instanceof Error) ? { error } : undefined;
        
        this.log('ERROR', message, { ...context, ...errorContext }, errorObj);
    }

    /**
     * Log health check result
     * Specialized logging for health check operations
     */
    healthCheck(
        url: string,
        result: { status: string; latency: number; httpStatus?: number },
        context?: LogContext
    ): void {
        const level: LogLevel = result.status === 'DOWN' ? 'WARN' : 'INFO';
        this.log(level, `Health check completed: ${url}`, {
            url,
            status: result.status,
            latency: result.latency,
            httpStatus: result.httpStatus,
            ...context,
        });
    }

    /**
     * Log API request
     * Specialized logging for API operations
     */
    apiRequest(
        method: string,
        path: string,
        statusCode: number,
        duration?: number,
        context?: LogContext
    ): void {
        const level: LogLevel = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
        this.log(level, `API ${method} ${path}`, {
            method,
            path,
            statusCode,
            duration,
            ...context,
        });
    }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
