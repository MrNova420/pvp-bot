const ProxySources = require('./proxySources');
const ProxyValidator = require('./proxyValidator');
const fs = require('fs');
const path = require('path');

class ProxyManager {
  constructor(config = {}, logger = null) {
    this.logger = logger || console;
    this.config = config;
    this.enabled = true; // Always enabled - used via USE_PROXY env var
    this.proxies = new Map();
    this.blacklist = new Set();
    this.healthScores = new Map();
    this.rotationStrategy = config.rotationStrategy || 'random';
    this.minHealthScore = config.minHealthScore || 0.3;
    this.maxLatency = config.maxLatency || 5000;
    this.blacklistThreshold = config.blacklistThreshold || 3;
    this.preferredCountries = config.preferredCountries || [];
    this.refreshInterval = config.refreshInterval || 900000;
    this.lastRefresh = 0;
    this.currentProxyIndex = 0;
    
    this.sources = new ProxySources();
    this.validator = new ProxyValidator({ logger: this.logger });
    
    this._loadState();
  }
  
  _getStatePath() {
    const dataDir = path.join(__dirname, '../../data');
    return path.join(dataDir, 'proxies.json');
  }
  
  _loadState() {
    try {
      const statePath = this._getStatePath();
      if (fs.existsSync(statePath)) {
        const data = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        this.proxies = new Map(Object.entries(data.proxies || {}));
        this.blacklist = new Set(data.blacklist || []);
        this.healthScores = new Map(Object.entries(data.healthScores || {}));
        this.lastRefresh = data.lastRefresh || 0;
        this.logger.info(`[ProxyManager] Loaded ${this.proxies.size} proxies from state`);
      }
    } catch (e) {
      this.logger.warn('[ProxyManager] Failed to load state:', e.message);
    }
  }
  
  _saveState() {
    try {
      const dataDir = path.join(__dirname, '../../data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const state = {
        proxies: Object.fromEntries(this.proxies),
        blacklist: Array.from(this.blacklist),
        healthScores: Object.fromEntries(this.healthScores),
        lastRefresh: this.lastRefresh
      };
      fs.writeFileSync(this._getStatePath(), JSON.stringify(state, null, 2));
    } catch (e) {
      this.logger.warn('[ProxyManager] Failed to save state:', e.message);
    }
  }
  
  async fetchAndValidate() {
    if (!this.enabled) return [];
    
    this.logger.info('[ProxyManager] Fetching proxies from sources...');
    
    // Get all raw proxies quickly - no validation wait!
    const rawProxies = await this.sources.fetchAll();
    this.logger.info(`[ProxyManager] Got ${rawProxies.length} raw proxies`);
    
    // Store ALL raw proxies immediately - test them LIVE when connecting!
    for (const proxy of rawProxies) {
      if (!this.proxies.has(proxy.address)) {
        this.proxies.set(proxy.address, proxy);
        this.healthScores.set(proxy.address, 0.5); // Default score - will get tested live
      }
    }
    
    this.lastRefresh = Date.now();
    this._saveState();
    
    return Array.from(this.proxies.values());
  }
  
  // Get ONLY SOCKS proxies - socks-proxy-agent doesn't support HTTP!
  getAnyProxy() {
    const socksProxies = Array.from(this.proxies.values())
      .filter(p => !this.blacklist.has(p.address))
      .filter(p => p.type === 'socks5' || p.type === 'socks4');
    
    if (socksProxies.length === 0) {
      this.logger.warn('[ProxyManager] No SOCKS proxies available!');
      return null;
    }
    
    // Random selection to distribute load
    const proxy = socksProxies[Math.floor(Math.random() * socksProxies.length)];
    this.logger.info(`[ProxyManager] Selected: ${proxy.address} (${proxy.type})`);
    return proxy;
  }
  
  getHealthyProxies() {
    const healthy = [];
    for (const [address, proxy] of this.proxies) {
      if (this.blacklist.has(address)) continue;
      
      const health = this.healthScores.get(address) || 0;
      const latency = proxy.latency || 99999;
      
      if (health >= this.minHealthScore && latency <= this.maxLatency) {
        if (this.preferredCountries.length === 0 || 
            this.preferredCountries.includes(proxy.country)) {
          healthy.push(proxy);
        }
      }
    }
    
    return healthy.sort((a, b) => (b.latency || 99999) - (a.latency || 99999));
  }
  
