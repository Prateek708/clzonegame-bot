const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

// ============ ADMIN IDs ============
const ADMIN_IDS = [1315564307, 8708547223];

// ============ DATA PERSISTENCE ============
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

// ============ GLOBAL VARIABLES ============
let userData = loadData();
let userSpinCooldown = {};
let numberGuessGames = {};

// ============ HELPER FUNCTIONS ============
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
            spinLast: null,
            numberGuessWins: 0
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

function addAchievement(userId, achievement) {
    if (!userData[userId].achievements.includes(achievement)) {
        userData[userId].achievements.push(achievement);
        saveData(userData);
        return true;
    }
    return false;
}

function removeAchievement(userId, achievement) {
    const index = userData[userId].achievements.indexOf(achievement);
    if (index > -1) {
        userData[userId].achievements.splice(index, 1);
        saveData(userData);
        return true;
    }
    return false;
}

// Find user by username or ID or mention
function findUser(searchText) {
    // Remove @ if present
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

// ============ BOT INITIALIZATION ============
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
    console.error('❌ Please set BOT_TOKEN environment variable!');
    process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// ============ COMMAND HANDLERS ============

// Start Command
bot.start(async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    
    const welcomeText = `🎮 **Welcome to Gaming Space!** 🎮

🎁 Thanks for starting! You are rewarded with **2000 Coins** 🎁

**Use these commands to play:**
🔹 /profile - View status & coins
🔹 /daily - Claim 1000 Coins
🔹 /spin - Spin for 1k-10k coins
🔹 /leaderboard - View Top 15 players

**🎮 Games Available:** 
🎲 /dice <amount> - Dice game (1-3: lose, 4-6: win double)
🪙 /flip <heads/tails> <amount> - Flip coin game
🔢 /numberguess - Start number guessing game
👉 /ng <number> - Make a guess
✨ /myachievement - View your achievements
🛍️ /shop - Visit game shop

**🧪 Test Command:**
/test - Check if bot is active`;
    
    await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
});

// Test Command
bot.command('test', async (ctx) => {
    await ctx.reply('✅ **Test Successful!**\n\nBot is active and running perfectly! 🎮\n\nTime: ' + new Date().toLocaleString(), { parse_mode: 'Markdown' });
});

// Profile Command
bot.command('profile', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    
    const stats = userData[user.id];
    
    const profileText = `👤 **YOUR GAME PROFILE** 👤

📝 **Name:** ${stats.username}
💰 **Total Coins:** ${stats.coins} CL Tokens
✅ **Total Wins:** ${stats.wins}
❌ **Total Losses:** ${stats.losses}
🆔 **User ID:** ${stats.userId}
📊 **Games Played:** ${stats.gamesPlayed}`;
    
    await ctx.reply(profileText, { parse_mode: 'Markdown' });
});

// Daily Command
bot.command('daily', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    
    const userId = user.id;
    const now = new Date();
    
    if (userData[userId].dailyLast) {
        const lastDaily = new Date(userData[userId].dailyLast);
        if (now - lastDaily < 24 * 60 * 60 * 1000) {
            const remaining = getTimeRemaining(userData[userId].dailyLast);
            await ctx.reply(`⏰ **Daily reward already claimed!**\n\nNext claim: ${remaining}`, { parse_mode: 'Markdown' });
            return;
        }
    }
    
    userData[userId].coins += 1000;
    userData[userId].dailyLast = now.toISOString();
    saveData(userData);
    
    await ctx.reply(`🎁 **Daily Reward Claimed!**\n\n+1000 Coins 🪙\n💰 Total Coins: ${userData[userId].coins}`, { parse_mode: 'Markdown' });
});

// Spin Command
bot.command('spin', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    
    const userId = user.id;
    const now = new Date();
    
    if (userSpinCooldown[userId]) {
        const remaining = getTimeRemaining(userSpinCooldown[userId]);
        if (remaining) {
            await ctx.reply(`🎡 **Spin on cooldown!**\n\nNext spin available: ${remaining}`, { parse_mode: 'Markdown' });
            return;
        }
    }
    
    const spinAmount = Math.floor(Math.random() * (10000 - 1000 + 1) + 1000);
    userData[userId].coins += spinAmount;
    userSpinCooldown[userId] = now.toISOString();
    saveData(userData);
    
    const spinText = `🎡 **SPIN RESULT** 🎡

🔄 Wheel spinning...
✨ You won: **+${spinAmount} Coins** 🪙

💰 New Balance: ${userData[userId].coins} Coins

⏰ Next spin available in 24 hours!`;
    
    await ctx.reply(spinText, { parse_mode: 'Markdown' });
});

