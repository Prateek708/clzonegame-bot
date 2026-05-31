const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const users = {}; 
const activeMines = {};
const activeNG = {}; 

function initUser(id, name) {
    if (!users[id]) {
        users[id] = { name, coins: 2000, wins: 0, losses: 0 };
    }
}

// --- WELCOME ---
bot.onText(/\/start(?:@\w+)?/, (msg) => {
    initUser(msg.from.id, msg.from.first_name);
    const text = `🎮 *Welcome to CL Zone Bot!* 🎮\n\n` +
                 `Commands:\n/profile, /daily, /spin, /leaderboard\n\n` +
                 `Games:\n💣 /mines <amt> <bombs>\n🎲 /dice\n🪙 /flip\n🔢 /numberguess`;
    bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// --- PROFILE, DAILY, SPIN ---
bot.onText(/\/profile(?:@\w+)?/, (msg) => {
    const u = users[msg.from.id];
    bot.sendMessage(msg.chat.id, `👤 ${u.name}\n💰 Coins: ${u.coins}`);
});

bot.onText(/\/daily(?:@\w+)?/, (msg) => {
    initUser(msg.from.id, msg.from.first_name);
    users[msg.from.id].coins += 500;
    bot.sendMessage(msg.chat.id, "🎁 You claimed 500 coins!");
});

bot.onText(/\/spin(?:@\w+)?/, (msg) => {
    const id = msg.from.id;
    initUser(id, msg.from.first_name);
    const win = Math.floor(Math.random() * 9000) + 1000;
    users[id].coins += win;
    bot.sendMessage(msg.chat.id, `🎉 *Spin Wheel Result!* 🎉\n\n🎡 Stopped at: ${win} Tokens!\n💰 Total Coins: ${users[id].coins}`, { parse_mode: "Markdown" });
});

bot.onText(/\/leaderboard(?:@\w+)?/, (msg) => {
    const sorted = Object.entries(users).sort((a, b) => b[1].coins - a[1].coins).slice(0, 10)
        .map((u, i) => `${i + 1}. ${u[1].name}: ${u[1].coins} 💰`).join("\n");
    bot.sendMessage(msg.chat.id, `🏆 *Top Players:*\n${sorted || "No players yet."}`);
});

// --- DICE, FLIP, NG ---
bot.onText(/\/dice(?:@\w+)?/, (msg) => {
    bot.sendMessage(msg.chat.id, `🎲 *Dice rolled:* ${Math.floor(Math.random() * 6) + 1}`);
});

bot.onText(/\/flip(?:@\w+)?/, (msg) => {
    bot.sendMessage(msg.chat.id, `🪙 *Coin Flip:* ${Math.random() < 0.5 ? "Heads" : "Tails"}`);
});

bot.onText(/\/numberguess(?:@\w+)?/, (msg) => {
    activeNG[msg.from.id] = Math.floor(Math.random() * 100) + 1;
    bot.sendMessage(msg.chat.id, "🔢 *Guess a number (1-100)!* Use /ng <number>");
});

bot.onText(/\/ng(?:@\w+)?\s+(\d+)/, (msg, match) => {
    const guess = parseInt(match[1]);
    if (!activeNG[msg.from.id]) return bot.sendMessage(msg.chat.id, "❌ Start with /numberguess first.");
    if (guess === activeNG[msg.from.id]) {
        users[msg.from.id].coins += 1000;
        bot.sendMessage(msg.chat.id, "🎉 *Correct!* Won 1000 coins.");
        delete activeNG[msg.from.id];
    } else {
        bot.sendMessage(msg.chat.id, guess < activeNG[msg.from.id] ? "Too low! ⬆️" : "Too high! ⬇️");
    }
});

// --- MINES GRID ---
bot.onText(/\/mines(?:@\w+)?(?:\s+(\d+))?(?:\s+(\d+))?/, (msg, match) => {
    const id = msg.from.id;
    const bet = parseInt(match[1]);
    const bombs = parseInt(match[2]) || 3;
    initUser(id, msg.from.first_name);
    if (!bet || bet < 100) return bot.sendMessage(msg.chat.id, "⚠️ Min bet: 100.");
    
    let keyboard = [];
    for (let i = 0; i < 5; i++) {
        let row = [];
        for (let j = 0; j < 5; j++) row.push({ text: "⬜", callback_data: `pick_${i * 5 + j}` });
        keyboard.push(row);
    }
    activeMines[id] = { bet, mines: Array.from({length: bombs}, () => Math.floor(Math.random()*25)), step: 0 };
    bot.sendMessage(msg.chat.id, `💣 *Mines (Bet: ${bet}, Bombs: ${bombs})*\nClick a button:`, { reply_markup: { inline_keyboard: keyboard } });
});

bot.on('callback_query', (query) => {
    if (!query.data.startsWith('pick_')) return;
    const id = query.from.id;
    const pos = parseInt(query.data.split('_')[1]);
    const game = activeMines[id];
    if (!game) return bot.answerCallbackQuery(query.id, { text: "Game expired!" });

    if (game.mines.includes(pos)) {
        users[id].coins -= game.bet;
        delete activeMines[id];
        bot.editMessageText("💥 *BOOM!* Game Over.", { chat_id: query.message.chat.id, message_id: query.message.message_id });
    } else {
        game.step++;
        bot.editMessageText(`✅ *Safe!* Mult: ${1.3 + (game.step * 0.5)}x\nKeep picking!`, { chat_id: query.message.chat.id, message_id: query.message.message_id });
    }
});

http.createServer((req, res) => res.end('Bot is running')).listen(process.env.PORT || 3000);
