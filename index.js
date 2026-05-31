const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// --- SET YOUR TELEGRAM USER ID HERE ---
const ADMIN_ID = 1315564307; 

// In-Memory Database
const users = {};
const activeGames = {}; 

// Shop Items
const items = {
    "shield": { name: "Protection Shield", cost: 1000000, desc: "Prevents coin loss on your next game." },
    "booster": { name: "Lucky Booster", cost: 1500000, desc: "Get 2x earnings for your next 3 games." },
    "vip": { name: "VIP Badge", cost: 5000000, desc: "Get a special VIP tag on your profile." }
};

// Helper function
function initUser(userId, firstName) {
  if (!users[userId]) {
    users[userId] = {
      name: firstName || "Player",
      coins: 2000, 
      wins: 0,
      losses: 0,
      lastClaim: null,
      lastSpin: null,
      shield: false,
      booster: 0,
      vip: false
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

  let welcomeText = `🎮 *Welcome to Gaming Space!* 🎮\n\n`;
  if (isNew) welcomeText += `🎁 *Thanks for starting! Your reward: 2000 Coins* 🎁\n\n`;
  welcomeText += `🔹 /profile - View status & coins\n🔹 /shop - Visit Premium Shop\n🔹 /daily - Claim 1000 Coins\n🔹 /spin - Spin Wheel\n🔹 /dice <amount>\n🔹 /flip <h/t> <amount>\n🔹 /numberguess`;
  bot.sendMessage(chatId, welcomeText, { parse_mode: "Markdown" });
});

// 2. PROFILE
bot.onText(/\/profile/, (msg) => {
  const chatId = msg.chat.id;
  const user = users[msg.from.id];
  if (!user) return bot.sendMessage(chatId, "❌ Please /start first.");

  const vipTag = user.vip ? " | 👑 VIP" : "";
  const shieldStatus = user.shield ? "✅ Active" : "❌ None";
  
  const profileText = `👤 *PROFILE* ${vipTag}\n\n` +
                      `📝 *Name:* ${user.name}\n` +
                      `💰 *Coins:* ${user.coins.toLocaleString()}\n` +
                      `🛡 *Shield:* ${shieldStatus}\n` +
                      `⚡ *Booster:* ${user.booster || 0} left\n` +
                      `✅ *Wins:* ${user.wins}\n` +
                      `❌ *Losses:* ${user.losses}`;
  bot.sendMessage(chatId, profileText, { parse_mode: "Markdown" });
});

// 3. SHOP COMMANDS
bot.onText(/\/shop/, (msg) => {
    let shopText = "🛒 *CL Zone Premium Shop* 🛒\n\n";
    for (let id in items) {
        shopText += `🔹 *${items[id].name}*\n💰 Price: ${items[id].cost.toLocaleString()}\n📝 ${items[id].desc}\nCommand: /buy_${id}\n\n`;
    }
    bot.sendMessage(msg.chat.id, shopText, { parse_mode: "Markdown" });
});

bot.onText(/\/buy_(shield|booster|vip)/, (msg, match) => {
    const userId = msg.from.id;
    const itemId = match[1];
    const user = users[userId];
    if (!user) return bot.sendMessage(msg.chat.id, "❌ /start first.");
    if (user.coins < items[itemId].cost) return bot.sendMessage(msg.chat.id, "❌ Not enough coins!");

    user.coins -= items[itemId].cost;
    if (itemId === "shield") user.shield = true;
    if (itemId === "booster") user.booster = 3;
    if (itemId === "vip") user.vip = true;

    bot.sendMessage(msg.chat.id, `✅ Successfully purchased *${items[itemId].name}*!`);
});

// 4. DICE GAME
bot.onText(/\/dice (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const amount = parseInt(match[1]);
  const user = users[userId];

  if (!user) return bot.sendMessage(chatId, "❌ Please /start first.");
  if (amount < 100 || amount > 20000) return bot.sendMessage(chatId, "⚠️ Limit: 100-20,000.");
  if (user.coins < amount) return bot.sendMessage(chatId, "❌ Not enough coins!");

  const roll = Math.floor(Math.random() * 6) + 1;
  if (roll >= 4) {
    let winAmount = amount;
    if (user.booster > 0) { winAmount *= 2; user.booster -= 1; }
    user.coins += winAmount;
    user.wins += 1;
    bot.sendMessage(chatId, `🎲 *Roll:* ${roll}\n🎉 *WIN!* Added: ${winAmount}\n💰 Balance: ${user.coins}`);
  } else {
    if (user.shield) { user.shield = false; bot.sendMessage(chatId, "🛡 *Shield Activated!* No coins lost."); }
    else { user.coins -= amount; user.losses += 1; bot.sendMessage(chatId, `🎲 *Roll:* ${roll}\n❌ *LOSS!* Lost: ${amount}\n💰 Balance: ${user.coins}`); }
  }
});

// 5. ADMIN COMMANDS
bot.onText(/\/add (\d+)/, (msg, match) => {
    if (msg.from.id !== ADMIN_ID || !msg.reply_to_message) return;
    users[msg.reply_to_message.from.id].coins += parseInt(match[1]);
    bot.sendMessage(msg.chat.id, "✅ Added.");
});

bot.onText(/\/remove (\d+)/, (msg, match) => {
    if (msg.from.id !== ADMIN_ID || !msg.reply_to_message) return;
    const target = users[msg.reply_to_message.from.id];
    target.coins = Math.max(0, target.coins - parseInt(match[1]));
    bot.sendMessage(msg.chat.id, "✅ Deducted.");
});

// Daily, Spin, Flip, NumberGuess... (Keep your remaining code here)