// Leaderboard Command
bot.command('leaderboard', async (ctx) => {
    const sortedUsers = Object.values(userData).sort((a, b) => b.coins - a.coins);
    const topPlayers = sortedUsers.slice(0, 15);
    
    if (topPlayers.length === 0) {
        await ctx.reply("📊 No players yet!", { parse_mode: 'Markdown' });
        return;
    }
    
    let leaderboardText = "🌎 **TOP 15 -- COINS 🪙**\n\n";
    const emojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    
    for (let i = 0; i < Math.min(10, topPlayers.length); i++) {
        leaderboardText += `${emojis[i]} **${topPlayers[i].username.substring(0, 20)}** - ${topPlayers[i].coins} 🪙\n`;
    }
    
    for (let i = 10; i < Math.min(15, topPlayers.length); i++) {
        leaderboardText += `${i+1}. **${topPlayers[i].username.substring(0, 20)}** - ${topPlayers[i].coins} 🪙\n`;
    }
    
    await ctx.reply(leaderboardText, { parse_mode: 'Markdown' });
});

// Dice Game
bot.command('dice', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply("🎲 **Usage:** `/dice <amount>`\nAmount between 1000-20000", { parse_mode: 'Markdown' });
        return;
    }
    
    const amount = parseInt(args[1]);
    if (isNaN(amount)) {
        await ctx.reply("❌ Please enter a valid number!", { parse_mode: 'Markdown' });
        return;
    }
    
    if (amount < 1000 || amount > 20000) {
        await ctx.reply("❌ **Invalid amount!**\nMinimum: 1000 coins\nMaximum: 20000 coins", { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = user.id;
    if (userData[userId].coins < amount) {
        await ctx.reply(`❌ **Insufficient coins!**\nYou have ${userData[userId].coins} coins`, { parse_mode: 'Markdown' });
        return;
    }
    
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const diceEmojis = {1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅"};
    
    userData[userId].gamesPlayed++;
    
    let resultText;
    if (diceRoll <= 3) {
        userData[userId].coins -= amount;
        userData[userId].losses++;
        resultText = `🎲 **DICE RESULT** 🎲

${diceEmojis[diceRoll]} You rolled: **${diceRoll}**

❌ **You LOST!** (0x)
💸 Lost: ${amount} coins

💰 New Balance: ${userData[userId].coins} coins`;
    } else {
        const winAmount = amount;
        userData[userId].coins += winAmount;
        userData[userId].wins++;
        
        if (userData[userId].wins === 1) {
            addAchievement(userId, 'first_win');
        }
        
        resultText = `🎲 **DICE RESULT** 🎲

${diceEmojis[diceRoll]} You rolled: **${diceRoll}**

✅ **You WON!** (2x)
🎉 Won: +${winAmount} coins

💰 New Balance: ${userData[userId].coins} coins`;
    }
    
    saveData(userData);
    await ctx.reply(resultText, { parse_mode: 'Markdown' });
});

// Flip Game
bot.command('flip', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        await ctx.reply("🪙 **Usage:** `/flip <heads/tails> <amount>`\nAmount between 1000-20000", { parse_mode: 'Markdown' });
        return;
    }
    
    const choice = args[1].toLowerCase();
    if (choice !== 'heads' && choice !== 'tails') {
        await ctx.reply("❌ Choose 'heads' or 'tails'!", { parse_mode: 'Markdown' });
        return;
    }
    
    const amount = parseInt(args[2]);
    if (isNaN(amount)) {
        await ctx.reply("❌ Please enter a valid number!", { parse_mode: 'Markdown' });
        return;
    }
    
    if (amount < 1000 || amount > 20000) {
        await ctx.reply("❌ **Invalid amount!**\nMinimum: 1000 coins\nMaximum: 20000 coins", { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = user.id;
    if (userData[userId].coins < amount) {
        await ctx.reply(`❌ **Insufficient coins!**\nYou have ${userData[userId].coins} coins`, { parse_mode: 'Markdown' });
        return;
    }
    
    const flipResult = Math.random() < 0.5 ? 'heads' : 'tails';
    const flipEmojis = { heads: '🪙 Heads', tails: '🪙 Tails' };
    
    userData[userId].gamesPlayed++;
    
    let resultText;
    if (choice === flipResult) {
        const winAmount = amount;
        userData[userId].coins += winAmount;
        userData[userId].wins++;
        
        if (userData[userId].wins === 1) {
            addAchievement(userId, 'first_win');
        }
        
        resultText = `🪙 **FLIP RESULT** 🪙

${flipEmojis[flipResult]}

✅ **You WON!** (2x)
🎉 Won: +${winAmount} coins

💰 New Balance: ${userData[userId].coins} coins`;
    } else {
        userData[userId].coins -= amount;
        userData[userId].losses++;
        
        resultText = `🪙 **FLIP RESULT** 🪙

${flipEmojis[flipResult]}

❌ **You LOST!**
💸 Lost: ${amount} coins

💰 New Balance: ${userData[userId].coins} coins`;
    }
    
    saveData(userData);
    await ctx.reply(resultText, { parse_mode: 'Markdown' });
});

// Number Guess Start
bot.command('numberguess', async (ctx) => {
    const user = ctx.from;
    const targetNumber = Math.floor(Math.random() * 100) + 1;
    
    numberGuessGames[user.id] = {
        target: targetNumber,
        attempts: 0,
        guessedNumbers: []
    };
    
    await ctx.reply(`🔢 **Number Guess Game Started!**\n\nI'm thinking of a number between 1-100.\nUse /ng <number> to guess!\n\nBetter attempts = better rewards!`, { parse_mode: 'Markdown' });
});

// Number Guess
bot.command('ng', async (ctx) => {
    const user = ctx.from;
    const userId = user.id;
    
    if (!numberGuessGames[userId]) {
        await ctx.reply("❌ Start a game first using `/numberguess`!", { parse_mode: 'Markdown' });
        return;
    }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply("🔢 **Usage:** `/ng <number>`\nNumber between 1-100", { parse_mode: 'Markdown' });
        return;
    }
    
    const guess = parseInt(args[1]);
    if (isNaN(guess) || guess < 1 || guess > 100) {
        await ctx.reply("❌ Please enter a valid number between 1-100!", { parse_mode: 'Markdown' });
        return;
    }
    
    saveUser(user.id, user.first_name);
    const game = numberGuessGames[userId];
    game.attempts++;
    game.guessedNumbers.push(guess);
    
    if (guess === game.target) {
        let reward;
        if (game.attempts <= 3) reward = 5000;
        else if (game.attempts <= 5) reward = 3000;
        else if (game.attempts <= 7) reward = 1000;
        else reward = 500;
        
        userData[userId].coins += reward;
        userData[userId].wins++;
        userData[userId].gamesPlayed++;
        userData[userId].numberGuessWins = (userData[userId].numberGuessWins || 0) + 1;
        
        if (userData[userId].wins === 1) {
            addAchievement(userId, 'first_win');
        }
        
        saveData(userData);
        
        const resultText = `🔢 **NUMBER GUESS RESULT** 🎯

✅ **Correct!** The number was ${game.target}

📊 Attempts used: ${game.attempts}
🎁 Reward: +${reward} coins

💰 New Balance: ${userData[userId].coins} coins`;
        
        delete numberGuessGames[userId];
        await ctx.reply(resultText, { parse_mode: 'Markdown' });
    } else {
        const hint = guess < game.target ? "higher ⬆️" : "lower ⬇️";
        
        const resultText = `🔢 **NUMBER GUESS** 🎯

❌ Wrong guess! The number is ${hint}

📊 Your guess: ${guess}
🎯 Attempts used: ${game.attempts}
💡 Keep guessing! Use /ng <number>`;
        
        await ctx.reply(resultText, { parse_mode: 'Markdown' });
    }
});

// My Achievements
bot.command('myachievement', async (ctx) => {
    const user = ctx.from;
    const userId = user.id;
    
    if (!userData[userId]) {
        await ctx.reply("❌ Start the bot with /start first!", { parse_mode: 'Markdown' });
        return;
    }
    
    const achievementsList = userData[userId].achievements || [];
    
    if (achievementsList.length === 0) {
        await ctx.reply("❌ **No Achievement!**\n\nWin your first game to get an achievement! 🏆", { parse_mode: 'Markdown' });
        return;
    }
    
    const achievementNames = {
        'first_win': '🏆 First Victory - Win your first game',
        'lucky_spin': '🍀 Lucky Spinner - Get 10k coins from spin',
        'high_roller': '💎 High Roller - Reach 50k coins',
        'game_master': '🎮 Game Master - Play 10 games'
    };
    
    let achievementText = "✨ **YOUR ACHIEVEMENTS** ✨\n\n";
    for (const ach of achievementsList) {
        if (achievementNames[ach]) {
            achievementText += `✓ ${achievementNames[ach]}\n`;
        }
    }
    
    await ctx.reply(achievementText, { parse_mode: 'Markdown' });
});

// Shop Command
bot.command('shop', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    
    const shopText = `🛍️ **GAMING SHOP** 🛍️

━━━━━━━━━━━━━━━━━━━
1️⃣ 🎯 **Double XP** (24h)
   Effect: Double coins on wins
   Price: \`20000\` coins

2️⃣ 💰 **Lucky Charm** (1 game)
   Effect: +25% win chance
   Price: \`17000\` coins

3️⃣ 🎨 **Custom Title** (Permanent)
   Effect: Special title in profile
   Price: \`99000\` coins

4️⃣ 🃏 **Extra Spin** (One time)
   Effect: One additional spin
   Price: \`1400\` coins

5️⃣ 🛡️ **Shield** (1 use)
   Effect: Protect from 1 loss
   Price: \`20000\` coins

6️⃣ 💎 **Premium Pass** (Permanent)
   Effect: Daily bonus x2 + more
   Price: \`99000\` coins
━━━━━━━━━━━━━━━━━━━

💰 Your Coins: \`${userData[user.id].coins}\` coins

Use: /buy <item_number>
Example: /buy 1

Use: /myitems to see owned items`;
    
    await ctx.reply(shopText, { parse_mode: 'Markdown' });
});

// Buy Command
bot.command('buy', async (ctx) => {
    const user = ctx.from;
    saveUser(user.id, user.first_name);
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply("🛍️ **Usage:** /buy <item_number>\nUse /shop to see items", { parse_mode: 'Markdown' });
        return;
    }
    
    const itemNum = parseInt(args[1]);
    const shopItems = {
        1: { name: '🎯 Double XP', price: 20000, effect: 'double_xp' },
        2: { name: '💰 Lucky Charm', price: 17000, effect: 'lucky_charm' },
        3: { name: '🎨 Custom Title', price: 99000, effect: 'custom_title' },
        4: { name: '🃏 Extra Spin', price: 1400, effect: 'extra_spin' },
        5: { name: '🛡️ Shield', price: 20000, effect: 'shield' },
        6: { name: '💎 Premium Pass', price: 99000, effect: 'premium' }
    };
    
    if (!shopItems[itemNum]) {
        await ctx.reply("❌ Invalid item number! Use /shop to see available items", { parse_mode: 'Markdown' });
        return;
    }
    
    const item = shopItems[itemNum];
    const userId = user.id;
    
    if (userData[userId].coins < item.price) {
        await ctx.reply(`❌ **Insufficient coins!**\nNeed: ${item.price} coins\nYou have: ${userData[userId].coins} coins`, { parse_mode: 'Markdown' });
        return;
    }
    
    userData[userId].coins -= item.price;
    saveData(userData);
    
    await ctx.reply(`✅ **Purchase Successful!**\n\nYou bought: ${item.name}\n💸 Cost: ${item.price} coins\n\n💰 Remaining Coins: ${userData[userId].coins}\n\n✨ Item effect will be applied automatically!`, { parse_mode: 'Markdown' });
});

