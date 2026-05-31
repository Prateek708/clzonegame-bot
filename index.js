Def add_group(group_id):
    """Saves a group chat ID to the database for auto-promotion."""
    conn = sqlite3.connect('economy.db')
    c = conn.cursor()
    c.execute("INSERT OR IGNORE INTO groups (group_id) VALUES (?)", (group_id,))
    conn.commit()
    conn.close()

def add_land_purchase(user_id, city, area, sq_ft, price):
    """Saves a new land purchase to the database."""
    conn = sqlite3.connect("economy.db")
    cursor = conn.cursor()
    cursor.execute("INSERT INTO land_holdings VALUES (?, ?, ?, ?, ?)",
                   (user_id, city, area, sq_ft, price))
    conn.commit()
    conn.close()

def get_user_land(user_id):
    """Retrieves all properties owned by a specific user."""
    conn = sqlite3.connect("economy.db")
    cursor = conn.cursor()
    # Ensure it's selecting rowid
    cursor.execute("SELECT rowid, city, area, sq_ft, purchase_price FROM land_holdings WHERE user_id = ?", (user_id,))
    land = cursor.fetchall()
    conn.close()
    return land

def get_specific_land(purchase_id, user_id):
    """Fetches a single property to verify ownership before selling."""
    conn = sqlite3.connect("economy.db")
    cursor = conn.cursor()
    cursor.execute("SELECT city, area, sq_ft, purchase_price FROM land_holdings WHERE rowid = ? AND user_id = ?",
                   (purchase_id, user_id))
    result = cursor.fetchone()
    conn.close()
    return result

def delete_land_record(purchase_id):
    """Removes a property record after it has been sold."""
    conn = sqlite3.connect("economy.db")
    cursor = conn.cursor()
    cursor.execute("DELETE FROM land_holdings WHERE rowid = ?", (purchase_id,))
    conn.commit()
    conn.close()

def transfer_inventory_item(item_name, old_owner_id, new_owner_id):
    """Moves a car or cricketer from one inventory to another."""
    conn = sqlite3.connect("economy.db")
    cursor = conn.cursor()
    # Using LIMIT 1 ensures we only gift one instance of the item
    cursor.execute("UPDATE inventory SET user_id = ? WHERE user_id = ? AND item_name = ?",
                   (new_owner_id, old_owner_id, item_name))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

Ye code kya hai
