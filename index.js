const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// ===== ADMIN IDS =====
const ADMINS = [1315564307, 8708547223];

// ===== GLOBAL DATA (NO DB YET) =====
let users = {};
let leaderboardCache = {};

// ===== GLOBAL NUMBER GUESS =====
let secretNumber = Math.floor(Math.random() * 100) + 1;
let guessActive = true;

// ===== GET USER =====
function getUser(user) {
  if (!users[user.id]) {
    users[user.id] = {
      id: user.id,
      name: user.first_name,
      coins: 0,
      wins: 0,
      losses: 0,
      achievements: [],
      lastDaily: 0,
      lastSpin: 0,
    };
  }
  return users[user.id];
}

// ===== START =====
bot.onText(/\/start/, (msg) => {
  const u = getUser(msg.from);

  if (!u.started) {
    u.started = true;
    u.coins += 2000;
  }

  bot.sendMessage(msg.chat.id, `🎮 Welcome to Gaming Space! 🎮

🎁 Thanks for starting, You are rewarded with 2000 Coins 🎁

Use these commands to play:
🔹 /profile - View status & coins
🔹 /daily - Claim 1000 Coins
🔹 /spin - Spin for 1k-10k coins
🔹 /leaderboard - View Top 15 players

🎮 Games Available: 
🎲 /dice <amount>
🪙 /flip <heads/tails> <amount>
🔢 /numberguess
👉 /ng <number>
✨ /myachievement`);
});

// ===== PROFILE =====
bot.onText(/\/profile/, (msg) => {
  const u = getUser(msg.from);

  bot.sendMessage(msg.chat.id, `👤 Profile

Name: ${u.name}
ID: ${u.id}
💰 Coins: ${u.coins}
🏆 Wins: ${u.wins}
💀 Losses: ${u.losses}
🎖 Achievements: ${u.achievements.length}`);
});

// ===== DAILY =====
bot.onText(/\/daily/, (msg) => {
  const u = getUser(msg.from);
  const now = Date.now();

  if (now - u.lastDaily < 12 * 60 * 60 * 1000) {
    return bot.sendMessage(msg.chat.id, "⏳ Daily already claimed. Try after 12 hours.");
  }

  u.lastDaily = now;
  u.coins += 1000;

  bot.sendMessage(msg.chat.id, "🎁 You claimed 1000 Coins!");
});

// ===== SPIN =====
bot.onText(/\/spin/, (msg) => {
  const u = getUser(msg.from);
  const now = Date.now();

  if (now - u.lastSpin < 12 * 60 * 60 * 1000) {
    return bot.sendMessage(msg.chat.id, "⏳ Spin cooldown 12 hours.");
  }

  u.lastSpin = now;

  const reward = Math.floor(Math.random() * 9000) + 1000;
  u.coins += reward;

  bot.sendMessage(msg.chat.id, `🎰 You won ${reward} coins!`);
});

