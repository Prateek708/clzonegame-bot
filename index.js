const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// In-Memory Database (Temporary)
const users = {};

// Helper function to initialize user data
function initUser(userId, username) {
  if (!users[userId]) {
    users[userId] = {
      username: username || "Player",
      coins: 5000, // Starting baseline tokens for testing
      wins: 0,
      losses: 0,
      lastClaim: null
    };
  }
}

// 1. START COMMAND
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  initUser(userId, msg.from.username);

  const welcomeText = `🎮 *Welcome to CL Zone Bot!* 🎮\n\n` +
                      `Aap in commands ka use karke khel sakte hain:\n` +
                      `🔹 /profile - Aapka status, wins, loss aur coins\n` +
                      `🔹 /daily - 1000 Daily Tokens claim karein\n` +
                      `🔹 /spin - Spin karke 1k-10k tokens jeetein\n` +
                      `🔹 /leaderboard - Top 15 players ki list`;

  bot.sendMessage(chatId, welcomeText, { parse_mode: "Markdown" });
});

// 2. /profile COMMAND
bot.onText(/\/profile/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  initUser(userId, msg.from.username);
  const user = users[userId];

  const profileText = `👤 *YOUR GAME PROFILE* 👤\n\n` +
                      `📝 *Name:* ${user.username}\n` +
                      `💰 *Total Coins:* ${user.coins} CL Tokens\n` +
                      `✅ *Total Wins:* ${user.wins}\n` +
                      `❌ *Total Losses:* ${user.losses}\n` +
                      `🆔 *User ID:* \`${userId}\``;

  bot.sendMessage(chatId, profileText, { parse_mode: "Markdown" });
});

// 3. /daily COMMAND (1000 Tokens)
bot.onText(/\/daily/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  initUser(userId, msg.from.username);
  const user = users[userId];

  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000; // 24 Ghante

  if (user.lastClaim && (now - user.lastClaim < cooldown)) {
    const remaining = cooldown - (now - user.lastClaim);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    bot.sendMessage(chatId, `❌ Aap aaj ka reward claim kar chuke hain!\n⏳ Agla claim *${hours}h ${minutes}m* baad milega.`, { parse_mode: "Markdown" });
  } else {
    user.coins += 1000;
    user.lastClaim = now;
    bot.sendMessage(chatId, `🎁 *Daily Reward Claimed!*\n\nAapko *1000 CL Tokens* mile hain.\n💰 Total Coins: *${user.coins}*`, { parse_mode: "Markdown" });
  }
});

// 4. /spin COMMAND (1k - 10k random amount)
bot.onText(/\/spin/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  initUser(userId, msg.from.username);
  const user = users[userId];

  const spinCost = 2000; // Spin fee taaki wins/loss dynamic rahe

  if (user.coins < spinCost) {
    bot.sendMessage(chatId, `❌ Spin karne ke liye kam se kam *${spinCost} Coins* chahiye!\nAapke paas sirf *${user.coins}* hain.`, { parse_mode: "Markdown" });
    return;
  }

  user.coins -= spinCost; // Entry fee deducted

  bot.sendMessage(chatId, "🎡 *Spinning the Wheel...* 🔄").then((sentMsg) => {
    setTimeout(() => {
      // 1000 se 10000 ke beech random amount (1000 ke multiples me)
      const randomMultiplier = Math.floor(Math.random() * 10) + 1; // 1 to 10
      const wonAmount = randomMultiplier * 1000; // 1000, 2000 ... 10000

      user.coins += wonAmount;

      if (wonAmount > spinCost) {
        user.wins += 1; // Agar cost se zyada mila toh Win
      } else if (wonAmount < spinCost) {
        user.losses += 1; // Agar cost se kam mila toh Loss
      } else {
        // Agar barabar mila toh no win/loss adjustments, coins wapas mil gaye
      }

      bot.editMessageText(`🎉 *Spin Wheel Result!* 🎉\n\n🎡 Wheel ruka: *${wonAmount} Tokens* par!\n📉 Entry Fee: -${spinCost}\n💰 Total Coins: *${user.coins}*`, {
        chat_id: chatId,
        message_id: sentMsg.message_id,
        parse_mode: "Markdown"
      });
    }, 2000); // 2 second delay for animation effect
  });
});

// 5. /leaderboard COMMAND (Top 15 Players)
bot.onText(/\/leaderboard/, (msg) => {
  const chatId = msg.chat.id;
  
  const sortedPlayers = Object.keys(users)
    .map(id => ({ username: users[id].username, coins: users[id].coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 15); // Top 15 players

  let leaderboardText = `🏆 *TOP 15 LEADERS* 🏆\n\n`;
  
  sortedPlayers.forEach((player, index) => {
    let medal = `${index + 1}.`;
    if (index === 0) medal = "🥇";
    if (index === 1) medal = "🥈";
    if (index === 2) medal = "🥉";
    
    leaderboardText += `${medal} *${player.username}* — ${player.coins} Coins\n`;
  });

  if (sortedPlayers.length === 0) {
    leaderboardText += "Abhi koi data nahi hai.";
  }

  bot.sendMessage(chatId, leaderboardText, { parse_mode: "Markdown" });
});

console.lo
