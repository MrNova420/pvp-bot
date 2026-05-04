class PlayerAddon {
  constructor() {
    this.name = 'player';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;
    
    this.states = ['work', 'rest', 'trade', 'social', 'explore'];
    this.currentState = 'rest';
    this.stateStartTime = 0;
    this.stateInterval = null;
    this.config = {};
    
    this.blocksThisCycle = 0;
    this.chatResponses = [
      'Hello!', 'Hi there!', 'Hey!', 'Good to see you!',
      'Need any help?', 'How are you doing?', 'Nice day!',
      'What are you working on?', 'Cool build!', 'Awesome!',
      'That looks great!', 'Need any materials?', 'I can help with that!',
      'Let me know if you need anything.', 'Happy to help!',
      'Working on a project myself.', 'Been busy gathering resources.',
      'Found some good spots nearby.', 'The server is looking good!',
      'Thanks!', 'You too!', 'Same here!', 'Definitely!',
      'Sure thing!', 'Of course!', 'No problem!', 'Anytime!'
    ];
  }
  
  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
    this.config = engine.config.playerMode || {};
    
    this._setupEventHandlers();
    
    if (engine.currentMode === 'player') {
      this.enable();
    }
  }
  
  _setupEventHandlers() {
    this.bot.on('death', () => {
      if (this.enabled) {
        this.logger.info('[Player] Died, respawning and resting...');
        setTimeout(() => {
          this.bot.respawn();
          this._setState('rest');
        }, 2000);
      }
    });
    
    this.bot.on('messagestr', (message) => {
      if (this.enabled && this.config.respondToChat) {
        this._handleChatMessage(message);
      }
    });
    
    this.bot.on('health', () => {
      if (this.enabled && this.bot.food < 16) {
        this._tryEat();
      }
    });
  }
  
  enable() {
    if (this.enabled) return;
    
    this.enabled = true;
    this.logger.info('[Player] Mode activated');
    
    this._setState('rest');
    this.stateInterval = setInterval(() => {
      this._updateState();
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
    
    this.bot.clearControlStates();
  }
  
  _setState(newState) {
    if (this.currentState === newState) return;
    
    this.logger.info(`[Player] State: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
    this.stateStartTime = Date.now();
    this.blocksThisCycle = 0;
  }
  
  _updateState() {
    if (this.engine.getSafety().isThrottled()) {
      if (this.currentState !== 'rest') {
        this._setState('rest');
      }
      return;
    }
    
    const elapsed = Date.now() - this.stateStartTime;
    const maxBlocks = this.config.maxBlocksPerCycle || 100;
    
    if (this.blocksThisCycle >= maxBlocks) {
      this._setState('rest');
      return;
    }
    
    switch (this.currentState) {
      case 'work':
        if (elapsed > (this.config.workDuration || 1800000)) {
          this._setState('rest');
        } else {
          this._doWork();
        }
        break;
        
      case 'rest':
        if (elapsed > (this.config.restDuration || 300000)) {
          const nextState = this._pickNextState();
          this._setState(nextState);
        }
        break;
        
      case 'trade':
        if (elapsed > (this.config.tradeDuration || 600000)) {
          this._setState('rest');
        } else {
          this._doTrade();
        }
        break;
        
      case 'social':
        if (elapsed > (this.config.socialDuration || 900000)) {
          this._setState('rest');
        } else {
          this._doSocial();
        }
        break;
        
      case 'explore':
        if (elapsed > (this.config.exploreDuration || 1200000)) {
          this._setState('rest');
        } else {
          this._doExplore();
        }
        break;
    }
  }
  
  _pickNextState() {
    const weights = {
      work: 0.3,
      explore: 0.25,
      social: 0.2,
      trade: 0.15,
      rest: 0.1
    };
    
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [state, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (rand < cumulative) {
        return state;
      }
    }
    
    return 'work';
  }
  
  _doWork() {
    if (!this.bot || !this.bot.entity) return;
    
    const workType = Math.random();
    
    if (workType < 0.4) {
      this._doMining();
    } else if (workType < 0.7) {
      this._doGathering();
    } else {
      this._doBuilding();
    }
  }
  
  _doMining() {
    if (!this.bot.entity) return;
    
    try {
      const Block = require('prismarine-block')(this.bot.version);
      const mcData = require('minecraft-data')(this.bot.version);
      
      const ores = ['stone', 'coal_ore', 'iron_ore', 'dirt', 'sand'];
      let targetBlock = null;
      
      for (const oreName of ores) {
        const oreType = mcData.blocksByName[oreName];
        if (oreType) {
          targetBlock = this.bot.findBlock({
            matching: oreType.id,
            maxDistance: 32
          });
          
          if (targetBlock) break;
        }
      }
      
      if (targetBlock) {
        const tool = this.bot.inventory.items().find(item => 
          item.name.includes('pickaxe') || item.name.includes('shovel')
        );
        
        if (tool) {
          this.bot.equip(tool, 'hand', (err) => {
            if (!err) {
              this.bot.dig(targetBlock, (err) => {
                if (!err) {
                  this.blocksThisCycle++;
                  this.engine.getSafety().recordBlock();
                  this.logger.debug(`[Player] Mined ${targetBlock.name}`);
                }
              });
            }
          });
        }
      }
    } catch (err) {
      this.logger.debug('[Player] Mining error:', err.message);
    }
  }
  
  _doGathering() {
    if (!this.bot.entity) return;
    
    try {
      const mcData = require('minecraft-data')(this.bot.version);
      const gatherables = ['oak_log', 'birch_log', 'wheat', 'carrots', 'potatoes'];
      
      for (const itemName of gatherables) {
        const itemType = mcData.blocksByName[itemName];
        if (itemType) {
          const block = this.bot.findBlock({
            matching: itemType.id,
            maxDistance: 16
          });
          
          if (block) {
            this.bot.dig(block, (err) => {
              if (!err) {
                this.blocksThisCycle++;
                this.engine.getSafety().recordBlock();
                this.logger.debug(`[Player] Gathered ${block.name}`);
              }
            });
            break;
          }
        }
      }
    } catch (err) {
      this.logger.debug('[Player] Gathering error:', err.message);
    }
  }
  
  _doBuilding() {
    this.logger.debug('[Player] Building activity (placeholder)');
  }
  
  _doTrade() {
    this.logger.debug('[Player] Trading activity');
  }
  
  _doSocial() {
    if (Math.random() < 0.05) {
      const message = this.chatResponses[Math.floor(Math.random() * this.chatResponses.length)];
      this.bot.chat(message);
      this.logger.debug(`[Player] Said: ${message}`);
    }
  }
  
  _doExplore() {
    if (!this.bot || !this.bot.entity) return;
    
    try {
      const pos = this.bot.entity.position;
      const dx = (Math.random() - 0.5) * 30;
      const dz = (Math.random() - 0.5) * 30;
      
      const targetPos = pos.offset(dx, 0, dz);
      this.bot.lookAt(targetPos);
      
      this.bot.setControlState('forward', true);
      
      setTimeout(() => {
        this.bot.setControlState('forward', false);
      }, 2000);
      
      this.logger.debug('[Player] Exploring...');
    } catch (err) {
      this.logger.debug('[Player] Explore error:', err.message);
    }
  }
  
  _handleChatMessage(message) {
    const botName = this.bot.username.toLowerCase();
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes(botName) || lowerMsg.includes('anyone') || lowerMsg.includes('help')) {
      setTimeout(() => {
        const responses = [
          'I can help!',
          'What do you need?',
          'Sure, what can I do for you?',
          'Happy to assist!',
          'Let me know what you need!'
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        this.bot.chat(response);
        this.logger.info(`[Player] Responded to chat: ${response}`);
      }, 1000 + Math.random() * 2000);
    }
  }
  
  _tryEat() {
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
          item.name.includes('potato')
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
  
  cleanup() {
    this.disable();
  }
}

module.exports = new PlayerAddon();
