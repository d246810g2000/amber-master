import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, datetime, timedelta
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
import crud
from database import Base

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

HOUSE_ODDS_EVEN = 1.92  # (1 - 0.04) / 0.5

class TestBettingV2(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    def _create_standard_match(self, match_id="test_match_001"):
        p1 = models.Player(id="p1", name="Player 1", mu=30.0, feathers=1000)
        p2 = models.Player(id="p2", name="Player 2", mu=30.0, feathers=1000)
        p3 = models.Player(id="p3", name="Player 3", mu=20.0, feathers=1000)
        p4 = models.Player(id="p4", name="Player 4", mu=20.0, feathers=1000)
        b1 = models.Player(id="b1", name="Bettor 1", feathers=1000)
        b2 = models.Player(id="b2", name="Bettor 2", feathers=1000)
        self.db.add_all([p1, p2, p3, p4, b1, b2])
        match = models.Match(
            id=match_id,
            match_date=date.today(),
            t1p1_id="p1", t1p2_id="p2",
            t2p1_id="p3", t2p2_id="p4",
            score=None,
            winner=None,
            court_name="Test Court"
        )
        self.db.add(match)
        self.db.commit()
        return match

    def _place_test_bet(self, match_id, p_id, t, amt, bt, lv=0.0, locked_odds=None):
        p = self.db.query(models.Player).filter(models.Player.id == p_id).first()
        p.feathers -= amt
        if locked_odds is None:
            locked_odds = HOUSE_ODDS_EVEN
        self.db.add(models.Bet(
            player_id=p_id, match_id=match_id, team=t, amount=amt,
            bet_type=bt, line_value=lv, locked_odds=locked_odds,
        ))

    def test_multi_pool_betting_settlement(self):
        db = self.db
        match_id = "test_match_001"
        self._create_standard_match(match_id)

        self._place_test_bet(match_id, "b1", 1, 100, "moneyline")
        self._place_test_bet(match_id, "b2", 2, 100, "moneyline")
        self._place_test_bet(match_id, "b1", 1, 100, "handicap", 5.0)
        self._place_test_bet(match_id, "b2", 2, 100, "handicap", -5.0)
        self._place_test_bet(match_id, "b1", 1, 100, "over_under", 40.5)
        self._place_test_bet(match_id, "b2", 2, 100, "over_under", 40.5)
        db.commit()

        match = db.query(models.Match).filter(models.Match.id == match_id).first()
        match.score = "21-15"
        match.winner = 1
        db.commit()

        results = crud.settle_bets(db, match_id, winner_team=1)

        self.assertEqual(len(results["winners"]), 3)

        b1 = db.query(models.Player).filter(models.Player.id == "b1").first()
        b2 = db.query(models.Player).filter(models.Player.id == "b2").first()
        # 莊家保底 1.92 > 池子 1.85
        self.assertEqual(b1.feathers, 1000 - 300 + 192 + 192)
        self.assertEqual(b2.feathers, 1000 - 300 + 192)

        p1 = db.query(models.Player).filter(models.Player.id == "p1").first()
        self.assertEqual(p1.feathers, 1015)

        house = crud.get_house_daily_stats(db, date.today())
        self.assertEqual(house["houseRakeToday"], 15)
        self.assertGreater(house["houseSubsidyToday"], 0)

    def test_one_sided_house_floor(self):
        db = self.db
        match_id = "test_match_one_sided"
        self._create_standard_match(match_id)
        self._place_test_bet(match_id, "b1", 1, 100, "moneyline")
        db.commit()

        match = db.query(models.Match).filter(models.Match.id == match_id).first()
        match.score = "21-15"
        match.winner = 1
        db.commit()

        results = crud.settle_bets(db, match_id, winner_team=1)
        self.assertEqual(len(results["winners"]), 1)

        b1 = db.query(models.Player).filter(models.Player.id == "b1").first()
        self.assertEqual(b1.feathers, 1000 - 100 + 192)
        self.assertGreater(results["winners"][0]["payout"], 100)

        house = crud.get_house_daily_stats(db, date.today())
        self.assertEqual(house["houseRakeToday"], 0)
        self.assertEqual(house["houseSubsidyToday"], 82)

    def test_pool_beats_house_when_imbalanced(self):
        db = self.db
        match_id = "test_match_pool_high"
        self._create_standard_match(match_id)
        # 逆風少數押中：贏家邊 100，敗家邊 900 → 池子賠率遠高於莊家
        self._place_test_bet(match_id, "b1", 1, 100, "moneyline", locked_odds=1.92)
        self._place_test_bet(match_id, "b2", 2, 900, "moneyline", locked_odds=1.92)
        db.commit()

        match = db.query(models.Match).filter(models.Match.id == match_id).first()
        match.score = "21-15"
        match.winner = 1
        db.commit()

        crud.settle_bets(db, match_id, winner_team=1)
        b1 = db.query(models.Player).filter(models.Player.id == "b1").first()
        # pool: (100 + 765) / 100 = 8.65 → 865; house: 192
        self.assertEqual(b1.feathers, 1000 - 100 + 865)

    def test_locked_odds_persist(self):
        db = self.db
        match_id = "test_match_lock"
        self._create_standard_match(match_id)

        today = date.today()
        cs = models.CourtState(date=today, state={
            "courts": [{"matchId": match_id, "players": ["p1", "p2", "p3", "p4"]}]
        })
        db.add(cs)
        db.commit()

        res = crud.place_bet(db, "b1", match_id, 1, 100, bet_type="moneyline")
        self.assertEqual(res["status"], "success")

        bet = db.query(models.Bet).filter(models.Bet.player_id == "b1").first()
        self.assertIsNotNone(bet.locked_odds)
        self.assertAlmostEqual(bet.locked_odds, HOUSE_ODDS_EVEN, places=1)

    def test_anti_match_fixing(self):
        db = self.db
        p1 = models.Player(id="p1", name="Player 1", mu=30.0, feathers=1000)
        db.add(p1)
        today = date.today()
        cs = models.CourtState(date=today, state={
            "courts": [
                {"matchId": "match_123", "players": ["p1", "p2", "p3", "p4"]}
            ]
        })
        db.add(cs)
        db.commit()

        res = crud.place_bet(db, player_id="p1", match_id="match_123", team=2, amount=100, bet_type="moneyline")
        self.assertEqual(res["status"], "error")
        self.assertIn("只能看好自己贏", res["message"])

        res_ok = crud.place_bet(db, player_id="p1", match_id="match_123", team=1, amount=100, bet_type="moneyline")
        self.assertEqual(res_ok["status"], "success")

    def test_place_bet_returns_locked_odds(self):
        db = self.db
        match_id = "test_match_odds_return"
        self._create_standard_match(match_id)
        today = date.today()
        cs = models.CourtState(date=today, state={
            "courts": [{"matchId": match_id, "players": ["p1", "p2", "p3", "p4"], "startTime": None}]
        })
        db.add(cs)
        db.commit()

        res = crud.place_bet(db, "b1", match_id, 1, 100, bet_type="moneyline")
        self.assertEqual(res["status"], "success")
        self.assertIn("lockedOdds", res)
        self.assertGreater(res["lockedOdds"], 1.0)
        self.assertIn("預估獲利", res["message"])

    def test_bet_time_lock(self):
        db = self.db
        match_id = "test_match_time_lock"
        self._create_standard_match(match_id)
        today = date.today()
        old_start = datetime.utcnow() - timedelta(minutes=5)
        cs = models.CourtState(date=today, state={
            "courts": [{
                "matchId": match_id,
                "players": ["p1", "p2", "p3", "p4"],
                "startTime": old_start.isoformat() + "Z",
            }]
        })
        db.add(cs)
        db.commit()

        res = crud.place_bet(db, "b1", match_id, 1, 100, bet_type="moneyline")
        self.assertEqual(res["status"], "error")
        self.assertIn("封盤", res["message"])

    def test_handicap_push_refund(self):
        db = self.db
        match_id = "test_match_push"
        self._create_standard_match(match_id)
        # 21-15，讓分 -6 → 21+(-6)=15 剛好平線
        self._place_test_bet(match_id, "b1", 1, 100, "handicap", -6.0)
        db.commit()

        match = db.query(models.Match).filter(models.Match.id == match_id).first()
        match.score = "21-15"
        match.winner = 1
        db.commit()

        results = crud.settle_bets(db, match_id, winner_team=1)
        self.assertEqual(len(results["winners"]), 0)

        b1 = db.query(models.Player).filter(models.Player.id == "b1").first()
        self.assertEqual(b1.feathers, 1000)

        refund = db.query(models.FeatherTransaction).filter(
            models.FeatherTransaction.player_id == "b1",
            models.FeatherTransaction.type == "bet_refund",
        ).first()
        self.assertIsNotNone(refund)
        self.assertIn("走水", refund.description)

    def test_get_bet_status_house_and_pool_odds(self):
        db = self.db
        match_id = "test_match_status"
        self._create_standard_match(match_id)
        self._place_test_bet(match_id, "b1", 1, 100, "moneyline")
        db.commit()

        status = crud.get_bet_status(db, match_id)
        ml = status["moneyline"]
        self.assertEqual(ml["houseOdds1"], HOUSE_ODDS_EVEN)
        self.assertEqual(ml["effectiveOdds1"], HOUSE_ODDS_EVEN)
        self.assertIn("poolOdds1", ml)

    def test_pool_odds_floor_is_1_10(self):
        db = self.db
        match_id = "test_match_floor_1_10"
        self._create_standard_match(match_id)
        # Everyone bets on the same side, so pool odds should floor at 1.10
        self._place_test_bet(match_id, "b1", 1, 200, "moneyline")
        db.commit()

        match = db.query(models.Match).filter(models.Match.id == match_id).first()
        match.score = "21-10"
        match.winner = 1
        db.commit()

        # Artificially set house to bankrupt so pool odds are used
        today = date.today()
        crud.accumulate_house_daily_stats(db, today, 0, 100000)
        db.commit()

        results = crud.settle_bets(db, match_id, winner_team=1)
        self.assertEqual(len(results["winners"]), 1)
        # Winner should get paid 200 * 1.10 = 220 feathers instead of just 200
        self.assertEqual(results["winners"][0]["payout"], 220)

    def test_house_rescue_donation(self):
        db = self.db
        today = date.today()
        self._create_standard_match("test_rescue_match")
        
        # 1. House is not bankrupt initially, donation should fail
        res = crud.donate_to_house(db, "b1", 500)
        self.assertEqual(res["status"], "error")
        self.assertIn("財務健全", res["message"])

        # 2. Make house bankrupt
        crud.accumulate_house_daily_stats(db, today, 0, 60000)
        db.commit()

        # 3. Donate to house (b1 has 1000 feathers)
        res = crud.donate_to_house(db, "b1", 500)
        self.assertEqual(res["status"], "success")
        
        b1 = db.query(models.Player).filter(models.Player.id == "b1").first()
        self.assertEqual(b1.feathers, 500) # 1000 - 500 = 500

        # Check rescue progress
        progress = crud.get_today_house_rescue_progress(db, today)
        self.assertEqual(progress["totalRaised"], 500)
        self.assertFalse(progress["isRescued"])

        # 4. Donate the remaining goal (49500) to trigger rescue success
        # Give b2 some feathers (he starts with 1000, let's give him 50000)
        b2 = db.query(models.Player).filter(models.Player.id == "b2").first()
        b2.feathers = 50000
        db.commit()

        res2 = crud.donate_to_house(db, "b2", 49500)
        self.assertEqual(res2["status"], "success")

        # Now target of 50000 is reached, b1 and b2 should receive 1.2x payout
        db.refresh(b1)
        db.refresh(b2)

        # b1 donated 500, should get back 500 * 1.2 = 600. Remaining was 500. Total = 1100.
        self.assertEqual(b1.feathers, 1100)
        # b2 started with 50000, donated 49500 (remaining 500), gets back 49500 * 1.2 = 59400. Total = 59900.
        self.assertEqual(b2.feathers, 59900)

        # House should be rescued
        progress = db_query_progress = crud.get_today_house_rescue_progress(db, today)
        self.assertTrue(progress["isRescued"])

    def test_minigame_workflow(self):
        db = self.db
        self._create_standard_match("test_minigame_match")
        
        # Mock datetime.utcnow to return a Wednesday (e.g. 2026-06-24)
        from datetime import datetime as real_datetime
        original_datetime = crud.datetime
        
        class MockedDatetime:
            @staticmethod
            def utcnow():
                # 2026-06-24 is Wednesday
                return real_datetime(2026, 6, 24, 12, 0, 0)
            
            @staticmethod
            def combine(*args, **kwargs):
                return real_datetime.combine(*args, **kwargs)
            
            @staticmethod
            def strptime(*args, **kwargs):
                return real_datetime.strptime(*args, **kwargs)
            
            @staticmethod
            def fromisoformat(*args, **kwargs):
                return real_datetime.fromisoformat(*args, **kwargs)
        
        crud.datetime = MockedDatetime
        try:
            # 1. Initially, player should be eligible to play
            status = crud.check_minigame_eligibility(db, "b1")
            self.assertTrue(status["canPlay"])
            
            # 2. Submit score
            res = crud.submit_minigame_score(db, "b1", 150)
            self.assertEqual(res["status"], "success")
            self.assertEqual(res["reward"], 150)
            
            b1 = db.query(models.Player).filter(models.Player.id == "b1").first()
            self.assertEqual(b1.feathers, 1150) # 1000 + 150 = 1150
            
            # 3. Check eligibility again (canPlay is True, but canEarnReward is False)
            status2 = crud.check_minigame_eligibility(db, "b1")
            self.assertTrue(status2["canPlay"])
            self.assertFalse(status2["canEarnReward"])
            
            # 4. Attempting to submit again should succeed as practice mode (reward is 0)
            res2 = crud.submit_minigame_score(db, "b1", 200)
            self.assertEqual(res2["status"], "success")
            self.assertEqual(res2["reward"], 0)
            self.assertIn("已領取過羽毛獎勵", res2["message"])
            
            # 5. Check score reward (submit score 800 for eligible player b2)
            status_b2 = crud.check_minigame_eligibility(db, "b2")
            self.assertTrue(status_b2["canPlay"])
            self.assertTrue(status_b2["canEarnReward"])
            res_b2 = crud.submit_minigame_score(db, "b2", 800)
            self.assertEqual(res_b2["status"], "success")
            self.assertEqual(res_b2["reward"], 800) # Awards full score
            
            b2 = db.query(models.Player).filter(models.Player.id == "b2").first()
            self.assertEqual(b2.feathers, 1800) # 1000 + 800 = 1800
        finally:
            crud.datetime = original_datetime

    def test_feather_rush_minigame(self):
        db = self.db
        self._create_standard_match("test_feather_rush_match")

        from datetime import datetime as real_datetime
        original_datetime = crud.datetime

        class MockedDatetime:
            @staticmethod
            def utcnow():
                return real_datetime(2026, 6, 24, 12, 0, 0)

            @staticmethod
            def combine(*args, **kwargs):
                return real_datetime.combine(*args, **kwargs)

            @staticmethod
            def strptime(*args, **kwargs):
                return real_datetime.strptime(*args, **kwargs)

            @staticmethod
            def fromisoformat(*args, **kwargs):
                return real_datetime.fromisoformat(*args, **kwargs)

        crud.datetime = MockedDatetime
        try:
            res = crud.submit_minigame_score(db, "b1", "feather_rush", 850, 0)
            self.assertEqual(res["status"], "success")
            self.assertEqual(res["reward"], 0)

            record = db.query(models.MiniGameRecord).filter(
                models.MiniGameRecord.player_id == "b1",
                models.MiniGameRecord.game_type == "feather_rush",
            ).first()
            self.assertIsNotNone(record)
            self.assertEqual(record.score, 850)

            status = crud.get_minigame_weekly_claim_status(db, "b1")
            self.assertEqual(status["highestScores"]["feather_rush"], 850)

            leaderboard = crud.get_minigame_leaderboard(db)
            self.assertIn("feather_rush", leaderboard)
            self.assertTrue(any(e["name"] == "Bettor 1" for e in leaderboard["feather_rush"]["allTime"]))

            claim = crud.claim_minigame_weekly_score(db, "b1", "feather_rush")
            self.assertEqual(claim["status"], "success")
            tx = db.query(models.FeatherTransaction).filter(
                models.FeatherTransaction.player_id == "b1",
                models.FeatherTransaction.type == "minigame_weekly_convert",
            ).first()
            self.assertIsNotNone(tx)
            self.assertIn("飛羽衝鋒", tx.description)
        finally:
            crud.datetime = original_datetime

if __name__ == "__main__":
    unittest.main()
