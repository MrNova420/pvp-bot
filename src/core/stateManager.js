const fs = require('fs');
const path = require('path');

class StateManager {
  constructor(config = {}, logger = null) {
    this.logger = logger || console;
    this.stateFile = path.join(config.persistDir || 'data', 'bot-state.json');
    this.state = {
      lastPosition: null,
      currentMode: 'afk',
      currentActivity: null,
      inventory: [],
      exploredChunks: [],
      landmarks: [],
      playerRelationships: {},
      workProgress: {},
      lastSaveTime: null
    };
    
    this._ensureStateDir();
    this._loadState();
    
    this.dirty = false;
    
    this.saveInterval = setInterval(() => {
      if (this.dirty) {
        this._saveState();
        this.dirty = false;
      }
    }, 120000);
  }
  
  _ensureStateDir() {
    const dir = path.dirname(this.stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
  
  _loadState() {
    if (fs.existsSync(this.stateFile)) {
      try {
        const data = fs.readFileSync(this.stateFile, 'utf8');
        this.state = { ...this.state, ...JSON.parse(data) };
        this.logger.info('[StateManager] Loaded saved state');
      } catch (err) {
        this.logger.error('[StateManager] Failed to load state:', err.message);
      }
    }
  }
  
  _saveState() {
    try {
      this.state.lastSaveTime = new Date().toISOString();
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
      this.logger.debug('[StateManager] State saved');
    } catch (err) {
      this.logger.error('[StateManager] Failed to save state:', err.message);
    }
  }
  
  updatePosition(position) {
    this.state.lastPosition = {
      x: position.x,
      y: position.y,
      z: position.z,
      dimension: position.dimension || 'overworld'
    };
    this.dirty = true;
  }
  
  updateMode(mode) {
    this.state.currentMode = mode;
    this._saveState();
  }
  
  updateActivity(activity) {
    this.state.currentActivity = activity;
    this.dirty = true;
  }
  
  addExploredChunk(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;
    if (!this.state.exploredChunks.includes(chunkKey)) {
      this.state.exploredChunks.push(chunkKey);
      if (this.state.exploredChunks.length > 1000) {
        this.state.exploredChunks.shift();
      }
      this.dirty = true;
    }
  }
  
  addLandmark(name, position, type) {
    this.state.landmarks.push({
      name,
      position,
      type,
      addedAt: Date.now()
    });
    
    if (this.state.landmarks.length > 100) {
      this.state.landmarks.shift();
    }
    this._saveState();
  }
  
  updatePlayerRelationship(playerName, interaction) {
    if (!this.state.playerRelationships[playerName]) {
      this.state.playerRelationships[playerName] = {
        firstMet: Date.now(),
        interactions: 0,
        lastSeen: Date.now()
      };
    }
    
    this.state.playerRelationships[playerName].interactions++;
    this.state.playerRelationships[playerName].lastSeen = Date.now();
  }
  
  setWorkProgress(taskType, progress) {
    this.state.workProgress[taskType] = progress;
    this._saveState();
  }
  
  getWorkProgress(taskType) {
    return this.state.workProgress[taskType] || null;
  }
  
  getState() {
    return { ...this.state };
  }
  
  hasBeenToChunk(chunkX, chunkZ) {
    return this.state.exploredChunks.includes(`${chunkX},${chunkZ}`);
  }
  
  getNearbyLandmarks(position, radius = 100) {
    return this.state.landmarks.filter(landmark => {
      const dx = landmark.position.x - position.x;
      const dz = landmark.position.z - position.z;
      return Math.sqrt(dx * dx + dz * dz) <= radius;
    });
  }
  
  forceSave() {
    this._saveState();
  }
  
  cleanup() {
    if (this.saveInterval) {
      clearInterval(this.saveInterval);
    }
    this._saveState();
    this.logger.info('[StateManager] Cleaned up and saved final state');
  }
}

module.exports = StateManager;
