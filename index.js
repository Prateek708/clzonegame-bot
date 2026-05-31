const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const users = {}; 
const activeMines = {};
const multipliers = [0.99, 1.3, 1.8, 1.131, 2.5, 4.0, 8.0];

// --- INITIALIZATION ---
function initUser(id, name) {
    if (!users[id]) {
        users[id] = { name, coins: 2000, wins: 0, losses: 0, lastClaim: null, lastSpin: null };
    }
}

// --- PHASE 1 & 2 COMMANDS ---
bot.onText(/\/start/, (msg) => {
    initUser(msg.from.id, msg.from.first_name);
    bot.sendMessage(msg.chat.id, "Welcome to CL Zone! Commands: /profile, /daily, /spin, /dice, /flip, /mines <amt>.");
});

bot.onText(/\/profile/, (msg) => {
    const u = users[msg.from.id];
    if (!u) return bot.sendMessage(msg.chat.id, "Use /start first.");
    bot.sendMessage(msg.chat.id, `👤 ${u.name}\n💰 Coins: ${u.coins}\n✅ Wins: ${u.wins}\n❌ Losses: ${u.losses}`);
});

bot.onText(/\/daily/, (msg) => {
    initUser(msg.from.id, msg.from.first_name);
    users[msg.from.id].coins += 500;
    bot.sendMessage(msg.chat.id, "🎁 You claimed 500 coins!");
});

bot.onText(/\/dice/, (msg) => {
    const val = Math.floor(Math.random() * 6) + 1;
    bot.sendMessage(msg.chat.id, `🎲 You rolled a ${val}`);
});

bot.onText(/\/flip/, (msg) => {
    const res = Math.random() < 0.5 ? "Heads" : "Tails";
    bot.sendMessage(msg.chat.id, `🪙 Coin Flip: ${res}`);
});

// --- MINES GAME LOGIC ---
bot.onText(/\/mines (\d+)/, (msg, match) => {
    const id = msg.from.id;
    const bet = parseInt(match[1]);
    initUser(id, msg.from.first_name);

    if (bet < 100 || bet > 10000) return bot.sendMessage(msg.chat.id, "⚠️ Limit: 100-10,000 coins.");
    if (users[id].coins < bet) return bot.sendMessage(msg.chat.id, "❌ Not enough coins.");

    activeMines[id] = { bet, mines: [Math.floor(Math.random()*25), Math.floor(Math.random()*25), Math.floor(Math.random()*25)], step: 0 };
    bot.sendMessage(msg.chat.id, `💣 *Mines Game Started!*\nBet: ${bet}\nNext Multiplier: 0.99x\nUse /pick <0-24>`);
});

bot.onText(/\/pick (\d+)/, (msg, match) => {
    const id = msg.from.id;
    const pos = parseInt(match[1]);
    const game = activeMines[id];
    if (!game) return bot.sendMessage(msg.chat.id, "❌ Start with /mines <amt>.");

    if (game.mines.includes(pos)) {
        users[id].coins -= game.bet;
        users[id].losses++;
        delete activeMines[id];
        bot.sendMessage(msg.chat.id, `💥 *BOOM!* You lost ${game.bet} coins.`);
    } else {
        const cur = multipliers[game.step] || 3.0;
        game.step++;
        const next = multipliers[game.step] || "Max";
        bot.sendMessage(msg.chat.id, `✅ *Safe Spot!*\nCurrent: ${cur}x\nNext: ${next}x\n/pick or /cashout.`);
    }
});

bot.onText(/\/cashout/, (msg) => {
    const id = msg.from.id;
    const game = activeMines[id];
    if (!game) return bot.sendMessage(msg.chat.id, "❌ No active game.");
    
    const win = Math.floor(game.bet * (multipliers[game.step - 1] || 1.0));
    users[id].coins += (win - game.bet);
    users[id].wins++;
    delete activeMines[id];
    bot.sendMessage(msg.chat.id, `💰 *Cashed out!* Won: ${win} coins.`);
});

// --- RENDER KEEP ALIVE ---
http.createServer((req, res) => res.end('Bot is running')).listen(process.env.PORT || 3000);
