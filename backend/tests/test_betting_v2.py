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
        self.assertEqual(house["houseSubsidyToday"], 92)

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

if __name__ == "__main__":
    unittest.main()
