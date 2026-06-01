import random
import json
import os
from datetime import datetime, timedelta
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

# ============ ADMIN IDs ============
ADMIN_IDS = [1315564307, 8708547223]

# ============ DATA PERSISTENCE ============
DATA_FILE = 'user_data.json'

def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    return {}

def save_data(data):
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=4)

# ============ GLOBAL VARIABLES ============
user_data = load_data()
user_spin_cooldown = {}
number_guess_games = {}

# ============ HELPER FUNCTIONS ============
def save_user(user_id, username):
    if str(user_id) not in user_data:
        user_data[str(user_id)] = {
            'user_id': user_id,
            'username': username,
            'coins': 2000,
            'wins': 0,
            'losses': 0,
            'games_played': 0,
            'achievements': [],
            'spin_last': None,
            'number_guess_wins': 0
        }
        save_data(user_data)

def get_time_remaining(last_time):
    if last_time is None:
        return None
    last = datetime.fromisoformat(last_time)
    time_passed = datetime.now() - last
    if time_passed >= timedelta(hours=24):
        return None
    remaining = timedelta(hours=24) - time_passed
    hours = remaining.seconds // 3600
    minutes = (remaining.seconds % 3600) // 60
    return f"{hours}h {minutes}m"

def add_achievement(user_id, achievement):
    user = user_data[str(user_id)]
    if achievement not in user['achievements']:
        user['achievements'].append(achievement)
        save_data(user_data)
        return True
    return False

def remove_achievement(user_id, achievement):
    user = user_data[str(user_id)]
    if achievement in user['achievements']:
        user['achievements'].remove(achievement)
        save_data(user_data)
        return True
    return False

# ============ COMMAND HANDLERS ============

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    save_user(user.id, user.first_name)
    
    welcome_text = f"""🎮 **Welcome to Gaming Space!** 🎮

🎁 Thanks for starting! You are rewarded with **2000 Coins** 🎁

**Use these commands to play:**
🔹 `/profile` - View status & coins
🔹 `/daily` - Claim 1000 Coins
🔹 `/spin` - Spin for 1k-10k coins
🔹 `/leaderboard` - View Top 15 players

**🎮 Games Available:** 
🎲 `/dice <amount>` - Dice game (1-3: lose, 4-6: win double)
🪙 `/flip <heads/tails> <amount>` - Flip coin game
🔢 `/numberguess` - Start number guessing game
👉 `/ng <number>` - Make a guess
✨ `/myachievement` - View your achievements"""
    
    await update.message.reply_text(welcome_text, parse_mode='Markdown')

async def profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    save_user(user.id, user.first_name)
    
    stats = user_data[str(user.id)]
    
    profile_text = f"""👤 **YOUR GAME PROFILE** 👤

📝 **Name:** {stats['username']}
💰 **Total Coins:** {stats['coins']} CL Tokens
✅ **Total Wins:** {stats['wins']}
❌ **Total Losses:** {stats['losses']}
🆔 **User ID:** {stats['user_id']}
📊 **Games Played:** {stats['games_played']}"""
    
    await update.message.reply_text(profile_text, parse_mode='Markdown')

