const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const users = {};

// Helper: Init User
function initUser(id, name) {
    if (!users[id]) users[id] = { name: name, coins: 2000, wins: 0, losses: 0 };
    return users[id];
}

// 1. START COMMAND
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

// 2. PROFILE (Old Style)
bot.onText(/\/profile/, (msg) => {
    const u = initUser(msg.from.id, msg.from.first_name);
    let msgText = `👤 YOUR GAME PROFILE 👤\n\n` +
                  `📝 Name: ${u.name}\n` +
                  `💰 Total Coins: ${u.coins} CL Tokens\n` +
                  `✅ Total Wins: ${u.wins}\n` +
                  `❌ Total Losses: ${u.losses}\n` +
                  `🆔 User ID: ${msg.from.id}`;
    bot.sendMessage(msg.chat.id, msgText);
});

// 3. DAILY (Old Style)
bot.onText(/\/daily/, (msg) => {
    const u = initUser(msg.from.id, msg.from.first_name);
    u.coins += 1000;
    bot.sendMessage(msg.chat.id, `🎁 Daily Reward Claimed!\n\nAapko 1000 CL Tokens mile hain.\n💰 Total Coins: ${u.coins}`);
});

// 4. DICE
bot.onText(/\/dice (\d+)/, (msg, match) => {
    const u = initUser(msg.from.id, msg.from.first_name);
    const amt = parseInt(match[1]);
    if (u.coins < amt) return bot.sendMessage(msg.chat.id, "❌ Low balance!");
    const roll = Math.floor(Math.random() * 6) + 1;
    roll >= 4 ? (u.coins += amt, u.wins++) : (u.coins -= amt, u.losses++);
    bot.sendMessage(msg.chat.id, `🎲 Roll: ${roll} | ${roll >= 4 ? 'WIN' : 'LOSS'}`);
});

// 5. LOBBIES (Games)
bot.onText(/\/cricket(?:\s+(\d+))?/, (msg) => {
    bot.sendMessage(msg.chat.id, "🏏 Cricket Lobby", { reply_markup: { inline_keyboard: [[{text: "Join Match", callback_data: "c_join"}]] } });
});

bot.onText(/\/rps(?:\s+(\d+))?/, (msg) => {
    bot.sendMessage(msg.chat.id, "🪨 RPS Lobby", { reply_markup: { inline_keyboard: [[{text: "Vs Bot", callback_data: "r_bot"}]] } });
});

bot.onText(/\/ttt(?:\s+(\d+))?/, (msg) => {
    bot.sendMessage(msg.chat.id, "❌ TTT Lobby", { reply_markup: { inline_keyboard: [[{text: "Vs Bot", callback_data: "t_bot"}]] } });
});

// 6. CALLBACKS (Game Logic)
bot.on('callback_query', (q) => {
    const cid = q.message.chat.id;
    if (q.data === "c_join") bot.sendMessage(cid, "🏏 Cricket Match Started! Type /bat <num>");
    if (q.data === "r_bot") bot.sendMessage(cid, "🪨 RPS Game Started! Choose: /rock, /paper, /scissors");
    if (q.data === "t_bot") bot.sendMessage(cid, "❌ TTT Game Started! Use /pos <1-9>");
    bot.answerCallbackQuery(q.id);
});

http.createServer((req, res) => res.end('Engine Active')).listen(process.env.PORT || 3000);
