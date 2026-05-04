class PlayerInteractions {
  constructor(bot, engine, logger) {
    this.bot = bot;
    this.engine = engine;
    this.logger = logger;
    this.activeRequests = new Map();
    this.helpQueue = [];
  }
  
  handlePlayerRequest(playerName, request) {
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('help') || lowerRequest.includes('can you')) {
      return this._handleHelpRequest(playerName, request);
    }
    
    if (lowerRequest.includes('trade') || lowerRequest.includes('give')) {
      return this._handleTradeRequest(playerName, request);
    }
    
    if (lowerRequest.includes('build') || lowerRequest.includes('make')) {
      return this._handleBuildRequest(playerName, request);
    }
    
    if (lowerRequest.includes('mine') || lowerRequest.includes('gather')) {
      return this._handleGatherRequest(playerName, request);
    }
    
    if (lowerRequest.includes('follow') || lowerRequest.includes('come')) {
      return this._handleFollowRequest(playerName);
    }
    
    return null;
  }
  
  _handleHelpRequest(playerName, request) {
    const responses = [
      "Sure! What do you need?",
      "I can help! What are you working on?",
      "Happy to help! Tell me what you need",
      "Yeah, what can I do for you?"
    ];
    
    const requestId = `help-${Date.now()}`;
    this.activeRequests.set(requestId, {
      type: 'help',
      player: playerName,
      timestamp: Date.now()
    });
    
    return this._randomFrom(responses);
  }
  
  _handleTradeRequest(playerName, request) {
    const responses = [
      "What do you want to trade?",
      "Sure, what are you offering?",
      "I'm interested! What do you have?",
      "Let's trade! What do you need?"
    ];
    
    this.activeRequests.set(`trade-${Date.now()}`, {
      type: 'trade',
      player: playerName,
      timestamp: Date.now()
    });
    
    this.engine.getStateManager().updatePlayerRelationship(playerName, 'trade_request');
    
    return this._randomFrom(responses);
  }
  
  _handleBuildRequest(playerName, request) {
    const words = request.toLowerCase().split(' ');
    let buildType = 'structure';
    
    if (words.includes('house')) buildType = 'house';
    if (words.includes('farm')) buildType = 'farm';
    if (words.includes('tower')) buildType = 'tower';
    if (words.includes('wall')) buildType = 'wall';
    
    this.helpQueue.push({
      type: 'build',
      player: playerName,
      buildType,
      timestamp: Date.now()
    });
    
    const responses = [
      `I can help build a ${buildType}! Give me a few minutes`,
      `Sure, I'll help with the ${buildType}. Where do you want it?`,
      `I'll work on that ${buildType} for you`,
      `Building a ${buildType}, got it! I'll start soon`
    ];
    
    return this._randomFrom(responses);
  }
  
  _handleGatherRequest(playerName, request) {
    const words = request.toLowerCase().split(' ');
    let resourceType = 'resources';
    
    if (words.includes('wood')) resourceType = 'wood';
    if (words.includes('stone')) resourceType = 'stone';
    if (words.includes('food')) resourceType = 'food';
    if (words.includes('iron')) resourceType = 'iron';
    
    this.helpQueue.push({
      type: 'gather',
      player: playerName,
      resourceType,
      timestamp: Date.now()
    });
    
    return `I'll gather some ${resourceType} for you!`;
  }
  
  _handleFollowRequest(playerName) {
    this.helpQueue.push({
      type: 'follow',
      player: playerName,
      timestamp: Date.now()
    });
    
    const responses = [
      "Coming!",
      "On my way",
      "Following you",
      "Lead the way!"
    ];
    
    return this._randomFrom(responses);
  }
  
  getNextHelpTask() {
    if (this.helpQueue.length === 0) return null;
    
    const oldTasks = this.helpQueue.filter(task => 
      Date.now() - task.timestamp > 600000
    );
    
    oldTasks.forEach(task => {
      const index = this.helpQueue.indexOf(task);
      if (index > -1) this.helpQueue.splice(index, 1);
    });
    
    return this.helpQueue.shift();
  }
  
  hasActiveTasks() {
    return this.helpQueue.length > 0;
  }
  
  _randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}

module.exports = PlayerInteractions;
