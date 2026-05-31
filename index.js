const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const ADMIN_ID = 1315564307; 
const users = {};

// Game Memory Storage (No heavy keys in callback data)
const cricketGames = {};
const rpsGames = {};
const tttGames = {};
const activeGames = {}; // Number guess

function initUser(userId, firstName) {
  if (!users[userId]) {
    users[userId] = { name: firstName || "Player", coins: 2000, wins: 0, losses: 0, lastClaim: null, lastSpin: null };
    return true; 
  }
  return false; 
}

function checkTTTWinner(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.includes(null) ? null : 'draw';
}

// ==========================================
// 1. CORE COMMANDS
// ==========================================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const isNew = initUser(msg.from.id, msg.from.first_name);
  let text = `🎮 *Welcome to CL Zone!* 🎮\n\n`;
  if (isNew) text += `🎁 *Bonus: 2000 Coins Added!*\n\n`;
  text += `🔹 /profile - Check stats & coins\n🔹 /daily - Claim 1000 Coins\n🔹 /spin - Lucky Wheel\n🔹 /leaderboard - Top 15\n\n🎮 *Games:* \n🎲 /dice <amt>\n🪙 /flip <heads/tails> <amt>\n🔢 /numberguess\n🪨 /rps <amt>\n❌ /ttt <amt>\n🏏 /cricket <amt>`;
  bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
});

bot.onText(/\/profile/, (msg) => {
  const uid = msg.from.id;
  if (!users[uid]) initUser(uid, msg.from.first_name);
  const u = users[uid];
  bot.sendMessage(msg.chat.id, `👤 *PROFILE*\n\n📝 *Name:* ${u.name}\n💰 *Coins:* ${u.coins}\n🏆 *Wins:* ${u.wins}\n📉 *Losses:* ${u.losses}`, { parse_mode: "Markdown" });
});

bot.onText(/\/daily/, (msg) => {
  const uid = msg.from.id;
  if (!users[uid]) initUser(uid, msg.from.first_name);
  const u = users[uid];
  const now = Date.now();
  if (u.lastClaim && (now - u.lastClaim < 86400000)) return bot.sendMessage(msg.chat.id, "⏳ Cooldown active! Kal aana.");
  u.coins += 1000; u.lastClaim = now;
  bot.sendMessage(msg.chat.id, `🎁 1000 Coins added! Balance: *${u.coins}*`, { parse_mode: "Markdown" });
});

bot.onText(/\/spin/, (msg) => {
  const uid = msg.from.id;
  if (!users[uid]) initUser(uid, msg.from.first_name);
  const u = users[uid];
  const now = Date.now();
  if (u.lastSpin && (now - u.lastSpin < 86400000)) return bot.sendMessage(msg.chat.id, "❌ Kal spin karna.");
  
  const amt = (Math.floor(Math.random() * 10) + 1) * 1000;
  u.coins += amt; u.wins += 1; u.lastSpin = now;
  bot.sendMessage(msg.chat.id, `🎡 Spin Stopped at: *${amt} Tokens*!\n💰 Balance: *${u.coins}*`, { parse_mode: "Markdown" });
});

bot.onText(/\/leaderboard/, (msg) => {
  const sorted = Object.keys(users).map(id => ({ name: users[id].name, coins: users[id].coins })).sort((a,b) => b.coins - a.coins).slice(0, 15);
  let text = `🌎 *TOP 15 PLAYERS*\n\n`;
  sorted.forEach((p, i) => { text += `${i+1}. *${p.name}* - ${p.coins} 🪙\n`; });
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" });
});

// ==========================================
// 2. DICE, FLIP & NUMBER GUESS
// ==========================================
bot.onText(/\/dice (\d+)/, (msg, match) => {
  const uid = msg.from.id; const amt = parseInt(match[1]);
  if (!users[uid]) initUser(uid, msg.from.first_name);
  if (amt < 100 || amt > 20000 || users[uid].coins < amt) return bot.sendMessage(msg.chat.id, "❌ Invalid amount or low coins!");

  const roll = Math.floor(Math.random() * 6) + 1;
  if (roll >= 4) { users[uid].coins += amt; users[uid].wins += 1; bot.sendMessage(msg.chat.id, `🎲 Roll: ${roll} | *WIN* 🎉`); }
  else { users[uid].coins -= amt; users[uid].losses += 1; bot.sendMessage(msg.chat.id, `🎲 Roll: ${roll} | *LOSS* ❌`); }
});

bot.onText(/\/flip (heads|tails) (\d+)/, (msg, match) => {
  const uid = msg.from.id; const choice = match[1].toLowerCase(); const amt = parseInt(match[2]);
  if (!users[uid]) initUser(uid, msg.from.first_name);
  if (amt < 100 || amt > 30000 || users[uid].coins < amt) return bot.sendMessage(msg.chat.id, "❌ Error setup!");

  const res = Math.random() < 0.5 ? "heads" : "tails";
  if (choice === res) { users[uid].coins += amt; users[uid].wins += 1; bot.sendMessage(msg.chat.id, `🪙 *${res.toUpperCase()}* | WIN!`); }
  else { users[uid].coins -= amt; users[uid].losses += 1; bot.sendMessage(msg.chat.id, `🪙 *${res.toUpperCase()}* | LOSS!`); }
});

