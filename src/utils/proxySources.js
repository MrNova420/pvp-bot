const https = require('https');
const http = require('http');
const { URL } = require('url');

class ProxySources {
  constructor() {
    // ONLY SOCKS proxies - socks-proxy-agent doesn't support HTTP!
    this.sources = [
      {
        name: 'ProxyScrape SOCKS5',
        url: 'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text&timeout=15000&protocol=socks5',
        type: 'socks5'
      },
      {
        name: 'TheSpeedX SOCKS4',
        url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks4.txt',
        type: 'socks4'
      },
      {
        name: 'TheSpeedX SOCKS5',
        url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
        type: 'socks5'
      },
      {
        name: 'Jetkai SOCKS5',
        url: 'https://raw.githubusercontent.com/jetkai/proxy-list/main/online/socks5.txt',
        type: 'socks5'
      },
      {
        name: 'hookzproxies SOCKS5',
        url: 'https://raw.githubusercontent.com/hookzproxies/socks5-list/master/proxies.txt',
        type: 'socks5'
      },
      {
        name: 'clarketm HTTP',
        url: 'https://raw.githubusercontent.com/clarketm/proxy-list/master/proxies-http.txt',
        type: 'http'
      },
      {
        name: 'madveyjake SOCKS5',
        url: 'https://raw.githubusercontent.com/madveyjake/proxy-list/master/socks5.txt',
        type: 'socks5'
      },
      {
        name: '-proxy-rayg- HTTP',
        url: 'https://raw.githubusercontent.com/proxy-rayg/proxy_list/main/http.txt',
        type: 'http'
      },
      {
        name: 'roosterkid HTTP',
        url: 'https://raw.githubusercontent.com/roosterkid/proxy-list/main/http.txt',
        type: 'http'
      },
      {
        name: 'sunny9573 SOCKS5',
        url: 'https://raw.githubusercontent.com/sunny9573/proxy-list/master/socks5.txt',
        type: 'socks5'
      },
      {
        name: 'mastercard HTTP',
        url: 'https://raw.githubusercontent.com/a2elu/proxy-list/main/http.txt',
        type: 'http'
      },
      {
        name: 'US Only HTTP',
        url: 'https://raw.githubusercontent.com/BlackBeaTE/Proxys/main/US.txt',
        type: 'http'
      },
      {
        name: 'EU Only HTTP',
        url: 'https://raw.githubusercontent.com/BlackBeaTE/Proxys/main/EU.txt',
        type: 'http'
      }
    ];
  }
  
  async fetchAll() {
    const promises = this.sources.map(src => this._fetchSource(src).catch(() => []));
    const results = await Promise.all(promises);
    const allProxies = results.flat();
    
    const unique = new Map();
    for (const proxy of allProxies) {
      unique.set(proxy.address, proxy);
    }
    
    return Array.from(unique.values());
  }
  
  _fetchSource(source) {
    return new Promise((resolve) => {
      const proxies = [];
      const urlObj = new URL(source.url);
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const req = protocol.get(source.url, { timeout: 15000 }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const lines = data.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            const proxy = this._parseProxy(trimmed, source.type, source.name);
            if (proxy) {
              proxies.push(proxy);
            }
          }
          resolve(proxies);
        });
      });
      
      req.on('error', () => {
        resolve([]);
      });
      
      req.setTimeout(15000, () => {
        req.destroy();
        resolve([]);
      });
    });
  }
  
  _parseProxy(line, defaultType, sourceName) {
    const parts = line.split(':');
    if (parts.length < 2) return null;
    
    const host = parts[0].trim();
    const port = parseInt(parts[1].trim());
    
    if (!host || isNaN(port)) return null;
    
    let type = defaultType;
    if (line.includes('socks4') || line.includes('@')) {
      type = 'socks4';
    } else if (line.includes('socks5') || line.includes('@')) {
      type = 'socks5';
    }
    
    return {
      address: `${host}:${port}`,
      host,
      port,
      type,
      source: sourceName,
      latency: null,
      country: null,
      anonymity: 'transparent',
      lastChecked: Date.now()
    };
  }
}

module.exports = ProxySources;