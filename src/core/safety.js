const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');

class SafetyMonitor {
  constructor(config = {}, logger = null) {
    this.config = {
      maxCpuPercent: config.maxCpuPercent || 30,
      maxMemoryMB: config.maxMemoryMB || 512,
      maxBlocksPerHour: config.maxBlocksPerHour || 200,
      checkIntervalMs: config.checkIntervalMs || 30000,
      enableThermalMonitoring: config.enableThermalMonitoring !== false,
      enableBatteryMonitoring: config.enableBatteryMonitoring !== false,
      autoThrottle: config.autoThrottle !== false,
      enableIdleMode: config.enableIdleMode !== false,
      idleThresholdMs: config.idleThresholdMs || 600000,
      enable24x7Optimization: config.enable24x7Optimization !== false
    };
    
    this.logger = logger || console;
    this.metrics = {
      cpu: 0,
      memory: 0,
      temperature: null,
      battery: null,
      blocksThisHour: 0,
      lastBlockReset: Date.now()
    };
    
    this.throttled = false;
    this.idleMode = false;
    this.activityLevel = 'normal';
    this.lastActivityTime = Date.now();
    this.monitorInterval = null;
    this.callbacks = {
      onThrottle: null,
      onRestore: null,
      onCritical: null,
      onIdleMode: null,
      onActiveMode: null
    };
    
    this.lastCpuInfo = null;
    this.lastMemCheck = Date.now();
    this.startupTime = Date.now();
    this.cpuReadings = [];
    this.memoryReadings = [];
    this.performanceHistory = [];
  }
  
  start() {
    this.logger.info('Safety monitor started');
    this.monitorInterval = setInterval(() => {
      this._checkMetrics();
    }, this.config.checkIntervalMs);
    
    this._checkMetrics();
  }
  
