import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

import models
from database import SessionLocal

def find_player():
    db = SessionLocal()
    try:
        player = db.query(models.Player).filter(models.Player.name.like('%張銘%')).first()
        if player:
            print(f"ID: {player.id}, Name: {player.name}")
        else:
            print("Player not found")
    finally:
        db.close()

if __name__ == "__main__":
    find_player()
