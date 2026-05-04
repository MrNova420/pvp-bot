class ReconnectManager {
  constructor(config = {}, logger = null) {
    this.logger = logger || console;
    this.enabled = config.enabled !== false;
    this.maxAttempts = config.maxAttempts || 100;
    this.initialDelayMs = config.initialDelayMs || 5000;
    this.maxDelayMs = config.maxDelayMs || 60000;
    this.backoffMultiplier = config.backoffMultiplier || 1.5;
    
    this.attempts = 0;
    this.reconnectTimeout = null;
    this.consecutiveFailures = 0;
    this.lastErrorType = null;
  }
  
  shouldReconnect() {
    if (!this.enabled) return false;
    if (this.attempts >= this.maxAttempts) {
      this.logger.error(`Max reconnect attempts (${this.maxAttempts}) reached`);
      return false;
    }
    
    if (this.lastErrorType === 'ECONNREFUSED' && this.consecutiveFailures > 5) {
      this.logger.warn(`Server appears to be offline (${this.consecutiveFailures} connection refused). Slowing reconnect attempts.`);
      return true;
    }
    
    return true;
  }
  
  getDelay() {
    let baseDelay = this.initialDelayMs * Math.pow(this.backoffMultiplier, this.attempts);
    
    if (this.lastErrorType === 'ECONNREFUSED' && this.consecutiveFailures > 5) {
      const offlineDelay = Math.min(baseDelay * 3, 180000);
      return Math.round(offlineDelay);
    }
    
    const delay = Math.min(baseDelay, this.maxDelayMs);
    return Math.round(delay);
  }
  
  scheduleReconnect(callback) {
    if (!this.shouldReconnect()) return false;
    
    const delay = this.getDelay();
    this.attempts++;
    
    this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.attempts}/${this.maxAttempts})`);
    
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