async def daily(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    save_user(user.id, user.first_name)
    
    user_id = str(user.id)
    current_time = datetime.now()
    
    if 'daily_last' in user_data[user_id] and user_data[user_id]['daily_last']:
        last_daily = datetime.fromisoformat(user_data[user_id]['daily_last'])
        if current_time - last_daily < timedelta(hours=24):
            remaining = timedelta(hours=24) - (current_time - last_daily)
            hours = remaining.seconds // 3600
            minutes = (remaining.seconds % 3600) // 60
            await update.message.reply_text(f"⏰ **Daily reward already claimed!**\n\nNext claim: {hours}h {minutes}m", parse_mode='Markdown')
            return
    
    user_data[user_id]['coins'] += 1000
    user_data[user_id]['daily_last'] = current_time.isoformat()
    save_data(user_data)
    
    await update.message.reply_text(f"🎁 **Daily Reward Claimed!**\n\n+1000 Coins 🪙\n💰 Total Coins: {user_data[user_id]['coins']}", parse_mode='Markdown')

async def spin(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    save_user(user.id, user.first_name)
    
    user_id = str(user.id)
    current_time = datetime.now()
    
    if user_id in user_spin_cooldown and user_spin_cooldown[user_id]:
        remaining = get_time_remaining(user_spin_cooldown[user_id])
        if remaining:
            await update.message.reply_text(f"🎡 **Spin on cooldown!**\n\nNext spin available: {remaining}", parse_mode='Markdown')
            return
    
    spin_amount = random.randint(1000, 10000)
    user_data[user_id]['coins'] += spin_amount
    user_spin_cooldown[user_id] = current_time.isoformat()
    save_data(user_data)
    
    spin_text = f"""🎡 **SPIN RESULT** 🎡

🔄 Wheel spinning...
✨ You won: **+{spin_amount} Coins** 🪙

💰 New Balance: {user_data[user_id]['coins']} Coins

⏰ Next spin available in 24 hours!"""
    
    await update.message.reply_text(spin_text, parse_mode='Markdown')

async def leaderboard(update: Update, context: ContextTypes.DEFAULT_TYPE):
    sorted_users = sorted(user_data.values(), key=lambda x: x['coins'], reverse=True)
    top_players = sorted_users[:15]
    
    if not top_players:
        await update.message.reply_text("📊 No players yet!", parse_mode='Markdown')
        return
    
    leaderboard_text = "🌎 **TOP 15 -- COINS 🪙**\n\n"
    
    emojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"]
    
    for i, player in enumerate(top_players[:10]):
        leaderboard_text += f"{emojis[i]} **{player['username'][:20]}** - {player['coins']} 🪙\n"
    
    for i in range(10, min(15, len(top_players))):
        leaderboard_text += f"{i+1}. **{top_players[i]['username'][:20]}** - {top_players[i]['coins']} 🪙\n"
    
    await update.message.reply_text(leaderboard_text, parse_mode='Markdown')

async def dice_game(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    save_user(user.id, user.first_name)
    
    if not context.args:
        await update.message.reply_text("🎲 **Usage:** `/dice <amount>`\nAmount between 1000-20000", parse_mode='Markdown')
        return
    
    try:
        amount = int(context.args[0])
    except ValueError:
        await update.message.reply_text("❌ Please enter a valid number!", parse_mode='Markdown')
        return
    
    if amount < 1000 or amount > 20000:
        await update.message.reply_text("❌ **Invalid amount!**\nMinimum: 1000 coins\nMaximum: 20000 coins", parse_mode='Markdown')
        return
    
    user_id = str(user.id)
    
    if user_data[user_id]['coins'] < amount:
        await update.message.reply_text(f"❌ **Insufficient coins!**\nYou have {user_data[user_id]['coins']} coins", parse_mode='Markdown')
        return
    
    dice_roll = random.randint(1, 6)
    dice_emojis = {1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅"}
    
    user_data[user_id]['games_played'] += 1
    
    if dice_roll <= 3:
        user_data[user_id]['coins'] -= amount
        user_data[user_id]['losses'] += 1
        save_data(user_data)
        result_text = f"""🎲 **DICE RESULT** 🎲

{dice_emojis[dice_roll]} You rolled: **{dice_roll}**

❌ **You LOST!** (0x)
💸 Lost: {amount} coins

💰 New Balance: {user_data[user_id]['coins']} coins"""
    else:
        win_amount = amount
        user_data[user_id]['coins'] += win_amount
        user_data[user_id]['wins'] += 1
        save_data(user_data)
        
        if user_data[user_id]['wins'] == 1:
            add_achievement(user_id, 'first_win')
        
        result_text = f"""🎲 **DICE RESULT** 🎲

{dice_emojis[dice_roll]} You rolled: **{dice_roll}**

✅ **You WON!** (2x)
🎉 Won: +{win_amount} coins

💰 New Balance: {user_data[user_id]['coins']} coins"""
    
    await update.message.reply_text(result_text, parse_mode='Markdown')

async def flip_game(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    save_user(user.id, user.first_name)
    
    if len(context.args) < 2:
        await update.message.reply_text("🪙 **Usage:** `/flip <heads/tails> <amount>`\nAmount between 1000-20000", parse_mode='Markdown')
        return
    
    choice = context.args[0].lower()
    if choice not in ['heads', 'tails']:
        await update.message.reply_text("❌ Choose 'heads' or 'tails'!", parse_mode='Markdown')
        return
    
    try:
        amount = int(context.args[1])
    except ValueError:
        await update.message.reply_text("❌ Please enter a valid number!", parse_mode='Markdown')
        return
    
    if amount < 1000 or amount > 20000:
        await update.message.reply_text("❌ **Invalid amount!**\nMinimum: 1000 coins\nMaximum: 20000 coins", parse_mode='Markdown')
        return
    
    user_id = str(user.id)
    
    if user_data[user_id]['coins'] < amount:
        await update.message.reply_text(f"❌ **Insufficient coins!**\nYou have {user_data[user_id]['coins']} coins", parse_mode='Markdown')
        return
    
    flip_result = random.choice(['heads', 'tails'])
    flip_emojis = {'heads': '🪙 Heads', 'tails': '🪙 Tails'}
    
    user_data[user_id]['games_played'] += 1
    
    if choice == flip_result:
        win_amount = amount
        user_data[user_id]['coins'] += win_amount
        user_data[user_id]['wins'] += 1
        save_data(user_data)
        
        if user_data[user_id]['wins'] == 1:
            add_achievement(user_id, 'first_win')
        
        result_text = f"""🪙 **FLIP RESULT** 🪙

{flip_emojis[flip_result]}

✅ **You WON!** (2x)
🎉 Won: +{win_amount} coins

💰 New Balance: {user_data[user_id]['coins']} coins"""
    else:
        user_data[user_id]['coins'] -= amount
        user_data[user_id]['losses'] += 1
        save_data(user_data)
        
        result_text = f"""🪙 **FLIP RESULT** 🪙

{flip_emojis[flip_result]}

❌ **You LOST!**
💸 Lost: {amount} coins

💰 New Balance: {user_data[user_id]['coins']} coins"""
    
    await update.message.reply_text(result_text, parse_mode='Markdown')

async def numberguess_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    
    target_number = random.randint(1, 100)
    number_guess_games[str(user.id)] = {
        'target': target_number,
        'attempts': 0,
        'guessed_numbers': []
    }
    
    await update.message.reply_text(f"🔢 **Number Guess Game Started!**\n\nI'm thinking of a number between 1-100.\nUse `/ng <number>` to guess!\n\nYou have unlimited attempts. Better attempts = better rewards!", parse_mode='Markdown')

async def numberguess_guess(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_id = str(user.id)
    
    if user_id not in number_guess_games:
        await update.message.reply_text("❌ Start a game first using `/numberguess`!", parse_mode='Markdown')
        return
    
    if not context.args:
        await update.message.reply_text("🔢 **Usage:** `/ng <number>`\nNumber between 1-100", parse_mode='Markdown')
        return
    
    try:
        guess = int(context.args[0])
    except ValueError:
        await update.message.reply_text("❌ Please enter a valid number!", parse_mode='Markdown')
        return
    
    if guess < 1 or guess > 100:
        await update.message.reply_text("❌ Number must be between 1-100!", parse_mode='Markdown')
        return
    
    game = number_guess_games[user_id]
    game['attempts'] += 1
    game['guessed_numbers'].append(guess)
    
    save_user(user.id, user.first_name)
    
    if guess == game['target']:
        # Calculate reward based on attempts
        attempts = game['attempts']
        if attempts <= 3:
            reward = 5000
        elif attempts <= 5:
            reward = 3000
        elif attempts <= 7:
            reward = 1000
        else:
            reward = 500
        
        user_data[user_id]['coins'] += reward
        user_data[user_id]['wins'] += 1
        user_data[user_id]['games_played'] += 1
        user_data[user_id]['number_guess_wins'] = user_data[user_id].get('number_guess_wins', 0) + 1
        
        if user_data[user_id]['wins'] == 1:
            add_achievement(user_id, 'first_win')
        
        save_data(user_data)
        
        result_text = f"""🔢 **NUMBER GUESS RESULT** 🎯

✅ **Correct!** The number was {game['target']}

📊 Attempts used: {game['attempts']}
🎁 Reward: +{reward} coins

💰 New Balance: {user_data[user_id]['coins']} coins"""
        
        del number_guess_games[user_id]
        await update.message.reply_text(result_text, parse_mode='Markdown')
    else:
        hint = "higher ⬆️" if guess < game['target'] else "lower ⬇️"
        remaining = 100 - len(game['guessed_numbers'])
        
        result_text = f"""🔢 **NUMBER GUESS** 🎯

❌ Wrong guess! The number is {hint}

📊 Your guess: {guess}
🎯 Attempts used: {game['attempts']}
💡 Remaining attempts: Unlimited

Keep guessing! Use `/ng <number>`"""
        
        await update.message.reply_text(result_text, parse_mode='Markdown')

async def myachievement(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_id = str(user.id)
    
    if user_id not in user_data:
        await update.message.reply_text("❌ Start the bot with /start first!", parse_mode='Markdown')
        return
    
    achievements_list = user_data[user_id].get('achievements', [])
    
    if not achievements_list:
        await update.message.reply_text("❌ **No Achievement!**\n\nWin your first game to get an achievement! 🏆", parse_mode='Markdown')
        return
    
    achievement_names = {
        'first_win': '🏆 First Victory - Win your first game',
        'lucky_spin': '🍀 Lucky Spinner - Get 10k coins from spin',
        'high_roller': '💎 High Roller - Reach 50k coins',
        'game_master': '🎮 Game Master - Play 10 games'
    }
    
    achievement_text = "✨ **YOUR ACHIEVEMENTS** ✨\n\n"
    for ach in achievements_list:
        if ach in achievement_names:
            achievement_text += f"✓ {achievement_names[ach]}\n"
    
    await update.message.reply_text(achievement_text, parse_mode='Markdown')

# ============ ADMIN COMMANDS ============

async def admin_add_coins(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_IDS:
        await update.message.reply_text("❌ You are not authorized to use this command!", parse_mode='Markdown')
        return
    
    if len(context.args) < 2:
        await update.message.reply_text("👑 **Admin Usage:** `/add <amount> <username or user_id>`\nExample: `/add 500 Rahul`", parse_mode='Markdown')
        return
    
    try:
        amount = int(context.args[0])
        target = ' '.join(context.args[1:])
    except ValueError:
        await update.message.reply_text("❌ Invalid amount!", parse_mode='Markdown')
        return
    
    found = False
    for user_id, data in user_data.items():
        if target.lower() in data['username'].lower() or target == str(data['user_id']):
            data['coins'] += amount
            save_data(user_data)
            await update.message.reply_text(f"✅ Added {amount} coins to {data['username']}!\n💰 New balance: {data['coins']} coins", parse_mode='Markdown')
            found = True
            break
    
    if not found:
        await update.message.reply_text("❌ User not found!", parse_mode='Markdown')

async def admin_remove_coins(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_IDS:
        await update.message.reply_text("❌ You are not authorized to use this command!", parse_mode='Markdown')
        return
    
    if len(context.args) < 2:
        await update.message.reply_text("👑 **Admin Usage:** `/remove <amount> <username or user_id>`\nExample: `/remove 500 Rahul`", parse_mode='Markdown')
        return
    
    try:
        amount = int(context.args[0])
        target = ' '.join(context.args[1:])
    except ValueError:
        await update.message.reply_text("❌ Invalid amount!", parse_mode='Markdown')
        return
    
    found = False
    for user_id, data in user_data.items():
        if target.lower() in data['username'].lower() or target == str(data['user_id']):
            if data['coins'] >= amount:
                data['coins'] -= amount
                save_data(user_data)
                await update.message.reply_text(f"✅ Removed {amount} coins from {data['username']}!\n💰 New balance: {data['coins']} coins", parse_mode='Markdown')
            else:
                await update.message.reply_text(f"❌ {data['username']} doesn't have enough coins! Has: {data['coins']}", parse_mode='Markdown')
            found = True
            break
    
    if not found:
        await update.message.reply_text("❌ User not found!", parse_mode='Markdown')

async def admin_add_achievement(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_IDS:
        await update.message.reply_text("❌ You are not authorized to use this command!", parse_mode='Markdown')
        return
    
    if len(context.args) < 2:
        await update.message.reply_text("👑 **Admin Usage:** `/addachievement <achievement> <username>`\nAchievements: first_win, lucky_spin, high_roller, game_master", parse_mode='Markdown')
        return
    
    achievement = context.args[0].lower()
    target = ' '.join(context.args[1:])
    
    valid_achievements = ['first_win', 'lucky_spin', 'high_roller', 'game_master']
    if achievement not in valid_achievements:
        await update.message.reply_text(f"❌ Invalid achievement! Choose from: {', '.join(valid_achievements)}", parse_mode='Markdown')
        return
    
    found = False
    for user_id, data in user_data.items():
        if target.lower() in data['username'].lower() or target == str(data['user_id']):
            add_achievement(user_id, achievement)
            await update.message.reply_text(f"✅ Added achievement '{achievement}' to {data['username']}!", parse_mode='Markdown')
            found = True
            break
    
    if not found:
        await update.message.reply_text("❌ User not found!", parse_mode='Markdown')

async def admin_remove_achievement(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.effective_user.id not in ADMIN_IDS:
        await update.message.reply_text("❌ You are not authorized to use this command!", parse_mode='Markdown')
        return
    
    if len(context.args) < 2:
        await update.message.reply_text("👑 **Admin Usage:** `/rmachievement <achievement> <username>`", parse_mode='Markdown')
        return
    
    achievement = context.args[0].lower()
    target = ' '.join(context.args[1:])
    
    found = False
    for user_id, data in user_data.items():
        if target.lower() in data['username'].lower() or target == str(data['user_id']):
            remove_achievement(user_id, achievement)
            await update.message.reply_text(f"✅ Removed achievement '{achievement}' from {data['username']}!", parse_mode='Markdown')
            found = True
            break
    
    if not found:
        await update.message.reply_text("❌ User not found!", parse_mode='Markdown')

# ============ TEST COMMANDS ============

async def test_add_coins(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    save_user(user.id, user.first_name)
    
    if not context.args:
        await update.message.reply_text("🧪 **Test Usage:** `/test_add_coins <amount>`", pars
