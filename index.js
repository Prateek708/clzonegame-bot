import TelegramBot from 'node-telegram-bot-api';

// Yahan apna token daalein
const token = 'YOUR_TELEGRAM_BOT_TOKEN_HERE';
const bot = new TelegramBot(token, { polling: true });

// Dummy database (Restart par data delete ho jayega)
const users = new Map();

// Helper function to check/create user
const getUser = (id) => {
    if (!users.has(id)) users.set(id, { coins: 2000, items: [] });
    return users.get(id);
};

// 1. /start
bot.onText(/\/start/, (msg) => {
    const user = getUser(msg.from.id);
    bot.sendMessage(msg.chat.id, 
        `✨ **Welcome to the Game!**\n\n` +
        `Thanks For Starting! You are rewarded with **2000 Coins!!!** 🪙\n\n` +
        `Commands:\n/help - All features\n/profile - Your stats\n/shop - View items`, 
        { parse_mode: 'Markdown' }
    );
});

// 2. /help
bot.onText(/\/help/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `🤖 **Bot Command Menu**\n\n` +
        `💰 **Economy**\n/daily - 1000 coins\n/profile - View stats\n/leaderboard - Top 15\n\n` +
        `🎲 **Games**\n/spin - 1k-10k coins\n/dice <amount> - Roll\n/flip <h/t> <amount> - Coin flip\n/numberguess - Start game\n\n` +
        `🛒 **Shop**\n/shop - Items\n/buy <num> - Purchase\n/myitems - Your items`,
        { parse_mode: 'Markdown' }
    );
});

// 3. /profile
bot.onText(/\/profile/, (msg) => {
    const user = getUser(msg.from.id);
    bot.sendMessage(msg.chat.id, `👤 **Your Profile**\n\n💰 Coins: ${user.coins}\n🎒 Items: ${user.items.length}`, { parse_mode: 'Markdown' });
});

// 4. /shop
bot.onText(/\/shop/, (msg) => {
    bot.sendMessage(msg.chat.id, 
        `🛒 **Bot Shop**\n\n` +
        `1️⃣ Double XP - 20,000\n2️⃣ Lucky Charm - 17,000\n3️⃣ Custom Title - 99,000\n` +
        `4️⃣ Extra Spin - 8,000\n5️⃣ Shield - 20,000\n6️⃣ Premium Pass - 99,000`,
        { parse_mode: 'Markdown' }
    );
});

// 5. /dice <amount>
bot.onText(/\/dice (.+)/, (msg, match) => {
    const amount = parseInt(match[1]);
    const user = getUser(msg.from.id);
    if (isNaN(amount) || amount < 1000) return bot.sendMessage(msg.chat.id, "❌ Min 1000 coins lagayein.");
    
    const roll = Math.floor(Math.random() * 6) + 1;
    if (roll >= 4) {
        user.coins += amount;
        bot.sendMessage(msg.chat.id, `🎲 Roll: ${roll}\
