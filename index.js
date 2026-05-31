const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: { autoStart: true, params: { timeout: 10 } } });

const users = {};
const cricketGames = {};
const rpsGames = {};
const tttGames = {};

// Helper: Init User
function initUser(id, name) {
    if (!users[id]) users[id] = { name: name, coins: 2000, wins: 0, losses: 0, lastClaim: null, lastSpin: null };
    return users[id];
}

// 1. IMPROVED START COMMAND (UI)
bot.onText(/\/start(?:@\w+)?/, (msg) => {
    const u = initUser(msg.from.id, msg.from.first_name);
    let text = `🎮 *Welcome to CL Zone Bot!* 🎮\n\n` +
               `🎁 *Bonus: 2000 Coins Added!*\n\n` +
               `*Use these commands to play:*\n` +
               `🔹 /profile - View status & coins\n` +
               `🔹 /daily - Claim 1000 Coins (24h)\n` +
               `🔹 /spin - Spin for 1k-10k coins\n` +
               `🔹 /leaderboard - Top 15 players\n\n` +
               `🎮 *Games Available:*\n` +
               `🎲 /dice <amount>\n` +
               `🪙 /flip <heads/tails> <amount>\n` +
               `🔢 /numberguess\n` +
               `🪨 /rps <amount>\n` +
               `❌ /ttt <amount>\n` +
               `🏏 /cricket <amount>`;
    bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" }).catch(()=>{});
});

// 2. INTERACTIVE GAME LOBBIES (Cricket, RPS, TTT)
bot.onText(/\/cricket(?:\s+(\d+))?/, (msg, match) => {
    const cid = msg.chat.id;
    cricketGames[cid] = { p1: { id: msg.from.id, name: msg.from.first_name }, amt: match[1] || 0 };
    bot.sendMessage(cid, `🏏 *Hand Cricket Lobby*\n👤 Host: ${msg.from.first_name}\n💰 Bet: ${match[1] || "Free"}`, {
        reply_markup: { inline_keyboard: [[{ text: "🤝 Join Match", callback_data: "c_join" }]] }
    });
});

bot.onText(/\/rps(?:\s+(\d+))?/, (msg, match) => {
    const cid = msg.chat.id;
    rpsGames[cid] = { p1: { id: msg.from.id, name: msg.from.first_name }, amt: match[1] || 0 };
    bot.sendMessage(cid, `🪨✂️📄 *RPS Lobby*`, {
        reply_markup: { inline_keyboard: [[{ text: "🤖 Vs Bot", callback_data: "r_bot" }, { text: "👥 PvP", callback_data: "r_pvp" }]] }
    });
});

bot.onText(/\/ttt(?:\s+(\d+))?/, (msg, match) => {
    const cid = msg.chat.id;
    tttGames[cid] = { p1: { id: msg.from.id, name: msg.from.first_name }, amt: match[1] || 0 };
    bot.sendMessage(cid, `❌⭕ *TTT Lobby*`, {
        reply_markup: { inline_keyboard: [[{ text: "🤖 Vs Bot", callback_data: "t_bot" }, { text: "👥 PvP", callback_data: "t_pvp" }]] }
    });
});

// 3. CALLBACK ROUTER (Handle buttons)
bot.on('callback_query', (q) => {
    const cid = q.message.chat.id;
    const data = q.data;

    if (data === "c_join") {
        bot.sendMessage(cid, "🏏 *Match Started!* (Cricket Logic Loaded)");
    } else if (data === "r_bot" || data === "r_pvp") {
        bot.sendMessage(cid, "🪨✂️📄 *RPS Game Started!* Make your move.");
    } else if (data === "t_bot" || data === "t_pvp") {
        bot.sendMessage(cid, "❌⭕ *Tic Tac Toe Started!*");
    }
    bot.answerCallbackQuery(q.id).catch(()=>{});
});

// Simple web server for Render
const port = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Engine Active')).listen(port);
