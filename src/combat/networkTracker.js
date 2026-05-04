class PingTracker {
  constructor(bot, logger) {
    this.bot = bot;
    this.logger = logger;
    
    this.ping = 0;
    this.pingHistory = [];
    this.maxHistory = 20;
    this.lastKeepAlive = 0;
    this.serverTPS = 20;
    this.tpsHistory = [];
    this.maxTPSHistory = 20;
    
    this._setupPingTracking();
  }

  _setupPingTracking() {
    this.bot.on('keep_alive', () => {
      const now = Date.now();
      if (this.lastKeepAlive > 0) {
        this.ping = now - this.lastKeepAlive;
        this.pingHistory.push(this.ping);
        if (this.pingHistory.length > this.maxHistory) {
          this.pingHistory.shift();
        }
      }
      this.lastKeepAlive = now;
    });
  }

  getPing() {
    return this.ping;
  }

  getAveragePing() {
    if (this.pingHistory.length === 0) return 0;
    return this.pingHistory.reduce((a, b) => a + b, 0) / this.pingHistory.length;
  }

  getPingVariation() {
    if (this.pingHistory.length < 3) return 0;
    const sorted = [...this.pingHistory].sort((a, b) => a - b);
    return sorted[sorted.length - 1] - sorted[0];
  }

  isPingStable() {
    return this.getPingVariation() < 50;
  }

  getLatencyRating() {
    const avg = this.getAveragePing();
    if (avg < 50) return 'excellent';
    if (avg < 100) return 'good';
    if (avg < 200) return 'fair';
    if (avg < 300) return 'poor';
    return 'critical';
  }

  compensateForPing(distance) {
    const avgPing = this.getAveragePing();
    return distance + (avgPing / 50);
  }
}

class VelocityTracker {
  constructor(bot, logger) {
    this.bot = bot;
    this.logger = logger;
    
    this.positionHistory = [];
    this.maxHistory = 20;
    this.velocity = { x: 0, y: 0, z: 0 };
    
    this.updateInterval = setInterval(() => {
      this._update();
    }, 50);
  }

  _update() {
    if (!this.bot.entity) return;
    
    const pos = this.bot.entity.position.clone();
    const time = Date.now();
    
    this.positionHistory.push({ pos, time });
    
    if (this.positionHistory.length > this.maxHistory) {
      this.positionHistory.shift();
    }
    
    if (this.positionHistory.length >= 2) {
      const recent = this.positionHistory.slice(-5);
      const first = recent[0];
      const last = recent[recent.length - 1];
      const timeDiff = (last.time - first.time) / 1000;
      
      if (timeDiff > 0) {
        this.velocity = {
          x: (last.pos.x - first.pos.x) / timeDiff,
          y: (last.pos.y - first.pos.y) / timeDiff,
          z: (last.pos.z - first.pos.z) / timeDiff
        };
      }
    }
  }

  getVelocity() {
    return this.velocity;
  }

  getSpeed() {
    return Math.sqrt(
      this.velocity.x ** 2 +
      this.velocity.y ** 2 +
      this.velocity.z ** 2
    );
  }

  isMoving() {
    return this.getSpeed() > 0.01;
  }

  isGrounded() {
    return Math.abs(this.velocity.y) < 0.1;
  }

  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

module.exports = { PingTracker, VelocityTracker };