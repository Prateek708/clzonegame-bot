const TelegramBot = require("node-telegram-bot-api");
const http = require('http');

const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: { autoStart: true, params: { timeout: 10 } } });

const ADMIN_ID = 1315564307; 
const users = {};
const cricketGames = {};
const rpsGames = {};
const tttGames = {};
const activeGames = {}; 

process.on('unhandledRejection', (reason, p) => { console.log('Bypassed Rejection:', reason); });
process.on('uncaughtException', (err) => { console.log('Bypassed Exception:', err); });

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

// --- COMMANDS ---
bot.onText(/\/start(?:@\w+)?/, (msg) => {
  const isNew = initUser(msg.from.id, msg.from.first_name);
  let text = `🎮 *CL Zone Hub* 🎮\n\n` + (isNew ? `🎁 *Bonus: 2000 Coins added!*\n\n` : ``) +
             `🔹 /profile | /daily | /spin\n` +
             `🎲 /dice <amt> | 🪙 /flip <h/t> <amt>\n` +
             `🔢 /numberguess\n🪨 /rps <amt> | ❌ /ttt <amt> | 🏏 /cricket <amt>`;
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" }).catch(()=>{});
});

bot.onText(/\/profile(?:@\w+)?/, (msg) => {
  const u = users[msg.from.id] || {name: "Player", coins: 2000, wins: 0, losses: 0};
  bot.sendMessage(msg.chat.id, `👤 *${u.name}*\n💰 *Coins:* ${u.coins}\n🏆 *Wins:* ${u.wins}\n📉 *Losses:* ${u.losses}`, { parse_mode: "Markdown" }).catch(()=>{});
});

bot.onText(/\/daily(?:@\w+)?/, (msg) => {
  const u = users[msg.from.id] || initUser(msg.from.id, msg.from.first_name);
  if (u.lastClaim && (Date.now() - u.lastClaim < 86400000)) return bot.sendMessage(msg.chat.id, "⏳ Cooldown!").catch(()=>{});
  u.coins += 1000; u.lastClaim = Date.now();
  bot.sendMessage(msg.chat.id, `🎁 1000 added! Bal: *${u.coins}*`, { parse_mode: "Markdown" }).catch(()=>{});
});

bot.onText(/\/spin(?:@\w+)?/, (msg) => {
  const u = users[msg.from.id] || initUser(msg.from.id, msg.from.first_name);
  if (u.lastSpin && (Date.now() - u.lastSpin < 86400000)) return bot.sendMessage(msg.chat.id, "❌ Wait 24h!").catch(()=>{});
  const amt = (Math.floor(Math.random() * 10) + 1) * 1000;
  u.coins += amt; u.wins++; u.lastSpin = Date.now();
  bot.sendMessage(msg.chat.id, `🎡 Won: *${amt}*! Bal: *${u.coins}*`, { parse_mode: "Markdown" }).catch(()=>{});
});

bot.onText(/\/leaderboard(?:@\w+)?/, (msg) => {
  const sorted = Object.keys(users).map(id => ({ name: users[id].name, coins: users[id].coins })).sort((a,b) => b.coins - a.coins).slice(0, 15);
  let text = `🌎 *TOP 15*\n` + sorted.map((p,i) => `${i+1}. ${p.name} - ${p.coins}`).join('\n');
  bot.sendMessage(msg.chat.id, text, { parse_mode: "Markdown" }).catch(()=>{});
});

// Games
bot.onText(/\/dice(?:@\w+)?\s+(\d+)/, (msg, match) => {
  const uid = msg.from.id; const amt = parseInt(match[1]);
  if (!users[uid]) initUser(uid, msg.from.first_name);
  if (users[uid].coins < amt || amt < 100) return bot.sendMessage(msg.chat.id, "❌ Check bal/amt!").catch(()=>{});
  const roll = Math.floor(Math.random() * 6) + 1;
  if (roll >= 4) { users[uid].coins += amt; users[uid].wins++; bot.sendMessage(msg.chat.id, `🎲 ${roll} | WIN!`); }
  else { users[uid].coins -= amt; users[uid].losses++; bot.sendMessage(msg.chat.id, `🎲 ${roll} | LOSS!`); }
});

