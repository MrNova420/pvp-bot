class SuperPathfinderAddon {
  constructor() {
    this.name = 'super-pathfinder';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;
    
    this.pathfinder = null;
    this.goals = null;
    this.movements = null;
    
    this.following = false;
    this.followTarget = null;
    this.lastJumpTime = 0;
    
    // From advanced-pathfinder.js and pathfinding.js
    this.followDistance = 3;
  }
  
  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
    
    try {
      const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
      this.goals = goals;
      
      // Load plugin if not already loaded
      if (!this.bot.pathfinder) {
        this.bot.loadPlugin(pathfinder);
      }
      
      const mcData = require('minecraft-data')(this.bot.version);
      
      // Use the most comprehensive movement config (from super-pathfinder.js)
      this.movements = new Movements(this.bot, mcData, {
        canOpenDoors: true,
        canBreakDoors: true,
        canDig: true,
        avoidWater: false,
        swimUpwards: true,
        placeholderMaxDropAndBreak: 100
      });
      
      if (this.bot.pathfinder) {
        this.bot.pathfinder.setMovements(this.movements);
      }
      
      // Setup tick-based movement (from super-pathfinder.js)
      this.bot.on('physicsTick', () => this.tick());
      
      this.logger.info('[SuperPathfinder] Initialized with custom movements and tick-based movement');
    } catch (err) {
      this.logger.error('[SuperPathfinder] Init failed:', err.message);
    }
  }
  
  // ==================== TICK-BASED MOVEMENT (from super-pathfinder.js) ====================
  
  tick() {
    if (!this.bot.entity || !this.following || !this.followTarget) return;
    
    const player = this.bot.players[this.followTarget];
    if (!player || !player.entity) return;
    
    const dist = this.bot.entity.position.distanceTo(player.entity.position);
    const now = Date.now();
    
    // Different tiers based on distance (from super-pathfinder.js)
    
    // Far - Pro jump-sprint
    if (dist > 4) {
      this.bot.setControlState('forward', true);
      this.bot.setControlState('sprint', true);
      if (this.bot.onGround && now - this.lastJumpTime > 150) {
        this.bot.setControlState('jump', true);
        this.lastJumpTime = now;
      }
    }
    // Medium - normal sprint
    else if (dist > 2) {
      this.bot.setControlState('forward', true);
      this.bot.setControlState('sprint', true);
      this.bot.setControlState('jump', false);
    }
    // Close - walk
    else if (dist > 1) {
      this.bot.setControlState('forward', true);
      this.bot.setControlState('sprint', false);
    }
    // Very close - stop
    else {
      this.bot.setControlState('forward', false);
      this.bot.setControlState('sprint', false);
      this.bot.setControlState('jump', false);
    }
  }
  
  // ==================== FOLLOW PLAYER (merged from all files) ====================
  
  async followPlayer(playerName, distance = 3) {
    if (!this.bot || !this.bot.pathfinder) return false;
    
    const player = this.bot.players[playerName];
    if (!player || !player.entity) return false;
    
    this.following = true;
    this.followTarget = playerName;
    this.followDistance = distance;
    this.lastJumpTime = 0;
    
    try {
      // Use GoalFollow from goals (merged from all files)
      if (this.goals) {
        const goal = new this.goals.GoalFollow(player.entity, distance);
        this.bot.pathfinder.setGoal(goal, true);
      }
      
      this.logger.info('[SuperPathfinder] Following ' + playerName + ' at distance ' + distance);
      return true;
    } catch (err) {
      this.logger.error('[SuperPathfinder] Follow error:', err.message);
      return false;
    }
  }
  
  // Alias for compatibility (from pathfinding.js uses goTo, advanced-pathfinder uses goto)
  async goTo(x, y, z) {
    return this.goto(x, y, z);
  }
  
  async goto(x, y, z) {
    if (!this.bot.pathfinder) return false;
    
    try {
      if (this.goals) {
        const goal = new this.goals.GoalBlock(x, y, z);
        await this.bot.pathfinder.goto(goal);
        this.logger.info(`[SuperPathfinder] Reached destination: (${x}, ${y}, ${z})`);
      }
      return true;
    } catch (err) {
      this.logger.error(`[SuperPathfinder] Error:`, err.message);
      return false;
    }
  }
  
  // ==================== STOP (merged from all files) ====================
  
  stop() {
    this.following = false;
    this.followTarget = null;
    this.lastJumpTime = 0;
    
    if (this.bot?.pathfinder) {
      this.bot.pathfinder.setGoal(null);
    }
    this.bot?.clearControlStates();
    
    this.logger.info('[SuperPathfinder] Stopped');
  }
  
  // ==================== ENABLE/DISABLE ====================
  
  enable() {
    this.enabled = true;
    this.logger.info('[SuperPathfinder] Enabled');
  }
  
  disable() {
    this.enabled = false;
    this.stop();
    this.logger.info('[SuperPathfinder] Disabled');
  }
  
  // ==================== CLEANUP ====================
  
  cleanup() {
    this.disable();
    this.bot = null;
    this.engine = null;
    this.logger = null;
  }
}

module.exports = SuperPathfinderAddon;
