const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const users = {}; 
const activeMines = {};
const activeNG = {}; 
const multipliers = [0.99, 1.3, 1.8, 1.131, 2.5, 4.0, 8.0];

function initUser(id, name) {
    if (!users[id]) {
        users[id] = { name, coins: 2000, wins: 0, losses: 0 };
    }
}

// --- WELCOME UI ---
bot.onText(/\/start(?:@\w+)?/, (msg) => {
    initUser(msg.from.id, msg.from.first_name);
    const text = `🎮 *Welcome to CL Zone Bot!* 🎮\n\n` +
                 `🎁 Thanks for starting! Your reward: 2000 Coins 🎁\n\n` +
                 `🔹 /profile - View status & coins\n` +
                 `🔹 /daily - Claim 500 Coins\n` +
                 `🔹 /leaderboard - View Top players\n\n` +
                 `🎮 *Games Available:*\n` +
                 `💣 /mines <amount> [bombs]\n` +
                 `🔢 /numberguess - Play Number Guess\n` +
                 `🎲 /dice <amount>\n` +
                 `🪙 /flip <heads/tails> <amount>`;
    bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// --- LEADERBOARD ---
bot.onText(/\/leaderboard(?:@\w+)?/, (msg) => {
    const sorted = Object.entries(users)
        .sort((a, b) => b[1].coins - a[1].coins)
        .slice(0, 15)
        .map((u, i) => `${i + 1}. ${u[1].name}: ${u[1].coins} 💰`)
        .join("\n");
    bot.sendMessage(msg.chat.id, `🏆 *Top 15 Players:*\n${sorted || "No players yet."}`);
});

// --- NUMBER GUESSING ---
bot.onText(/\/numberguess(?:@\w+)?/, (msg) => {
    activeNG[msg.from.id] = Math.floor(Math.random() * 100) + 1;
    bot.sendMessage(msg.chat.id, "🔢 *Guess a number (1-100)!* Use /ng <number>");
});

bot.onText(/\/ng(?:@\w+)?\s+(\d+)/, (msg, match) => {
    const guess = parseInt(match[1]);
    const secret = activeNG[msg.from.id];
    if (!secret) return bot.sendMessage(msg.chat.id, "❌ Start with /numberguess first.");
    if (guess === secret) {
        users[msg.from.id].coins += 1000;
        delete activeNG[msg.from.id];
        bot.sendMessage(msg.chat.id, "🎉 *Correct!* You won 1000 coins.");
    } else {
        bot.sendMessage(msg.chat.id, guess < secret ? "Too low! ⬆️" : "Too high! ⬇️");
    }
});

// --- MINES LOGIC ---
bot.onText(/\/mines(?:@\w+)?(?:\s+(\d+))?(?:\s+(\d+))?/, (msg, match) => {
    const id = msg.from.id;
    const bet = parseInt(match[1]);
    const bombCount = parseInt(match[2]) || 3;
    initUser(id, msg.from.first_name);

    if (!bet || bet < 100 || bet > 10000) return bot.sendMessage(msg.chat.id, "⚠️ Limit: 100-10,000.");
    if (users[id].coins < bet) return bot.sendMessage(msg.chat.id, "❌ Not enough coins.");

    let mines = [];
    while(mines.length < bombCount) {
        let r = Math.floor(Math.random() * 25);
        if(!mines.includes(r)) mines.push(r);
    }
    activeMines[id] = { bet, mines, step: 0 };
    bot.sendMessage(msg.chat.id, `💣 *Mines Game Started!*\nBet: ${bet} | Bombs: ${bombCount}\nUse /pick <0-24>`);
});

bot.onText(/\/pick(?:@\w+)?\s+(\d+)/, (msg, match) => {
    const id = msg.from.id;
    const game = activeMines[id];
    if (!game) return bot.sendMessage(msg.chat.id, "❌ No active game.");
    
    const pos = parseInt(match[1]);
    if (game.mines.includes(pos)) {
        users[id].coins -= game.bet;
        delete activeMines[id];
        bot.sendMessage(msg.chat.id, `💥 *BOOM!* Mine hit. You lost ${game.bet} coins.`);
    } else {
        const cur = multipliers[game.step] || 3.0;
        game.step++;
        bot.sendMessage(msg.chat.id, `✅ *Safe Spot!* Multiplier: ${cur}x\n/pick <0-24> or /cashout.`);
    }
});

bot.onText(/\/cashout(?:@\w+)?/, (msg) => {
    const id = msg.from.id;
    const game = activeMines[id];
    if (!game) return bot.sendMessage(msg.chat.id, "❌ No active game.");
    const win = Math.floor(game.bet * (multipliers[game.step - 1] || 1.0));
    users[id].coins += (win - game.bet);
    delete activeMines[id];
    bot.sendMessage(msg.chat.id, `💰 *Cashed out!* Won: ${win} coins.`);
});

// --- PROFILE & DAILY ---
bot.onText(/\/profile(?:@\w+)?/, (msg) => {
    const u = users[msg.from.id];
    if (!u) return bot.sendMessage(msg.chat.id, "Use /start first.");
    bot.sendMessage(msg.chat.id, `👤 ${u.name}\n💰 Coins: ${u.coins}\n✅ Wins: ${u.wins}\n❌ Losses: ${u.losses}`);
});

bot.onText(/\/daily(?:@\w+)?/, (msg) => {
    initUser(msg.from.id, msg.from.first_name);
    users[msg.from.id].coins += 500;
    bot.sendMessage(msg.chat.id, "🎁 You claimed 500 coins!");
});

http.createServer((req, res) => res.end('Bot is running')).listen(process.env.PORT || 3000);
