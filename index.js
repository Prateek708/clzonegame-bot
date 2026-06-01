const { Telegraf } = require('telegraf');
const fs = require('fs');

// ADMIN IDs
const ADMIN_IDS = [1315564307, 8708547223];

// DATA FILE
const DATA_FILE = 'user_data.json';

function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
    return {};
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 4));
}

let userData = loadData();
let userSpinCooldown = {};
let numberGuessGames = {};

function saveUser(userId, username) {
    if (!userData[userId]) {
        userData[userId] = {
            userId: userId,
            username: username,
            coins: 2000,
            wins: 0,
            losses: 0,
            gamesPlayed: 0,
            achievements: [],
            dailyLast: null,
            spinLast: null
        };
        saveData(userData);
    }
}

function getTimeRemaining(lastTime) {
    if (!lastTime) return null;
    const last = new Date(lastTime);
    const now = new Date();
    const timePassed = now - last;
    if (timePassed >= 24 * 60 * 60 * 1000) return null;
    const remaining = (24 * 60 * 60 * 1000) - timePassed;
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
}

function findUser(searchText) {
    searchText = searchText.replace('@', '').toLowerCase();
    for (const [userId, data] of Object.entries(userData)) {
        if (data.username.toLowerCase() === searchText || 
            data.username.toLowerCase().includes(searchText) ||
            userId === searchText ||
            String(data.userId) === searchText) {
            return { userId: parseInt(userId), data: data };
        }
    }
    return null;
}

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('BOT_TOKEN not set');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// TEST COMMAND
bot.command('test', async (ctx) => {
    await ctx.reply('✅ Test Successful! Bot is active!');
});

// START COMMAND
bot.start(async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    await ctx.reply('Welcome to Gaming Space! Use /help for commands');
});

// HELP COMMAND
bot.command('help', async (ctx) => {
    await ctx.reply(`Commands:
/start - Start bot
/profile - View profile
/daily - Claim 1000 coins
/spin - Spin wheel
/leaderboard - Top players
/dice <amount> - Dice game
/flip <heads/tails> <amount> - Flip game
/numberguess - Start number game
/ng <number> - Make guess
/myachievement - View achievements
/shop - View shop
/buy <number> - Buy item
/test - Check bot status`);
});

// PROFILE COMMAND
bot.command('profile', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    const stats = userData[user.id];
    await ctx.reply(`Profile:
Name: ${stats.username}
Coins: ${stats.coins}
Wins: ${stats.wins}
Losses: ${stats.losses}
ID: ${stats.userId}`);
});

// DAILY COMMAND
bot.command('daily', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    const userId = user.id;
    const now = new Date();
    
    if (userData[userId].dailyLast) {
        const lastDaily = new Date(userData[userId].dailyLast);
        if (now - lastDaily < 24 * 60 * 60 * 1000) {
            const remaining = getTimeRemaining(userData[userId].dailyLast);
            await ctx.reply(`Daily already claimed! Next: ${remaining}`);
            return;
        }
    }
    
    userData[userId].coins += 1000;
    userData[userId].dailyLast = now.toISOString();
    saveData(userData);
    await ctx.reply(`+1000 Coins! Total: ${userData[userId].coins}`);
});

// SPIN COMMAND
bot.command('spin', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    const userId = user.id;
    const now = new Date();
    
    if (userSpinCooldown[userId]) {
        const remaining = getTimeRemaining(userSpinCooldown[userId]);
        if (remaining) {
            await ctx.reply(`Spin cooldown! Next: ${remaining}`);
            return;
        }
    }
    
    const spinAmount = Math.floor(Math.random() * 9000) + 1000;
    userData[userId].coins += spinAmount;
    userSpinCooldown[userId] = now.toISOString();
    saveData(userData);
    await ctx.reply(`🎡 You won ${spinAmount} coins! Balance: ${userData[userId].coins}`);
});

// LEADERBOARD COMMAND
bot.command('leaderboard', async (ctx) => {
    const sorted = Object.values(userData).sort((a, b) => b.coins - a.coins);
    const top = sorted.slice(0, 15);
    let text = 'TOP 15 PLAYERS\n\n';
    for (let i = 0; i < top.length; i++) {
        text += `${i+1}. ${top[i].username} - ${top[i].coins} coins\n`;
    }
    await ctx.reply(text);
});

// DICE COMMAND
bot.command('dice', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply('Usage: /dice <amount> (1000-20000)');
        return;
    }
    const amount = parseInt(args[1]);
    if (amount < 1000 || amount > 20000) {
        await ctx.reply('Amount must be between 1000-20000');
        return;
    }
    const userId = user.id;
    if (userData[userId].coins < amount) {
        await ctx.reply(`Insufficient coins! You have ${userData[userId].coins}`);
        return;
    }
    const roll = Math.floor(Math.random() * 6) + 1;
    if (roll <= 3) {
        userData[userId].coins -= amount;
        userData[userId].losses++;
        saveData(userData);
        await ctx.reply(`You rolled ${roll}! You lost ${amount} coins! Balance: ${userData[userId].coins}`);
    } else {
        userData[userId].coins += amount;
        userData[userId].wins++;
        saveData(userData);
        await ctx.reply(`You rolled ${roll}! You won ${amount} coins! Balance: ${userData[userId].coins}`);
    }
});

