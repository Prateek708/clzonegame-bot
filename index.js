const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// In-Memory Database (Temporary)
const users = {};

// Helper function to initialize user data
function initUser(userId, firstName) {
  if (!users[userId]) {
    users[userId] = {
      name: firstName || "Player",
      coins: 2000, // Starting baseline tokens
      wins: 0,
      losses: 0,
      lastClaim: null,
      lastSpin: null
    };
    return true;
  }
  return false;
}

// 1. START COMMAND
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const firstName = msg.from.first_name;
  
  const isNew = initUser(userId, firstName);

  let welcomeText = `🎮 *Welcome to CL Zone Bot!* 🎮\n\n`;
  
  if (isNew) {
    welcomeText += `🎁 *Thanks for starting! Your reward: 2000 Coins* 🎁\n\n`;
  }

  welcomeText += `You can use the following commands to play:\n` +
                 `🔹 /profile - View your status, wins, losses, and coins\n` +
                 `🔹 /daily - Claim 1000 Daily Tokens (Every 24h)\n` +
                 `🔹 /spin - Spin the wheel to win 1k-10k tokens (Every 24h)\n` +
                 `🔹 /leaderboard - View the Top 15 players`;

  bot.sendMessage(chatId, welcomeText, { parse_mode: "Markdown" });
});

// 2. /profile COMMAND
bot.onText(/\/profile/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  initUser(userId, msg.from.first_name);
  const user = users[userId];

  const profileText = `👤 *YOUR GAME PROFILE* 👤\n\n` +
                      `📝 *Name:* ${user.name}\n` +
                      `💰 *Total Coins:* ${user.coins} CL Tokens\n` +
                      `✅ *Total Wins:* ${user.wins}\n` +
                      `❌ *Total Losses:* ${user.losses}\n` +
                      `🆔 *User ID:* \`${userId}\``;

  bot.sendMessage(chatId, profileText, { parse_mode: "Markdown" });
});

// 3. /daily COMMAND (1000 Tokens - 24 Hours Cooldown)
bot.onText(/\/daily/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  initUser(userId, msg.from.first_name);
  const user = users[userId];

  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000; // 24 Hours

  if (user.lastClaim && (now - user.lastClaim < cooldown)) {
    const remaining = cooldown - (now - user.lastClaim);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    bot.sendMessage(chatId, `❌ *You have already claimed your daily reward!*\n⏳ Please wait *${hours}h ${minutes}m* before your next claim.`, { parse_mode: "Markdown" });
  } else {
    user.coins += 1000;
    user.lastClaim = now;
    bot.sendMessage(chatId, `🎁 *Daily Reward Claimed!*\n\nYou received *1000 CL Tokens*.\n💰 Total Coins: *${user.coins}*`, { parse_mode: "Markdown" });
  }
});

// 4. /spin COMMAND (1k - 10k random amount - 24 Hours Cooldown)
bot.onText(/\/spin/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  initUser(userId, msg.from.first_name);
  const user = users[userId];

  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000; // 24 Hours

  if (user.lastSpin && (now - user.lastSpin < cooldown)) {
    const remaining = cooldown - (now - user.lastSpin);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    bot.sendMessage(chatId, `❌ *The wheel is still cooling down!*\n⏳ You can spin again in *${hours}h ${minutes}m*.`, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, "🎡 *Spinning the Wheel...* 🔄").then((sentMsg) => {
      setTimeout(() => {
        // Random amount between 1000 and 10000 (multiples of 1000)
        const randomMultiplier = Math.floor(Math.random() * 10) + 1; // 1 to 10
        const wonAmount = randomMultiplier * 1000; // 1000, 2000 ... 10000

        user.coins += wonAmount;
        user.wins += 1; 
        user.lastSpin = now; // Save the spin timestamp

        bot.editMessageText(`🎉 *Spin Wheel Result!* 🎉\n\n🎡 Wheel stopped at: *${wonAmount} Tokens*!\n💰 Total Coins: *${user.coins}*`, {
          chat_id: chatId,
          message_id: sentMsg.message_id,
          parse_mode: "Markdown"
        });
      }, 2000);
    });
  }
});

// 5. /leaderboard COMMAND (Top 15 Players - Custom Style)
bot.onText(/\/leaderboard/, (msg) => {
  const chatId = msg.chat.id;
  
  const sortedPlayers = Object.keys(users)
    .map(id => ({ name: users[id].name, coins: users[id].coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 15); // Top 15 players

  let leaderboardText = `🌎 *TOP 15 -- COINS* 🪙\n\n`;
  
  sortedPlayers.forEach((player, index) => {
    let medal = `${index + 1}.`;
    if (index === 0) medal = "🥇";
    if (index === 1) medal = "🥈";
    if (index === 2) medal = "🥉";
    
    leaderboardText += `${medal} *${player.name}* - ${player.coins} 🪙\n`;
  });

  if (sortedPlayers.length === 0) {
    leaderboardText += "No data available yet.";
  }

  bot.sendMessage(chatId, leaderboardText, { parse_mode: "Markdown" });
});

console.log("CL Zone Bot Started");

// --- Render Port Error Fix ---
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Bot is running safely!');
});
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
