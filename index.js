Const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// --- SET YOUR TELEGRAM USER ID HERE ---
const ADMIN_ID = 1315564307; 8708547223;

// In-Memory Database (Temporary until MongoDB setup)
const users = {};
const activeGames = {}; 

// Helper function to initialize user data
function initUser(userId, firstName) {
  if (!users[userId]) {
    users[userId] = {
      name: firstName || "Player",
      coins: 2000, 
      wins: 0,
      losses: 0,
      lastClaim: null,
      lastSpin: null
    };
    return true; 
  }
  return false; 
}

// ==========================================
// 1. START COMMAND & REGISTRATION LOCK
// ==========================================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const firstName = msg.from.first_name;
  
  const isNew = initUser(userId, firstName);

  let welcomeText = `🎮 *Welcome to Gaming Space!* 🎮\n\n`;
  if (isNew) {
    welcomeText += `🎁 *Thanks for starting! Your reward: 2000 Coins* 🎁\n\n`;
  }

  welcomeText += `Use these commands to play:\n` +
                 `🔹 /profile - View status & coins\n` +
                 `🔹 /daily - Claim 1000 Coins (24h)\n` +
                 `🔹 /spin - Spin for 1k-10k coins (24h)\n` +
                 `🔹 /leaderboard - View Top 15 players\n\n` +
                 `🎮 *Games Available:* \n` +
                 `🎲 /dice <amount> (Limit: 100-20k)\n` +
                 `🪙 /flip <heads/tails> <amount> (Limit: 100-30k)\n` +
                 `🔢 /numberguess - Start Number Guessing Game\n` +
                 `👉 /ng <number> - Make your guess (1-100)`;

  bot.sendMessage(chatId, welcomeText, { parse_mode: "Markdown" });
});

// ==========================================
// 2. PHASE 1 COMMANDS (Profile, Daily, Spin, Leaderboard)
// ==========================================
bot.onText(/\/profile/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!users[userId]) {
    return bot.sendMessage(chatId, `❌ *Access Denied!*\nPlease /start the bot first.`, { parse_mode: "Markdown" });
  }

  const user = users[userId];
  const profileText = `👤 *YOUR GAME PROFILE* 👤\n\n` +
                      `📝 *Name:* ${user.name}\n` +
                      `💰 *Total Coins:* ${user.coins} CL Tokens\n` +
                      `✅ *Total Wins:* ${user.wins}\n` +
                      `❌ *Total Losses:* ${user.losses}\n` +
                      `🆔 *User ID:* \`${userId}\``;

  bot.sendMessage(chatId, profileText, { parse_mode: "Markdown" });
});

bot.onText(/\/daily/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!users[userId]) return bot.sendMessage(chatId, `❌ Please /start first.`);

  const user = users[userId];
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;

  if (user.lastClaim && (now - user.lastClaim < cooldown)) {
    const remaining = cooldown - (now - user.lastClaim);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    bot.sendMessage(chatId, `❌ *Cooldown active!*\n⏳ Wait *${hours}h ${minutes}m*.`, { parse_mode: "Markdown" });
  } else {
    user.coins += 1000;
    user.lastClaim = now;
    bot.sendMessage(chatId, `🎁 *Daily Reward:* Received *1000 Coins*.\n💰 Total: *${user.coins}*`, { parse_mode: "Markdown" });
  }
});