bot.onText(/\/flip(?:@\w+)?\s+(heads|tails)\s+(\d+)/, (msg, match) => {
  const uid = msg.from.id; const choice = match[1].toLowerCase(); const amt = parseInt(match[2]);
  if (!users[uid]) initUser(uid, msg.from.first_name);
  if (users[uid].coins < amt) return bot.sendMessage(msg.chat.id, "❌ Low bal!");
  const res = Math.random() < 0.5 ? "heads" : "tails";
  if (choice === res) { users[uid].coins += amt; bot.sendMessage(msg.chat.id, `🪙 *${res}* | WIN!`); }
  else { users[uid].coins -= amt; bot.sendMessage(msg.chat.id, `🪙 *${res}* | LOSS!`); }
});

bot.onText(/\/numberguess(?:@\w+)?/, (msg) => {
  activeGames[msg.from.id] = { target: Math.floor(Math.random() * 100) + 1, attempts: 0 };
  bot.sendMessage(msg.chat.id, "🔢 Guess 1-100 via /ng <num>");
});

bot.onText(/\/ng(?:@\w+)?\s+(\d+)/, (msg, match) => {
  const g = activeGames[msg.from.id];
  if (!g) return;
  const guess = parseInt(match[1]);
  if (guess === g.target) { users[msg.from.id].coins += 1000; bot.sendMessage(msg.chat.id, "🎉 Win!"); delete activeGames[msg.from.id]; }
  else bot.sendMessage(msg.chat.id, guess < g.target ? "Higher ⬆️" : "Lower ⬇️");
});

// Interactive Logic (Cricket/RPS/TTT)
bot.onText(/\/cricket(?:@\w+)?(?:\s+(\d+))?/, (msg, match) => {
  const cid = String(msg.chat.id); const amt = parseInt(match[1] || 0);
  cricketGames[cid] = { p1: { id: msg.from.id, name: msg.from.first_name, score: 0 }, p2: null, amount: amt, status: 'wait', innings: 1, turnData: {} };
  bot.sendMessage(cid, `🏏 *Lobby* | Bet: ${amt}`, { reply_markup: { inline_keyboard: [[{text:"Join", callback_data:"c_j"}]] } });
});

bot.onText(/\/rps(?:@\w+)?(?:\s+(\d+))?/, (msg, match) => {
  const cid = String(msg.chat.id); const amt = parseInt(match[1] || 0);
  rpsGames[cid] = { p1: { id: msg.from.id, name: msg.from.first_name }, p2: null, amount: amt };
  bot.sendMessage(cid, `🪨✂️📄 *Lobby*`, { reply_markup: { inline_keyboard: [[{text:"Vs Bot", callback_data:"r_b"}, {text:"PvP", callback_data:"r_p"}]] } });
});

bot.onText(/\/ttt(?:@\w+)?(?:\s+(\d+))?/, (msg, match) => {
  const cid = String(msg.chat.id); const amt = parseInt(match[1] || 0);
  tttGames[cid] = { p1: { id: msg.from.id, name: msg.from.first_name, symbol: '❌' }, p2: null, amount: amt, board: Array(9).fill(null), status: 'select' };
  bot.sendMessage(cid, `❌⭕ *Lobby*`, { reply_markup: { inline_keyboard: [[{text:"Vs Bot", callback_data:"t_b"}, {text:"PvP", callback_data:"t_p"}]] } });
});

bot.on('callback_query', (q) => {
  const data = q.data; const cid = String(q.message.chat.id); const uid = q.from.id;
  // Note: Add your game logic routers here from previous block
  bot.answerCallbackQuery(q.id).catch(()=>{});
});

const port = process.env.PORT || 3000;
http.createServer((req, res) => res.end('Engine Active')).listen(port);
