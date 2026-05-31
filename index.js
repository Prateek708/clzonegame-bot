const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const users = {};

// 1. ORIGINAL UI START
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

// 2. PROFILE & DAILY
bot.onText(/\/profile/, (msg) => {
    if (!users[msg.from.id]) users[msg.from.id] = { name: msg.from.first_name, coins: 2000, wins: 0, losses: 0 };
    const u = users[msg.from.id];
    bot.sendMessage(msg.chat.id, `👤 NAME: ${u.name}\n💰 COINS: ${u.coins}\n🏆 WINS: ${u.wins}\n📉 LOSSES: ${u.losses}`);
});

bot.onText(/\/daily/, (msg) => {
    if (!users[msg.from.id]) users[msg.from.id] = { name: msg.from.first_name, coins: 2000, wins: 0, losses: 0 };
    users[msg.from.id].coins += 1000;
    bot.sendMessage(msg.chat.id, "🎁 1000 Coins added!");
});

// 3. DICE
bot.onText(/\/dice (\d+)/, (msg, match) => {
    const amt = parseInt(match[1]);
    if (!users[msg.from.id]) users[msg.from.id] = { name: msg.from.first_name, coins: 2000, wins: 0, losses: 0 };
    const u = users[msg.from.id];
    if (u.coins < amt) return bot.sendMessage(msg.chat.id, "❌ Low balance!");
    const roll = Math.floor(Math.random() * 6) + 1;
    roll >= 4 ? (u.coins += amt, u.wins++) : (u.coins -= amt, u.losses++);
    bot.sendMessage(msg.chat.id, `🎲 Roll: ${roll} | ${roll >= 4 ? 'WIN' : 'LOSS'}`);
});

// 4. GAME LOBBIES (Lobby Message)
bot.onText(/\/cricket(?:\s+(\d+))?/, (msg) => {
    bot.sendMessage(msg.chat.id, "🏏 Cricket Lobby", { reply_markup: { inline_keyboard: [[{text: "Join Match", callback_data: "c_join"}]] } });
});

bot.onText(/\/rps(?:\s+(\d+))?/, (msg) => {
    bot.sendMessage(msg.chat.id, "🪨 RPS Lobby", { reply_markup: { inline_keyboard: [[{text: "Vs Bot", callback_data: "r_bot"}]] } });
});

bot.onText(/\/ttt(?:\s+(\d+))?/, (msg) => {
    bot.sendMessage(msg.chat.id, "❌ TTT Lobby", { reply_markup: { inline_keyboard: [[{text: "Vs Bot", callback_data: "t_bot"}]] } });
});

// 5. CALLBACKS (Game Logic)
bot.on('callback_query', (q) => {
    if (q.data === "c_join") bot.sendMessage(q.message.chat.id, "🏏 Match Started! Type /bat <num> to play.");
    if (q.data === "r_bot") bot.sendMessage(q.message.chat.id, "🪨 RPS Game Started!");
    if (q.data === "t_bot") bot.sendMessage(q.message.chat.id, "❌ TTT Game Started!");
    bot.answerCallbackQuery(q.id);
});

http.createServer((req, res) => res.end('Engine Active')).listen(process.env.PORT || 3000);
