class FollowSystem {
  constructor(bot, logger, config, targetManager) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    this.targetManager = targetManager;
    
    this.following = false;
    this.followInterval = null;
    
    this.owner = config.owner?.username || 'Player';
    this.followDistance = config.owner?.followDistance || 3;
    this.protectEnabled = config.owner?.protectEnabled !== false;
    
    this.currentYaw = 0;
    this.states = ['idle', 'following', 'guarding', 'returning'];
    this.currentState = 'idle';
  }

  start() {
    if (this.protectEnabled) {
      this.following = true;
      this.currentState = 'guarding';
      
      this.followInterval = setInterval(() => {
        this._followLoop();
      }, 500);
      
      this.logger.info(`Follow system started - protecting ${this.owner}`);
    }
  }

  stop() {
    this.following = false;
    this.currentState = 'idle';
    
    if (this.followInterval) {
      clearInterval(this.followInterval);
      this.followInterval = null;
    }
    
    this.bot.clearControlStates();
  }

  _followLoop() {
    if (!this.following || !this.bot.entity) return;
    
    if (this.targetManager.hasTarget()) {
      this.currentState = 'guarding';
      return;
    }
    
    const ownerEntity = this._findOwner();
    
    if (!ownerEntity) {
      this._findOwnerOnline();
      return;
    }
    
    const distance = this.bot.entity.position.distanceTo(ownerEntity.position);
    
    if (distance > this.followDistance) {
      this._moveToward(ownerEntity);
      this.currentState = 'following';
    } else {
      this.currentState = 'guarding';
      this.bot.clearControlStates();
    }
  }

  _findOwner() {
    const players = this.bot.players;
    const owner = players[this.owner];
    
    return owner && owner.entity ? owner.entity : null;
  }

  _findOwnerOnline() {
    const players = this.bot.players;
    if (!players) return;
    
    try {
      for (const [username, player] of Object.entries(players)) {
        if (player && player.entity && username === this.owner) {
          return;
        }
      }
    } catch(e) {}
    
    if (this.bot.entity) {
      this.currentState = 'returning';
    }
  }

  _moveToward(targetEntity) {
    const pos = targetEntity.position;
    const targetPos = pos.offset(0, 0, 0);
    
    this.bot.lookAt(targetPos, true);
    
    const direction = targetPos.minus(this.bot.entity.position);
    const dx = direction.x;
    const dz = direction.z;
    
    const angle = Math.atan2(dz, dx);
    
    let moveX = 0;
    let moveZ = 0;
    
    if (Math.abs(dx) > 1) {
      moveX = dx > 0 ? 1 : -1;
    }
    if (Math.abs(dz) > 1) {
      moveZ = dz > 0 ? 1 : -1;
    }
    
    this.bot.setControlState('forward', true);
  }

  follow() {
    this.following = true;
    this.logger.info('Following enabled');
  }

  stopFollow() {
    this.stop();
    this.logger.info('Following stopped');
  }

  isFollowing() {
    return this.following;
  }

  getState() {
    return this.currentState;
  }

  getOwner() {
    return this.owner;
  }
}

module.exports = FollowSystem;