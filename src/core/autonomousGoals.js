class AutonomousGoalGenerator {
  constructor(bot, logger, progressionSystem) {
    this.bot = bot;
    this.logger = logger;
    this.progression = progressionSystem;
    this.dynamicGoals = [];
    this.homeLocation = null;
    this.communityMembers = new Set();
    this.resources = {};
    this.completedMilestones = new Set();
  }

  generateNewGoals() {
    const inventory = this.bot.inventory ? this.bot.inventory.slots.filter(slot => slot) : [];
    const health = this.bot.health || 20;
    const food = this.bot.food || 20;
    const position = this.bot.entity ? this.bot.entity.position : null;
    
    const newGoals = [];
    
    if (health < 10 || food < 10) {
      newGoals.push({
        type: 'survival',
        action: 'find_food',
        priority: 1,
        description: 'Find food immediately'
      });
    }
    
    if (!this.homeLocation) {
      newGoals.push({
        type: 'building',
        action: 'establish_home',
        priority: 1,
        description: 'Find location and build first home'
      });
    }
    
    if (this.homeLocation && !this.hasChests()) {
      newGoals.push({
        type: 'building',
        action: 'build_storage',
        priority: 2,
        description: 'Build storage system with chests'
      });
    }
    
    if (inventory.length < 5) {
      newGoals.push({
        type: 'resources',
        action: 'gather_basic_materials',
        priority: 1,
        description: 'Gather wood, stone, and basic resources'
      });
    }
    
    const hasTools = inventory.some(slot => 
      slot && slot.name && (slot.name.includes('pickaxe') || slot.name.includes('axe'))
    );
    
    if (!hasTools) {
      newGoals.push({
        type: 'crafting',
        action: 'craft_tools',
        priority: 2,
        description: 'Craft basic tools (pickaxe, axe, shovel)'
      });
    }
    
    if (this.homeLocation && this.hasBasicResources()) {
      newGoals.push({
        type: 'building',
        action: 'expand_base',
        priority: 3,
        description: 'Expand base with farms, workshops, and community areas'
      });
    }
    
    const nearbyPlayers = Object.values(this.bot.players || {}).filter(p => {
      if (!p.entity || !this.bot.entity) return false;
      const dist = p.entity.position.distanceTo(this.bot.entity.position);
      return dist < 50 && p.username !== this.bot.username;
    });
    
    if (nearbyPlayers.length > 0) {
      newGoals.push({
        type: 'social',
        action: 'interact_with_players',
        priority: 2,
        description: 'Interact with nearby players and build community'
      });
    }
    
    if (this.shouldExplore()) {
      newGoals.push({
        type: 'exploration',
        action: 'explore_new_areas',
        priority: 3,
        description: 'Explore and discover new biomes and structures'
      });
    }
    
    if (this.hasExcessResources()) {
      newGoals.push({
        type: 'trading',
        action: 'find_trading_opportunities',
        priority: 3,
        description: 'Find villagers or players to trade with'
      });
    }
    
    this.dynamicGoals = newGoals;
    return newGoals;
  }

  getNextGoal() {
    this.generateNewGoals();
    
    if (this.dynamicGoals.length === 0) {
      return {
        type: 'exploration',
        action: 'explore_randomly',
        priority: 4,
        description: 'Explore the world'
      };
    }
    
    this.dynamicGoals.sort((a, b) => a.priority - b.priority);
    return this.dynamicGoals[0];
  }

  setHomeLocation(position) {
    this.homeLocation = {
      x: Math.floor(position.x),
      y: Math.floor(position.y),
      z: Math.floor(position.z)
    };
    this.logger.info(`[Autonomous] Home established at ${this.homeLocation.x}, ${this.homeLocation.y}, ${this.homeLocation.z}`);
    this.completedMilestones.add('home_established');
  }

  addCommunityMember(username) {
    this.communityMembers.add(username);
    this.logger.info(`[Autonomous] Added ${username} to community (${this.communityMembers.size} members)`);
  }

  hasChests() {
    return this.completedMilestones.has('build_storage') || this.completedMilestones.has('storage_built');
  }

  hasBasicResources() {
    const inventory = this.bot.inventory ? this.bot.inventory.slots.filter(slot => slot) : [];
    return inventory.length > 10;
  }

  hasExcessResources() {
    const inventory = this.bot.inventory ? this.bot.inventory.slots.filter(slot => slot) : [];
    return inventory.length > 20;
  }

  shouldExplore() {
    const explorationGoals = this.dynamicGoals.filter(g => g.type === 'exploration');
    return explorationGoals.length === 0 && Math.random() > 0.7;
  }

  completeGoal(goalAction) {
    this.dynamicGoals = this.dynamicGoals.filter(g => g.action !== goalAction);
    this.completedMilestones.add(goalAction);
    this.logger.info(`[Autonomous] Completed goal: ${goalAction}`);
  }

  getProgress() {
    return {
      homeLocation: this.homeLocation,
      communitySize: this.communityMembers.size,
      completedMilestones: Array.from(this.completedMilestones),
      activeGoals: this.dynamicGoals.length
    };
  }
}

module.exports = AutonomousGoalGenerator;
