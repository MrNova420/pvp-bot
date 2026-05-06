class EnhancedSoldierAddon {
  constructor() {
    this.name = 'soldier'; // Name of the addon, used for mode switching
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;

    // Soldier-specific states
    this.states = ['idle', 'following', 'guarding', 'attacking', 'gathering', 'building', 'fleeing', 'patrolling', 'commanded_task'];
    this.currentState = 'idle';
    this.currentTask = null; // The task currently being executed or targeted
    this.currentTarget = null; // e.g., entity to attack, player to follow, location to guard/go to
    this.commandPrefix = '!soldier'; // Prefix for soldier commands

    // Dependencies from BotEngine or other addons
    this.commandHandler = null;
    this.taskManager = null;
    this.actionExecutor = null;
    this.botIntelligence = null;
    this.pathfinder = null; // For navigation
  }

  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
    this.commandHandler = engine.commandHandler;
    this.taskManager = engine.getTaskManager();
    this.pathfinder = bot.pathfinder; // Assuming bot has pathfinder attached

    // Access other core systems/addons
    // These might be directly from bot, engine, or other addons
    this.actionExecutor = engine.getAddon('player')?.actionExecutor; // Assuming player addon provides action executor
    this.botIntelligence = engine.getAddon('player')?.botIntelligence; // Assuming player addon provides bot intelligence

    if (!this.actionExecutor) {
      this.logger.warn('[Soldier] ActionExecutor not found. Some actions may fail.');
    }
    if (!this.botIntelligence) {
      this.logger.warn('[Soldier] BotIntelligence not found. AI decision making might be limited.');
    }
    if (!this.pathfinder) {
        this.logger.warn('[Soldier] Pathfinder not found. Navigation may be limited.');
    }

    this._registerCommands();
    this._setupEventListeners();

    this.logger.info('Soldier addon initialized.');

    // Enable addon if the current mode is already 'soldier'
    if (engine.currentMode === this.name) {
      setTimeout(() => {
        this.enable();
      }, 1000);
    }
  }

  _registerCommands() {
    if (!this.commandHandler) {
      this.logger.error('[Soldier] CommandHandler not available. Cannot register commands.');
      return;
    }
    
    this.commandHandler.registerCommand(this.commandPrefix, (username, args) => {
      const action = args[0]?.toLowerCase();
      const params = args.slice(1);
      return this.handleCommand(username, action, params);
    });
    this.logger.info(`Registered soldier commands with prefix: ${this.commandPrefix}`);
  }

  _setupEventListeners() {
    // Listen for events from engine or other addons if needed
    // e.g., engine.on('target_acquired', ...) for combat, or events from TaskManager
  }

  enable() {
    if (this.enabled) return;
    
    if (!this.bot || !this.bot.entity) {
      this.logger.warn('[Soldier] Cannot enable - bot not connected');
      return;
    }
    
    this.enabled = true;
    this.logger.info('[Soldier] Mode activated.');
    this._setState('idle');
    // Ensure tasks can be processed when enabled
    if (this.taskManager) {
      this.taskManager.resume(); 
    }
  }

  disable() {
    if (!this.enabled) return;

    this.enabled = false;
    this.logger.info('[Soldier] Mode deactivated.');
    // Pause tasks when disabling the addon
    if (this.taskManager) {
      this.taskManager.pause(); 
    }
    this._setState('idle');
    this.currentTarget = null;
    // Stop any current bot actions
    if (this.bot) {
      this.bot.clearControlStates();
    }
  }

  handleCommand(username, action, params) {
    if (!this.enabled) {
      return `Soldier mode is not active.`;
    }

    this.logger.info(`[Soldier] Received command: ${action} with params: ${params.join(' ')} from ${username}`);

    let response = `Unknown soldier command: ${action}`;

    switch (action) {
      case 'follow':
        response = this._followCommand(username, params);
        break;
      case 'guard':
        response = this._guardCommand(username, params);
        break;
      case 'attack':
        response = this._attackCommand(username, params);
        break;
      case 'gather':
        response = this._gatherCommand(username, params);
        break;
      case 'build':
        response = this._buildCommand(username, params);
        break;
      case 'go':
        response = this._goCommand(username, params);
        break;
      case 'patrol':
        response = this._patrolCommand(username, params);
        break;
      case 'status':
        response = this._statusCommand(username, params);
        break;
      case 'flee':
        response = this._fleeCommand(username, params);
        break;
      case 'stop':
        response = this._stopCommand(username, params);
        break;
      case 'help':
        response = this._helpCommand();
        break;
      default:
        response = `Unknown soldier action: ${action}. Try !soldier help`;
    }
    return response;
  }

  _followCommand(username, params) {
    const targetPlayerName = params[0];
    if (!targetPlayerName) {
      return 'Please specify a player to follow.';
    }
    this.logger.info(`Command: follow ${targetPlayerName}`);
    this.taskManager.pushTask({
      type: 'follow_player',
      targetPlayerName: targetPlayerName,
      requester: username,
      priority: 5 // Medium priority
    });
    this._setState('following');
    this.currentTarget = { type: 'player', name: targetPlayerName };
    return `Following ${targetPlayerName}.`;
  }

  _guardCommand(username, params) {
    const target = params.join(' '); // Can be player name or coordinates
    if (!target) {
      return 'Please specify a location (x,y,z) or player to guard.';
    }
    this.logger.info(`Command: guard ${target}`);
    this.taskManager.pushTask({
      type: 'guard_location',
      target: target, // Store raw target for interpretation later
      requester: username,
      priority: 5
    });
    this._setState('guarding');
    this.currentTarget = { type: 'guard', target: target };
    return `Guarding ${target}.`;
  }

  async _attackCommand(username, params) {
    const targetName = params.join(' '); // Allow entity names with spaces
    if (!targetName) {
      return 'Please specify an entity to attack.';
    }
    this.logger.info(`Command: attack ${targetName}`);
    // Directly trigger attack behavior or queue a task
    // For simplicity, let's queue a task that the bot intelligence can pick up
    this.taskManager.pushTask({
      type: 'attack_entity',
      targetName: targetName,
      requester: username,
      priority: 8 // High priority
    });
    this._setState('attacking');
    this.currentTarget = { type: 'entity', name: targetName };
    return `Attacking ${targetName}.`;
  }

  async _gatherCommand(username, params) {
    const resourceType = params[0];
    const amount = parseInt(params[1]) || 10; // Default to 10 if amount not specified
    if (!resourceType) {
      return 'Please specify a resource type to gather (e.g., wood, stone, coal).';
    }
    this.logger.info(`Command: gather ${resourceType} ${amount}`);
    this.taskManager.pushTask({
      type: 'gather_resource',
      resource: resourceType,
      amount: amount,
      requester: username,
      priority: 6
    });
    this._setState('gathering');
    this.currentTarget = { type: 'resource', resource: resourceType, amount: amount };
    return `Gathering ${amount} ${resourceType}.`;
  }

  async _buildCommand(username, params) {
    const structureType = params[0];
    const location = params.slice(1).join(' '); // Can be coordinates or player name
    if (!structureType) {
      return 'Please specify a structure type to build (e.g., house, furnace).';
    }
    this.logger.info(`Command: build ${structureType} ${location || 'here'}`);
    this.taskManager.pushTask({
      type: 'build_structure',
      structureType: structureType,
      location: location,
      requester: username,
      priority: 7
    });
    this._setState('building');
    this.currentTarget = { type: 'structure', structure: structureType, location: location };
    return `Building ${structureType}${location ? ` at ${location}` : ''}.`;
  }

  async _goCommand(username, params) {
    const coords = params.map(Number).filter(n => !isNaN(n));
    if (coords.length < 2 || coords.length > 3) {
      return 'Please provide coordinates in the format x, y, z (e.g., !soldier go 100 64 -200)';
    }
    const [x, y, z] = coords;
    this.logger.info(`Command: go to ${x}, ${y}, ${z}`);
    this.taskManager.pushTask({
      type: 'move_to_location',
      position: { x, y: y || this.bot.entity.position.y, z }, // Use provided y or current y
      requester: username,
      priority: 5
    });
    this._setState('following'); // Or a dedicated 'moving' state
    this.currentTarget = { type: 'location', position: { x, y: y || this.bot.entity.position.y, z } };
    return `Moving to ${x}, ${y}, ${z}.`;
  }

  _patrolCommand(username, params) {
    const areaDefinition = params.join(' '); // e.g., 'around player 10' or 'from x1 y1 z1 to x2 y2 z2'
    if (!areaDefinition) {
      return 'Please define an area to patrol.';
    }
    this.logger.info(`Command: patrol ${areaDefinition}`);
    this.taskManager.pushTask({
      type: 'patrol_area',
      area: areaDefinition,
      requester: username,
      priority: 4
    });
    this._setState('patrolling');
    this.currentTarget = { type: 'patrol', area: areaDefinition };
    return `Patrolling area: ${areaDefinition}.`;
  }

  _statusCommand(username, params) {
    this.logger.info('Command: status');
    let statusMessage = `Soldier Status:
`;
    statusMessage += `  Current State: ${this.currentState}
`;
    statusMessage += `  Current Task: ${this.taskManager.getCurrentTask()?.type || 'None'}
`;
    if (this.currentTarget) {
      statusMessage += `  Current Target: ${JSON.stringify(this.currentTarget)}
`;
    }
    statusMessage += `  Health: ${this.bot.health}/20
`;
    statusMessage += `  Food: ${this.bot.food}/20
`;
    statusMessage += `  Addon Enabled: ${this.enabled}`;

    return statusMessage;
  }

  async _fleeCommand(username, params) {
    this.logger.info('Command: flee');
    // Directly trigger fleeing behavior
    // Ensure ActionExecutor._flee() is available and called, or trigger BotIntelligence's seekSafety
    if (this.actionExecutor && typeof this.actionExecutor._flee === 'function') {
        await this.actionExecutor._flee();
    } else if (this.botIntelligence && typeof this.botIntelligence._seekSafety === 'function') {
        await this.botIntelligence._seekSafety();
    } else {
        this.logger.warn("Cannot execute flee command: Underlying flee/seekSafety mechanism not available.");
        return "Flee command failed: no underlying mechanism found.";
    }
    this._setState('fleeing');
    this.currentTarget = { type: 'flee' };
    return 'Fleeing immediately!';
  }

  _stopCommand(username, params) {
    this.logger.info('Command: stop');
    this.taskManager.clearQueue();
    this.taskManager.pause(); // Pause the task manager
    this._setState('idle');
    this.currentTarget = null;
    // Stop any current bot actions
    if (this.bot) {
        this.bot.clearControlStates();
    }
    return 'Stopped all tasks. Soldier is now idle.';
  }
  
  _helpCommand() {
    return `Available soldier commands: follow, guard, attack, gather, build, go, patrol, status, flee, stop, help.
    Example: !soldier follow PlayerName`;
  }

  _setState(newState) {
    if (this.currentState === newState) return;
    this.logger.info(`[Soldier] State: ${this.currentState} -> ${newState}`);
    this.currentState = newState;
    // Potentially trigger specific logic based on state change
  }

  cleanup() {
    this.disable();
    // Potentially unregister commands from CommandHandler if possible, or ensure intervals are cleared.
  }
}

module.exports = new EnhancedSoldierAddon();
