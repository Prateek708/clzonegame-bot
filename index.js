const TelegramBot = require("node-telegram-bot-api");
const token = "YOUR_BOT_TOKEN_HERE"; // Yahan apna token daalo
const bot = new TelegramBot(token, { polling: true });

const ADMIN_IDS = [1315564307, 8708547223];
const users = {};
const activeGames = {};
let achievements = []; // Global list

// --- Helper Functions ---
const initUser = (uid, name) => {
    if (!users[uid]) {
        users[uid] = { name, coins: 2000, wins: 0, losses: 0, lastClaim: 0, lastSpin: 0 };
        return true;
    }
    return false;
};

// --- Command: Start ---
bot.onText(/\/start/, (msg) => {
    const isNew = initUser(msg.from.id, msg.from.first_name);
    let msgText = "🎮 *Welcome to Gaming Space!* 🎮\n\n";
    if (isNew) msgText += "🫶🏻 *Thanks for starting! You are rewarded with 2000 Coins!* 🎁\n\n";
    
    msgText += "📋 *MAIN COMMANDS:*\n" +
               "🔹 /profile - View status & coins\n" +
               "🎁 /daily - Claim 1000 Coins\n" +
               "🎡 /spin - Win 1k-10k coins\n" +
               "📊 /leaderboard - View Top 15 players\n\n" +
               "🎮 *GAMES AVAILABLE:*\n" +
               "🎲 /dice <amount> - (4-6 Win, 1-3 Lose)\n" +
               "🪙 /flip <heads/tails> <amount>\n" +
               "🔢 /numberguess - Start game\n" +
               "👉 /ng <number> - Guess number\n" +
               "✨ /myachievement - View achievements";
    
    bot.sendMessage(msg.chat.id, msgText, { parse_mode: "Markdown" });
});

// --- Command: Profile ---
bot.onText(/\/profile/, (msg) => {
    const u = users[msg.from.id];
    if (!u) return bot.sendMessage(msg.chat.id, "❌ Please /start first.");
    const txt = `👤 *YOUR GAME PROFILE* 👤\n\n` +
                `📝 Name: ${u.name}\n` +
                `💰 Total Coins: ${u.coins} CL Tokens\n` +
                `✅ Total Wins: ${u.wins}\n` +
                `❌ Total Losses: ${u.losses}\n` +
                `🆔 User ID: ${msg.from.id}`;
    bot.sendMessage(msg.chat.id, txt, { parse_mode: "Markdown" });
});

// --- Command: Number Guessing ---
bot.onText(/\/numberguess/, (msg) => {
    activeGames[msg.from.id] = { target: Math.floor(Math.random() * 100) + 1, attempts: 0 };
    bot.sendMessage(msg.chat.id, "🔢 *Number Guessing Game Started!*\nI've chosen a number (1-100). Use /ng <number> to guess!");
});

bot.onText(/\/ng (\d+)/, (msg, match) => {
    const game = activeGames[msg.from.id];
    if (!game) return bot.sendMessage(msg.chat.id, "❌ No active game. Use /numberguess");
    
    game.attempts++;
    const guess = parseInt(match[1]);
    
    if (guess === game.target) {
        users[msg.from.id].coins += 1000;
        delete activeGames[msg.from.id];
        bot.sendMessage(msg.chat.id, `🎉 *CORRECT!* The number was ${guess}.\n💰 Reward: 1000 Coins added!`);
    } else {
        const hint = guess < game.target ? "Higher ⬆️" : "Lower ⬇️";
        bot.sendMessage(msg.chat.id, `❌ *Wrong Guess!* Try ${hint}. (Attempt: ${game.attempts})`);
    }
});

// --- Admin: Add/Remove ---
bot.onText(/\/add (\d+)/, (msg, match) => {
    if (!ADMIN_IDS.includes(msg.from.id) || !msg.reply_to_message) return;
    const amount = parseInt(match[1]);
    users[msg.reply_to_message.from.id].coins += amount;
    bot.sendMessage(msg.chat.id, `✅ *Added ${amount} coins to ${msg.reply_to_message.from.first_name}*`);
});

bot.onText(/\/remove (\d+)/, (msg, match) => {
    if (!ADMIN_IDS.includes(msg.from.id) || !msg.reply_to_message) return;
    const amount = parseInt(match[1]);
    users[msg.reply_to_message.from.id].coins = Math.max(0, users[msg.reply_to_message.from.id].coins - amount);
    bot.sendMessage(msg.chat.id, `➖ *Removed ${amount} coins from ${msg.reply_to_message.from.first_name}*`);
});

// --- Achievements ---
bot.onText(/\/myachievement/, (msg) => {
    if (achievements.length === 0) {
        return bot.sendMessage(msg.chat.id, "🚫 *No achievements yet! Win some games first, buddy.*");
    }
    const txt = achievements.map((a, i) => `${i + 1}. ${a}`).join('\n');
    bot.sendMessage(msg.chat.id, `🏆 *ACHIEVEMENTS:*\n${txt}`);
});

// --- Test Command ---
bot.onText(/\/test/, (msg) => bot.sendMessage(msg.chat.id, "✅ *Bot is working perfectly!*"));
