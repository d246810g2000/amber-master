import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
import crud
import schemas
from database import Base

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
        player = models.Player(id="p1", email="test@example.com", name="Test Player", feathers=1000)
        db.add(player)
        db.commit()

        result = crud.buy_egg(db, "test@example.com", "egg_epic")
        self.assertEqual(result["status"], "success")

        db.refresh(player)
        self.assertEqual(player.feathers, 0)
        self.assertEqual(player.active_egg_id, "egg_epic")
        self.assertEqual(player.egg_progress_games, 0)

        with self.assertRaises(ValueError) as context:
            crud.buy_egg(db, "test@example.com", "egg_ultimate")
        self.assertIn("羽毛不足", str(context.exception))

    def test_buy_egg_preserves_ability_pet(self):
        db = self.db
        player = models.Player(
            id="p1", email="test@example.com", name="Test Player",
            feathers=2000, active_pet_id="pet_slime_king", ability_pet_id="pet_slime_king",
            unlocked_pets="pet_slime_king",
        )
        db.add(player)
        db.commit()

        crud.buy_egg(db, "test@example.com", "egg_epic")
        db.refresh(player)
        self.assertEqual(player.active_pet_id, "egg_epic")
        self.assertEqual(player.ability_pet_id, "pet_slime_king")

    def test_shop_discount_on_egg(self):
        db = self.db
        player = models.Player(
            id="p1", email="test@example.com", name="Test Player",
            feathers=1000, ability_pet_id="pet_mushroom",
        )
        db.add(player)
        db.commit()

        crud.buy_egg(db, "test@example.com", "egg_classic")
        db.refresh(player)
        self.assertEqual(player.feathers, 525)

    def test_equip_egg_preserves_ability(self):
        db = self.db
        player = models.Player(
            id="p1", email="test@example.com", name="Test Player",
            active_egg_id="egg_epic", active_pet_id="pet_slime_king",
            ability_pet_id="pet_slime_king", unlocked_pets="pet_slime_king",
        )
        db.add(player)
        db.commit()

        crud.equip_pet(db, "test@example.com", "egg_epic", target="display")
        db.refresh(player)
        self.assertEqual(player.active_pet_id, "egg_epic")
        self.assertEqual(player.ability_pet_id, "pet_slime_king")

    def test_match_progress_update(self):
        db = self.db
        p1 = models.Player(id="p1", email="test@example.com", name="Player 1", feathers=1000, active_egg_id="egg_epic", egg_progress_games=0, mu=25.0, sigma=8.333)
        p2 = models.Player(id="p2", email="p2@example.com", name="Player 2", feathers=1000, mu=25.0, sigma=8.333)
        p3 = models.Player(id="p3", email="p3@example.com", name="Player 3", feathers=1000, mu=25.0, sigma=8.333)
        p4 = models.Player(id="p4", email="p4@example.com", name="Player 4", feathers=1000, mu=25.0, sigma=8.333)
        db.add_all([p1, p2, p3, p4])
        db.commit()

        req = schemas.MatchRecordRequest(
            matchId="match_001",
            date="2026-05-23T12:00:00Z",
            matchDate="2026-05-23",
            t1p1="p1", t1p2="p2", t2p1="p3", t2p2="p4",
            winnerTeam="Team 1", score="21-19"
        )
        crud.record_match_and_update(db, req)
        db.refresh(p1)
        self.assertEqual(p1.egg_progress_games, 30)

    def test_hatch_egg(self):
        db = self.db
        player = models.Player(
            id="p1", email="test@example.com", name="Test Player",
            feathers=1000, active_egg_id="egg_epic",
            egg_progress_games=100, egg_progress_wins=0, unlocked_pets=""
        )
        db.add(player)
        db.commit()

        result = crud.hatch_egg(db, "test@example.com")
        self.assertEqual(result["status"], "success")

        db.refresh(player)
        self.assertIsNone(player.active_egg_id)
        self.assertEqual(player.active_pet_id, player.ability_pet_id)
        self.assertIn(result["pet_id"], player.unlocked_pets.split(","))

    def test_equip_pet(self):
        db = self.db
        player = models.Player(
            id="p1", email="test@example.com", name="Test Player",
            unlocked_pets="pet_slime_king,pet_finalfantasy_moogle", active_pet_id=None
        )
        db.add(player)
        db.commit()

        crud.equip_pet(db, "test@example.com", "pet_slime_king", target="both")
        db.refresh(player)
        self.assertEqual(player.active_pet_id, "pet_slime_king")
        self.assertEqual(player.ability_pet_id, "pet_slime_king")

        crud.equip_pet(db, "test@example.com", None, target="display")
        db.refresh(player)
        self.assertIsNone(player.active_pet_id)
        self.assertEqual(player.ability_pet_id, "pet_slime_king")

    def test_attack_drain(self):
        from unittest.mock import patch
        db = self.db
        p1 = models.Player(id="p1", email="p1@example.com", name="Attacker", feathers=1000, ability_pet_id="pet_rabbit_warrior", mu=25.0, sigma=8.333)
        p2 = models.Player(id="p2", email="p2@example.com", name="Ally", feathers=1000, mu=25.0, sigma=8.333)
        p3 = models.Player(id="p3", email="p3@example.com", name="Victim", feathers=1000, mu=25.0, sigma=8.333)
        p4 = models.Player(id="p4", email="p4@example.com", name="Victim2", feathers=1000, mu=25.0, sigma=8.333)
        db.add_all([p1, p2, p3, p4])
        db.commit()

        feathers_before = p1.feathers
        victim_before = p3.feathers
        victim2_before = p4.feathers

        req = schemas.MatchRecordRequest(
            matchId="match_atk", date="2026-05-23T12:00:00Z", matchDate="2026-05-23",
            t1p1="p1", t1p2="p2", t2p1="p3", t2p2="p4",
            winnerTeam="Team 1", score="21-19"
        )
        with patch("crud.random.choice", return_value=p3):
            crud.record_match_and_update(db, req)

        db.refresh(p1)
        db.refresh(p3)
        db.refresh(p4)
        # 掠奪在完賽獎勵後結算：敗方先 +50，再被掠奪 4%（1050*4%=42）
        self.assertEqual(p3.feathers, victim_before + 50 - 42)
        self.assertEqual(p4.feathers, victim2_before + 50)
        self.assertEqual(p1.feathers, feathers_before + 100 + 42)

    def test_attack_drain_skips_broke_opponent(self):
        import random
        db = self.db
        p1 = models.Player(id="p1", email="p1@example.com", name="Attacker", feathers=1000, ability_pet_id="pet_rabbit_warrior", mu=25.0, sigma=8.333)
        p2 = models.Player(id="p2", email="p2@example.com", name="Ally", feathers=1000, mu=25.0, sigma=8.333)
        p3 = models.Player(id="p3", email="p3@example.com", name="Broke", feathers=0, mu=25.0, sigma=8.333)
        p4 = models.Player(id="p4", email="p4@example.com", name="Rich", feathers=500, mu=25.0, sigma=8.333)
        db.add_all([p1, p2, p3, p4])
        db.commit()

        feathers_before = p1.feathers
        rich_before = p4.feathers
        random.seed(0)

        req = schemas.MatchRecordRequest(
            matchId="match_atk_broke", date="2026-05-23T12:00:00Z", matchDate="2026-05-23",
            t1p1="p1", t1p2="p2", t2p1="p3", t2p2="p4",
            winnerTeam="Team 1", score="21-19"
        )
        crud.record_match_and_update(db, req)

        db.refresh(p1)
        db.refresh(p4)
        # Rich 先拿 50 安慰獎再被掠奪 4%（550*4%=22）
        self.assertEqual(p4.feathers, rich_before + 50 - 22)
        self.assertEqual(p1.feathers, feathers_before + 100 + 22)

    def test_defense_mitigate(self):
        from unittest.mock import patch
        db = self.db
        p1 = models.Player(id="p1", email="p1@example.com", name="Attacker", feathers=1000, ability_pet_id="pet_rabbit_warrior", mu=25.0, sigma=8.333)
        p2 = models.Player(id="p2", email="p2@example.com", name="Ally", feathers=1000, mu=25.0, sigma=8.333)
        p3 = models.Player(id="p3", email="p3@example.com", name="Defender", feathers=1000, ability_pet_id="pet_pikachu", mu=25.0, sigma=8.333)
        p4 = models.Player(id="p4", email="p4@example.com", name="Open", feathers=1000, mu=25.0, sigma=8.333)
        db.add_all([p1, p2, p3, p4])
        db.commit()

        victim_before = p3.feathers

        req = schemas.MatchRecordRequest(
            matchId="match_def", date="2026-05-23T12:00:00Z", matchDate="2026-05-23",
            t1p1="p1", t1p2="p2", t2p1="p3", t2p2="p4",
            winnerTeam="Team 1", score="21-19"
        )
        with patch("crud.random.choice", return_value=p3):
            crud.record_match_and_update(db, req)

        db.refresh(p3)
        # 1050*4%=42，45% 減損後掠奪 23 根
        self.assertEqual(p3.feathers, victim_before + 50 - 23)

    def test_defense_win_bonus(self):
        db = self.db
        p1 = models.Player(id="p1", email="p1@example.com", name="Guardian", feathers=1000, ability_pet_id="pet_pikachu", mu=25.0, sigma=8.333)
        p2 = models.Player(id="p2", email="p2@example.com", name="Ally", feathers=1000, mu=25.0, sigma=8.333)
        p3 = models.Player(id="p3", email="p3@example.com", name="Loser1", feathers=1000, mu=25.0, sigma=8.333)
        p4 = models.Player(id="p4", email="p4@example.com", name="Loser2", feathers=1000, mu=25.0, sigma=8.333)
        db.add_all([p1, p2, p3, p4])
        db.commit()

        feathers_before = p1.feathers

        req = schemas.MatchRecordRequest(
            matchId="match_def_bonus", date="2026-05-23T12:00:00Z", matchDate="2026-05-23",
            t1p1="p1", t1p2="p2", t2p1="p3", t2p2="p4",
            winnerTeam="Team 1", score="21-19"
        )
        crud.record_match_and_update(db, req)

        db.refresh(p1)
        self.assertEqual(p1.feathers, feathers_before + 100 + 8)

    def test_shop_daily_bonus_rate(self):
        player = models.Player(id="p1", email="test@example.com", ability_pet_id="pet_mushroom")
        self.assertEqual(crud.get_player_daily_bonus_rate(player), 0.02)
        player.ability_pet_id = "pet_green_slime"
        self.assertEqual(crud.get_player_daily_bonus_rate(player), 0.05)

    def test_weighted_pet_choice(self):
        from unittest.mock import patch
        with patch("crud.random.choices", return_value=["pet_black_cat"]) as mock:
            result = crud._weighted_pet_choice(["pet_black_cat", "pet_mushroom"])
            self.assertEqual(result, "pet_black_cat")
            mock.assert_called_once_with(
                ["pet_black_cat", "pet_mushroom"],
                weights=[1.35, 0.70],
                k=1,
            )

    def test_weighted_hatch_distribution(self):
        from collections import Counter
        candidates = crud.EGG_PET_POOL["egg_classic"]["pets"]
        counts = Counter(crud._weighted_pet_choice(candidates) for _ in range(3000))
        good_pets = {"pet_black_cat", "pet_green_slime"}
        weak_pets = {"pet_mushroom", "pet_rabbit_warrior"}
        good_count = sum(counts[p] for p in good_pets)
        weak_count = sum(counts[p] for p in weak_pets)
        self.assertGreater(good_count, weak_count)


if __name__ == "__main__":
    unittest.main()