// My Items
bot.command('myitems', async (ctx) => {
    await ctx.reply("📦 **Coming Soon!**\n\nItem inventory system is being upgraded. Your purchased items are saved and will be applied automatically when you play games!", { parse_mode: 'Markdown' });
});

// ============ ADMIN COMMANDS (With User Tag Support) ============

// Add Coins - Admin (supports @username, user_id, or name)
bot.command('add', async (ctx) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        await ctx.reply("❌ You are not authorized to use this command!", { parse_mode: 'Markdown' });
        return;
    }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        await ctx.reply("👑 **Admin Usage:** /add <amount> <@username or user_id or name>\n\nExamples:\n/add 500 @Prateek\n/add 1000 1315564307\n/add 750 Prateek", { parse_mode: 'Markdown' });
        return;
    }
    
    const amount = parseInt(args[1]);
    if (isNaN(amount)) {
        await ctx.reply("❌ Invalid amount!", { parse_mode: 'Markdown' });
        return;
    }
    
    const target = args.slice(2).join(' ');
    const user = findUser(target);
    
    if (!user) {
        await ctx.reply(`❌ User not found! Try using @username or user ID.\n\nExample: /add 500 @username`, { parse_mode: 'Markdown' });
        return;
    }
    
    user.data.coins += amount;
    saveData(userData);
    await ctx.reply(`✅ Added ${amount} coins to ${user.data.username}!\n💰 New balance: ${user.data.coins} coins`, { parse_mode: 'Markdown' });
});

// Remove Coins - Admin (supports @username, user_id, or name)
bot.command('remove', async (ctx) => {
    if (!ADMIN_IDS.includes(ctx.from.id)) {
        await ctx.reply("❌ You are not authorized to use this command!", { parse_mode: 'Markdown' });
        return;
    }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        await ctx.reply("👑 **Admin Usage:** /remove <amount> <@username or user_id or name>\n\nExamples:\n/remove 500 @Prateek\n/remove 1000 1315564307", { parse_mode: 'Markdown' });
        return;
    }
    
    const amount = parseInt(args[1]);
    if (isNaN(amount)) {
        await ctx.reply("❌ Invalid amount!", { parse_mode: 'Markdown' });
        return;
    }
    
    const target = args.slice(2).join(' ');
    const user = findUser(target);
    
    if (!user) {
        await ctx.reply(`❌ User not found!
