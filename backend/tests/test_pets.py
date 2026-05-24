import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Include backend path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
import crud
import schemas
from database import Base

# Setup in-memory SQLite database
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class TestPetSystem(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    def test_buy_egg(self):
        db = self.db
        # 1. Create a player with 1000 feathers
        player = models.Player(id="p1", email="test@example.com", name="Test Player", feathers=1000)
        db.add(player)
        db.commit()

        # 2. Buy an Epic Egg (requires 1000 feathers)
        result = crud.buy_egg(db, "test@example.com", "egg_epic")
        self.assertEqual(result["status"], "success")
        
        db.refresh(player)
        self.assertEqual(player.feathers, 0)
        self.assertEqual(player.active_egg_id, "egg_epic")
        self.assertEqual(player.egg_progress_games, 0)
        self.assertEqual(player.egg_progress_wins, 0)

        # 3. Try to buy Ultimate Egg (requires 2000 feathers, should fail due to insufficient funds)
        with self.assertRaises(ValueError) as context:
            crud.buy_egg(db, "test@example.com", "egg_ultimate")
        self.assertIn("羽毛不足", str(context.exception))

    def test_match_progress_update(self):
        db = self.db
        # 1. Create 4 players (p1, p2, p3, p4)
        p1 = models.Player(id="p1", email="test@example.com", name="Player 1", feathers=1000, active_egg_id="egg_epic", egg_progress_games=0, egg_progress_wins=0, mu=25.0, sigma=8.333)
        p2 = models.Player(id="p2", email="p2@example.com", name="Player 2", feathers=1000, mu=25.0, sigma=8.333)
        p3 = models.Player(id="p3", email="p3@example.com", name="Player 3", feathers=1000, mu=25.0, sigma=8.333)
        p4 = models.Player(id="p4", email="p4@example.com", name="Player 4", feathers=1000, mu=25.0, sigma=8.333)
        db.add_all([p1, p2, p3, p4])
        db.commit()

        # 2. Record a match where Team 1 (including p1) wins
        req = schemas.MatchRecordRequest(
            matchId="match_001",
            date="2026-05-23T12:00:00Z",
            matchDate="2026-05-23",
            t1p1="p1",
            t1p2="p2",
            t2p1="p3",
            t2p2="p4",
            winnerTeam="Team 1",
            score="21-19"
        )
        
        crud.record_match_and_update(db, req)
        
        db.refresh(p1)
        self.assertEqual(p1.egg_progress_games, 30)
        self.assertEqual(p1.egg_progress_wins, 0)

    def test_hatch_egg(self):
        db = self.db
        # 1. Create a player who has completed the progress for egg_epic (energy 100)
        player = models.Player(
            id="p1", email="test@example.com", name="Test Player", 
            feathers=1000, active_egg_id="egg_epic",
            egg_progress_games=100, egg_progress_wins=0,
            unlocked_pets=""
        )
        db.add(player)
        db.commit()

        # 2. Hatch the egg
        result = crud.hatch_egg(db, "test@example.com")
        self.assertEqual(result["status"], "success")
        self.assertIsNotNone(result["pet_id"])
        
        db.refresh(player)
        # Verify the progress was cleared and the egg is gone
        self.assertIsNone(player.active_egg_id)
        self.assertEqual(player.egg_progress_games, 0)
        self.assertEqual(player.egg_progress_wins, 0)
        
        # Verify the pet is unlocked
        unlocked = player.unlocked_pets.split(",")
        self.assertIn(result["pet_id"], unlocked)

    def test_equip_pet(self):
        db = self.db
        # 1. Create a player with unlocked pets
        player = models.Player(
            id="p1", email="test@example.com", name="Test Player",
            unlocked_pets="pet_cat,pet_dog", active_pet_id=None
        )
        db.add(player)
        db.commit()

        # 2. Equip an unlocked pet (pet_cat)
        result = crud.equip_pet(db, "test@example.com", "pet_cat")
        self.assertEqual(result["status"], "success")
        
        db.refresh(player)
        self.assertEqual(player.active_pet_id, "pet_cat")

        # 3. Try to equip a locked pet (pet_phoenix) - should fail
        with self.assertRaises(ValueError) as context:
            crud.equip_pet(db, "test@example.com", "pet_phoenix")
        self.assertIn("未解鎖該寵物", str(context.exception))

        # 4. Unequip pet (set to None)
        result = crud.equip_pet(db, "test@example.com", None)
        self.assertEqual(result["status"], "success")
        
        db.refresh(player)
        self.assertIsNone(player.active_pet_id)

if __name__ == "__main__":
    unittest.main()
