import fs from 'fs';
import path from 'path';
import util from 'util';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Generate a unique filename for each server session
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFilePath = path.join(logsDir, `server-log-${timestamp}.txt`);

// Create a write stream to the log file
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

class Logger {
    static logToFile(level, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.map(arg => {
            if (typeof arg === 'object') {
                if (arg instanceof Error) {
                    return `${arg.message}\n${arg.stack}`;
                }
                // Handle circular references in objects
                return util.inspect(arg, { depth: 10, colors: false, maxArrayLength: 100 });
            }
            return String(arg);
        }).join(' ');

        // Create a formatted log entry
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${formattedArgs}\n`;

        // Write to the file
        logStream.write(logEntry);

        // Also log to console with original formatting for better readability
        this.originalConsoleMethod(level, ...args);
    }

    static originalConsoleMethod(level, ...args) {
        switch (level.toLowerCase()) {
            case 'error':
                originalConsole.error(...args);
                break;
            case 'warn':
                originalConsole.warn(...args);
                break;
            case 'info':
                originalConsole.info(...args);
                break;
            case 'debug':
                originalConsole.debug(...args);
                break;
            default:
                originalConsole.log(...args);
        }
    }

    static info(...args) {
        this.logToFile('info', ...args);
    }

    static error(...args) {
        this.logToFile('error', ...args);
    }

    static warn(...args) {
        this.logToFile('warn', ...args);
    }

    static debug(...args) {
        this.logToFile('debug', ...args);
    }

    static log(...args) {
        this.logToFile('log', ...args);
    }
}

// Export the logger as default
export default Logger;

// Override console methods to automatically log to file as well
const originalConsole = { ...console };
console.log = (...args) => Logger.log(...args);
console.info = (...args) => Logger.info(...args);
console.warn = (...args) => Logger.warn(...args);
console.error = (...args) => Logger.error(...args);
console.debug = (...args) => Logger.debug(...args);

// Log server start
Logger.info('=== SERVER LOGGING INITIALIZED ===');
Logger.info(`Logs being written to: ${logFilePath}`); 