  stop() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.logger.info('Safety monitor stopped');
  }
  
  _checkMetrics() {
    this.metrics.cpu = this._getCpuUsage();
    this.metrics.memory = this._getMemoryUsageMB();
    
    this.memoryReadings.push(this.metrics.memory);
    if (this.memoryReadings.length > 10) {
      this.memoryReadings.shift();
    }
    
    if (this.config.enableThermalMonitoring) {
      this.metrics.temperature = this._getTemperature();
    }
    
    if (this.config.enableBatteryMonitoring) {
      this.metrics.battery = this._getBatteryStatus();
    }
    
    if (Date.now() - this.metrics.lastBlockReset > 3600000) {
      this.metrics.blocksThisHour = 0;
      this.metrics.lastBlockReset = Date.now();
    }
    
    if (this.config.enableIdleMode) {
      this._checkIdleMode();
    }
    
    if (this.config.enable24x7Optimization) {
      this._optimize24x7();
    }
    
    const shouldThrottle = this._shouldThrottle();
    
    if (shouldThrottle && !this.throttled) {
      this._activateThrottle();
    } else if (!shouldThrottle && this.throttled) {
      this._deactivateThrottle();
    }
    
    this._recordPerformanceHistory();
  }
  
  _getCpuUsage() {
    const cpus = os.cpus();
    
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const currentCpuInfo = {
      idle: totalIdle,
      total: totalTick,
      timestamp: Date.now()
    };
    
    if (!this.lastCpuInfo) {
      this.lastCpuInfo = currentCpuInfo;
      return 0;
    }
    
    const idleDiff = currentCpuInfo.idle - this.lastCpuInfo.idle;
    const totalDiff = currentCpuInfo.total - this.lastCpuInfo.total;
    
    this.lastCpuInfo = currentCpuInfo;
    
    if (totalDiff === 0) return 0;
    
    const usage = 100 - (100 * idleDiff / totalDiff);
    return Math.max(0, Math.min(100, Math.round(usage)));
  }
  
  _getMemoryUsageMB() {
    const processMemory = process.memoryUsage();
    return Math.round(processMemory.rss / (1024 * 1024));
  }
  
  _getTemperature() {
    if (!fs.existsSync('/sys/class/thermal/thermal_zone0/temp')) {
      return null;
    }
    
    try {
      const temp = fs.readFileSync('/sys/class/thermal/thermal_zone0/temp', 'utf8');
      return parseInt(temp) / 1000;
    } catch (err) {
      return null;
    }
  }
  
  _getBatteryStatus() {
    try {
      const output = execSync('termux-battery-status 2>/dev/null', { encoding: 'utf8' });
      return JSON.parse(output);
    } catch (err) {
      return null;
    }
  }
  
  _shouldThrottle() {
    const uptimeSeconds = (Date.now() - this.startupTime) / 1000;
    const isStartupPhase = uptimeSeconds < 30;
    
    this.cpuReadings.push(this.metrics.cpu);
    if (this.cpuReadings.length > 5) {
      this.cpuReadings.shift();
    }
    
    const avgCpu = this.cpuReadings.reduce((a, b) => a + b, 0) / this.cpuReadings.length;
    
    if (avgCpu > this.config.maxCpuPercent && !isStartupPhase) {
      this.logger.warn(`CPU usage high (avg): ${Math.round(avgCpu)}%`);
      return true;
    }
    
    if (this.metrics.memory > this.config.maxMemoryMB) {
      this.logger.warn(`Memory usage high: ${this.metrics.memory}MB`);
      return true;
    }
    
    if (this.metrics.temperature && this.metrics.temperature > 60) {
      this.logger.warn(`Temperature high: ${this.metrics.temperature}°C`);
      return true;
    }
    
    if (this.metrics.battery && this.metrics.battery.status === 'DISCHARGING' && this.metrics.battery.percentage < 20) {
      this.logger.warn(`Battery low: ${this.metrics.battery.percentage}%`);
      return true;
    }
    
    if (this.metrics.blocksThisHour > this.config.maxBlocksPerHour) {
      this.logger.warn(`Block limit reached: ${this.metrics.blocksThisHour}/hour`);
      return true;
    }
    
    return false;
  }
  
  _activateThrottle() {
    this.throttled = true;
    this.logger.warn('THROTTLING ACTIVATED - Reducing bot activity');
    
    if (this.callbacks.onThrottle) {
      this.callbacks.onThrottle(this.metrics);
    }
  }
  
  _deactivateThrottle() {
    this.throttled = false;
    this.logger.info('Throttling deactivated - Resuming normal activity');
    
    if (this.callbacks.onRestore) {
      this.callbacks.onRestore(this.metrics);
    }
  }
  
  recordBlock() {
    this.metrics.blocksThisHour++;
  }
  
  isThrottled() {
    return this.throttled;
  }
  
  getMetrics() {
    return { ...this.metrics };
  }
  
  _checkIdleMode() {
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    
    if (timeSinceActivity > this.config.idleThresholdMs && !this.idleMode) {
      this._activateIdleMode();
    } else if (timeSinceActivity < this.config.idleThresholdMs && this.idleMode) {
      this._deactivateIdleMode();
    }
  }
  
  _activateIdleMode() {
    this.idleMode = true;
    this.activityLevel = 'idle';
    this.logger.info('IDLE MODE ACTIVATED - Reducing resource consumption');
    
    if (this.callbacks.onIdleMode) {
      this.callbacks.onIdleMode(this.metrics);
    }
  }
  
  _deactivateIdleMode() {
    this.idleMode = false;
    this.activityLevel = 'normal';
    this.logger.info('IDLE MODE DEACTIVATED - Resuming normal activity');
    
    if (this.callbacks.onActiveMode) {
      this.callbacks.onActiveMode(this.metrics);
    }
  }
  
  _optimize24x7() {
    const avgMemory = this.memoryReadings.reduce((a, b) => a + b, 0) / this.memoryReadings.length;
    const avgCpu = this.cpuReadings.reduce((a, b) => a + b, 0) / this.cpuReadings.length;
    
    if (avgMemory > this.config.maxMemoryMB * 0.8) {
      if (global.gc) {
        try {
          global.gc();
          this.logger.info('Performed garbage collection to optimize memory');
        } catch (err) {
          this.logger.debug('GC not available:', err.message);
        }
      }
    }
    
    if (avgCpu < 10 && !this.idleMode) {
      this.activityLevel = 'low';
    } else if (avgCpu > 20 && avgCpu < 35) {
      this.activityLevel = 'normal';
    } else if (avgCpu > 35) {
      this.activityLevel = 'high';
    }
  }
  
  _recordPerformanceHistory() {
    const record = {
      timestamp: Date.now(),
      cpu: this.metrics.cpu,
      memory: this.metrics.memory,
      throttled: this.throttled,
      idleMode: this.idleMode,
      activityLevel: this.activityLevel
    };
    
    this.performanceHistory.push(record);
    
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }
  
  recordActivity() {
    this.lastActivityTime = Date.now();
  }
  
  isIdleMode() {
    return this.idleMode;
  }
  
  getActivityLevel() {
    return this.activityLevel;
  }
  
  getPerformanceHistory() {
    return this.performanceHistory;
  }

  on(event, callback) {
    if (event === 'throttle') {
      this.callbacks.onThrottle = callback;
    } else if (event === 'restore') {
      this.callbacks.onRestore = callback;
    } else if (event === 'critical') {
      this.callbacks.onCritical = callback;
    } else if (event === 'idle') {
      this.callbacks.onIdleMode = callback;
    } else if (event === 'active') {
      this.callbacks.onActiveMode = callback;
    }
  }
}

module.exports = SafetyMonitor;
