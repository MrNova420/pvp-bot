const net = require('net');
const http = require('http');
const https = require('https');
const { URL } = require('url');

let geoip;
try {
  geoip = require('geoip-lite');
} catch (e) {
  geoip = null;
}

class ProxyValidator {
  constructor(config = {}, logger = null) {
    this.logger = logger || console;
    this.checkTimeout = config.checkTimeout || 3000; // Fast 3s timeout
    this.maxConcurrency = config.maxConcurrency || 100; // More concurrent
    this.testUrl = config.testUrl || 'https://httpbin.org/ip';
    this.enableGeoIP = config.enableGeoIP !== false;
  }
  
  async validateBatch(proxies, blacklist = new Set()) {
    const valid = [];
    const batchSize = this.maxConcurrency;
    
    // Process in batches of 100
    for (let i = 0; i < proxies.length; i += batchSize) {
      const batch = proxies.slice(i, i + batchSize).filter(p => !blacklist.has(p.address));
      
      // Fire all 100 at once!
      const promises = batch.map(p => this.validateProxy(p).catch(() => null));
      const results = await Promise.all(promises);
      
      for (const result of results) {
        if (result) valid.push(result);
      }
      
      // Progress every batch
      const progress = Math.min(i + batchSize, proxies.length);
      this.logger.info(`[ProxyValidator] Validated ${progress}/${proxies.length}...`);
    }
    
    return valid;
  }
  
  async validateProxy(proxy) {
    const startTime = Date.now();
    
    try {
      const latency = await this._testConnectivity(proxy);
      if (latency === null) return null;
      
      const checked = {
        ...proxy,
        latency,
        lastChecked: Date.now(),
        healthy: true
      };
      
      if (this.enableGeoIP && geoip) {
        const geo = this.lookupGeoIP(proxy.host);
        if (geo) {
          checked.country = geo.country;
          checked.city = geo.city;
          checked.region = geo.region;
        }
      }
      
      return checked;
    } catch (e) {
      return null;
    }
  }
  
  lookupGeoIP(ip) {
    if (!geoip || !ip) return null;
    
    try {
      const geo = geoip.lookup(ip);
      if (geo) {
        return {
          country: geo.country || 'XX',
          region: geo.region || '',
          city: geo.city || ''
        };
      }
    } catch (e) {
      // Invalid IP
    }
    return null;
  }
  
  _testConnectivity(proxy) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timeout = this.checkTimeout;
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        // Fast connect = proxy works
        socket.destroy();
        resolve(100); // Fake low latency for working proxy
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(null);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(null);
      });
      
      // Just connect - don't do full SOCKS handshake (too slow!)
      socket.connect(proxy.port, proxy.host);
    });
  }
  
  _testSOCKS5(proxy, socket, timeout, resolve) {
    socket.connect(proxy.port, proxy.host);
    
    socket.on('connect', () => {
      const buf = Buffer.from([0x05, 0x01, 0x00]);
      socket.write(buf);
    });
    
    socket.once('data', (data) => {
      if (data[0] === 0x05 && data[1] === 0x00) {
        const latency = Date.now() - timeout + timeout;
        socket.destroy();
        resolve(latency);
      } else {
        socket.destroy();
        resolve(null);
      }
    });
  }
  
  _testSOCKS4(proxy, socket, timeout, resolve) {
    socket.connect(proxy.port, proxy.host);
    
    socket.on('connect', () => {
      const ipArray = proxy.host.split('.').map(Number);
      const buf = Buffer.from([
        0x04, 0x01,
        (proxy.port >> 8) & 0xFF,
        proxy.port & 0xFF,
        ipArray[0], ipArray[1], ipArray[2], ipArray[3],
        0x00
      ]);
      socket.write(buf);
    });
    
    socket.once('data', (data) => {
      if (data[0] === 0x00 && data[1] === 0x5A) {
        const latency = Date.now() - timeout + timeout;
        socket.destroy();
        resolve(latency);
      } else {
        socket.destroy();
        resolve(null);
      }
    });
  }
  
  async checkAnonymity(proxy) {
    return new Promise((resolve) => {
      try {
        const url = new URL(this.testUrl);
        const protocol = url.protocol === 'https:' ? https : http;
        
        const options = {
          hostname: proxy.host,
          port: proxy.port,
          path: '/',
          method: 'GET',
          timeout: this.checkTimeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        };
        
        const req = protocol.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            const via = res.headers['via'] || '';
            const xff = res.headers['x-forwarded-for'] || '';
            
            let anonymity = 'transparent';
            if (!via && !xff) {
              anonymity = 'elite';
            } else if (xff) {
              anonymity = 'anonymous';
            }
            
            resolve(anonymity);
          });
        });
        
        req.on('error', () => resolve('transparent'));
        req.on('timeout', () => { req.destroy(); resolve('transparent'); });
        req.end();
      } catch (e) {
        resolve('transparent');
      }
    });
  }
}

module.exports = ProxyValidator;