bot.onText(/\/spin/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!users[userId]) return bot.sendMessage(chatId, `❌ Please /start first.`);

  const user = users[userId];
  const now = Date.now();
  const cooldown = 24 * 60 * 60 * 1000;

  if (user.lastSpin && (now - user.lastSpin < cooldown)) {
    const remaining = cooldown - (now - user.lastSpin);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    bot.sendMessage(chatId, `❌ *Wheel is cooling down!*\n⏳ Wait *${hours}h ${minutes}m*.`, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, "🎡 *Spinning the Wheel...* 🔄").then((sentMsg) => {
      setTimeout(() => {
        const randomMultiplier = Math.floor(Math.random() * 10) + 1; 
        const wonAmount = randomMultiplier * 1000; 

        user.coins += wonAmount;
        user.wins += 1; 
        user.lastSpin = now; 

        bot.editMessageText(`🎉 *Spin Wheel Result!* 🎉\n\n🎡 Stopped at: *${wonAmount} Tokens*!\n💰 Total Coins: *${user.coins}*`, {
          chat_id: chatId,
          message_id: sentMsg.message_id,
          parse_mode: "Markdown"
        });
      }, 2000);
    });
  }
});

bot.onText(/\/leaderboard/, (msg) => {
  const chatId = msg.chat.id;
  const sortedPlayers = Object.keys(users)
    .map(id => ({ name: users[id].name, coins: users[id].coins }))
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 15); 

  let leaderboardText = `🌎 *TOP 15 -- COINS* 🪙\n\n`;
  sortedPlayers.forEach((player, index) => {
    let medal = `${index + 1}.`;
    if (index === 0) medal = "🥇";
    if (index === 1) medal = "🥈";
    if (index === 2) medal = "🥉";
    leaderboardText += `${medal} *${player.name}* - ${player.coins} 🪙\n`;
  });
  if (sortedPlayers.length === 0) leaderboardText += "No data available yet.";
  bot.sendMessage(chatId, leaderboardText, { parse_mode: "Markdown" });
});

// ==========================================
// 3. PHASE 2 GAMES (Dice, Flip, NumberGuess)
// ==========================================

// --- DICE GAME ---
bot.onText(/\/dice (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const amount = parseInt(match[1]);
  const user = users[userId];

  if (!user) return bot.sendMessage(chatId, "❌ Please use /start first.");
  if (amount < 100 || amount > 20000) return bot.sendMessage(chatId, "⚠️ *Dice Limit:* 100 to 20,000 coins.", { parse_mode: "Markdown" });
  if (user.coins < amount) return bot.sendMessage(chatId, "❌ You don't have enough coins for this bet!");

  const roll = Math.floor(Math.random() * 6) + 1; 
  if (roll >= 4) {
    user.coins += amount;
    user.wins += 1;
    bot.sendMessage(chatId, `🎲 *Dice Roll:* ${roll}\n\n🎉 *WIN!* You doubled your bet.\n💰 Added: *${amount}* coins.\nBalance: *${user.coins}*`, { parse_mode: "Markdown" });
  } else {
    user.coins -= amount;
    user.losses += 1;
    bot.sendMessage(chatId, `🎲 *Dice Roll:* ${roll}\n\n❌ *LOSS!* You lost your bet.\n📉 Deducted: *${amount}* coins.\nBalance: *${user.coins}*`, { parse_mode: "Markdown" });
  }
});

// --- COIN FLIP ---
bot.onText(/\/flip (heads|tails) (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const choice = match[1].toLowerCase();
  const amount = parseInt(match[2]);
  const user = users[userId];

  if (!user) return bot.sendMessage(chatId, "❌ Please use /start first.");
  if (amount < 100 || amount > 30000) return bot.sendMessage(chatId, "⚠️ *Flip Limit:* 100 to 30,000 coins.", { parse_mode: "Markdown" });
  if (user.coins < amount) return bot.sendMessage(chatId, "❌ You don't have enough coins for this bet!");

  const result = Math.random() < 0.5 ? "heads" : "tails";
  
  if (choice === result) {
    user.coins += amount;
    user.wins += 1;
    bot.sendMessage(chatId, `🪙 *Coin Result:* ${result.toUpperCase()}\n\n🎉 *WIN!* Choice matched.\n💰 Won: *${amount}* coins.\nBalance: *${user.coins}*`, { parse_mode: "Markdown" });
  } else {
    user.coins -= amount;
    user.losses += 1;
    bot.sendMessage(chatId, `🪙 *Coin Result:* ${result.toUpperCase()}\n\n❌ *LOSS!* Choice mismatched.\n📉 Lost: *${amount}* coins.\nBalance: *${user.coins}*`, { parse_mode: "Markdown" });
  }
});

