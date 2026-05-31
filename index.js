// --- NUMBER GUESSING ---
bot.onText(/\/numberguess/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  if (!users[userId]) return bot.sendMessage(chatId, "❌ Please use /start first.");
  
  activeGames[userId] = {
    target: Math.floor(Math.random() * 100) + 1,
    attempts: 0
  };

  bot.sendMessage(chatId, 🔢 *Number Guessing Game Started!*\n\nI've chosen a number between *1 and 100*.\nUse \/ng <number>\ to guess!, { parse_mode: "Markdown" });
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

    bot.sendMessage(chatId, 🎉 *CORRECT!* The number was *${guess}*.\n🎯 Total Attempts: *${game.attempts}*\n💰 Reward Credited: *${reward} Coins*!, { parse_mode: "Markdown" });
  } else {
    const hint = guess < game.target ? "Higher ⬆️" : "Lower ⬇️";
    bot.sendMessage(chatId, ❌ *Wrong Guess!*\n💡 Hint: Try a *${hint}* number.\n⏳ Attempt Count: *${game.attempts}*, { parse_mode: "Markdown" });
  }
});

// ==========================================
// 4. ADMIN CONTROL (Add Coins by Replying)
// ==========================================
bot.onText(/\/add (\d+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const senderId = msg.from.id;
  const amount = parseInt(match[1]);

  if (senderId !== ADMIN_ID) {
    return bot.sendMessage(chatId, "❌ *Access Denied!* Only the Bot Admin can add coins.", { parse_mode: "Markdown" });
  }

  if (!msg.reply_to_message) {
    return bot.sendMessage(chatId, "⚠️ Please *reply* to a player's message with /add <amount> to give them coins.", { parse_mode: "Markdown" });
  }

  const targetUserId = msg.reply_to_message.from.id;
  
  if (!users[targetUserId]) {
    return bot.sendMessage(chatId, "❌ This player is not registered in temporary database yet (Ask them to /start).");
  }

  users[targetUserId].coins += amount;
  bot.sendMessage(chatId, added ${amount});
});

console.log("CL Zone Bot Core Online");

// --- Render Web Service Port Binding ---
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('CL Zone Bot is Alive and Running!');
});
server.listen(port, () => {
  console.log(Server standard checking active on port ${port});
});