  getNextProxy() {
    // Try healthy first, but if none, get ANY available proxy (no validation needed!)
    const healthy = this.getHealthyProxies();
    
    if (healthy.length > 0) {
      switch (this.rotationStrategy) {
        case 'round-robin':
          const proxy = healthy[this.currentProxyIndex % healthy.length];
          this.currentProxyIndex++;
          return proxy;
        case 'weighted':
          return this._getWeightedProxy(healthy);
        case 'random':
        default:
          return healthy[Math.floor(Math.random() * healthy.length)];
      }
    }
    
    // Fallback: get ANY proxy even without health scores
    const allProxies = Array.from(this.proxies.values());
    if (allProxies.length > 0) {
      const proxy = allProxies[Math.floor(Math.random() * allProxies.length)];
      this.logger.info(`[ProxyManager] Using random proxy: ${proxy.address}`);
      return proxy;
    }
    
    this.logger.warn('[ProxyManager] No proxies available');
    return null;
  }
  
  _getWeightedProxy(proxies) {
    const totalWeight = proxies.reduce((sum, p) => {
      return sum + (this.healthScores.get(p.address) || 0.5);
    }, 0);
    
    let random = Math.random() * totalWeight;
    for (const proxy of proxies) {
      random -= (this.healthScores.get(proxy.address) || 0.5);
      if (random <= 0) return proxy;
    }
    
    return proxies[0];
  }
  
  recordResult(proxyAddress, success, latency = null) {
    if (!this.proxies.has(proxyAddress)) return;
    
    const current = this.healthScores.get(proxyAddress) || 0.5;
    let newScore;
    
    if (success) {
      newScore = Math.min(1, current + 0.1);
    } else {
      newScore = Math.max(0, current - 0.2);
    }
    
    this.healthScores.set(proxyAddress, newScore);
    
    const failures = (1 - newScore) * 10;
    if (failures >= this.blacklistThreshold) {
      this.blacklistProxy(proxyAddress);
    }
    
    this._saveState();
  }
  
  blacklistProxy(proxyAddress) {
    if (!this.blacklist.has(proxyAddress)) {
      this.blacklist.add(proxyAddress);
      this.proxies.delete(proxyAddress);
      this.healthScores.delete(proxyAddress);
      this.logger.info(`[ProxyManager] Blacklisted: ${proxyAddress}`);
      this._saveState();
    }
  }
  
  unblacklistProxy(proxyAddress) {
    if (this.blacklist.has(proxyAddress)) {
      this.blacklist.delete(proxyAddress);
      this.logger.info(`[ProxyManager] Unblacklisted: ${proxyAddress}`);
      this._saveState();
    }
  }
  
  clearBlacklist() {
    this.blacklist.clear();
    this.logger.info('[ProxyManager] Blacklist cleared');
    this._saveState();
  }
  
  getStats() {
    const healthy = this.getHealthyProxies();
    return {
      total: this.proxies.size,
      healthy: healthy.length,
      blacklist: this.blacklist.size,
      lastRefresh: this.lastRefresh
    };
  }
  
  exportToTxt(filename = 'proxies.txt') {
    const healthy = this.getHealthyProxies();
    const lines = healthy.map(p => p.address);
    const fs = require('fs');
    fs.writeFileSync(filename, lines.join('\n') + '\n');
    return lines.length;
  }
  
  exportToJson(filename = 'proxies.json') {
    const healthy = this.getHealthyProxies();
    const fs = require('fs');
    fs.writeFileSync(filename, JSON.stringify(healthy, null, 2));
    return healthy.length;
  }
  
  exportToCsv(filename = 'proxies.csv') {
    const healthy = this.getHealthyProxies();
    const lines = ['address,host,port,type,country,city,latency,anonymity'];
    for (const p of healthy) {
      lines.push(`${p.address},${p.host},${p.port},${p.type},${p.country || ''},${p.city || ''},${p.latency || ''},${p.anonymity || ''}`);
    }
    const fs = require('fs');
    fs.writeFileSync(filename, lines.join('\n') + '\n');
    return healthy.length;
  }
  
  exportToProxyFormat(filename = 'proxies.formatted') {
    const healthy = this.getHealthyProxies();
    const lines = healthy.map(p => {
      if (p.type === 'http') return `http://${p.address}`;
      if (p.type === 'socks4') return `socks4://${p.address}`;
      if (p.type === 'socks5') return `socks5://${p.address}`;
      return p.address;
    });
    const fs = require('fs');
    fs.writeFileSync(filename, lines.join('\n') + '\n');
    return healthy.length;
  }
}

module.exports = ProxyManager;