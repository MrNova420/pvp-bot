const https = require('https');
const { SocksClient } = require('socks');
const net = require('net');
const dns = require('dns').promises;

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
        'https://www.proxy-list.download/api/v1/get?type=socks5',
        'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt'
      ];
      
      for (const url of sources) {
        try {
          const proxies = await this._fetchFromUrl(url);
          // Filter out error messages and invalid entries
          const validProxies = proxies.filter(proxy => {
            return proxy && 
                   typeof proxy === 'string' && 
                   !proxy.includes('error') && 
                   !proxy.includes('Error') &&
                   proxy.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d{1,5}$/);
          });
          
          if (validProxies.length > 0) {
            this.proxies = validProxies;
            this.lastFetch = now;
            return validProxies;
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
           proxies.push(`${ip}:${port}`);
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
  
  // Create a socket that connects through a SOCKS5 proxy
  async createProxiedSocket(targetHost, targetPort, botName = 'unknown', loggerInstance = null) {
    const proxy = await this.getNextProxy();
    if (!proxy) {
      throw new Error('No proxy available');
    }
    
    // Proxy is in format "ip:port"
    const proxyParts = proxy.split(':');
    if (proxyParts.length < 2) {
      throw new Error(`Invalid proxy format: ${proxy}`);
    }
    const proxyHost = proxyParts[0];
    const proxyPort = parseInt(proxyParts[1], 10);
    
    if (isNaN(proxyPort)) {
      throw new Error(`Invalid proxy port: ${proxyParts[1]} in ${proxy}`);
    }
    
    const proxyInfo = `${proxyHost}:${proxyPort}`;
    
    // Validate inputs
    if (!targetHost || typeof targetHost !== 'string') {
      throw new Error(`Invalid targetHost: ${targetHost}`);
    }
    if (!targetPort || typeof targetPort !== 'number' || targetPort <= 0 || targetPort > 65535) {
      throw new Error(`Invalid targetPort: ${targetPort}`);
    }
    
    // Use provided logger or fallback to require
    const logger = loggerInstance || require('./logger');
    logger.info(`[Proxy] Bot ${botName} assigned to proxy: ${proxyInfo}`);
    logger.info(`[Proxy] Target: ${targetHost}:${targetPort}`);
    
    // Log the options we are passing to SocksClient for debugging
    loggerInstance ? loggerInstance.debug(`[Proxy] SocksClient options: proxy={host:${proxyHost},port:${proxyPort},type:5}, target={host:${targetHost},port:${targetPort}}, command:connect`) : 
      require('./logger').debug(`[Proxy] SocksClient options: proxy={host:${proxyHost},port:${proxyPort},type:5}, target={host:${targetHost},port:${targetPort}}, command:connect`);
    
    return new Promise((resolve, reject) => {
      const connectionPromise = SocksClient.createConnection({
        proxy: {
          host: proxyHost,
          port: proxyPort,
          type: 5
        },
        destination: {
          host: targetHost,
          port: targetPort
        },
        command: 'connect'
      });
      
      // Handle the promise properly
      connectionPromise
        .then((socket) => {
          resolve(socket);
        })
        .catch((err) => {
          // Log proxy connection error
          logger.warn(`[Proxy] Bot ${botName} connection failed to proxy ${proxyInfo}: ${err.message}`);
          reject(err);
        });
        
      // Also attach error handler to the socket events if needed
      // The SocksClient creates events on the returned socket
    });
  }
}

module.exports = new ProxyManager();