bot.onText(/\/numberguess/, (msg) => {
  const uid = msg.from.id; if (!users[uid]) initUser(uid, msg.from.first_name);
  activeGames[uid] = { target: Math.floor(Math.random() * 100) + 1, attempts: 0 };
  bot.sendMessage(msg.chat.id, "🔢 Guess 1-100 using `/ng <number>`");
});

bot.onText(/\/ng (\d+)/, (msg, match) => {
  const uid = msg.from.id; const guess = parseInt(match[1]);
  if (!activeGames[uid]) return msg.reply("❌ Run /numberguess first!");
  const g = activeGames[uid]; g.attempts++;

  if (guess === g.target) {
    let bonus = g.attempts <= 3 ? 3000 : 500;
    users[uid].coins += bonus; users[uid].wins += 1; delete activeGames[uid];
    bot.sendMessage(msg.chat.id, `🎉 Correct! Reward: *${bonus}* coins.`);
  } else { bot.sendMessage(msg.chat.id, guess < g.target ? "Higher ⬆️" : "Lower ⬇️"); }
});

// ==========================================
// 3. INTERACTIVE ENGINE (CRICKET, RPS, TTT)
// ==========================================
bot.onText(/\/cricket(?:\s+(\d+))?/, (msg, match) => {
  const cid = String(msg.chat.id); const amt = parseInt(match[1] || 0);
  if (!users[msg.from.id]) initUser(msg.from.id, msg.from.first_name);
  if (amt > 0 && users[msg.from.id].coins < amt) return bot.sendMessage(cid, "❌ Low Balance!");

  cricketGames[cid] = { p1: { id: msg.from.id, name: msg.from.first_name, score: 0 }, p2: null, amount: amt, mode: 'Default', status: 'wait', batting: null, bowling: null, innings: 1, target: null, turnData: {} };
  bot.sendMessage(cid, `🏏 *Cricket Lobby*\n👤 Host: ${msg.from.first_name}\n💰 Bet: ${amt}`, {
    reply_markup: { inline_keyboard: [[{ text: "Join Match 🤝", callback_data: `c_j` }], [{ text: "1-3 Mode", callback_data: `c_m_13` }, { text: "No 5 Mode", callback_data: `c_m_no5` }], [{ text: "Default 🏏", callback_data: `c_m_def` }]] }
  });
});

bot.onText(/\/rps(?:\s+(\d+))?/, (msg, match) => {
  const cid = String(msg.chat.id); const amt = parseInt(match[1] || 0);
  if (!users[msg.from.id]) initUser(msg.from.id, msg.from.first_name);
  rpsGames[cid] = { p1: { id: msg.from.id, name: msg.from.first_name, choice: null }, p2: null, amount: amt, status: 'select' };
  bot.sendMessage(cid, `🪨✂️📄 *RPS Lobby* (${amt} coins)\nSelect Type:`, {
    reply_markup: { inline_keyboard: [[{ text: "Vs Bot 🤖", callback_data: `r_b` }, { text: "PvP Match 👥", callback_data: `r_p` }]] }
  });
});

bot.onText(/\/ttt(?:\s+(\d+))?/, (msg, match) => {
  const cid = String(msg.chat.id); const amt = parseInt(match[1] || 0);
  if (!users[msg.from.id]) initUser(msg.from.id, msg.from.first_name);
  tttGames[cid] = { p1: { id: msg.from.id, name: msg.from.first_name, symbol: '❌' }, p2: null, amount: amt, board: Array(9).fill(null), turn: null, status: 'select' };
  bot.sendMessage(cid, `❌⭕ *TTT Lobby* (${amt} coins)\nSelect Type:`, {
    reply_markup: { inline_keyboard: [[{ text: "Vs Bot 🤖", callback_data: `t_b` }, { text: "PvP Match 👥", callback_data: `t_p` }]] }
  });
});

