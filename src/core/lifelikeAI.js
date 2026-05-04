class LifelikeAI {
  constructor(bot, logger, minecraftProgression) {
    this.bot = bot;
    this.logger = logger;
    this.progression = minecraftProgression;
    
    this.personality = {
      curiosity: 0.7,
      social: 0.6,
      ambitious: 0.8,
      cautious: 0.5,
      helpful: 0.7
    };
    
    this.mood = 'neutral';
    this.energy = 100;
    this.boredom = 0;
    
    this.memories = [];
    this.currentActivity = null;
    this.lastActivityTime = Date.now();
    this.activityHistory = [];
    
    this.randomBehaviors = [
      'look_around',
      'jump_occasionally',
      'sneak_peek',
      'sprint_burst',
      'observe_surroundings'
    ];
  }
  
  decideNextAction() {
    this.updateMood();
    this.updateEnergy();
    
    const progressionGoal = this.progression.getNextGoal();
    if (progressionGoal && Math.random() > this.boredom * 0.5) {
      return this.convertGoalToAction(progressionGoal);
    }
    
    if (this.bot.health < 10 || this.bot.food < 6) {
      return { type: 'survival', action: 'emergency_heal', priority: 10, description: 'Critical: Find food/shelter immediately' };
    }
    
    if (this.bot.food < 14) {
      return { type: 'survival', action: 'find_food', priority: 8, description: 'Getting hungry, need to eat' };
    }
    
    const nearbyPlayers = this.getNearbyPlayers();
    if (nearbyPlayers.length > 0 && this.personality.social > Math.random()) {
      return { type: 'social', action: 'interact_players', priority: 6, description: 'Chat with nearby players' };
    }
    
    if (this.boredom > 50 && this.personality.curiosity > Math.random()) {
      return { type: 'exploration', action: 'explore', priority: 5, description: 'Feeling bored, time to explore' };
    }
    
    if (this.energy < 30) {
      return { type: 'rest', action: 'rest', priority: 7, description: 'Tired, need to rest' };
    }
    
    const currentStage = this.progression.currentStage;
    const stageActions = this.getStageAppropriateActions(currentStage);
    return this.selectAction(stageActions);
  }
  
  convertGoalToAction(goal) {
    const actionMap = {
      'gather_wood': { type: 'resource', action: 'chop_trees', priority: 9, items: ['oak_log', 'birch_log'] },
      'mine_stone': { type: 'mining', action: 'mine_stone', priority: 9, items: ['stone'] },
      'craft_crafting_table': { type: 'crafting', action: 'craft', priority: 9, item: 'crafting_table' },
      'craft_wooden_pickaxe': { type: 'crafting', action: 'craft', priority: 9, item: 'wooden_pickaxe' },
      'craft_stone_tools': { type: 'crafting', action: 'craft', priority: 9, item: 'stone_pickaxe' },
      'find_food': { type: 'survival', action: 'hunt_gather', priority: 8, items: ['beef', 'chicken', 'apple'] },
      'find_location': { type: 'building', action: 'scout_location', priority: 8 },
      'build_foundation': { type: 'building', action: 'build_structure', priority: 9, structure: 'foundation' },
      'build_walls': { type: 'building', action: 'build_structure', priority: 9, structure: 'walls' },
      'mine_coal': { type: 'mining', action: 'mine_ore', priority: 8, ore: 'coal_ore' },
      'mine_iron': { type: 'mining', action: 'mine_ore', priority: 9, ore: 'iron_ore' },
      'find_cave': { type: 'exploration', action: 'find_cave', priority: 7 },
      'find_diamonds': { type: 'mining', action: 'mine_ore', priority: 10, ore: 'diamond_ore' },
      'mine_obsidian': { type: 'mining', action: 'mine_ore', priority: 9, ore: 'obsidian' },
      'build_nether_portal': { type: 'building', action: 'build_portal', priority: 10 },
      'enter_nether': { type: 'exploration', action: 'enter_nether', priority: 10 }
    };
    
    const action = actionMap[goal.id] || { 
      type: 'generic', 
      action: 'work_on_goal', 
      priority: 7, 
      goalId: goal.id 
    };
    
    action.description = goal.name;
    return action;
  }
  
  getStageAppropriateActions(stage) {
    const actions = {
      'early_game': [
        { type: 'resource', action: 'gather_wood', priority: 8 },
        { type: 'resource', action: 'gather_food', priority: 7 },
        { type: 'crafting', action: 'craft_basic_tools', priority: 7 }
      ],
      'shelter': [
        { type: 'building', action: 'build_home', priority: 9 },
        { type: 'resource', action: 'gather_building_materials', priority: 7 }
      ],
      'iron_age': [
        { type: 'mining', action: 'mine_underground', priority: 8 },
        { type: 'resource', action: 'smelt_ores', priority: 7 },
        { type: 'crafting', action: 'craft_iron_gear', priority: 8 }
      ],
      'diamond': [
        { type: 'mining', action: 'deep_mine', priority: 9 },
        { type: 'exploration', action: 'explore_caves', priority: 7 }
      ],
      'nether': [
        { type: 'exploration', action: 'explore_nether', priority: 10 },
        { type: 'combat', action: 'fight_blazes', priority: 9 }
      ],
      'end_dragon': [
        { type: 'combat', action: 'prepare_fight', priority: 10 },
        { type: 'exploration', action: 'locate_stronghold', priority: 9 }
      ]
    };
    
    return actions[stage] || actions['early_game'];
  }
  
  selectAction(actions) {
    if (actions.length === 0) {
      return { type: 'idle', action: 'wander', priority: 3, description: 'Just wandering around' };
    }
    
    const weighted = actions.map(action => ({
      ...action,
      weight: action.priority * (1 + Math.random() * 0.3)
    }));
    
    weighted.sort((a, b) => b.weight - a.weight);
    return weighted[0];
  }
  
  performRandomBehavior() {
    const behavior = this.randomBehaviors[Math.floor(Math.random() * this.randomBehaviors.length)];
    
    switch (behavior) {
      case 'look_around':
        if (this.bot && this.bot.entity) {
          const yaw = (Math.random() - 0.5) * Math.PI * 2;
          const pitch = (Math.random() - 0.5) * Math.PI * 0.5;
          this.bot.look(yaw, pitch);
        }
        break;
      case 'jump_occasionally':
        if (Math.random() < 0.1 && this.bot) {
          this.bot.setControlState('jump', true);
          setTimeout(() => this.bot.setControlState('jump', false), 100);
        }
        break;
      case 'sneak_peek':
        if (Math.random() < 0.05 && this.bot) {
          this.bot.setControlState('sneak', true);
          setTimeout(() => this.bot.setControlState('sneak', false), 2000);
        }
        break;
      case 'sprint_burst':
        if (Math.random() < 0.1 && this.bot) {
          this.bot.setControlState('sprint', true);
          setTimeout(() => this.bot.setControlState('sprint', false), 3000);
        }
        break;
    }
  }
  
  updateMood() {
    if (this.bot.health < 10) {
      this.mood = 'stressed';
    } else if (this.progression.completedStages.length > 0) {
      this.mood = 'accomplished';
    } else if (this.boredom > 70) {
      this.mood = 'bored';
    } else if (this.getNearbyPlayers().length > 0) {
      this.mood = 'social';
    } else {
      this.mood = 'neutral';
    }
  }
  
  updateEnergy() {
    const timeSinceActivity = Date.now() - this.lastActivityTime;
    
    if (timeSinceActivity > 300000) {
      this.boredom = Math.min(100, this.boredom + 10);
    } else {
      this.boredom = Math.max(0, this.boredom - 5);
    }
    
    if (this.currentActivity === 'rest') {
      this.energy = Math.min(100, this.energy + 10);
    } else if (this.currentActivity) {
      this.energy = Math.max(0, this.energy - 2);
    }
  }
  
  recordActivity(activity) {
    this.currentActivity = activity;
    this.lastActivityTime = Date.now();
    this.activityHistory.push({
      activity: activity,
      timestamp: Date.now(),
      mood: this.mood
    });
    
    if (this.activityHistory.length > 100) {
      this.activityHistory.shift();
    }
  }
  
  getNearbyPlayers() {
    if (!this.bot || !this.bot.players || !this.bot.entity) return [];
    
    return Object.values(this.bot.players).filter(player => {
      if (!player.entity || player.username === this.bot.username) return false;
      const distance = player.entity.position.distanceTo(this.bot.entity.position);
      return distance < 50;
    });
  }
  
  shouldInteract() {
    return Math.random() < this.personality.social;
  }
  
  shouldHelp() {
    return Math.random() < this.personality.helpful;
  }
  
  shouldExplore() {
    return Math.random() < this.personality.curiosity;
  }
  
  getStatus() {
    return {
      mood: this.mood,
      energy: this.energy,
      boredom: this.boredom,
      currentActivity: this.currentActivity,
      personality: this.personality
    };
  }
}

module.exports = LifelikeAI;
