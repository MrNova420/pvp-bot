class ReconnectManager {
  constructor(config = {}, logger = null) {
    this.logger = logger || console;
    this.enabled = config.enabled !== false;
    this.unlimitedMode = config.unlimitedMode !== false;
    this.minDelayMs = config.minDelayMs || 5000;
    this.maxDelayMs = config.maxDelayMs || 15000;
    this.initialDelayMs = config.initialDelayMs || 5000;
    this.maxDelayMsConfig = config.maxDelayMs || 15000;
    this.backoffMultiplier = config.backoffMultiplier || 1;
    
    this.attempts = 0;
    this.reconnectTimeout = null;
    this.consecutiveFailures = 0;
    this.lastErrorType = null;
  }
  
  shouldReconnect() {
    if (!this.enabled) return false;
    
    if (!this.unlimitedMode && this.attempts >= 75) {
      this.logger.error(`Max reconnect attempts (75) reached`);
      return false;
    }
    
    if (this.lastErrorType === 'ECONNREFUSED' && this.consecutiveFailures > 10) {
      this.logger.warn(`Server appears to be offline (${this.consecutiveFailures} connection refused). Using longer delays.`);
      return true;
    }
    
    return true;
  }
  
  getDelay() {
    if (this.lastErrorType === 'ECONNREFUSED' && this.consecutiveFailures > 10) {
      const offlineDelay = Math.floor(Math.random() * 10000) + 15000;
      return offlineDelay;
    }
    
    const delay = Math.floor(Math.random() * (this.maxDelayMs - this.minDelayMs)) + this.minDelayMs;
    return delay;
  }
  
  scheduleReconnect(callback) {
    if (!this.shouldReconnect()) return false;
    
    const delay = this.getDelay();
    this.attempts++;
    
    if (this.unlimitedMode) {
      this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.attempts}/unlimited)`);
    } else {
      this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.attempts}/75)`);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      callback();
    }, delay);
    
    return true;
  }
  
  reset() {
    this.attempts = 0;
    this.consecutiveFailures = 0;
    this.lastErrorType = null;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
  
  recordFailure(errorType) {
    this.consecutiveFailures++;
    this.lastErrorType = errorType;
  }
  
  cancel() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
      this.logger.info('Reconnect cancelled');
    }
  }
}

module.exports = ReconnectManager;
