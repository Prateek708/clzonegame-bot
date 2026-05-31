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

// --- WELCOME UI ---
bot.onText(/\/start/, (msg) => {
    initUser(msg.from.id, msg.from.first_name);
    const welcomeText = `🎮 *Welcome to CL Zone Bot!* 🎮\n\n` +
                        `🎁 Thanks for starting! Your reward: 2000 Coins 🎁\n\n` +
                        `Use these commands to play:\n` +
                        `🔹 /profile - View status & coins\n` +
                        `🔹 /daily - Claim 1000 Coins (24h)\n` +
                        `🔹 /spin - Spin for 1k-10k coins (24h)\n` +
                        `🔹 /leaderboard - View Top 15 players\n\n` +
                        `🎮 *Games Available:*\n` +
                        `🎲 /dice <amount> (Limit: 100-20k)\n` +
                        `🪙 /flip <heads/tails> <amount> (Limit: 100-30k)\n` +
                        `🔢 /numberguess - Start Number Guessing Game\n` +
                        `👉 /ng <number> - Make your guess (1-100)\n` +
                        `💣 /mines <amount> (Limit: 100-10k)`;
    bot.sendMessage(msg.chat.id, welcomeText, { parse_mode: "Markdown" });
});

// --- MINES LOGIC (FIXED) ---
bot.onText(/\/mines(?:\s+(\d+))?/, (msg, match) => {
    const id = msg.from.id;
    const bet = parseInt(match[1]);
    initUser(id, msg.from.first_name);

    if (!bet || bet < 100 || bet > 10000) {
        return bot.sendMessage(msg.chat.id, "⚠️ *Format Error!*\nUsage: /mines <amount>\nLimit: 100-10,000");
    }
    if (users[id].coins < bet) return bot.sendMessage(msg.chat.id, "❌ Not enough coins.");

    activeMines[id] = { 
        bet, 
        mines: [Math.floor(Math.random()*25), Math.floor(Math.random()*25), Math.floor(Math.random()*25)], 
        step: 0 
    };
    bot.sendMessage(msg.chat.id, `💣 *Mines Game Started!*\n\n💰 Bet: ${bet} CL Tokens\n📈 Next Multiplier: 0.99x\n\nUse /pick <0-24> to reveal a spot!`);
});

bot.onText(/\/pick (\d+)/, (msg, match) => {
    const id = msg.from.id;
    const pos = parseInt(match[1]);
    const game = activeMines[id];
    if (!game) return bot.sendMessage(msg.chat.id, "❌ Start a game with /mines <amount> first.");

    if (game.mines.includes(pos)) {
        users[id].coins -= game.bet;
        users[id].losses++;
        delete activeMines[id];
        bot.sendMessage(msg.chat.id, `💥 *BOOM!* Mine hit. You lost ${game.bet} coins.`);
    } else {
        const cur = multipliers[game.step] || 3.0;
        game.step++;
        const next = multipliers[game.step] || "Max";
        bot.sendMessage(msg.chat.id, `✅ *Safe Spot!*\nCurrent: ${cur}x\nNext: ${next}x\n/pick <0-24> or /cashout.`);
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
