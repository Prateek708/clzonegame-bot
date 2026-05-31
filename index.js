const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// --- ADMIN ID ---
const ADMIN_ID = 1315564307; 

// Database
const users = {};
const activeGames = {}; 

function initUser(userId, firstName) {
  if (!users[userId]) {
    users[userId] = {
      name: firstName || "Player",
      coins: 2000, 
      wins: 0,
      losses: 0,
      lastClaim: null,
      lastSpin: null
    };
    return true; 
  }
  return false; 
}

// ==========================================
// 1. START
// ==========================================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const firstName = msg.from.first_name;
  
  const isNew = initUser(userId, firstName);

  let welcomeText = `🎮 *Welcome to CL Zone Bot!* 🎮\n\n`;
  if (isNew) welcomeText += `🎁 *2000 Coins* credited!\n\n`;

  welcomeText += `Commands:\n` +
    `🔹 /profile\n` +
    `🔹 /daily\n` +
    `🔹 /spin\n` +
    `🔹 /leaderboard\n\n` +
    `Games:\n` +
    `🎲 /dice <amount>\n` +
    `🪙 /flip <heads|tails> <amount>\n` +
    `🔢 /numberguess`;

  bot.sendMessage(chatId, welcomeText, { parse_mode: "Markdown" });
});

// ==========================================
// 2. BASIC COMMANDS
// ==========================================
bot.onText(/\/profile/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!users[userId]) return bot.sendMessage(chatId, "❌ Use /start first.");

  const u = users[userId];
  bot.sendMessage(chatId, 
    `👤 *PROFILE*\n\n` +
    `Name: *${u.name}*\n` +
    `Coins: *${u.coins}*\n` +
    `Wins: *${u.wins}*\n` +
    `Losses: *${u.losses}*`, 
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/daily/, (msg) => { /* same as before */ 
  // ... (keep your original daily code or ask me if needed)
});

bot.onText(/\/spin/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  if (!users[userId]) return bot.sendMessage(chatId, "❌ Use /start first.");

  const user = users[userId];
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;

  if (user.lastSpin && (now - user.lastSpin < cooldown)) {
    const rem = cooldown - (now - user.lastSpin);
    const h = Math.floor(rem / 3600000);
    const m = Math.floor((rem % 3600000) / 60000);
    return bot.sendMessage(chatId, `⏳ Wait ${h}h ${m}m`, { parse_mode: "Markdown" });
  }

  bot.sendMessage(chatId, "🎡 *Spinning...*").then(sentMsg => {
    setTimeout(() => {
      const wonAmount = (Math.floor(Math.random() * 10) + 1) * 1000;
      user.coins += wonAmount;
      user.wins += 1;
      user.lastSpin = now;

      bot.editMessageText(
        `🎉 *Spin Result!* 🎉\n\n` +
        `🎡 Stopped at: *${wonAmount}* Tokens!\n` +
        `💰 Total Coins: *${user.coins}*`,
        { chat_id: chatId, message_id: sentMsg.message_id, parse_mode: "Markdown" }
      );
    }, 2000);
  });
});

bot.onText(/\/leaderboard/, (msg) => {
  const chatId = msg.chat.id;

  const sorted = Object.keys(users)
    .map(id => ({ name: users[id].name, coins: users[id].coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 15);

  let text = `🌎 *TOP 15 PLAYERS* 🪙\n\n`;
  sorted.forEach((p, i) => {
    let medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
    text += `\( {medal} * \){p.name}* — ${p.coins} coins\n`;
  });

  if (sorted.length === 0) text += "No players yet.";
  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
});

// ==========================================
// 3. GAMES (with @botusername support)
// ==========================================

bot.onText(/\/dice(?:@\w+)?\s+(\d+)/i, (msg, match) => {
  // ... (same as previous response)
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const amount = parseInt(match[1]);
  const user = users[userId];

  if (!user) return bot.sendMessage(chatId, "❌ Use /start first.");
  if (isNaN(amount) || amount < 100 || amount > 20000) return bot.sendMessage(chatId, "⚠️ Limit: 100-20000");
  if (user.coins < amount) return bot.sendMessage(chatId, "❌ Not enough coins!");

  const roll = Math.floor(Math.random() * 6) + 1;
  if (roll >= 4) {
    user.coins += amount;
    user.wins++;
    bot.sendMessage(chatId, `🎲 *Roll:* \( {roll}\n🎉 *WIN!* + \){amount}\nBalance: *${user.coins}*`, { parse_mode: "Markdown" });
  } else {
    user.coins -= amount;
    user.losses++;
    bot.sendMessage(chatId, `🎲 *Roll:* \( {roll}\n❌ *LOSS!* - \){amount}\nBalance: *${user.coins}*`, { parse_mode: "Markdown" });
  }
});

bot.onText(/\/flip(?:@\w+)?\s+(heads|tails)\s+(\d+)/i, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const choice = match[1].toLowerCase();
  const amount = parseInt(match[2]);
  const user = users[userId];

  if (!user) return bot.sendMessage(chatId, "❌ Use /start first.");
  if (isNaN(amount) || amount < 100 || amount > 30000) return bot.sendMessage(chatId, "⚠️ Limit: 100-30000");
  if (user.coins < amount) return bot.sendMessage(chatId, "❌ Not enough coins!");

  const result = Math.random() < 0.5 ? "heads" : "tails";
  if (choice === result) {
    user.coins += amount;
    user.wins++;
    bot.sendMessage(chatId, `🪙 *\( {result.toUpperCase()}*\n🎉 *WIN!* + \){amount}\nBalance: *${user.coins}*`, { parse_mode: "Markdown" });
  } else {
    user.coins -= amount;
    user.losses++;
    bot.sendMessage(chatId, `🪙 *\( {result.toUpperCase()}*\n❌ *LOSS!* - \){amount}\nBalance: *${user.coins}*`, { parse_mode: "Markdown" });
  }
});

bot.onText(/\/numberguess(?:@\w+)?/i, (msg) => { /* same */ });
bot.onText(/\/ng(?:@\w+)?\s+(\d+)/i, (msg, match) => { /* same */ });

// Admin Command (unchanged)
bot.onText(/\/add (\d+)/, (msg, match) => { /* same as before */ });

console.log("✅ CL Zone Bot Running...");
const port = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Bot Alive')).listen(port);
