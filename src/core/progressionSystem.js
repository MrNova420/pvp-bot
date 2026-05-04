class ProgressionSystem {
  constructor(stateManager, logger) {
    this.stateManager = stateManager;
    this.logger = logger;
    
    this.goals = {
      survival: {
        gatherFood: { target: 64, current: 0, priority: 1 },
        gatherWood: { target: 128, current: 0, priority: 1 },
        findShelter: { target: 1, current: 0, priority: 1 }
      },
      building: {
        buildBase: { target: 1, current: 0, priority: 2 },
        buildFarm: { target: 1, current: 0, priority: 3 },
        buildStorage: { target: 1, current: 0, priority: 2 }
      },
      exploration: {
        exploreArea: { target: 100, current: 0, priority: 2 },
        findVillage: { target: 1, current: 0, priority: 3 },
        findCave: { target: 1, current: 0, priority: 2 }
      },
      resources: {
        mineStone: { target: 256, current: 0, priority: 1 },
        mineCoal: { target: 64, current: 0, priority: 2 },
        mineIron: { target: 32, current: 0, priority: 3 }
      },
      social: {
        helpPlayers: { target: 10, current: 0, priority: 2 },
        completeTrades: { target: 5, current: 0, priority: 3 }
      }
    };
    
    this._loadProgress();
  }
  
  _loadProgress() {
    const savedState = this.stateManager.getState();
    if (savedState.workProgress && savedState.workProgress.goals) {
      this.goals = { ...this.goals, ...savedState.workProgress.goals };
      this.logger.info('[Progression] Loaded saved goals');
    }
  }
  
  updateGoal(category, goalName, increment = 1) {
    if (this.goals[category] && this.goals[category][goalName]) {
      this.goals[category][goalName].current += increment;
      
      if (this.goals[category][goalName].current >= this.goals[category][goalName].target) {
        this.logger.info(`[Progression] Goal completed: ${category}.${goalName}`);
        this._unlockNewGoals(category, goalName);
      }
      
      this._saveProgress();
    }
  }
  
  _unlockNewGoals(category, completedGoal) {
    if (category === 'survival' && completedGoal === 'findShelter') {
      this.goals.building.buildBase.priority = 1;
    }
    
    if (category === 'resources' && completedGoal === 'mineIron') {
      this.goals.resources.mineDiamond = { target: 3, current: 0, priority: 4 };
    }
  }
  
  getCurrentGoal() {
    let highestPriority = null;
    
    for (const [category, goals] of Object.entries(this.goals)) {
      for (const [goalName, goalData] of Object.entries(goals)) {
        if (goalData.current < goalData.target) {
          if (!highestPriority || goalData.priority < highestPriority.priority) {
            highestPriority = {
              category,
              name: goalName,
              ...goalData
            };
          }
        }
      }
    }
    
    return highestPriority;
  }
  
  getProgress() {
    return this.goals;
  }
  
  _saveProgress() {
    this.stateManager.setWorkProgress('goals', this.goals);
  }
}

module.exports = ProgressionSystem;
