class RevengeSystem {
  constructor(bot, logger, config) {
    this.bot = bot;
    this.logger = logger;
    this.config = config;
    
    this.revengeTarget = null;
    this.revengeEnabled = config.combat?.revengeEnabled !== false;
    this.revengeDelay = config.combat?.revengeDelay || 2000;
    this.lastKiller = null;
    this.killHistory = new Map();
    this.maxHistory = 10;
  }

  setKiller(username) {
    if (!this.revengeEnabled) return;
    
    this.lastKiller = username;
    this.revengeTarget = username;
    
    this.killHistory.set(username, Date.now());
    
    if (this.killHistory.size > this.maxHistory) {
      const oldest = this.killHistory.keys().next().value;
      this.killHistory.delete(oldest);
    }
    
    this.logger.info(`Revenge target set: ${username}`);
  }

  getRevengeTarget() {
    return this.revengeTarget;
  }

  shouldSeekRevenge() {
    if (!this.revengeTarget || !this.revengeEnabled) return false;
    
    const players = this.bot.players;
    return this.revengeTarget in players && players[this.revengeTarget].entity;
  }

  cancelRevenge() {
    this.revengeTarget = null;
  }

  getTopAttacker() {
    let topAttacker = null;
    let topKills = 0;
    
    for (const [username, time] of this.killHistory) {
      let kills = 0;
      for (const [, t] of this.killHistory) {
        if (t === username) kills++;
      }
      if (kills > topKills) {
        topKills = kills;
        topAttacker = username;
      }
    }
    
    return topAttacker;
  }

  clearHistory() {
    this.killHistory.clear();
    this.revengeTarget = null;
    this.lastKiller = null;
  }
}

module.exports = RevengeSystem;