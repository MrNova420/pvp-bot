const fs = require('fs');
const path = require('path');

class ActivityTracker {
  constructor(config = {}, logger = null) {
    this.logger = logger || console;
    this.activityFile = path.join(config.persistDir || 'data', 'activity-history.json');
    this.activities = [];
    this.maxActivities = config.maxActivities || 1000;
    
    this._ensureDir();
    this._loadActivities();
    
    this.dirty = false;
    
    this.saveInterval = setInterval(() => {
      if (this.dirty) {
        this._saveActivities();
        this.dirty = false;
      }
    }, 120000);
  }
  
  _ensureDir() {
    const dir = path.dirname(this.activityFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  _loadActivities() {
    if (fs.existsSync(this.activityFile)) {
      try {
        const data = fs.readFileSync(this.activityFile, 'utf8');
        this.activities = JSON.parse(data);
        this.logger.info(`[ActivityTracker] Loaded ${this.activities.length} activities`);
      } catch (err) {
        this.logger.error('[ActivityTracker] Failed to load:', err.message);
      }
    }
  }
  
  _saveActivities() {
    try {
      fs.writeFileSync(this.activityFile, JSON.stringify(this.activities, null, 2));
    } catch (err) {
      this.logger.error('[ActivityTracker] Failed to save:', err.message);
    }
  }
  
  record(type, details = {}) {
    const activity = {
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      date: new Date().toISOString(),
      details
    };
    
    this.activities.push(activity);
    
    if (this.activities.length > this.maxActivities) {
      this.activities.shift();
    }
    
    this.dirty = true;
    this.logger.debug(`[ActivityTracker] Recorded: ${type}`);
  }
  
  getActivities(options = {}) {
    let filtered = [...this.activities];
    
    if (options.type) {
      filtered = filtered.filter(a => a.type === options.type);
    }
    
    if (options.since) {
      filtered = filtered.filter(a => a.timestamp >= options.since);
    }
    
    if (options.limit) {
      filtered = filtered.slice(-options.limit);
    }
    
    return filtered.reverse();
  }
  
  getStats() {
    const stats = {
      total: this.activities.length,
      byType: {},
      last24Hours: 0,
      lastWeek: 0
    };
    
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const week = 7 * day;
    
    this.activities.forEach(activity => {
      stats.byType[activity.type] = (stats.byType[activity.type] || 0) + 1;
      
      if (now - activity.timestamp < day) {
        stats.last24Hours++;
      }
      
      if (now - activity.timestamp < week) {
        stats.lastWeek++;
      }
    });
    
    return stats;
  }
  
  search(query) {
    const lowerQuery = query.toLowerCase();
    
    return this.activities.filter(activity => {
      const typeMatch = activity.type.toLowerCase().includes(lowerQuery);
      const detailsMatch = JSON.stringify(activity.details).toLowerCase().includes(lowerQuery);
      return typeMatch || detailsMatch;
    }).reverse();
  }
  
  clear() {
    this.activities = [];
    this._saveActivities();
    this.logger.info('[ActivityTracker] History cleared');
  }
  
  cleanup() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this._saveActivities();
    this.logger.info('[ActivityTracker] Cleaned up and saved');
  }
}

module.exports = ActivityTracker;
