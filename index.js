const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const users = {}; 
const activeMines = {};
const activeNG = {}; 

function initUser(id, name) {
    if (!users[id]) {
        users[id] = { name, coins: 2000, wins: 0, losses: 0, lastClaim: 0 };
    }
}

// --- START COMMAND ---
bot.onText(/\/start(?:@\w+)?/, (msg) => {
    initUser(msg.from.id, msg.from.first_name);
    const text = `🎮 *Welcome to CL Zone Bot!* 🎮\n\n` +
                 `Commands:\n/profile, /daily, /spin, /leaderboard\n\n` +
                 `Games:\n💣 /mines <amt> <bombs>\n🎲 /dice, 🪙 /flip\n🔢 /numberguess\n👉 /ng <number>`;
    bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// --- PROFILE, DAILY, SPIN ---
bot.onText(/\/profile(?:@\w+)?/, (msg) => {
    initUser(msg.from.id, msg.from.first_name);
    const u = users[msg.from.id];
    bot.sendMessage(msg.chat.id, `👤 ${u.name}\n💰 Coins: ${u.coins}\n✅ Wins: ${u.wins}\n❌ Losses: ${u.losses}`);
});

bot.onText(/\/daily(?:@\w+)?/, (msg) => {
    const u = users[msg.from.id];
    if (Date.now() - u.lastClaim < 86400000) return bot.sendMessage(msg.chat.id, "⏳ Come back in 24h!");
    u.coins += 500;
    u.lastClaim = Date.now();
    bot.sendMessage(msg.chat.id, "🎁 Claimed 500 coins!");
});

bot.onText(/\/spin(?:@\w+)?/, (msg) => {
    const win = Math.floor(Math.random() * 9000) + 1000;
    users[msg.from.id].coins += win;
    bot.sendMessage(msg.chat.id, `🎉 *Spin Wheel Result!* 🎉\n\n🎡 Stopped at: ${win} Tokens!\n💰 Total Coins: ${users[msg.from.id].coins}`, { parse_mode: "Markdown" });
});

bot.onText(/\/leaderboard(?:@\w+)?/, (msg) => {
    const sorted = Object.entries(users).sort((a,b) => b[1].coins - a[1].coins).slice(0,10)
        .map((u, i) => `${i+1}. ${u[1].name}: ${u[1].coins} 💰`).
        
