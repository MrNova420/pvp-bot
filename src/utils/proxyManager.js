const https = require('https');
const socks = require('socks');

class ProxyManager {
  constructor() {
    this.proxies = [];
    this.currentIndex = 0;
    this.lastFetch = 0;
    this.fetchInterval = 5 * 60 * 1000; // 5 minutes
  }
  
  // Fetch free proxies from public API
  async fetchProxies() {
    const now = Date.now();
    if (this.proxies.length > 0 && (now - this.lastFetch) < this.fetchInterval) {
      return this.proxies;
    }
    
    try {
      const sources = [
        'https://api.proxyscrape.com/v2/?request=get&protocol=socks5&timeout=10000&country=all&ssl=all&anonymity=all',
        'https://www.proxy-list.download/api/v1/get?type=socks5'
      ];
      
      for (const url of sources) {
        try {
          const proxies = await this._fetchFromUrl(url);
          if (proxies.length > 0) {
            this.proxies = proxies;
            this.lastFetch = now;
            return proxies;
          }
        } catch (e) {
          console.log(`[Proxy] Failed to fetch from ${url}: ${e.message}`);
        }
      }
      
      if (this.proxies.length === 0) {
        this.proxies = [];
      }
    } catch (e) {
      console.log(`[Proxy] Error fetching proxies: ${e.message}`);
    }
    
    return this.proxies;
  }
  
  async _fetchFromUrl(url) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { timeout: 10000 }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const proxies = this._parseProxyResponse(data);
            resolve(proxies);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Timeout')));
    });
  }
  
  _parseProxyResponse(data) {
    const proxies = [];
    const lines = data.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const parts = trimmed.split(':');
      if (parts.length >= 2) {
        const ip = parts[0];
        const port = parseInt(parts[1]);
        if (ip && port) {
          proxies.push(`socks5://${ip}:${port}`);
        }
      }
    }
    
    return proxies;
  }
  
  // Get next proxy in rotation
  async getNextProxy() {
    const proxies = await this.fetchProxies();
    if (proxies.length === 0) return null;
    
    const proxy = proxies[this.currentIndex % proxies.length];
    this.currentIndex++;
    return proxy;
  }
}

module.exports = new ProxyManager();
