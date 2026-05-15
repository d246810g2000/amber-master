
import os
import sys

# 將 backend 加入路徑，以便匯入 crud 和 models
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
import crud
import models

def add_feathers(player_id, amount):
    db = SessionLocal()
    try:
        db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
        if not db_player:
            print(f"Error: Player {player_id} not found")
            return
        
        old_feathers = db_player.feathers or 0
        db_player.feathers = old_feathers + amount
        db.commit()
        print(f"Success: Added {amount} feathers to {db_player.name} ({player_id}).")
        print(f"New balance: {db_player.feathers}")
    finally:
        db.close()

if __name__ == "__main__":
    add_feathers("d246810g2000", 10000)
