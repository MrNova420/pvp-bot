class A1BotAddon {
  constructor() {
    this.name = 'a1-bot';
    this.bot = null;
    this.engine = null;
    this.logger = null;
    this.enabled = false;
    this.following = false;
    this.master = null;
    this.pathfinder = null;
  }

  init(bot, engine) {
    this.bot = bot;
    this.engine = engine;
    this.logger = engine.getLogger();
    this.master = engine.getMaster();
    this.pathfinder = engine.addons.get('pathfinding');

    this.bot.on('spawn', () => {
      if (this.enabled && this.following && this.master) {
        this.startFollowing();
      }
    });

    this.bot.on('chat', (username, message) => {
      if (!this.enabled || !this.isMaster(username)) return;
      
      const cmd = message.toLowerCase().trim();
      
      if (cmd.startsWith('!follow')) {
        this.startFollowing();
      } else if (cmd.startsWith('!stop') || cmd === '!stay') {
        this.stopFollowing();
      }
    });
  }

  isMaster(username) {
    return this.master && username.toLowerCase() === this.master.toLowerCase();
  }

  startFollowing() {
    if (!this.master) return;
    
    this.following = true;
    this.bot.chat('On my way');
    
    if (this.pathfinder) {
      this.pathfinder.followPlayer(this.master);
    }
  }

  stopFollowing() {
    this.following = false;
    
    if (this.pathfinder) {
      this.pathfinder.stop();
    }
  }

  enable() {
    if (this.enabled) return;
    this.enabled = true;
    this.master = this.engine?.getMaster() || this.master;
  }

  disable() {
    this.stopFollowing();
    this.enabled = false;
  }

  cleanup() {
    this.stopFollowing();
    this.bot = null;
    this.engine = null;
    this.logger = null;
  }
}

module.exports = A1BotAddon;