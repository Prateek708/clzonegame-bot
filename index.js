const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const users = {};

// Start Command
bot.onText(/\/start/, (msg) => {
    let text = "🎮 Welcome to CL Zone! 🎮\n\n" +
               "🔹 /profile - Check stats & coins\n" +
               "🔹 /daily - Claim 1000 Coins\n" +
               "🔹 /spin - Lucky Wheel\n" +
               "🔹 /leaderboard - Top 15\n\n" +
               "🎮 Games:\n" +
               "🎲 /dice <amt>\n" +
               "🪙 /flip <heads/tails> <amt>\n" +
               "🔢 /numberguess\n" +
               "🪨 /rps <amt>\n" +
               "❌ /ttt <amt>\n" +
               "🏏 /cricket <amt>";
    bot.sendMessage(msg.chat.id, text);
});

// Profile
bot.onText(/\/profile/, (msg) => {
    const id = msg.from.id;
    if (!users[id]) users[id] = { name: msg.from.first_name, coins: 2000, wins: 0, losses: 0 };
    bot.sendMessage(msg.chat.id, `👤 NAME: ${users[id].name}\n💰 COINS: ${users[id].coins}\n🏆 WINS: ${users[id].wins}\n📉 LOSSES: ${users[id].losses}`);
});

// Daily
bot.onText(/\/daily/, (msg) => {
    const id = msg.from.id;
    if (!users[id]) users[id] = { name: msg.from.first_name, coins: 2000, wins: 0, losses: 0 };
    users[id].coins += 1000;
    bot.sendMessage(msg.chat.id, "🎁 1000 Coins added!");
});

// Dice
bot.onText(/\/dice (\d+)/, (msg, match) => {
    const amt = parseInt(match[1]);
    const id = msg.from.id;
    if (!users[id]) users[id] = { name: msg.from.first_name, coins: 2000, wins: 0, losses: 0 };
    if (users[id].coins < amt) return bot.sendMessage(msg.chat.id, "❌ Low balance!");
    const roll = Math.floor(Math.random() * 6) + 1;
    roll >= 4 ? (users[id].coins += amt, users[id].wins++) : (users[id].coins -= amt, users[id].losses++);
    bot.sendMessage(msg.chat.id, `🎲 Roll: ${roll} | ${roll >= 4 ? 'WIN' : 'LOSS'}`);
});

// Lobbies
bot.onText(/\/cricket/, (msg) => bot.sendMessage(msg.chat.id, "🏏 Cricket Lobby", { reply_markup: { inline_keyboard: [[{text: "Join Match", callback_data: "c_join"}]] } }));
bot.onText(/\/rps/, (msg) => bot.sendMessage(msg.chat.id, "🪨 RPS Lobby", { reply_markup: { inline_keyboard: [[{text: "Vs Bot", callback_data: "r_bot"}]] } }));
bot.onText(/\/ttt/, (msg) => bot.sendMessage(msg.chat.id, "❌ TTT Lobby", { reply_markup: { inline_keyboard: [[{text: "Vs Bot", callback_data: "t_bot"}]] } }));

// Callback
bot.on('callback_query', (q) => {
    const cid = q.message.chat.id;
    if (q.data === "c_join") bot.sendMessage(cid, "🏏 Cricket Match Started!");
    if (q.data === "r_bot") bot.sendMessage(cid, "🪨 RPS Game Started!");
    if (q.data === "t_bot") bot.sendMessage(cid, "❌ TTT Game Started!");
    bot.answerCallbackQuery(q.id);
});

// Server
http.createServer((req, res) => res.end('Engine Active')).listen(process.env.PORT || 3000);
