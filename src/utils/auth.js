function getAuthOptions(authConfig) {
  const type = authConfig.type || 'offline';
  
  // Use BOT_NAME env var if set (for squad/army bots)
  const username = process.env.BOT_NAME || authConfig.username || 'BetterBender';
  
  if (type === 'offline') {
    return {
      username: username,
      auth: 'offline'
    };
  }
  
  if (type === 'microsoft') {
    return {
      username: username,
      auth: 'microsoft'
    };
  }
  
  if (type === 'mojang') {
    return {
      username: username,
      password: authConfig.password,
      auth: 'mojang'
    };
  }
  
  return {
    username: username,
    auth: 'offline'
  };
}

module.exports = { getAuthOptions };
