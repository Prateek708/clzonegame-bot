const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// --- ADMIN CONFIGURATION ---
const ADMIN_ID = 1315564307; 

// --- IN-MEMORY DATABASES ---
const users = {};
const activeGames = {};        // Number Guess
const activeCricketGames = {}; // Hand Cricket PvP
const activeRPSGames = {};     // RPS
const activeTTTGames = {};     // Tic-Tac-Toe

// User Initialization
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

// Helper: TTT Win Checker
function checkTTTWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.includes(null) ? null : 'draw';
}

// ==========================================
// 1. BASIC & CORE COMMANDS
// ==========================================

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isNew = initUser(userId, msg.from.first_name);

  let text = `🎮 *Welcome to CL Zone Bot!* 🎮\n\n`;
  if (isNew) text += `🎁 *New User Bonus: 2000 Coins Added!*\n\n`;

  text += `🔹 /profile - Check your stats & coins\n` +
          `🔹 /daily - Claim 1000 Coins (Daily)\n` +
          `🔹 /spin - Spin the lucky wheel (Daily)\n` +
          `🔹 /leaderboard - Top 15 richest players\n\n` +
          `🎮 *Games Available:* \n` +
          `🎲 /dice <amount> (100 - 20k)\n` +
          `🪙 /flip <heads/tails> <amount> (100 - 30k)\n` +
          `🔢 /numberguess - Play Guessing Game (Use /ng <num> to guess)\n` +
          `🪨 /rps <amount> - Rock Paper Scissors (Bot/PvP)\n` +
          `❌ /ttt <amount> - Tic Tac Toe (Bot/PvP)\n` +
          `🏏 /cricket <amount> - Hand Cricket (PvP + Modes)`;

  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
});

