const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// --- SET YOUR TELEGRAM USER ID HERE ---
const ADMIN_ID = [1315564307, 8708547223];

// In-Memory Database
const users = {};
const activeGames = {};
global.achievements = [];

// Helper function to initialize user data
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

// 1. START COMMAND & REGISTRATION
bot.onText(/\/start/, (msg) => {
    const isNew = initUser(msg.from.id, msg.from.first_name);
    let welcomeText = `🎮 *Welcome to Gaming Space!* 🎮\n\n`;
    if (isNew) {
        welcomeText += `🎁 *Thanks for starting, You are rewarded with 2000 Coins* 🎁\n\n`;
    }
    welcomeText += `Use these commands to play:\n🔹 /profile - View status & coins\n🔹 /daily - Claim 1000 Coins\n🔹 /spin - Spin for 1k-10k coins\n🔹 /leaderboard - View Top 15 players\n\n🎮 *Games Available:* \n🎲 /dice <amount>\n🪙 /flip <heads/tails> <amount>\n🔢 /numberguess\n👉 /ng <number>\n✨ /myachievement`;
    bot.sendMessage(msg.chat.id, welcomeText, { parse_mode: "Markdown" });
});

// 2. PHASE 1 COMMANDS
bot.onText(/\/profile/, (msg) => {
    const user = users[msg.from.id];
    if (!user) return bot.sendMessage(msg.chat.id, "❌ *Access Denied!*\nPlease /start the bot first.", { parse_mode: "Markdown" });
    const profileText = `👤 *YOUR GAME PROFILE* 👤\n\n📝 *Name:* ${user.name}\n💰 *Total Coins:* ${user.coins} CL Tokens\n✅ *Total Wins:* ${user.wins}\n❌ *Total Losses:* ${user.losses}\n🆔 *User ID:* ${msg.from.id}`;
    bot.sendMessage(msg.chat.id, profileText, { parse_mode: "Markdown" });
});

bot.onText(/\/leaderboard/, (msg) => {
    const sortedPlayers = Object.keys(users)
        .map(id => ({ name: users[id].name, coins: users[id].coins }))
        .sort((a, b) => b.coins - a.coins)
        .slice(0, 15);
    let leaderboardText = `🌎 *TOP 15 -- COINS* 🪙\n\n`;
    sortedPlayers.forEach((player, index) => {
        leaderboardText += `${index + 1}. *${player.name}* - ${player.coins} 🪙\n`;
    });
    bot.sendMessage(msg.chat.id, leaderboardText, { parse_mode: "Markdown" });
});

// 3. GAMES
bot.onText(/\/dice (\d+)/, (msg, match) => {
    const user = users[msg.from.id];
    const amount = parseInt(match[1]);
    if (!user) return bot.sendMessage(msg.chat.id, "❌ Please /start first.");
    const roll = Math.floor(Math.random() * 6) + 1;
    if (roll >= 4) { user.coins += amount; bot.sendMessage(msg.chat.id, `🎲 *Dice Roll:* ${roll}\n🎉 *WIN!*`); }
    else { user.coins -= amount; bot.sendMessage(msg.chat.id, `🎲 *Dice Roll:* ${roll}\n❌ *LOSS!*`); }
});

bot.onText(/\/numberguess/, (msg) => {
    activeGames[msg.from.id] = { target: Math.floor(Math.random() * 100) + 1 };
    bot.sendMessage(msg.chat.id, "🔢 *Number Guessing Game Started!*\nI've chosen a number between 1 and 100.\nUse /ng <number> to guess!", { parse_mode: "Markdown" });
});

bot.onText(/\/ng (\d+)/, (msg, match) => {
    const game = activeGames[msg.from.id];
    if (!game) return bot.sendMessage(msg.chat.id, "❌ No active game.");
    const guess = parseInt(match[1]);
    if (guess === game.target) { users[msg.from.id].coins += 1000; delete activeGames[msg.from.id]; bot.sendMessage(msg.chat.id, "🎉 *CORRECT!*"); }
    else { bot.sendMessage(msg.chat.id, guess < game.target ? "⬆️ *Higher*" : "⬇️ *Lower*"); }
});

// 4. ADMIN & ACHIEVEMENTS
bot.onText(/\/add (\d+)/, (msg, match) => {
    if (!ADMIN_ID.includes(msg.from.id) || !msg.reply_to_message) return;
    users[msg.reply_to_message.from.id].coins += parseInt(match[1]);
    bot.sendMessage(msg.chat.id, `✅ Successfully added ${match[1]} coins.`);
});

bot.onText(/\/remove (\d+)/, (msg, match) => {
    if (!ADMIN_ID.includes(msg.from.id) || !msg.reply_to_message) return;
    users[msg.reply_to_message.from.id].coins = Math.max(0, users[msg.reply_to_message.from.id].coins - parseInt(match[1]));
    bot.sendMessage(msg.chat.id, `✅ Successfully deducted ${match[1]} coins.`);
});

bot.onText(/\/addachievement (.+)/, (msg, match) => {
    if (!ADMIN_ID.includes(msg.from.id)) return;
    global.achievements.push(match[1]);
    bot.sendMessage(msg.chat.id, `🏆 Achievement Added: ${match[1]}`);
});

bot.onText(/\/rmachievement (\d+)/, (msg, match) => {
    if (!ADMIN_ID.includes(msg.from.id)) return;
    const idx = parseInt(match[1]) - 1;
    const removed = global.achievements.splice(idx, 1);
    bot.sendMessage(msg.chat.id, `🗑 Achievement Removed: ${removed}`);
});

bot.onText(/\/myachievement/, (msg) => {
    const txt = global.achievements.length ? global.achievements.map((a, i) => `${i+1}. ${a}`).join('\n') : "No achievements.";
    bot.sendMessage(msg.chat.id, `🏆 ACHIEVEMENTS:\n${txt}`);
});

// 5. SERVER BINDING (MUST BE LAST)
const port = process.env.PORT || 3000;
http.createServer((req, res) => res.end('CL Zone Bot is Alive!')).listen(port);

bot.onText(/\/test/, (msg) => {
  bot.sendMessage(msg.chat.id, "Test Working ✅");
});