// ===== LEADERBOARD =====
bot.onText(/\/leaderboard/, (msg) => {
  let top = Object.values(users)
    .sort((a, b) => b.coins - a.coins)
    .slice(0, 15);

  let text = "🏆 TOP 15 PLAYERS\n\n";

  top.forEach((u, i) => {
    text += `${i + 1}. ${u.name} - ${u.coins} coins\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

// ===== DICE GAME =====
bot.onText(/\/dice (\d+)/, (msg, match) => {
  const u = getUser(msg.from);
  let amount = parseInt(match[1]);

  if (amount < 1000 || amount > 20000)
    return bot.sendMessage(msg.chat.id, "❌ Amount 1k - 20k only");

  if (u.coins < amount)
    return bot.sendMessage(msg.chat.id, "❌ Not enough coins");

  let roll = Math.floor(Math.random() * 6) + 1;

  if (roll >= 4) {
    u.coins += amount;
    u.wins++;
    bot.sendMessage(msg.chat.id, `🎲 ${roll} → You WON ${amount} coins`);
  } else {
    u.coins -= amount;
    u.losses++;
    bot.sendMessage(msg.chat.id, `🎲 ${roll} → You LOST ${amount} coins`);
  }
});

// ===== FLIP =====
bot.onText(/\/flip (heads|tails) (\d+)/, (msg, match) => {
  const u = getUser(msg.from);
  let choice = match[1];
  let amount = parseInt(match[2]);

  if (amount < 1000 || amount > 10000)
    return bot.sendMessage(msg.chat.id, "❌ Amount 1k - 10k only");

  if (u.coins < amount)
    return bot.sendMessage(msg.chat.id, "❌ Not enough coins");

  let result = Math.random() < 0.5 ? "heads" : "tails";

  if (result === choice) {
    u.coins += amount;
    u.wins++;
    bot.sendMessage(msg.chat.id, `🪙 ${result} → You WON ${amount}`);
  } else {
    u.coins -= amount;
    u.losses++;
    bot.sendMessage(msg.chat.id, `🪙 ${result} → You LOST`);
  }
});

// ===== NUMBER GUESS (GLOBAL) =====
bot.onText(/\/numberguess/, (msg) => {
  bot.sendMessage(msg.chat.id, "🔢 Guess a number between 1-100 using /ng <number>");
});

bot.onText(/\/ng (\d+)/, (msg, match) => {
  const u = getUser(msg.from);
  let guess = parseInt(match[1]);

  if (!guessActive)
    return bot.sendMessage(msg.chat.id, "❌ Game not active now");

  if (guess < 1 || guess > 100)
    return bot.sendMessage(msg.chat.id, "❌ 1-100 only");

  if (guess === secretNumber) {
    let reward = 1000;
    u.coins += reward;
    u.wins++;

    secretNumber = Math.floor(Math.random() * 100) + 1;

    return bot.sendMessage(msg.chat.id, `🎉 Correct! You got ${reward} coins!
New number generated 🔁`);
  }

  u.losses++;
  bot.sendMessage(msg.chat.id, "❌ Wrong guess! Try again");
});

// ===== MY ACHIEVEMENT =====
bot.onText(/\/myachievement/, (msg) => {
  const u = getUser(msg.from);

  if (u.achievements.length === 0)
    return bot.sendMessage(msg.chat.id, "❌ No achievements yet");

  let text = "🏅 Achievements:\n\n";
  u.achievements.forEach((a, i) => {
    text += `${i + 1}. ${a}\n`;
  });

  bot.sendMessage(msg.chat.id, text);
});

// ===== ADMIN COMMANDS (REPLY BASED) =====
bot.on("message", (msg) => {
  const fromId = msg.from.id;
  if (!ADMINS.includes(fromId)) return;

  if (!msg.reply_to_message) return;

  const target = getUser(msg.reply_to_message.from);

  let text = msg.text;

  // ADD COINS
  if (text.startsWith("/add")) {
    let amt = parseInt(text.split(" ")[1]);
    target.coins += amt;

    return bot.sendMessage(msg.chat.id, `✅ Added ${amt} Coins to ${target.name}`);
  }

  // REMOVE COINS
  if (text.startsWith("/remove")) {
    let amt = parseInt(text.split(" ")[1]);
    target.coins -= amt;

    return bot.sendMessage(msg.chat.id, `❌ Removed ${amt} Coins from ${target.name}`);
  }

  // ADD ACHIEVEMENT
  if (text.startsWith("/addachievement")) {
    let ach = text.replace("/addachievement", "").trim();
    target.achievements.push(ach);

    return bot.sendMessage(msg.chat.id, `🏅 Added Achievement to ${target.name}`);
  }

  // REMOVE ACHIEVEMENT
  if (text.startsWith("/rmachievement")) {
    let idx = parseInt(text.split(" ")[1]) - 1;

    if (target.achievements[idx]) {
      target.achievements.splice(idx, 1);
      return bot.sendMessage(msg.chat.id, `🗑 Removed Achievement from ${target.name}`);
    }
  }
});

console.log("🚀 Gaming Bot Started...");