bot.onText(/\/profile/, (msg) => {
  const userId = msg.from.id;
  if (!users[userId]) initUser(userId, msg.from.first_name);
  const u = users[userId];

  const text = `👤 *YOUR GAME PROFILE* 👤\n\n` +
               `📝 *Name:* ${u.name}\n` +
               `💰 *Coins:* ${u.coins} CL Tokens\n` +
               `✅ *Wins:* ${u.wins}\n` +
               `❌ *Losses:* ${u.losses}\n` +
               `🆔 *ID:* \`${userId}\``;
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

bot.onText(/\/daily/, (msg) => {
  const userId = msg.from.id;
  if (!users[userId]) initUser(userId, msg.from.first_name);
  const u = users[userId];
  const now = Date.now();

  if (u.lastClaim && (now - u.lastClaim < 86400000)) {
    const rem = 86400000 - (now - u.lastClaim);
    return bot.sendMessage(msg.chat.id, `⏳ Wait *${Math.floor(rem/3600000)}h ${Math.floor((rem%3600000)/60000)}m* before claiming again!`, { parse_mode: "Markdown" });
  }
  u.coins += 1000;
  u.lastClaim = now;
  bot.sendMessage(msg.chat.id, `🎁 *Daily Reward:* 1000 coins added! Total: *${u.coins}*`, { parse_mode: "Markdown" });
});

bot.onText(/\/spin/, (msg) => {
  const userId = msg.from.id;
  if (!users[userId]) initUser(userId, msg.from.first_name);
  const u = users[userId];
  const now = Date.now();

  if (u.lastSpin && (now - u.lastSpin < 86400000)) {
    return bot.sendMessage(msg.chat.id, "❌ Wheel cooling down! Try again tomorrow.");
  }

  bot.sendMessage(msg.chat.id, "🎡 *Spinning...*").then((m) => {
    setTimeout(() => {
      const reward = (Math.floor(Math.random() * 10) + 1) * 1000;
      u.coins += reward;
      u.wins += 1;
      u.lastSpin = now;
      bot.editMessageText(`🎉 *Spin Result:* You won *${reward}* coins!\n💰 Balance: *${u.coins}*`, { chat_id: msg.chat.id, message_id: m.message_id, parse_mode: "Markdown" });
    }, 1500);
  });
});

bot.onText(/\/leaderboard/, (msg) => {
  const sorted = Object.keys(users).map(id => ({ name: users[id].name, coins: users[id].coins })).sort((a,b) => b.coins - a.coins).slice(0, 15);
  let text = `🌎 *TOP 15 LEADERS* 🪙\n\n`;
  sorted.forEach((p, i) => { text += `${i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1+"."} *${p.name}* - ${p.coins} 🪙\n`; });
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// ==========================================
// 2. CLASSIC GAMES (Dice, Flip, Guess)
// ==========================================

bot.onText(/\/dice (\d+)/, (msg, match) => {
  const userId = msg.from.id;
  const amt = parseInt(match[1]);
  if (!users[userId]) initUser(userId, msg.from.first_name);
  if (amt < 100 || amt > 20000) return bot.sendMessage(msg.chat.id, "⚠️ Bet limit: 100 to 20,000.");
  if (users[userId].coins < amt) return bot.sendMessage(msg.chat.id, "❌ Not enough coins!");

  const roll = Math.floor(Math.random() * 6) + 1;
  if (roll >= 4) {
    users[userId].coins += amt; users[userId].wins += 1;
    bot.sendMessage(msg.chat.id, `🎲 Roll: *${roll}*\n\n🎉 *WIN!* Doubled! Balance: *${users[userId].coins}*`, { parse_mode: "Markdown" });
  } else {
    users[userId].coins -= amt; users[userId].losses += 1;
    bot.sendMessage(msg.chat.id, `🎲 Roll: *${roll}*\n\n❌ *LOSS!* Lost bet. Balance: *${users[userId].coins}*`, { parse_mode: "Markdown" });
  }
});

bot.onText(/\/flip (heads|tails) (\d+)/, (msg, match) => {
  const userId = msg.from.id;
  const choice = match[1].toLowerCase();
  const amt = parseInt(match[2]);
  if (!users[userId]) initUser(userId, msg.from.first_name);
  if (amt < 100 || amt > 30000) return bot.sendMessage(msg.chat.id, "⚠️ Bet limit: 100 to 30,000.");
  if (users[userId].coins < amt) return bot.sendMessage(msg.chat.id, "❌ Not enough coins!");

  const res = Math.random() < 0.5 ? "heads" : "tails";
  if (choice === res) {
    users[userId].coins += amt; users[userId].wins += 1;
    bot.sendMessage(msg.chat.id, `🪙 Result: *${res.toUpperCase()}*\n\n🎉 *WIN!* Balance: *${users[userId].coins}*`, { parse_mode: "Markdown" });
  } else {
    users[userId].coins -= amt; users[userId].losses += 1;
    bot.sendMessage(msg.chat.id, `🪙 Result: *${res.toUpperCase()}*\n\n❌ *LOSS!* Balance: *${users[userId].coins}*`, { parse_mode: "Markdown" });
  }
});

bot.onText(/\/numberguess/, (msg) => {
  const userId = msg.from.id;
  if (!users[userId]) initUser(userId, msg.from.first_name);
  activeGames[userId] = { target: Math.floor(Math.random() * 100) + 1, attempts: 0 };
  bot.sendMessage(msg.chat.id, "🔢 System picked a number 1-100. Guess using `/ng <number>`");
});

bot.onText(/\/ng (\d+)/, (msg, match) => {
  const userId = msg.from.id;
  const guess = parseInt(match[1]);
  if (!activeGames[userId]) return msg.reply("❌ Start game using /numberguess first!");

  const game = activeGames[userId];
  game.attempts += 1;

  if (guess === game.target) {
    let bonus = game.attempts <= 3 ? 3000 : game.attempts <= 7 ? 1000 : 500;
    users[userId].coins += bonus; users[userId].wins += 1;
    delete activeGames[userId];
    bot.sendMessage(msg.chat.id, `🎉 *Correct!* You took ${game.attempts} attempts. Reward: *${bonus}* coins!`, { parse_mode: "Markdown" });
  } else {
    bot.sendMessage(msg.chat.id, guess < game.target ? "Higher ⬆️" : "Lower ⬇️");
  }
});

// ==========================================
// 3. ADVANCED RPS & TTT ENGINE (BOT + PVP)
// ==========================================

bot.onText(/\/rps(?:\s+(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const amt = match[1] ? parseInt(match[1]) : 0;
  if (!users[userId]) initUser(userId, msg.from.first_name);
  if (amt > 0 && users[userId].coins < amt) return bot.sendMessage(chatId, "❌ Insufficient balance!");

  const gameId = `rps_${chatId}_${Date.now()}`;
  activeRPSGames[gameId] = { p1: { id: userId, name: msg.from.first_name, choice: null }, p2: null, amount: amt, status: 'selecting' };

  bot.sendMessage(chatId, `🪨✂️📄 *RPS Game initiated by ${msg.from.first_name}*\n💰 Bet: ${amt || "Free"}\n\nSelect Mode:`, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{text:"Play vs Bot 🤖", callback_data:`rps_m_bot_${gameId}`},{text:"PvP Match 👥", callback_data:`rps_m_pvp_${gameId}`}]] }
  });
});

bot.onText(/\/ttt(?:\s+(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const amt = match[1] ? parseInt(match[1]) : 0;
  if (!users[userId]) initUser(userId, msg.from.first_name);
  if (amt > 0 && users[userId].coins < amt) return bot.sendMessage(chatId, "❌ Insufficient balance!");

  const gameId = `ttt_${chatId}_${Date.now()}`;
  activeTTTGames[gameId] = { p1: { id: userId, name: msg.from.first_name, symbol: '❌' }, p2: null, amount: amt, board: Array(9).fill(null), turn: null, status: 'selecting' };

  bot.sendMessage(chatId, `❌⭕ *Tic-Tac-Toe initiated by ${msg.from.first_name}*\n💰 Bet: ${amt || "Free"}\n\nSelect Mode:`, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{text:"Play vs Bot 🤖", callback_data:`ttt_m_bot_${gameId}`},{text:"PvP Match 👥", callback_data:`ttt_m_pvp_${gameId}`}]] }
  });
});

