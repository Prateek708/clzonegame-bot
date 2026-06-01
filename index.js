const TelegramBot = require("node-telegram-bot-api");
const token = process.env.BOT_TOKEN; 
const bot = new TelegramBot(token, { polling: true });

const ADMIN_IDS = [1315564307, 8708547223];
const users = {};
const activeGames = {};
const achievements = [];

// Helper: Format Time
const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const mins = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
};

// Start Command
bot.onText(/\/start/, (msg) => {
    const uid = msg.from.id;
    if (!users[uid]) {
        users[uid] = { name: msg.from.first_name, coins: 2000, wins: 0, losses: 0, lastClaim: 0, lastSpin: 0 };
    }
    const txt = `🎮 *Welcome to Gaming Space!* 🎮\n\n` +
                `💰 *Balance:* ${users[uid].coins} 🪙\n\n` +
                `🔹 /profile - View Status\n` +
                `🎁 /daily - 1000 Coins Daily\n` +
                `🎡 /spin - Wheel (1k-10k)\n` +
                `🎲 /dice <amount> - (1-3 Lose, 4-6 Win)\n` +
                `🪙 /flip <heads/tails> <amount>\n` +
                `🔢 /numberguess - Play Guess\n` +
                `🏆 /myachievement - Check Achievements\n` +
                `📊 /leaderboard - Top 15 Players`;
    bot.sendMessage(msg.chat.id, txt, { parse_mode: "Markdown" });
});

// Profile
bot.onText(/\/profile/, (msg) => {
    const u = users[msg.from.id];
    if (!u) return bot.sendMessage(msg.chat.id, "❌ Please /start first.");
    const txt = `👤 *YOUR PROFILE*\n\n` +
                `📛 Name: ${u.name}\n` +
                `💰 Coins: ${u.coins} 🪙\n` +
                `✅ Wins: ${u.wins}\n` +
                `❌ Losses: ${u.losses}`;
    bot.sendMessage(msg.chat.id, txt, { parse_mode: "Markdown" });
});

// Daily
bot.onText(/\/daily/, (msg) => {
    const u = users[msg.from.id];
    const now = Date.now();
    if (now - u.lastClaim < 86400000) {
        return bot.sendMessage(msg.chat.id, `⏳ *Wait ${formatTime(86400000 - (now - u.lastClaim))} for next reward!*`);
    }
    u.coins += 1000;
    u.lastClaim = now;
    bot.sendMessage(msg.chat.id, `🎁 *Received 1000 Coins!* New Balance: ${u.coins} 🪙`);
});

// Spin Wheel
bot.onText(/\/spin/, (msg) => {
    const u = users[msg.from.id];
    const now = Date.now();
    if (now - u.lastSpin < 86400000) {
        return bot.sendMessage(msg.chat.id, `🎡 *Spin cooling down!* Wait ${formatTime(86400000 - (now - u.lastSpin))}`);
    }
    const amount = (Math.floor(Math.random() * 10) + 1) * 1000;
    u.coins += amount;
    u.lastSpin = now;
    bot.sendMessage(msg.chat.id, `🎡 *Spinning...*\n\n🎉 *Congrats! You won ${amount} coins!*\n💰 Total: ${u.coins} 🪙`);
});

// Dice Game
bot.onText(/\/dice (\d+)/, (msg, match) => {
    const amount = parseInt(match[1]);
    const u = users[msg.from.id];
    if (amount < 1000 || amount > 20000) return bot.sendMessage(msg.chat.id, "⚠️ *Limit:* 1k to 20k coins only.");
    if (u.coins < amount) return bot.sendMessage(msg.chat.id, "❌ *Insufficient Balance!*");
    
    const roll = Math.floor(Math.random() * 6) + 1;
    if (roll >= 4) {
        u.coins += amount; u.wins++;
        bot.sendMessage(msg.chat.id, `🎲 *Dice:* ${roll}\n🎉 *WIN! You got ${amount} coins.*`);
    } else {
        u.coins -= amount; u.losses++;
        bot.sendMessage(msg.chat.id, `🎲 *Dice:* ${roll}\n❌ *LOSS! You lost ${amount} coins.*`);
    }
});

// Flip Coin
bot.onText(/\/flip (heads|tails) (\d+)/, (msg, match) => {
    const choice = match[1];
    const amount = parseInt(match[2]);
    const u = users[msg.from.id];
    if (amount < 1000 || amount > 20000) return bot.sendMessage(msg.chat.id, "⚠️ *Limit:* 1k to 20k coins.");
    
    const res = Math.random() < 0.5 ? "heads" : "tails";
    if (choice === res) {
        u.coins += amount; u.wins++;
        bot.sendMessage(msg.chat.id, `🪙 *Result:* ${res.toUpperCase()}\n🎉 *You won ${amount} coins!*`);
    } else {
        u.coins -= amount; u.losses++;
        bot.sendMessage(msg.chat.id, `🪙 *Result:* ${res.toUpperCase()}\n❌ *Loss! ${amount} coins gone.*`);
    }
});

// Admin Commands
bot.onText(/\/add (\d+)/, (msg, match) => {
    if (!ADMIN_IDS.includes(msg.from.id) || !msg.reply_to_message) return;
    const uid = msg.reply_to_message.from.id;
    const amount = parseInt(match[1]);
    users[uid].coins += amount;
    bot.sendMessage(msg.chat.id, `✅ *Added ${amount} coins to ${users[uid].name}*`);
});

// Leaderboard
bot.onText(/\/leaderboard/, (msg) => {
    const sorted = Object.values(users).sort((a, b) => b.coins - a.coins).slice(0, 15);
    let res = "🌎 *TOP 15 -- COINS* 🪙\n\n";
    sorted.forEach((u, i) => { res += `${i + 1}. ${u.name} - ${u.coins} 🪙\n`; });
    bot.sendMessage(msg.chat.id, res, { parse_mode: "Markdown" });
});

// Test
bot.onText(/\/test/, (msg) => bot.sendMessage(msg.chat.id, "✅ *Bot is working perfectly!*"));
