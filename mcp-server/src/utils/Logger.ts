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

// Save original console methods before overriding
const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
};

class Logger {
    static logToFile(level: string, ...args: any[]) {
        try {
            const timestamp = new Date().toISOString();
            const formattedArgs = args.map(arg => {
                if (typeof arg === 'object') {
                    if (arg instanceof Error) {
                        return `${arg.message}\n${arg.stack}`;
                    }
                    // Handle circular references in objects
                    return util.inspect(arg, { depth: 4, colors: false, maxArrayLength: 50 });
                }
                return String(arg);
            }).join(' ');

            // Create a formatted log entry
            const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${formattedArgs}\n`;

            // Write to the file without console output
            logStream.write(logEntry);

            // DO NOT call console methods from here to avoid recursion
        } catch (err) {
            // Use original console to report logger errors
            originalConsole.error('Logger error:', err);
        }
    }

    static info(...args: any[]) {
        // Write to file
        this.logToFile('info', ...args);
        // Output to console directly using the original method
        originalConsole.info(...args);
    }

    static error(...args: any[]) {
        this.logToFile('error', ...args);
        originalConsole.error(...args);
    }

    static warn(...args: any[]) {
        this.logToFile('warn', ...args);
        originalConsole.warn(...args);
    }

    static debug(...args: any[]) {
        this.logToFile('debug', ...args);
        originalConsole.debug(...args);
    }

    static log(...args: any[]) {
        this.logToFile('log', ...args);
        originalConsole.log(...args);
    }
}

// Export the logger as default
export default Logger;

// Override console methods to use our logger
console.log = function (...args) {
    Logger.logToFile('log', ...args);
    originalConsole.log(...args);
};

console.info = function (...args) {
    Logger.logToFile('info', ...args);
    originalConsole.info(...args);
};

console.warn = function (...args) {
    Logger.logToFile('warn', ...args);
    originalConsole.warn(...args);
};

console.error = function (...args) {
    Logger.logToFile('error', ...args);
    originalConsole.error(...args);
};

console.debug = function (...args) {
    Logger.logToFile('debug', ...args);
    originalConsole.debug(...args);
};

// Use original console to avoid recursion for initialization messages
originalConsole.log('=== SERVER LOGGING INITIALIZED ===');
originalConsole.log(`Logs being written to: ${logFilePath}`); 