class EnhancedPlayerAddon {
  constructor() {
    this.name = 'player';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;
    
    this.states = ['work', 'rest', 'trade', 'social', 'explore', 'build', 'organize'];
    this.currentState = 'rest';
    this.stateStartTime = 0;
    this.stateInterval = null;
    this.activityInterval = null;
    this.config = {};
    
    this.blocksThisCycle = 0;
    this.lastActionTime = 0;
    this.recentPlayers = new Map();
    this.isPerformingAction = false;
    
    this.naturalPhrases = {
      greetings: ['Hey!', 'Hi there', 'Hello!', 'Yo', 'Sup', 'Hey everyone', 'Greetings'],
      responses: ['lol', 'nice', 'cool', 'awesome', 'thanks', 'ty', 'np', 'yeah', 'sure', 'ok'],
      questions: ['Anyone need help?', 'What are you building?', 'Need any materials?', 'Found anything cool?'],
      observations: ['This area looks nice', 'Cool builds here', 'Lots of resources nearby', 'Nice spot'],
      work: ['Working on my base', 'Gathering some materials', 'Mining for a bit', 'Organizing my stuff'],
      leaving: ['Gonna explore a bit', 'brb', 'back later', 'afk for a min'],
      mistakes: ['oops', 'whoops', 'my bad', 'lol fail']
    };
    
    this.chatCooldown = 0;
    this.lastChatTime = 0;
  }
  
  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
    this.config = engine.config.playerMode || {};
    
    const ProgressionSystem = require('../src/core/progressionSystem');
    const AutonomousGoalGenerator = require('../src/core/autonomousGoals');
    const MinecraftProgressionSystem = require('../src/core/minecraftProgression');
    const LifelikeAI = require('../src/core/lifelikeAI');
    
    this.progression = new ProgressionSystem(engine.getStateManager(), this.logger);
    this.autonomousGoals = new AutonomousGoalGenerator(bot, this.logger, this.progression);
    this.minecraftProgression = new MinecraftProgressionSystem(engine.getStateManager(), this.logger);
    this.lifelikeAI = new LifelikeAI(bot, this.logger, this.minecraftProgression);
    
    this._setupEventHandlers();
    
