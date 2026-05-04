const mineflayer = require('mineflayer')

const bot = mineflayer.createBot({
  host: process.argv[2] || 'MrNova420.aternos.me',
  port: parseInt(process.argv[3]) || 31267,
  username: process.argv[4] || 'xxTryHardxx',
  auth: 'offline',
  version: false
})

bot.on('login', () => {
  console.log('✅ Logged in')
})

bot.on('spawn', () => {
  console.log('✅ Spawned in world')
})

bot.on('kicked', (reason) => {
  console.log('❌ Kicked:', reason)
})

bot.on('error', (err) => {
  console.log('❌ Error:', err.message)
})

bot.on('end', () => {
  console.log('⚠️ Disconnected')
})