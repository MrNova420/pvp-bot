class Logger {
  constructor(config = {}) {
    this.enabled = config.enabled !== false;
    this.level = config.level || 'info';
    this.colors = {
      error: '\x1b[31m',
      warn: '\x1b[33m',
      info: '\x1b[36m',
      debug: '\x1b[90m',
      reset: '\x1b[0m'
    };
  }

  error(message, ...args) {
    if (this.enabled && this.shouldLog('error')) {
      console.log(`${this.colors.error}[ERROR]${this.colors.reset} ${message}`, ...args);
    }
  }

  warn(message, ...args) {
    if (this.enabled && this.shouldLog('warn')) {
      console.log(`${this.colors.warn}[WARN]${this.colors.reset} ${message}`, ...args);
    }
  }

  info(message, ...args) {
    if (this.enabled && this.shouldLog('info')) {
      console.log(`${this.colors.info}[INFO]${this.colors.reset} ${message}`, ...args);
    }
  }

  debug(message, ...args) {
    if (this.enabled && this.shouldLog('debug')) {
      console.log(`${this.colors.debug}[DEBUG]${this.colors.reset} ${message}`, ...args);
    }
  }

  shouldLog(level) {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}

module.exports = Logger;