// ==========================================
// 4. MICRO STATS ROUTER (CALLBACK HANDLER)
// ==========================================
bot.on('callback_query', (query) => {
  const data = query.data; const uid = query.from.id; const fname = query.from.first_name;
  const cid = String(query.message.chat.id); const mid = query.message.message_id;

  // --- CRICKET ---
  const cg = cricketGames[cid];
  if (data.startsWith('c_') && cg) {
    if (data === 'c_j') {
      if (cg.p1.id === uid) return bot.answerCallbackQuery(query.id, { text: "Apna game khud join mat karo!" });
      if (!users[uid]) initUser(uid, fname);
      cg.p2 = { id: uid, name: fname, score: 0 }; cg.status = 'toss';
      bot.editMessageText(`🪙 *Toss Time!*\n@${cg.p1.name} Choose:`, { chat_id: cid, message_id: mid, reply_markup: { inline_keyboard: [[{ text: "Heads", callback_data: "c_t_h" }, { text: "Tails", callback_data: "c_t_t" }]] } });
    }
    else if (data.startsWith('c_m_')) {
      if (cg.p1.id !== uid) return bot.answerCallbackQuery(query.id);
      cg.mode = data === 'c_m_13' ? '1-3 Mode' : data === 'c_m_no5' ? 'No 5 Mode' : 'Default';
      bot.answerCallbackQuery(query.id, { text: `Mode set to ${cg.mode}` });
    }
    else if (data.startsWith('c_t_')) {
      if (cg.p1.id !== uid) return bot.answerCallbackQuery(query.id);
      const win = Math.random() < 0.5 ? 'c_t_h' : 'c_t_t';
      const twinner = data === win ? cg.p1 : cg.p2; cg.status = 'decide'; cg.twid = twinner.id;
      bot.editMessageText(`🎉 *${twinner.name}* won the toss! Choose:`, { chat_id: cid, message_id: mid, reply_markup: { inline_keyboard: [[{ text: "Bat 🏏", callback_data: "c_d_bat" }, { text: "Bowl 🥎", callback_data: "c_d_bowl" }]] } });
    }
    else if (data.startsWith('c_d_')) {
      if (cg.twid !== uid) return bot.answerCallbackQuery(query.id);
      const isBat = data === 'c_d_bat';
      cg.batting = cg.twid === cg.p1.id ? (isBat ? cg.p1 : cg.p2) : (isBat ? cg.p2 : cg.p1);
      cg.bowling = cg.batting.id === cg.p1.id ? cg.p2 : cg.p1;
      cg.status = 'play'; runCricEngine(cid, mid, cg);
    }
    else if (data.startsWith('c_r_')) {
      if (uid !== cg.p1.id && uid !== cg.p2.id) return bot.answerCallbackQuery(query.id);
      const run = parseInt(data.split('_')[2]); cg.turnData[uid] = run;
      bot.answerCallbackQuery(query.id, { text: "Locked! 🔒" });

      if (Object.keys(cg.turnData).length === 2) {
        const batMove = cg.turnData[cg.batting.id]; const bowlMove = cg.turnData[cg.bowling.id]; cg.turnData = {};
        if (batMove === bowlMove) {
          if (cg.innings === 1) {
            cg.innings = 2; cg.target = cg.batting.score + 1;
            const temp = cg.batting; cg.batting = cg.bowling; cg.bowling = temp;
            runCricEngine(cid, mid, cg);
          } else { endCric(cid, mid, cg, 'bowl'); }
        } else {
          cg.batting.score += batMove;
          if (cg.innings === 2 && cg.batting.score >= cg.target) { endCric(cid, mid, cg, 'bat'); }
          else { runCricEngine(cid, mid, cg); }
        }
      }
    }
    return;
  }

  // --- ROCK PAPER SCISSORS ---
  const rg = rpsGames[cid];
  if (data.startsWith('r_') && rg) {
    if (data === 'r_b') {
      rg.p2 = { id: 'bot', name: "Bot 🤖" }; rg.status = 'play';
      sendRpsKeyboard(cid, mid, rg);
    } else if (data === 'r_p') {
      rg.status = 'wait';
      bot.editMessageText(`👥 Waiting for player to Join...`, { chat_id: cid, message_id: mid, reply_markup: { inline_keyboard: [[{ text: "Join RPS", callback_data: "r_j" }]] } });
    } else if (data === 'r_j') {
      if (rg.p1.id === uid) return bot.answerCallbackQuery(query.id);
      rg.p2 = { id: uid, name: fname }; rg.status = 'play'; sendRpsKeyboard(cid, mid, rg);
    } else if (data.startsWith('r_v_')) {
      const move = data.split('_')[2];
      if (uid === rg.p1.id) rg.p1.choice = move;
      if (rg.p2.id !== 'bot' && uid === rg.p2.id) rg.p2.choice = move;
      bot.answerCallbackQuery(query.id, { text: "Locked!" });

      if (rg.p2.id === 'bot') rg.p2.choice = ['rock', 'paper', 'scissors'][Math.floor(Math.random()*3)];
      if (rg.p1.choice && rg.p2.choice) {
        let res = `🪨✂️📄 *RPS Results*\n\n${rg.p1.name}: ${rg.p1.choice}\n${rg.p2.name}: ${rg.p2.choice}\n\n`;
        if (rg.p1.choice === rg.p2.choice) res += "🤝 Draw!";
        else if ((rg.p1.choice==='rock' && rg.p2.choice==='scissors') || (rg.p1.choice==='paper' && rg.p2.choice==='rock') || (rg.p1.choice==='scissors' && rg.p2.choice==='paper')) {
          res +=
                                                                            