    if (engine.currentMode === 'player') {
      setTimeout(() => {
        this.enable();
      }, 2000);
    }
  }
  
  _setupEventHandlers() {
    this.bot.on('death', () => {
      if (this.enabled) {
        setTimeout(() => {
          try {
            this.bot.respawn();
            this._setState('rest');
          } catch (err) {
            this.logger.error('[Player] Respawn error:', err.message);
          }
        }, 2000);
      }
    });
    
    this.bot.on('health', () => {
      if (this.enabled && this.bot.food < 16) {
        this._tryEat();
      }
    });
    
    this.bot.on('chat', (username, message) => {
      if (this.enabled && username !== this.bot.username) {
        this._handleChatMessage(message, username);
      }
    });
  }
  
  enable() {
    if (this.enabled) return;
    
    if (!this.bot || !this.bot.entity) {
      this.logger.warn('[Player] Cannot enable - bot not connected');
      return;
    }
    
    this.enabled = true;
    this.logger.info('[Player] Mode activated - Bot will act like a player');
    
    this._setState('explore');
    
    this.stateInterval = setInterval(() => {
      this._updateState();
    }, 10000);
    
    this.activityInterval = setInterval(() => {
      this._performActivity();
    }, 3000);
    
    setTimeout(() => {
      if (Math.random() < 0.5) {
        this._saySomething(this._randomFrom(this.naturalPhrases.greetings));
      }
    }, 5000);
  }
  
  disable() {
    if (!this.enabled) return;
    
    this.enabled = false;
    this.logger.info('[Player] Mode deactivated');
    
    if (this.stateInterval) {
      clearInterval(this.stateInterval);
      this.stateInterval = null;
    }
    
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
    
    if (this.bot) {
      this.bot.clearControlStates();
    }
  }
  
  _setState(newState) {
    if (this.currentState === newState) return;
    
    this.logger.info(`[Player] State: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
    this.stateStartTime = Date.now();
    this.blocksThisCycle = 0;
  }
  
  _updateState() {
    if (!this.bot || !this.bot.entity || !this.enabled) return;
    
    const elapsed = Date.now() - this.stateStartTime;
    
    const stateDurations = {
      work: 120000,
      rest: 60000,
      explore: 180000,
      social: 90000
    };
    
    const duration = stateDurations[this.currentState] || 120000;
    
    if (elapsed > duration) {
      const nextState = this._pickNextState();
      this._setState(nextState);
    }
  }
  
  _pickNextState() {
    const weights = {
      rest: 0.2,
      work: 0.3,
      explore: 0.35,
      social: 0.15
    };
    
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [state, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand < cumulative) {
        return state;
      }
    }
    
    return 'explore';
  }
  
  async _performActivity() {
    if (!this.bot || !this.bot.entity || !this.enabled) return;
    if (this.isPerformingAction) return;
    
    const now = Date.now();
    if (now - this.lastActionTime < 2000) return;
    
    this.isPerformingAction = true;
    this.lastActionTime = now;
    
    try {
      if (this.bot.health < 6) {
        this._escapeFromDanger();
        return;
      }
      
      if (this.lifelikeAI && Math.random() < 0.3) {
        const aiAction = this.lifelikeAI.decideNextAction();
        if (aiAction) {
          await this._executeAIAction(aiAction);
          return;
        }
      }
      
      if (this.autonomousGoals && Math.random() < 0.4) {
        const goal = this.autonomousGoals.getNextGoal();
        if (goal) {
          this.logger.info(`[Player] Working on: ${goal.description}`);
          await this._executeGoal(goal);
          return;
        }
      }
      
      switch (this.currentState) {
        case 'work':
          await this._doWork();
          break;
        case 'rest':
          this._doRest();
          break;
        case 'explore':
          this._doExplore();
          break;
        case 'social':
          this._doSocial();
          break;
        case 'build':
          await this._doBuild();
          break;
        case 'organize':
          this._doOrganize();
          break;
      }
    } catch (err) {
      this.logger.error('[Player] Activity error:', err.message);
    } finally {
      this.isPerformingAction = false;
    }
  }
  
  async _doWork() {
    const action = Math.random();
    
    if (action < 0.6) {
      await this._mineNearbyBlock();
    } else if (action < 0.9) {
      this._walkAround();
    } else {
      this._lookAround();
    }
  }
  
  _doRest() {
    if (Math.random() < 0.6) {
      this._lookAround();
    } else {
      this._checkInventory();
    }
  }
  
  _doExplore() {
    if (Math.random() < 0.85) {
      this._walkAround();
    } else {
      this._lookAround();
    }
  }
  
  _doSocial() {
    if (Math.random() < 0.15) {
      const phrases = [...this.naturalPhrases.responses, ...this.naturalPhrases.work];
      this._saySomething(this._randomFrom(phrases));
    } else {
      this._lookAround();
    }
  }
  
  async _doBuild() {
    if (Math.random() < 0.4) {
      await this._mineNearbyBlock();
    } else {
      this._lookAround();
    }
  }
  
  _doOrganize() {
    this._checkInventory();
  }
  
  async _executeAIAction(aiAction) {
    if (!aiAction) return;
    
    this.logger.debug(`[Player] AI action: ${aiAction.action}`);
    
    switch (aiAction.action) {
      case 'chop_trees':
      case 'mine_stone':
      case 'mine':
        await this._mineNearbyBlock();
        break;
      case 'explore':
        this._walkAround();
        break;
      case 'find_food':
      case 'emergency_heal':
        this._tryEat();
        break;
      case 'rest':
        this._doRest();
        break;
      case 'interact_players':
        this._doSocial();
        break;
      default:
        this._walkAround();
    }
  }
  
  async _executeGoal(goal) {
    if (!goal) return;
    
    switch (goal.action) {
      case 'establish_home':
        // ACTUALLY BUILD A HOME - not fake it!
        try {
          const HomeBuilder = require('../src/core/homeBuilder');
          if (!this.homeBuilder) {
            this.homeBuilder = new HomeBuilder(this.bot, this.logger);
          }
          
          this.logger.info('[Player] Starting REAL home construction...');
          const success = await this.homeBuilder.buildBasicHome();
          
          if (success) {
            this.logger.info('[Player] ✅ HOME ACTUALLY BUILT!');
            if (this.autonomousGoals) {
              this.autonomousGoals.completeGoal(goal.action);
            }
          } else {
            this.logger.warn('[Player] Home building failed - will retry later');
          }
        } catch (err) {
          this.logger.error('[Player] Home build error:', err.message);
        }
        break;
        
      case 'build_storage':
      case 'expand_base':
        // For now, just gather materials
        await this._mineNearbyBlock();
        if (this.autonomousGoals) {
          setTimeout(() => this.autonomousGoals.completeGoal(goal.action), 30000);
        }
        break;
        
      case 'gather_basic_materials':
      case 'gather_wood':
        await this._mineNearbyBlock();
        break;
        
      case 'craft_tools':
        this._checkInventory();
        break;
        
      case 'find_food':
        this._tryEat();
        break;
        
      case 'explore_randomly':
      case 'explore_new_areas':
        this._walkAround();
        break;
        
      case 'interact_with_players':
        this._doSocial();
        break;
        
      default:
        await this._mineNearbyBlock();
    }
  }
  
  async _mineNearbyBlock() {
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const blockTypes = ['coal_ore', 'iron_ore', 'oak_log', 'birch_log', 'stone', 'dirt'];
      
      for (const blockName of blockTypes) {
        const blockType = mcData.blocksByName[blockName];
        if (!blockType) continue;
        
        const block = this.bot.findBlock({
          matching: blockType.id,
          maxDistance: 24
        });
        
        if (block) {
          this.logger.info(`[Player] Mining ${blockName}...`);
          
          const tool = this._getBestTool(block);
          if (tool) {
            await this.bot.equip(tool, 'hand').catch(() => {});
          }
          
          const distance = this.bot.entity.position.distanceTo(block.position);
          if (distance > 4.5) {
            this.bot.lookAt(block.position);
            this.bot.clearControlStates();
            this.bot.setControlState('forward', true);
            if (distance > 8) this.bot.setControlState('sprint', true);
            
            await new Promise(resolve => setTimeout(resolve, Math.min(distance * 250, 4000)));
            this.bot.clearControlStates();
            
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          const finalDistance = this.bot.entity.position.distanceTo(block.position);
          if (finalDistance <= 5.5) {
            await this.bot.dig(block).catch(err => {
              this.logger.debug('[Player] Dig error:', err.message);
            });
            
            this.blocksThisCycle++;
            if (this.engine.getSafety()) {
              this.engine.getSafety().recordBlock();
            }
            this.logger.info(`[Player] Successfully mined ${blockName}!`);
            
            if (Math.random() < 0.1) {
              setTimeout(() => {
                this._saySomething(this._randomFrom(['nice', 'got it', 'cool']));
              }, 500);
            }
          } else {
            this.logger.debug(`[Player] Too far from block: ${finalDistance}`);
          }
          
          break;
        }
      }
    } catch (err) {
      this.logger.debug('[Player] Mining error:', err.message);
    }
  }
  
  _walkAround() {
    if (!this.bot || !this.bot.entity) return;
    
    try {
      if (this.bot.pathfinder) {
        this.bot.pathfinder.setGoal(null);
      }
      
      const pos = this.bot.entity.position;
      const distance = 8 + Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      
      const dx = Math.cos(angle) * distance;
      const dz = Math.sin(angle) * distance;
      
      const targetPos = pos.offset(dx, 0, dz);
      this.bot.lookAt(targetPos, true);
      
      this.logger.debug('[Player] Walking around...');
      
      this.bot.clearControlStates();
      this.bot.setControlState('forward', true);
      
      if (Math.random() < 0.4) {
        this.bot.setControlState('sprint', true);
      }
      
      const walkTime = 2000 + Math.random() * 3000;
      
      setTimeout(() => {
        if (this.bot && this.enabled) {
          this.bot.clearControlStates();
          
          if (Math.random() < 0.25) {
            this.bot.setControlState('jump', true);
            setTimeout(() => {
              if (this.bot) this.bot.setControlState('jump', false);
            }, 300);
          }
        }
      }, walkTime);
      
    } catch (err) {
      this.logger.error('[Player] Walk error:', err.message);
      if (this.bot) this.bot.clearControlStates();
    }
  }
  
  _lookAround() {
    if (!this.bot || !this.bot.entity) return;
    
    try {
      const pos = this.bot.entity.position;
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 20;
      const height = Math.random() * 4 - 1;
      
      const lookPos = pos.offset(
        Math.cos(angle) * distance,
        height,
        Math.sin(angle) * distance
      );
      
      this.bot.lookAt(lookPos, true);
      this.logger.debug('[Player] Looking around');
    } catch (err) {
      this.logger.debug('[Player] Look error:', err.message);
    }
  }
  
  _checkInventory() {
    if (!this.bot) return;
    
    try {
      const items = this.bot.inventory.items();
      this.logger.debug(`[Player] Inventory check: ${items.length} items`);
    } catch (err) {
      this.logger.debug('[Player] Inventory error:', err.message);
    }
  }
  
  _escapeFromDanger() {
    if (!this.bot || !this.bot.entity) return;
    
    try {
      this.logger.warn('[Player] Low health - escaping!');
      
      if (this.bot.pathfinder) {
        this.bot.pathfinder.setGoal(null);
      }
      
      const pos = this.bot.entity.position;
      const angle = Math.random() * Math.PI * 2;
      const distance = 20;
      
      const escapePos = pos.offset(
        Math.cos(angle) * distance,
        0,
        Math.sin(angle) * distance
      );
      
      this.bot.lookAt(escapePos, true);
      this.bot.clearControlStates();
      this.bot.setControlState('forward', true);
      this.bot.setControlState('sprint', true);
      
      setTimeout(() => {
        if (this.bot && this.enabled) {
          this.bot.clearControlStates();
        }
      }, 3000);
      
      this._tryEat();
    } catch (err) {
      this.logger.error('[Player] Escape error:', err.message);
    }
  }
  
  _tryEat() {
    if (!this.bot) return;
    
    try {
      const foods = this.bot.inventory.items().filter(item => {
        return item && item.name && (
          item.name.includes('bread') ||
          item.name.includes('beef') ||
          item.name.includes('pork') ||
          item.name.includes('chicken') ||
          item.name.includes('fish') ||
          item.name.includes('apple') ||
          item.name.includes('carrot') ||
          item.name.includes('potato') ||
          item.name.includes('mutton') ||
          item.name.includes('cooked')
        );
      });
      
      if (foods.length > 0) {
        this.bot.equip(foods[0], 'hand', (err) => {
          if (!err) {
            this.bot.consume((err) => {
              if (!err) {
                this.logger.info('[Player] Ate food');
              }
            });
          }
        });
      }
    } catch (err) {
      this.logger.debug('[Player] Eat error:', err.message);
    }
  }
  
  _handleChatMessage(message, sender) {
    if (!message || !this.enabled) return;
    
    const now = Date.now();
    if (now - this.lastChatTime < this.chatCooldown) return;
    
    const lowerMsg = message.toLowerCase();
    const botName = this.bot.username.toLowerCase();
    
    const mentionsBot = lowerMsg.includes(botName);
    const isQuestion = lowerMsg.includes('?');
    
    if (mentionsBot || (isQuestion && Math.random() < 0.3)) {
      setTimeout(() => {
        if (lowerMsg.includes('help')) {
          this._saySomething('Sure, what do you need?');
        } else if (lowerMsg.includes('doing')) {
          this._saySomething(this._randomFrom(this.naturalPhrases.work));
        } else {
          this._saySomething(this._randomFrom(this.naturalPhrases.responses));
        }
      }, 1000 + Math.random() * 2000);
    }
  }
  
  _saySomething(message) {
    const now = Date.now();
    if (now - this.lastChatTime < 10000) return;
    
    try {
      this.bot.chat(message);
      this.lastChatTime = now;
      this.chatCooldown = 15000 + Math.random() * 10000;
      this.logger.debug(`[Player] Said: ${message}`);
    } catch (err) {
      this.logger.debug('[Player] Chat error:', err.message);
    }
  }
  
  _getBestTool(block) {
    if (!block || !this.bot) return null;
    
    try {
      const items = this.bot.inventory.items();
      
      if (block.name && block.name.includes('log')) {
        return items.find(item => item.name.includes('axe'));
      }
      
      if (block.name && (block.name.includes('stone') || block.name.includes('ore'))) {
        return items.find(item => item.name.includes('pickaxe'));
      }
      
      if (block.name && block.name.includes('dirt')) {
        return items.find(item => item.name.includes('shovel'));
      }
      
      return null;
    } catch (err) {
      return null;
    }
  }
  
  _randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  getMinecraftProgress() {
    if (!this.minecraftProgression) return null;
    return this.minecraftProgression.getProgress();
  }
  
  getAIStatus() {
    if (!this.lifelikeAI) return null;
    return this.lifelikeAI.getStatus();
  }
  
  cleanup() {
    this.disable();
  }
}

module.exports = new EnhancedPlayerAddon();
