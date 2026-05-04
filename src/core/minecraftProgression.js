class MinecraftProgressionSystem {
  constructor(stateManager, logger) {
    this.stateManager = stateManager;
    this.logger = logger;
    
    this.stages = {
      early_game: {
        name: 'Early Game Survival',
        goals: [
          { id: 'gather_wood', name: 'Gather Wood', target: 64, current: 0, completed: false },
          { id: 'craft_crafting_table', name: 'Craft Crafting Table', target: 1, current: 0, completed: false },
          { id: 'craft_wooden_pickaxe', name: 'Craft Wooden Pickaxe', target: 1, current: 0, completed: false },
          { id: 'mine_stone', name: 'Mine Stone', target: 32, current: 0, completed: false },
          { id: 'craft_stone_tools', name: 'Craft Stone Tools', target: 3, current: 0, completed: false },
          { id: 'find_food', name: 'Find Food', target: 20, current: 0, completed: false }
        ],
        nextStage: 'shelter'
      },
      shelter: {
        name: 'Build Shelter',
        goals: [
          { id: 'find_location', name: 'Find Build Location', target: 1, current: 0, completed: false },
          { id: 'build_foundation', name: 'Build Foundation', target: 1, current: 0, completed: false },
          { id: 'build_walls', name: 'Build Walls', target: 1, current: 0, completed: false },
          { id: 'build_roof', name: 'Build Roof', target: 1, current: 0, completed: false },
          { id: 'add_door', name: 'Add Door', target: 1, current: 0, completed: false },
          { id: 'add_bed', name: 'Add Bed', target: 1, current: 0, completed: false },
          { id: 'add_storage', name: 'Add Storage Chests', target: 4, current: 0, completed: false }
        ],
        nextStage: 'iron_age'
      },
      iron_age: {
        name: 'Iron Age',
        goals: [
          { id: 'find_cave', name: 'Find Cave', target: 1, current: 0, completed: false },
          { id: 'mine_coal', name: 'Mine Coal', target: 32, current: 0, completed: false },
          { id: 'craft_furnace', name: 'Craft Furnace', target: 1, current: 0, completed: false },
          { id: 'mine_iron', name: 'Mine Iron Ore', target: 24, current: 0, completed: false },
          { id: 'smelt_iron', name: 'Smelt Iron Ingots', target: 24, current: 0, completed: false },
          { id: 'craft_iron_armor', name: 'Craft Iron Armor Set', target: 4, current: 0, completed: false },
          { id: 'craft_iron_tools', name: 'Craft Iron Tools', target: 5, current: 0, completed: false }
        ],
        nextStage: 'diamond'
      },
      diamond: {
        name: 'Diamond Hunting',
        goals: [
          { id: 'mine_deep', name: 'Mine to Y-Level -54', target: 1, current: 0, completed: false },
          { id: 'find_diamonds', name: 'Find Diamonds', target: 8, current: 0, completed: false },
          { id: 'craft_diamond_pickaxe', name: 'Craft Diamond Pickaxe', target: 1, current: 0, completed: false },
          { id: 'mine_obsidian', name: 'Mine Obsidian', target: 14, current: 0, completed: false },
          { id: 'enchanting_setup', name: 'Build Enchanting Table', target: 1, current: 0, completed: false }
        ],
        nextStage: 'nether'
      },
      nether: {
        name: 'Nether Expedition',
        goals: [
          { id: 'build_nether_portal', name: 'Build Nether Portal', target: 1, current: 0, completed: false },
          { id: 'enter_nether', name: 'Enter The Nether', target: 1, current: 0, completed: false },
          { id: 'find_fortress', name: 'Find Nether Fortress', target: 1, current: 0, completed: false },
          { id: 'collect_blaze_rods', name: 'Collect Blaze Rods', target: 10, current: 0, completed: false },
          { id: 'collect_ender_pearls', name: 'Collect Ender Pearls', target: 12, current: 0, completed: false },
          { id: 'craft_eyes_of_ender', name: 'Craft Eyes of Ender', target: 12, current: 0, completed: false }
        ],
        nextStage: 'stronghold'
      },
      stronghold: {
        name: 'Stronghold Hunt',
        goals: [
          { id: 'locate_stronghold', name: 'Locate Stronghold', target: 1, current: 0, completed: false },
          { id: 'prepare_equipment', name: 'Prepare Full Equipment', target: 1, current: 0, completed: false },
          { id: 'gather_supplies', name: 'Gather Food & Supplies', target: 64, current: 0, completed: false },
          { id: 'activate_end_portal', name: 'Activate End Portal', target: 1, current: 0, completed: false }
        ],
        nextStage: 'end_dragon'
      },
      end_dragon: {
        name: 'Defeat Ender Dragon',
        goals: [
          { id: 'enter_end', name: 'Enter The End', target: 1, current: 0, completed: false },
          { id: 'destroy_crystals', name: 'Destroy End Crystals', target: 10, current: 0, completed: false },
          { id: 'defeat_dragon', name: 'Defeat Ender Dragon', target: 1, current: 0, completed: false }
        ],
        nextStage: 'post_game'
      },
      post_game: {
        name: 'Post-Game Activities',
        goals: [
          { id: 'build_mega_base', name: 'Build Mega Base', target: 1, current: 0, completed: false },
          { id: 'automate_farms', name: 'Build Automated Farms', target: 5, current: 0, completed: false },
          { id: 'explore_end_cities', name: 'Explore End Cities', target: 3, current: 0, completed: false },
          { id: 'max_enchantments', name: 'Get Max Enchantments', target: 1, current: 0, completed: false }
        ],
        nextStage: null
      }
    };
    
    this.currentStage = 'early_game';
    this.completedStages = [];
    this.achievements = [];
    
    this._loadProgress();
  }
  
  _loadProgress() {
    const savedState = this.stateManager.getState();
    if (savedState.minecraftProgression) {
      this.currentStage = savedState.minecraftProgression.currentStage || 'early_game';
      this.completedStages = savedState.minecraftProgression.completedStages || [];
      this.achievements = savedState.minecraftProgression.achievements || [];
      
      if (savedState.minecraftProgression.stages) {
        for (const [stageName, stageData] of Object.entries(savedState.minecraftProgression.stages)) {
          if (this.stages[stageName]) {
            this.stages[stageName].goals.forEach((goal, index) => {
              if (stageData.goals[index]) {
                goal.current = stageData.goals[index].current || 0;
                goal.completed = stageData.goals[index].completed || false;
              }
            });
          }
        }
      }
      
      this.logger.info(`[Minecraft Progression] Loaded progress - Stage: ${this.currentStage}, Completed Stages: ${this.completedStages.length}`);
    }
  }
  
  _saveProgress() {
    this.stateManager.setWorkProgress('minecraftProgression', {
      currentStage: this.currentStage,
      completedStages: this.completedStages,
      achievements: this.achievements,
      stages: this.stages
    });
  }
  
  updateGoal(stageId, goalId, increment = 1) {
    const stage = this.stages[stageId];
    if (!stage) return false;
    
    const goal = stage.goals.find(g => g.id === goalId);
    if (!goal || goal.completed) return false;
    
    goal.current = Math.min(goal.current + increment, goal.target);
    
    if (goal.current >= goal.target) {
      goal.completed = true;
      this.logger.info(`[Minecraft Progression] ✓ Completed: ${goal.name}`);
      this.achievements.push({
        name: goal.name,
        timestamp: Date.now()
      });
      
      this._checkStageCompletion(stageId);
    }
    
    this._saveProgress();
    return true;
  }
  
  _checkStageCompletion(stageId) {
    const stage = this.stages[stageId];
    const allCompleted = stage.goals.every(g => g.completed);
    
    if (allCompleted && !this.completedStages.includes(stageId)) {
      this.completedStages.push(stageId);
      this.logger.info(`[Minecraft Progression] 🎉 STAGE COMPLETED: ${stage.name}`);
      
      if (stage.nextStage) {
        this.currentStage = stage.nextStage;
        this.logger.info(`[Minecraft Progression] → Advanced to: ${this.stages[stage.nextStage].name}`);
      }
      
      this._saveProgress();
    }
  }
  
  getCurrentGoals() {
    return this.stages[this.currentStage].goals.filter(g => !g.completed);
  }
  
  getNextGoal() {
    const currentGoals = this.getCurrentGoals();
    if (currentGoals.length === 0) return null;
    
    return currentGoals[0];
  }
  
  getProgress() {
    const totalStages = Object.keys(this.stages).length;
    const completedCount = this.completedStages.length;
    const currentStageProgress = this._getStageProgress(this.currentStage);
    
    return {
      currentStage: this.currentStage,
      currentStageName: this.stages[this.currentStage].name,
      currentStageProgress: currentStageProgress,
      completedStages: this.completedStages,
      totalStages: totalStages,
      overallProgress: Math.round(((completedCount + currentStageProgress) / totalStages) * 100),
      nextGoal: this.getNextGoal(),
      achievements: this.achievements.slice(-10),
      stages: this.stages
    };
  }
  
  _getStageProgress(stageId) {
    const stage = this.stages[stageId];
    const completed = stage.goals.filter(g => g.completed).length;
    const total = stage.goals.length;
    return total > 0 ? completed / total : 0;
  }
  
  getStageForActivity(activity) {
    switch (activity) {
      case 'gather_wood':
      case 'mine_stone':
        return 'early_game';
      case 'build_home':
      case 'build_shelter':
        return 'shelter';
      case 'mine_iron':
      case 'mine_coal':
        return 'iron_age';
      case 'mine_diamonds':
        return 'diamond';
      case 'nether_exploration':
        return 'nether';
      case 'find_stronghold':
        return 'stronghold';
      case 'fight_dragon':
        return 'end_dragon';
      default:
        return this.currentStage;
    }
  }
}

module.exports = MinecraftProgressionSystem;