// SHOP COMMAND
bot.command('shop', async (ctx) => {
    await ctx.reply(`SHOP:
1. Double XP - 20000 coins (24h)
2. Lucky Charm - 17000 coins (1 game)
3. Custom Title - 99000 coins (Permanent)
4. Extra Spin - 1400 coins (One time)
5. Shield - 20000 coins (1 use)
6. Premium Pass - 99000 coins (Permanent)

Use: /buy <number>`);
});

// BUY COMMAND
bot.command('buy', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply('Usage: /buy <item_number>');
        return;
    }
    const itemNum = parseInt(args[1]);
    const prices = {1:20000, 2:17000, 3:99000, 4:1400, 5:20000, 6:99000};
    const names = {1:'Double XP', 2:'Lucky Charm', 3:'Custom Title', 4:'Extra Spin', 5:'Shield', 6:'Premium Pass'};
    
    if (!prices[itemNum]) {
        await ctx.reply('Invalid item number! Use /shop');
        return;
    }
    
    const userId = user.id;
    if (userData[userId].coins < prices[itemNum]) {
        await ctx.reply(`Insufficient coins! Need ${prices[itemNum]}, you have ${userData[userId].coins}`);
        return;
    }
    
    userData[userId].coins -= prices[itemNum];
    saveData(userData);
    await ctx.reply(`You bought ${names[itemNum]} for ${prices[itemNum]} coins! Balance: ${userData[userId].coins}`);
});

// ADMIN ADD COINS
bot.command('add', async (ctx) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        await ctx.reply('Not authorized');
        return;
    }
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        await ctx.reply('Usage: /add <amount> <user>');
        return;
    }
    const amount = parseInt(args[1]);
    const target = args.slice(2).join(' ');
    const user = findUser(target);
    if (!user) {
        await ctx.reply('User not found');
        return;
    }
    user.data.coins += amount;
    saveData(userData);
    await ctx.reply(`Added ${amount} coins to ${user.data.username}! New balance: ${user.data.coins}`);
});

// ADMIN REMOVE COINS
bot.command('remove', async (ctx) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        await ctx.reply('Not authorized');
        return;
    }
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        await ctx.reply('Usage: /remove <amount> <user>');
        return;
    }
    const amount = parseInt(args[1]);
    const target = args.slice(2).join(' ');
    const user = findUser(target);
    if (!user) {
        await ctx.reply('User not found');
        return;
    }
    if (user.data.coins >= amount) {
        user.data.coins -= amount;
        saveData(userData);
        await ctx.reply(`Removed ${amount} coins from ${user.data.username}! New balance: ${user.data.coins}`);
    } else {
        await ctx.reply(`User doesn't have enough coins! Has: ${user.data.coins}`);
    }
});

// MY ACHIEVEMENT
bot.command('myachievement', async (ctx) => {
    const user = ctx.from;
    if (!userData[user.id] || userData[user.id].achievements.length === 0) {
        await ctx.reply('❌ No Achievement! Win your first game to get an achievement!');
        return;
    }
    await ctx.reply(`Your achievements: ${userData[user.id].achievements.join(', ')}`);
});

// NUMBER GUESS START
bot.command('numberguess', async (ctx) => {
    const user = ctx.from;
    const target = Math.floor(Math.random() * 100) + 1;
    numberGuessGames[user.id] = { target: target, attempts: 0 };
    await ctx.reply('Number guess game started! Guess a number 1-100 using /ng <number>');
});

// NUMBER GUESS
bot.command('ng', async (ctx) => {
    const user = ctx.from;
    if (!numberGuessGames[user.id]) {
        await ctx.reply('Start a game with /numberguess first!');
        return;
    }
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply('Usage: /ng <number>');
        return;
    }
    const guess = parseInt(args[1]);
    const game = numberGuessGames[user.id];
    game.attempts++;
    
    if (guess === game.target) {
        let reward = 500;
        if (game.attempts <= 3) reward = 5000;
        else if (game.attempts <= 5) reward = 3000;
        else if (game.attempts <= 7) reward = 1000;
        
        saveUser(user.id, user.first_name);
        userData[user.id].coins += reward;
        saveData(userData);
        await ctx.reply(`Correct! The number was ${game.target}. You won ${reward} coins! Balance: ${userData[user.id].coins}`);
        delete numberGuessGames[user.id];
    } else {
        const hint = guess < game.target ? 'higher' : 'lower';
        await ctx.reply(`Wrong! The number is ${hint}. Attempts: ${game.attempts}`);
    }
});

// FLIP COMMAND
bot.command('flip', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        await ctx.reply('Usage: /flip <heads/tails> <amount> (1000-20000)');
        return;
    }
    const choice = args[1].toLowerCase();
    const amount = parseInt(args[2]);
    if (amount < 1000 || amount > 20000) {
        await ctx.reply('Amount must be between 1000-20000');
        return;
    }
    const userId = user.id;
    if (userData[userId].coins < amount) {
        await ctx.reply(`Insufficient coins! You have ${userData[userId].coins}`);
        return;
    }
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    if (choice === result) {
        userData[userId].coins += amount;
        userData[userId].wins++;
        saveData(userData);
        await ctx.reply(`It's ${result}! You won ${amount} coins! Balance: ${userData[userId].coins}`);
    } else {
        userData[userId].coins -= amount;
        userData[userId].losses++;
        saveData(userData);
        await ctx.reply(`It's ${result}! You lost ${amount} coins! Balance: ${userData[userId].coins}`);
    }
});

// START BOT
bot.launch().then(() => {
    console.log('Bot started successfully!');
}).catch(err => {
    console.error('Error:', err);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
