const fs = require('fs');
const path = require('path');

class Logger {
  constructor(config = {}) {
    this.level = config.level || 'info';
    this.logToFile = config.logToFile !== undefined ? config.logToFile : true;
    this.logDir = config.logDir || 'data/logs';
    this.maxLogSizeMB = config.maxLogSizeMB || 10;
    this.maxLogFiles = config.maxLogFiles || 5;
    this.currentLogFile = null;
    this.logBuffer = [];
    this.bufferFlushInterval = null;
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    if (this.logToFile) {
      this._ensureLogDir();
      this._rotateLogsIfNeeded();
      this._startBufferFlush();
    }
  }
  
  _ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
  
  _getCurrentLogPath() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `bot-${date}.log`);
  }
  
  _rotateLogsIfNeeded() {
    const logPath = this._getCurrentLogPath();
    
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      const sizeMB = stats.size / (1024 * 1024);
      
      if (sizeMB >= this.maxLogSizeMB) {
        const timestamp = Date.now();
        const newName = logPath.replace('.log', `-${timestamp}.log`);
        fs.renameSync(logPath, newName);
      }
    }
    
    const files = fs.readdirSync(this.logDir)
      .filter(f => f.startsWith('bot-') && f.endsWith('.log'))
      .map(f => ({
        name: f,
        path: path.join(this.logDir, f),
        time: fs.statSync(path.join(this.logDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    if (files.length > this.maxLogFiles) {
      files.slice(this.maxLogFiles).forEach(f => {
        fs.unlinkSync(f.path);
      });
    }
    
    this.currentLogFile = logPath;
  }
  
  _startBufferFlush() {
    this.bufferFlushInterval = setInterval(() => {
      this._flushBuffer();
    }, 15000);
  }
  
  _flushBuffer() {
    if (this.logBuffer.length === 0) return;
    
    const logs = this.logBuffer.splice(0);
    const logText = logs.join('\n') + '\n';
    
    try {
      fs.appendFileSync(this.currentLogFile, logText);
    } catch (err) {
      console.error('[Logger] Failed to write logs:', err.message);
    }
  }
  
  _shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }
  
  _formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  }
  
  _log(level, message, meta = {}) {
    if (!this._shouldLog(level)) return;
    
    const formatted = this._formatMessage(level, message, meta);
    console.log(formatted);
    
    if (this.logToFile) {
      this.logBuffer.push(formatted);
      
      if (this.logBuffer.length >= 100) {
        this._flushBuffer();
      }
    }
  }
  
  error(message, meta = {}) {
    this._log('error', message, meta);
  }
  
  warn(message, meta = {}) {
    this._log('warn', message, meta);
  }
  
  info(message, meta = {}) {
    this._log('info', message, meta);
  }
  
  debug(message, meta = {}) {
    this._log('debug', message, meta);
  }
  
  shutdown() {
    if (this.bufferFlushInterval) {
      clearInterval(this.bufferFlushInterval);
    }
    this._flushBuffer();
  }
}

module.exports = Logger;