// --- NUMBER GUESSING ---
bot.onText(/\/numberguess/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!users[userId]) return bot.sendMessage(chatId, "❌ Please use /start first.");
  
  activeGames[userId] = {
    target: Math.floor(Math.random() * 100) + 1,
    attempts: 0
  };

  bot.sendMessage(chatId, `🔢 *Number Guessing Game Started!*\n\nI've chosen a number between *1 and 100*.\nUse \`/ng <number>\` to guess!`, { parse_mode: "Markdown" });
});

bot.onText(/\/ng (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const guess = parseInt(match[1]);

  if (!activeGames[userId]) {
    return bot.sendMessage(chatId, "❌ No active game. Start one with /numberguess");
  }

  const game = activeGames[userId];
  game.attempts += 1;

  if (guess === game.target) {
    let reward = 500;
    if (game.attempts <= 3) reward = 3000;
    else if (game.attempts <= 7) reward = 1000;

    users[userId].coins += reward;
    delete activeGames[userId]; 

    bot.sendMessage(chatId, `🎉 *CORRECT!* The number was *${guess}*.\n🎯 Total Attempts: *${game.attempts}*\n💰 Reward Credited: *${reward} Coins*!`, { parse_mode: "Markdown" });
  } else {
    const hint = guess < game.target ? "Higher ⬆️" : "Lower ⬇️";
    bot.sendMessage(chatId, `❌ *Wrong Guess!*\n💡 Hint: Try a *${hint}* number.\n⏳ Attempt Count: *${game.attempts}*`, { parse_mode: "Markdown" });
  }
});

// ==========================================
// ADMIN CONTROL: ADD & REMOVE COINS
// ==========================================

// /addcoins <amount>
bot.onText(/\/addcoins (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const amount = parseInt(match[1]);

    // Admin Check
    if (senderId !== ADMIN_ID) {
        return bot.sendMessage(chatId, "❌ Access Denied!");
    }

    // Reply Check
    if (!msg.reply_to_message) {
        return bot.sendMessage(chatId, "⚠️ Please reply to a player's message to add coins.");
    }

    const targetUser = msg.reply_to_message.from;
    const targetUserId = targetUser.id;

    if (!users[targetUserId]) {
        return bot.sendMessage(chatId, "❌ Player is not registered (Tell them to /start).");
    }

    users[targetUserId].coins += amount;
    
    bot.sendMessage(chatId, `✅ Added ${amount} coins to ${targetUser.first_name}.\n💰 New Balance: ${users[targetUserId].coins}`, { parse_mode: "Markdown" });
});

// /removecoins <amount>
bot.onText(/\/removecoins (\d+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const senderId = msg.from.id;
    const amount = parseInt(match[1]);

    // Admin Check
    if (senderId !== ADMIN_ID) {
        return bot.sendMessage(chatId, "❌ Access Denied!");
    }

    // Reply Check
    if (!msg.reply_to_message) {
        return bot.sendMessage(chatId, "⚠️ Please reply to a player's message to deduct coins.");
    }

    const targetUser = msg.reply_to_message.from;
    const targetUserId = targetUser.id;

    if (!users[targetUserId]) {
        return bot.sendMessage(chatId, "❌ Player is not registered.");
    }

    // Deduct coins
    users[targetUserId].coins = Math.max(0, users[targetUserId].coins - amount);
    
    bot.sendMessage(chatId, `✅ Deducted ${amount} coins from ${targetUser.first_name}.\n💰 New Balance: ${users[targetUserId].coins}`, { parse_mode: "Markdown" });
});
