import os
import sys

# Add backend to path to import database/models
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from database import SessionLocal
import models

PET_EGG_MAP = {
    "pet_corgi": "egg_classic", "pet_black_cat": "egg_classic", "pet_chick": "egg_classic",
    "pet_cat": "egg_epic", "pet_slime": "egg_epic", "pet_rabbit": "egg_epic",
    "pet_dog": "egg_legendary", "pet_fox": "egg_legendary", "pet_dragon": "egg_legendary",
    "pet_phoenix": "egg_ultimate", "pet_unicorn": "egg_ultimate", "pet_panda": "egg_ultimate"
}

def revert_pets_to_eggs():
    db = SessionLocal()
    try:
        players = db.query(models.Player).all()
        updated_count = 0
        
        for p in players:
            active_pet = p.active_pet_id
            
            # If the player has an active pet that is a hatched pet (starts with pet_)
            if active_pet and active_pet.startswith("pet_"):
                egg_type = PET_EGG_MAP.get(active_pet, "egg_epic")
                
                print(f"Reverting player {p.name} ({p.email}): active pet {active_pet} -> egg {egg_type}")
                
                # Revert active egg and set progress to 100
                p.active_egg_id = egg_type
                p.egg_progress_games = 100
                p.egg_progress_wins = 0
                
                # Set active_pet_id to the egg so it is equipped
                p.active_pet_id = egg_type
                
                # Remove this pet from unlocked_pets list
                if p.unlocked_pets:
                    unlocked_list = [pet.strip() for pet in p.unlocked_pets.split(",") if pet.strip()]
                    if active_pet in unlocked_list:
                        unlocked_list.remove(active_pet)
                    p.unlocked_pets = ",".join(unlocked_list)
                
                updated_count += 1
        
        if updated_count > 0:
            db.commit()
            print(f"Successfully reverted pets for {updated_count} players.")
        else:
            print("No players with hatched pets were found.")
            
    except Exception as e:
        db.rollback()
        print(f"Error reverting pets: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    revert_pets_to_eggs()
