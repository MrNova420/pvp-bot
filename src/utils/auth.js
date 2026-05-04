function getAuthOptions(authConfig) {
  const type = authConfig.type || 'offline';
  
  if (type === 'offline') {
    return {
      username: authConfig.username || 'BetterBender',
      auth: 'offline'
    };
  }
  
  if (type === 'microsoft') {
    return {
      username: authConfig.username,
      auth: 'microsoft'
    };
  }
  
  if (type === 'mojang') {
    return {
      username: authConfig.username,
      password: authConfig.password,
      auth: 'mojang'
    };
  }
  
  return {
    username: authConfig.username || 'BetterBender',
    auth: 'offline'
  };
}

module.exports = { getAuthOptions };
