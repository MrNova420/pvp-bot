class CommandHandler {
  constructor(bot, engine, logger) {
    this.bot = bot;
    this.engine = engine;
    this.logger = logger;
    this.prefix = '!';
    this.commands = new Map();
    
    this._registerDefaultCommands();
  }
  
  _registerDefaultCommands() {
    this.registerCommand('help', {
      description: 'Show all available commands',
      usage: '!help [command]',
      execute: (args, sender) => {
        if (args.length > 0) {
          const cmd = this.commands.get(args[0]);
          if (cmd) {
            return `${this.prefix}${args[0]}: ${cmd.description}\nUsage: ${cmd.usage}`;
          }
          return `Command '${args[0]}' not found`;
        }
        
        const cmdList = Array.from(this.commands.keys()).join(', ');
        return `Available commands: ${cmdList}. Use !help <command> for details`;
      }
    });
    
    this.registerCommand('mode', {
      description: 'Switch bot mode (afk/player)',
      usage: '!mode <afk|player>',
      execute: (args) => {
        if (args.length === 0) {
          return `Current mode: ${this.engine.currentMode}`;
        }
        
        const mode = args[0].toLowerCase();
        if (mode !== 'afk' && mode !== 'player') {
          return 'Invalid mode. Use: afk or player';
        }
        
        this.engine.switchMode(mode);
        return `Switching to ${mode} mode...`;
      }
    });
    
    this.registerCommand('status', {
      description: 'Show bot status',
      usage: '!status',
      execute: () => {
        const health = this.bot.health || 0;
        const food = this.bot.food || 0;
        const pos = this.bot.entity?.position;
        const posStr = pos ? `(${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)})` : 'Unknown';
        
        return `Health: ${health}/20 | Food: ${food}/20 | Position: ${posStr} | Mode: ${this.engine.currentMode}`;
      }
    });
    
    this.registerCommand('come', {
      description: 'Make bot come to you',
      usage: '!come',
      execute: (args, sender) => {
        const player = this.bot.players[sender];
        if (!player || !player.entity) {
          return 'Cannot see you';
        }
        
        const pathfinder = this.engine.addons.get('pathfinding');
        if (pathfinder && pathfinder.enabled) {
          pathfinder.goToPlayer(sender);
          return `Coming to ${sender}!`;
        }
        return 'Pathfinding not available';
      }
    });
    
    this.registerCommand('follow', {
      description: 'Follow a player',
      usage: '!follow [player]',
      execute: (args, sender) => {
        const target = args[0] || sender;
        const player = this.bot.players[target];
        
        if (!player || !player.entity) {
          return `Cannot find ${target}`;
        }
        
        const pathfinder = this.engine.addons.get('pathfinding');
        if (pathfinder && pathfinder.enabled) {
          pathfinder.followPlayer(target);
          return `Following ${target}!`;
        }
        return 'Pathfinding not available';
      }
    });
    
    this.registerCommand('stop', {
      description: 'Stop current action',
      usage: '!stop',
      execute: () => {
        const pathfinder = this.engine.addons.get('pathfinding');
        if (pathfinder && pathfinder.enabled) {
          pathfinder.stop();
        }
        
        this.bot.clearControlStates();
        return 'Stopped!';
      }
    });
    
    this.registerCommand('mine', {
      description: 'Mine specific block type',
      usage: '!mine <block>',
      execute: (args) => {
        if (args.length === 0) {
          return 'Specify a block type to mine';
        }
        
        const mining = this.engine.addons.get('mining');
        if (mining && mining.enabled) {
          mining.mineBlock(args[0]);
          return `Mining ${args[0]}...`;
        }
        return 'Mining not available';
      }
    });
    
    this.registerCommand('build', {
      description: 'Build a structure',
      usage: '!build <house|tower|wall>',
      execute: (args) => {
        if (args.length === 0) {
          return 'Specify structure: house, tower, or wall';
        }
        
        const building = this.engine.addons.get('building');
        if (building && building.enabled) {
          building.buildStructure(args[0]);
          return `Building ${args[0]}...`;
        }
        return 'Building not available';
      }
    });
    
    this.registerCommand('give', {
      description: 'Give item to player',
      usage: '!give <item> [amount] [player]',
      execute: (args, sender) => {
        if (args.length === 0) {
          return 'Specify item to give';
        }
        
        const itemName = args[0];
        const amount = parseInt(args[1]) || 1;
        const target = args[2] || sender;
        
        const item = this.bot.inventory.items().find(i => i.name.includes(itemName));
        if (!item) {
          return `I don't have ${itemName}`;
        }
        
        return `Giving ${amount} ${itemName} to ${target}...`;
      }
    });
    
    this.registerCommand('inv', {
      description: 'Show inventory summary',
      usage: '!inv',
      execute: () => {
        const items = this.bot.inventory.items();
        if (items.length === 0) {
          return 'Inventory is empty';
        }
        
        const summary = items.slice(0, 5).map(i => `${i.name}(${i.count})`).join(', ');
        const more = items.length > 5 ? `... and ${items.length - 5} more` : '';
        return `Inventory: ${summary}${more}`;
      }
    });
    
    this.registerCommand('craft', {
      description: 'Craft an item',
      usage: '!craft <item> [amount]',
      execute: (args) => {
        if (args.length === 0) {
          return 'Specify item to craft';
        }
        
        const crafting = this.engine.addons.get('crafting');
        if (crafting && crafting.enabled) {
          const amount = parseInt(args[1]) || 1;
          crafting.craftItem(args[0], amount);
          return `Crafting ${amount} ${args[0]}...`;
        }
        return 'Crafting not available';
      }
    });
    
    this.registerCommand('progress', {
      description: 'Show Minecraft progression',
      usage: '!progress',
      execute: () => {
        const playerAddon = this.engine.addons.get('player');
        if (playerAddon && playerAddon.getMinecraftProgress) {
          const progress = playerAddon.getMinecraftProgress();
          if (progress) {
            const goal = progress.nextGoal;
            return `Stage: ${progress.currentStageName} (${Math.round(progress.currentStageProgress * 100)}%) | Next: ${goal ? goal.name : 'Complete!'}`;
          }
        }
        return 'Progression not available';
      }
    });
    
    this.registerCommand('mood', {
      description: 'Show bot AI mood and status',
      usage: '!mood',
      execute: () => {
        const playerAddon = this.engine.addons.get('player');
        if (playerAddon && playerAddon.getAIStatus) {
          const ai = playerAddon.getAIStatus();
          if (ai) {
            return `Mood: ${ai.mood} | Energy: ${ai.energy}% | Activity: ${ai.currentActivity || 'idle'}`;
          }
        }
        return 'AI status not available';
      }
    });
    
    this.registerCommand('home', {
      description: 'Go home',
      usage: '!home',
      execute: () => {
        const pathfinder = this.engine.addons.get('pathfinding');
        if (pathfinder && pathfinder.enabled) {
          pathfinder.goHome();
          return 'Going home!';
        }
        return 'Pathfinding not available';
      }
    });
    
    this.registerCommand('sleep', {
      description: 'Go to sleep',
      usage: '!sleep',
      execute: async () => {
        try {
          const bed = this.bot.findBlock({
            matching: (block) => block && block.name && block.name.includes('bed'),
            maxDistance: 32
          });
          
          if (bed) {
            await this.bot.sleep(bed);
            return 'Going to sleep...';
          }
          return 'No bed found nearby';
        } catch (err) {
          return `Cannot sleep: ${err.message}`;
        }
      }
    });
  }
  
  registerCommand(name, command) {
    this.commands.set(name, command);
  }
  
  handleMessage(message, sender) {
    if (!message || !message.startsWith(this.prefix)) {
      return null;
    }
    
    const parts = message.slice(this.prefix.length).trim().split(' ');
    const cmdName = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    const command = this.commands.get(cmdName);
    if (!command) {
      return null;
    }
    
    try {
      this.logger.info(`[Command] ${sender}: ${message}`);
      const response = command.execute(args, sender);
      return response;
    } catch (err) {
      this.logger.error(`Command error: ${err.message}`);
      return `Error: ${err.message}`;
    }
  }
}

module.exports = CommandHandler;
