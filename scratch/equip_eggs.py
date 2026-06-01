import os
import sys

# Add backend to path to import database/models
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
import models

def equip_eggs_for_all():
    db = SessionLocal()
    try:
        # Find all players who have an active egg but don't have it equipped or have active_pet_id starting with egg_ that is different,
        # or simply whose active_egg_id is not null but active_pet_id doesn't match active_egg_id (if they want it auto-equipped).
        players = db.query(models.Player).filter(models.Player.active_egg_id != None).all()
        updated_count = 0
        for p in players:
            if p.active_pet_id != p.active_egg_id:
                old_pet_id = p.active_pet_id
                p.active_pet_id = p.active_egg_id
                updated_count += 1
                print(f"Updated Player {p.name} ({p.id}): active_pet_id changed from {old_pet_id} -> {p.active_egg_id}")
        
        if updated_count > 0:
            db.commit()
            print(f"Successfully auto-equipped eggs for {updated_count} players.")
        else:
            print("No players needed egg auto-equipping.")
    except Exception as e:
        db.rollback()
        print(f"Error executing migration: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    equip_eggs_for_all()
