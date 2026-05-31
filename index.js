const remaining = cooldown - (now - user.lastSpin);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    bot.sendMessage(chatId, ❌ *Wheel is cooling down!*\n⏳ Wait *${hours}h ${minutes}m*., { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(chatId, "🎡 *Spinning the Wheel...* 🔄").then((sentMsg) => {
      setTimeout(() => {
        const randomMultiplier = Math.floor(Math.random() * 10) + 1; 
        const wonAmount = randomMultiplier * 1000; 

        user.coins += wonAmount;
        user.wins += 1; 
        user.lastSpin = now; 

        bot.editMessageText(🎉 *Spin Wheel Result!* 🎉\n\n🎡 Stopped at: *${wonAmount} Tokens*!\n💰 Total Coins: *${user.coins}*, {
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

  let leaderboardText = 🌎 *TOP 15 -- COINS* 🪙\n\n;
  sortedPlayers.forEach((player, index) => {
    let medal = ${index + 1}.;
    if (index === 0) medal = "🥇";
    if (index === 1) medal = "🥈";
    if (index === 2) medal = "🥉";
    leaderboardText += ${medal} *${player.name}* - ${player.coins} 🪙\n;
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
    bot.sendMessage(chatId, 🎲 *Dice Roll:* ${roll}\n\n🎉 *WIN!* You doubled your bet.\n💰 Added: *${amount}* coins.\nBalance: *${user.coins}*, { parse_mode: "Markdown" });
  } else {
    user.coins -= amount;
    user.losses += 1;
    bot.sendMessage(chatId, 🎲 *Dice Roll:* ${roll}\n\n❌ *LOSS!* You lost your bet.\n📉 Deducted: *${amount}* coins.\nBalance: *${user.coins}*, { parse_mode: "Markdown" });
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
    bot.sendMessage(chatId, 🪙 *Coin Result:* ${result.toUpperCase()}\n\n🎉 *WIN!* Choice matched.\n💰 Won: *${amount}* coins.\nBalance: *${user.coins}*, { parse_mode: "Markdown" });
  } else {
    user.coins -= amount;
    user.losses += 1;
    bot.sendMessage(chatId, 🪙 *Coin Result:* ${result.toUpperCase()}\n\n❌ *LOSS!* Choice mismatched.\n📉 Lost: *${amount}* coins.\nBalance: *${user.coins}*, { parse_mode: "Markdown" });
  }
});