// ==========================================
// 4. HAND CRICKET ENGINE (PVP COMPLETE)
// ==========================================

bot.onText(/\/cricket(?:\s+(\d+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const amt = match[1] ? parseInt(match[1]) : 0;
  if (!users[userId]) initUser(userId, msg.from.first_name);
  if (amt > 0 && users[userId].coins < amt) return bot.sendMessage(chatId, "❌ Insufficient balance!");
  if (activeCricketGames[chatId]) return bot.sendMessage(chatId, "⚠️ A cricket match is already being setup/played in this chat.");

  activeCricketGames[chatId] = {
    p1: { id: userId, name: msg.from.first_name, score: 0 },
    p2: null, amount: amt, mode: 'Default', status: 'waiting', msgId: null,
    batting: null, bowling: null, innings: 1, target: null
  };

  const menu = {
    inline_keyboard: [
      [{ text: "Join Match 🤝", callback_data: `cri_join_${chatId}` }],
      [{ text: "1-3 Mode", callback_data: `cri_setmode_13_${chatId}` }, { text: "No 5 Mode", callback_data: `cri_setmode_no5_${chatId}` }],
      [{ text: "1-9 Mode", callback_data: `cri_setmode_19_${chatId}` }, { text: "Default 🏏", callback_data: `cri_setmode_def_${chatId}` }]
    ]
  };

  bot.sendMessage(chatId, `🏏 *Hand Cricket PvP Lobby*\n\n👤 *Host:* ${msg.from.first_name}\n💰 *Bet:* ${amt || "Free"}\n⚙️ *Mode:* Default\n\nWaiting for opponent...`, {
    parse_mode: "Markdown", reply_markup: menu
  }).then(m => activeCricketGames[chatId].msgId = m.message_id);
});

// ==========================================
// 5. CALLBACK HANDLER (CORE ENGINE INTEGRATION)
// ==========================================

bot.on('callback_query', (query) => {
  const data = query.data;
  const userId = query.from.id;
  const firstName = query.from.first_name;
  const chatId = query.message.chat.id;
  const msgId = query.message.message_id;

  // --- CRICKET LOBBY LOGIC ---
  if (data.startsWith('cri_join_')) {
    const cid = data.replace('cri_join_', '');
    const game = activeCricketGames[cid];
    if (!game || game.status !== 'waiting') return bot.answerCallbackQuery(query.id);
    if (game.p1.id === userId) return bot.answerCallbackQuery(query.id, { text: "You are the host!", show_alert: true });
    if (game.amount > 0 && (!users[userId] || users[userId].coins < game.amount)) return bot.answerCallbackQuery(query.id, { text: "Not enough coins!", show_alert: true });

    game.p2 = { id: userId, name: firstName, score: 0 };
    game.status = 'toss';
    
    bot.editMessageText(`🪙 *Toss Time!*\n\n@${game.p1.name}, choose your side:`, {
      chat_id: chatId, message_id: msgId,
      reply_markup: { inline_keyboard: [[{ text: "Heads 🪙", callback_data: `cri_t_heads_${cid}` }, { text: "Tails 🪙", callback_data: `cri_t_tails_${cid}` }]] }
    });
  }

  if (data.startsWith('cri_setmode_')) {
    const parts = data.split('_');
    const mType = parts[2]; const cid = parts[3];
    const game = activeCricketGames[cid];
    if (!game || game.p1.id !== userId || game.status !== 'waiting') return bot.answerCallbackQuery(query.id);

    game.mode = mType === "13" ? "1-3 Mode" : mType === "no5" ? "No 5 Mode" : mType === "19" ? "1-9 Mode" : "Default";
    bot.answerCallbackQuery(query.id, { text: `Switched to ${game.mode}` });
    
    bot.editMessageText(`🏏 *Hand Cricket PvP Lobby*\n\n👤 *Host:* ${game.p1.name}\n💰 *Bet:* ${game.amount || "Free"}\n⚙️ *Mode:* ${game.mode}\n\nWaiting for opponent...`, {
      chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Join Match 🤝", callback_data: `cri_join_${cid}` }],
          [{ text: mType === "13"?"✅ 1-3 Mode":"1-3 Mode", callback_data: `cri_setmode_13_${cid}` }, { text: mType === "no5"?"✅ No 5 Mode":"No 5 Mode", callback_data: `cri_setmode_no5_${cid}` }],
          [{ text: mType === "19"?"✅ 1-9 Mode":"1-9 Mode", callback_data: `cri_setmode_19_${cid}` }, { text: mType === "def"?"✅ Default 🏏":"Default 🏏", callback_data: `cri_setmode_def_${cid}` }]
        ]
      }
    });
  }

  if (data.startsWith('cri_t_')) {
    const parts = data.split('_');
    const call = parts[2]; const cid = parts[3];
    const game = activeCricketGames[cid];
    if (!game || game.status !== 'toss' || game.p1.id !== userId) return bot.answerCallbackQuery(query.id);

    const toss = Math.random() < 0.5 ? "heads" : "tails";
    const won = call === toss;
    const winner = won ? game.p1 : game.p2;
    game.status = 'decision';
    game.tossWinnerId = winner.id;

    bot.editMessageText(`🪙 Toss Result: *${toss.toUpperCase()}*\n\n🎉 *${winner.name}* won the toss! Choose your play:`, {
      chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "Batting 🏏", callback_data: `cri_d_bat_${cid}` }, { text: "Bowling 🥎", callback_data: `cri_d_bowl_${cid}` }]] }
    });
  }

  if (data.startsWith('cri_d_')) {
    const parts = data.split('_');
    const choice = parts[2]; const cid = parts[3];
    const game = activeCricketGames[cid];
    if (!game || game.status !== 'decision' || game.tossWinnerId !== userId) return bot.answerCallbackQuery(query.id);

    if (choice === 'bat') {
      game.batting = game.tossWinnerId === game.p1.id ? game.p1 : game.p2;
      game.bowling = game.tossWinnerId === game.p1.id ? game.p2 : game.p1;
    } else {
      game.bowling = game.tossWinnerId === game.p1.id ? game.p1 : game.p2;
      game.batting = game.tossWinnerId === game.p1.id ? game.p2 : game.p1;
    }

    game.status = 'gameplay';
    renderCricketBoard(chatId, game);
  }

  if (data.startsWith('cri_run_')) {
    const parts = data.split('_');
    const run = parseInt(parts[2]); const cid = parts[3];
    const game = activeCricketGames[cid];
    if (!game || game.status !== 'gameplay') return bot.answerCallbackQuery(query.id);
    if (userId !== game.p1.id && userId !== game.p2.id) return bot.answerCallbackQuery(query.id);

    if (!game.turnData) game.turnData = {};
    game.turnData[userId] = run;

    if (Object.keys(game.turnData).length === 2) {
      const batMove = game.turnData[game.batting.id];
      const bowlMove = game.turnData[game.bowling.id];
      game.turnData = {}; // Clear

      if (batMove === bowlMove) {
        // OUT
        if (game.innings === 1) {
          game.innings = 2;
          game.target = game.batting.score + 1;
          // Swap positions
          const temp = game.batting;
          game.batting = game.bowling;
          game.bowling = temp;
          bot.answerCallbackQuery(query.id, { text: "⚠️ OUT!! Innings over.", show_alert: true });
          renderCricketBoard(chatId, game);
        } else {
          // End of Game (Innings 2 out)
          concludeCricketMatch(chatId, game, 'bowler_won');
        }
      } else {
        // Runs scoring
        game.batting.score += batMove;
        if (game.innings === 2 && game.batting.score >= game.target) {
          concludeCricketMatch(chatId, game, 'batsman_won');
        } else {
          renderCricketBoard(chatId, game);
        }
      }
    } else {
      bot.answerCallbackQuery(query.id, { text: "Move saved! Waiting for opponent..." });
    }
  }

  // --- RPS BOT/PVP GAMEPLAY ---
  if (data.startsWith('rps_m_')) {
    const parts = data.split('_');
    const mode = parts[2]; const gId = parts.slice(3).join('_');
    const game = activeRPSGames[gId];
    if (!game || game.p1.id !== userId) return bot.answerCallbackQuery(query.id);

    if (mode === 'bot') {
      game.p2 = { id: 'bot', name: "Bot 🤖" }; game.status = 'playing';
      bot.editMessageText(`🤖 *RPS vs Bot Started!*\nChoose your weapon:`, {
        chat_id: chatId, message_id: msgId, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{text:"Rock 🪨", callback_data:`rps_p_rock_${gId}`},{text:"Paper 📄", callback_data:`rps_p_paper_${gId}`},{text:"Scissors ✂️", callback_data:`rps_p_scissors_${gId}`}]] }
      });
    } else {
      game.status = 'waiting';
      bot.editMessageText(`👥 *RPS PvP Arena*\n💰 Bet: ${game.amount}\n\nWaiting for a Challenger...`, {
        chat_id: chatId, message_id: msgId, parse_mode:"Markdown",
        reply_markup: { inline_keyboard: [[{text: "Join Match 🤝", callback_data: `rps_j_${gId}` }]] }
      });
    }
  }

  if (data.startsWith('rps_j_')) {
    const gId = data.replace('rps_j_', '');
    const game = activeRPSGames[gId];
    if (!game || game.status !== 'waiting') return bot.answerCallbackQuery(query.id);
    if (game.p1.id === userId) return bot.answerCallbackQuery(query.id);

    game.p2 = { id: userId, name: firstName }; game.status = 'playing';
    bot.editMessageText(`🎮 *RPS Match Live!*\n\n${game.p1.name} VS ${game.p2.name}\nSelect your choices secretly!`, {
      chat_id: chatId, message_id: msgId,
      reply_markup: { inline_keyboard: [[{text:"Rock 🪨", callback_data:`rps_p_rock_${gId}`},{text:"Paper 📄", callback_data:`rps_p_paper_${gId}`},{text:"Scissors ✂️", callback_data:`rps_p_scissors_${gId}`}]] }
    });
  }

  if (data.startsWith('rps_p_')) {
    const parts = data.split('_');
    const weapon = parts[2]; const gId = parts.slice(3).join('_');
    const game = activeRPSGames[gId];
    if (!game || game.status !== 'playing') return bot.answerCallbackQuery(query.id);

    if (game.p2.id === 'bot') {
      const options = ['rock', 'paper', 'scissors'];
      const botChoice = options[Math.floor(Math.random()*3)];
      concludeRPSMatch(chatId, msgId, game, weapon, botChoice);
    } else {
      if (userId === game.p1.id) game.p1.choice = weapon;
      if (userId === game.p2.id) game.p2.choice = weapon;
      bot.answerCallbackQuery(query.id, { text: "Choice locked! 🔒" });

      if (game.p1.choice && game.p2.choice) {
        concludeRPSMatch(chatId, msgId, game, game.p1.choice, game.p2.choice);
      }
    }
  }

  // --- TIC TAC TOE BOT/PVP GAMEPLAY ---
  if (data.startsWith('ttt_m_')) {
    const parts = data.split('_');
    const mode = parts[2]; const gId = parts.slice(3).join('_');
    const game = activeTTTGames[gId];
    if (!game || game.p1.id !== userId) return bot.answerCallbackQuery(query.id);

    if (mode === 'bot') {
      game.p2 = { id: 'bot', name: "Bot 🤖", symbol: '⭕' };
      game.status = 'playing'; game.turn = game.p1.id;
      renderTTTBoard(chatId, msgId, game);
    } else {
      game.status = 'waiting';
      bot.editMessageText(`👥 *Tic-Tac-Toe PvP Mode*\n💰 Bet: ${game.amount}\n\nWaiting for opponent...`, {
        chat_id: chatId, message_id: msgId, reply_markup: { inline_keyboard: [[{text:"Join Challenge ❌⭕", callback_data:`ttt_j_${gId}`}]] }
      });
    }
  
