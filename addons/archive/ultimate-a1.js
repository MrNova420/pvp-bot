class UltimateA1BotAddon {
  constructor() {
    this.name = 'a1-bot';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;
    
    // Mode
    this.mode = 'follow'; // follow, combat, crystal, pvpr, pvpe, survival
    
    // Master
    this.master = null;
    this.masterEntity = null;
    
    // Following
    this.following = false;
    this.followDistance = 3;
    
    // Combat system
    this.target = null;
    this.targetEntity = null;
    this.attackRange = 4;
    this.combatEnabled = false;
    
    // Crystal PVP
    this.crystalMode = false;
    this.crystalHotbar = 9; // slot for crystals
    this.crystalPlaceDelay = 500;
    this.lastCrystalTime = 0;
    
    // Auto attack
    this.autoAttack = false;
    this.attackCooldown = 0;
    
    // Movement
    this.pathfinder = null;
    this.goals = null;
    this.lastJumpTime = 0;
  }

  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.master = engine.getMaster();
    this.logger = engine.getLogger();

    this.setupPathfinder();
    this.setupEventListeners();
    
    this.logger.info('[Ultimate A1] Initialized - Ultimate PVP System Ready');
  }

  setupPathfinder() {
    try {
      const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
      this.bot.loadPlugin(pathfinder);
      this.goals = goals;
      
      const mcData = require('minecraft-data')(this.bot.version);
      const movements = new Movements(this.bot, mcData, {
        canOpenDoors: true,
        canBreakDoors: true,
        canDig: true,
        avoidWater: false,
        swimUpwards: true
      });
      
      this.bot.pathfinder.setMovements(movements);
      
      this.logger.info('[Ultimate A1] Pathfinding ready');
    } catch (err) {
      this.logger.error('[Ultimate A1] Pathfinding failed:', err.message);
    }
  }

  setupEventListeners() {
    // Chat commands from master
    this.bot.on('chat', (username, message) => {
      if (!this.isMaster(username)) return;
      
      const cmd = message.toLowerCase().trim();
      
      // Movement commands
      if (cmd.startsWith('!follow')) this.setMode('follow');
      else if (cmd.startsWith('!stop')) this.stopAll();
      else if (cmd === '!stay') this.setMode('idle');
      
      // Combat modes
      else if (cmd.startsWith('!pvp') || cmd.startsWith('!kill')) this.setMode('combat');
      else if (cmd.startsWith('!crystal')) this.setMode('crystal');
      else if (cmd.startsWith('!pvm')) this.setMode('pvm'); // player vs mob
      else if (cmd.startsWith('!pve')) this.setMode('pve'); // player vs environment
      
      // Actions
      else if (cmd === '!attack') this.autoAttack = !this.autoAttack;
      else if (cmd === '!help') this.showHelp();
    });

    // Auto attack tick
    this.bot.on('physicsTick', () => this.update());
  }

  isMaster(username) {
    return this.master && username.toLowerCase() === this.master.toLowerCase();
  }

  setMode(newMode) {
    this.mode = newMode;
    this.bot?.chat(`Mode: ${newMode}`);
    this.logger.info(`[Ultimate A1] Mode set to: ${newMode}`);
  }

  stopAll() {
    this.following = false;
    this.combatEnabled = false;
    this.crystalMode = false;
    this.autoAttack = false;
    this.target = null;
    
    if (this.bot?.pathfinder) {
      this.bot.pathfinder.setGoal(null);
    }
    this.bot?.clearControlStates();
  }

  showHelp() {
    this.bot.chat('Commands: !follow, !stop, !pvp, !crystal, !pvm, !pve, !attack, !help');
  }

  update() {
    if (!this.enabled || !this.bot?.entity) return;
    
    const now = Date.now();
    
    // Update master position
    if (this.master) {
      const player = this.bot.players[this.master];
      if (player?.entity) {
        this.masterEntity = player.entity;
      }
    }
    
    // Mode-specific behavior
    switch(this.mode) {
      case 'follow':
        this.doFollow();
        break;
      case 'combat':
        this.doCombat();
        break;
      case 'crystal':
        this.doCrystalPVP();
        break;
      case 'pvm':
      case 'pve':
        this.doPVEMode();
        break;
    }
  }

  doFollow() {
    if (!this.masterEntity) return;
    
    const dist = this.bot.entity.position.distanceTo(this.masterEntity.position);
    const now = Date.now();
    
    // Use pathfinder for smart following
    if (dist > this.followDistance && !this.following) {
      const goal = new this.goals.GoalFollow(this.masterEntity.position, this.followDistance);
      this.bot.pathfinder.setGoal(goal, true);
      this.following = true;
    }
    
    // Add pro jump-sprint
    if (dist > 3 && this.bot.onGround && now - this.lastJumpTime > 150) {
      this.bot.setControlState('jump', true);
      this.lastJumpTime = now;
    }
    
    if (dist > 2) {
      this.bot.setControlState('sprint', true);
    }
  }

  doCombat() {
    // Find nearest enemy
    const enemy = this.findNearestEnemy();
    
    if (enemy) {
      this.targetEntity = enemy;
      const dist = this.bot.entity.position.distanceTo(enemy.position);
      
      // Move to enemy
      if (dist > this.attackRange) {
        const goal = new this.goals.GoalFollow(enemy.position, this.attackRange - 1);
        this.bot.pathfinder.setGoal(goal, true);
      } else {
        this.bot.pathfinder.setGoal(null);
      }
      
      // Attack when in range
      if (dist <= this.attackRange && now - this.attackCooldown > 500) {
        this.bot.attack(enemy);
        this.attackCooldown = now;
      }
    }
  }

  doCrystalPVP() {
    if (!this.targetEntity) {
      this.targetEntity = this.findNearestEnemy();
    }
    
    if (!this.targetEntity) return;
    
    const dist = this.bot.entity.position.distanceTo(this.targetEntity.position);
    const now = Date.now();
    
    // Stay at crystal distance (~4-6 blocks)
    if (dist > 6) {
      const goal = new this.goals.GoalFollow(this.targetEntity.position, 4);
      this.bot.pathfinder.setGoal(goal, true);
    } else if (dist < 3) {
      // Back away
      this.bot.setControlState('back', true);
      setTimeout(() => this.bot.setControlState('back', false), 200);
    }
    
    // Place crystal
    if (dist > 3 && dist < 6 && now - this.lastCrystalTime > this.crystalPlaceDelay) {
      this.placeCrystal();
      this.lastCrystalTime = now;
    }
  }

  placeCrystal() {
    const inv = this.bot.inventory;
    const crystalItem = inv.slots.find(slot => 
      slot && (slot.name.includes('crystal') || slot.name.includes('end_crystal'))
    );
    
    if (crystalItem) {
      const pos = this.bot.entity.position;
      const crystalPos = pos.offset(0, -1, 0);
      
      // Place on ground or on block
      this.bot.equip(crystalItem, 'hand');
      setTimeout(() => {
        this.bot.placeBlock(crystalPos, new this.bot.registry.Vec3(0, 1, 0));
      }, 100);
    }
  }

  doPVEMode() {
    // Hunt nearby mobs
    const mobs = this.findNearbyMobs();
    
    if (mobs.length > 0) {
      const closest = mobs[0];
      const dist = this.bot.entity.position.distanceTo(closest.position);
      
      if (dist > 2) {
        const goal = new this.goals.GoalFollow(closest.position, 1.5);
        this.bot.pathfinder.setGoal(goal, true);
      }
      
      if (dist <= 2.5 && Date.now() - this.attackCooldown > 500) {
        this.bot.attack(closest);
        this.attackCooldown = Date.now();
      }
    }
  }

  findNearestEnemy() {
    let nearest = null;
    let nearestDist = Infinity;
    
    for (const [name, player] of Object.entries(this.bot.players)) {
      if (name === this.master) continue;
      if (!player.entity) continue;
      
      const dist = this.bot.entity.position.distanceTo(player.entity.position);
      if (dist < nearestDist && dist < 20) {
        nearest = player.entity;
        nearestDist = dist;
      }
    }
    
    return nearest;
  }

  findNearbyMobs() {
    const mobs = [];
    const entity = this.bot.entity;
    
    for (const ent of Object.values(this.bot.entities)) {
      if (ent.type === 'mob' && ent.position) {
        const dist = entity.position.distanceTo(ent.position);
        if (dist < 15) {
          mobs.push(ent);
        }
      }
    }
    
    return mobs.sort((a, b) => 
      entity.position.distanceTo(a.position) - entity.position.distanceTo(b.position)
    );
  }

  async followPlayer(playerName, distance = 3) {
    this.setMode('follow');
    this.followDistance = distance;
    this.master = playerName;
    
    const player = this.bot.players[playerName];
    if (player?.entity) {
      const goal = new this.goals.GoalFollow(player.entity, distance);
      this.bot.pathfinder.setGoal(goal, true);
    }
  }

  enable() {
    this.enabled = true;
    this.logger?.info('[Ultimate A1] Enabled');
  }

  disable() {
    this.enabled = false;
    this.stopAll();
    this.logger?.info('[Ultimate A1] Disabled');
  }

  cleanup() {
    this.disable();
    this.bot = null;
    this.engine = null;
    this.logger = null;
  }
}

module.exports = UltimateA1BotAddon;