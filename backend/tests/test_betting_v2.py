import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date, datetime
import sys
import os

# 加入 backend 路徑以便 import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import models
import crud
from database import Base

# 使用 SQLite 記憶體資料庫進行測試
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class TestBettingV2(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    def test_multi_pool_betting_settlement(self):
        db = self.db
        
        # 1. 建立球員
        p1 = models.Player(id="p1", name="Player 1", mu=30.0, feathers=1000)
        p2 = models.Player(id="p2", name="Player 2", mu=30.0, feathers=1000)
        p3 = models.Player(id="p3", name="Player 3", mu=20.0, feathers=1000)
        p4 = models.Player(id="p4", name="Player 4", mu=20.0, feathers=1000)
        # 投注者 (一開始有 1000)
        b1 = models.Player(id="b1", name="Bettor 1", feathers=1000)
        b2 = models.Player(id="b2", name="Bettor 2", feathers=1000)
        
        db.add_all([p1, p2, p3, p4, b1, b2])
        db.commit()

        # 2. 建立比賽 (Team 1 vs Team 2, 預設 score 為 None 以免觸發 place_bet 檢查)
        match_id = "test_match_001"
        match = models.Match(
            id=match_id,
            match_date=date.today(),
            t1p1_id="p1", t1p2_id="p2",
            t2p1_id="p3", t2p2_id="p4",
            score=None, 
            winner=None,
            court_name="Test Court"
        )
        db.add(match)
        db.commit()

        # 3. 進行投注 (手動扣除羽毛以模擬真實行為)
        def place_test_bet(p_id, t, amt, bt, lv=0.0):
            p = db.query(models.Player).filter(models.Player.id == p_id).first()
            p.feathers -= amt # 手動扣除
            db.add(models.Bet(player_id=p_id, match_id=match_id, team=t, amount=amt, bet_type=bt, line_value=lv))

        # Moneyline: b1 (T1), b2 (T2)
        place_test_bet("b1", 1, 100, "moneyline")
        place_test_bet("b2", 2, 100, "moneyline")

        # Handicap: b1 (T1 讓 5.0), b2 (T2 受讓 5.0)
        place_test_bet("b1", 1, 100, "handicap", 5.0)
        place_test_bet("b2", 2, 100, "handicap", -5.0)

        # Over/Under: b1 (Over), b2 (Under) Line 40.5
        place_test_bet("b1", 1, 100, "over_under", 40.5)
        place_test_bet("b2", 2, 100, "over_under", 40.5)
        
        db.commit()

        # 模擬比賽結束錄入比分
        match.score = "21-15" # 總分 36
        match.winner = 1
        db.commit()

        # 4. 執行結算
        results = crud.settle_bets(db, match_id, winner_team=1)

        # 5. 驗證
        # 贏家包含: Moneyline(b1), Handicap(b1, 21-15=6 > 5), Under(b2, 36 < 40.5)
        self.assertEqual(len(results["winners"]), 3)
        
        db.refresh(b1)
        # 1000 - 300 + 185(ML) + 185(HCP) = 1070
        self.assertEqual(b1.feathers, 1070)

        db.refresh(b2)
        # 1000 - 300 + 185(OU Under) = 885
        self.assertEqual(b2.feathers, 885)

        db.refresh(p1)
        db.refresh(p2)
        # 敗方池 300 * 0.10 = 30. 每人 15.
        self.assertEqual(p1.feathers, 1015)
        self.assertEqual(p2.feathers, 1015)

        print("\n✅ 進階投注結算測試通過！")

    def test_anti_match_fixing(self):
        db = self.db
        # 1. 建立球員
        p1 = models.Player(id="p1", name="Player 1", mu=30.0, feathers=1000)
        db.add(p1)
        # 建立當日場地狀態
        today = date.today()
        cs = models.CourtState(date=today, state={
            "courts": [
                {"matchId": "match_123", "players": ["p1", "p2", "p3", "p4"]}
            ]
        })
        db.add(cs)
        db.commit()

        # 2. 測試投注對手 (p1 在 Team 1, 卻投 Team 2 獲勝)
        # 這裡需要注意：crud.py 裡的 today 計算包含時區偏移，我們儘量讓測試環境日期匹配
        res = crud.place_bet(db, player_id="p1", match_id="match_123", team=2, amount=100, bet_type="moneyline")
        
        # 3. 驗證被拒絕
        self.assertEqual(res["status"], "error")
        self.assertIn("只能看好自己贏", res["message"])
        
        # 4. 測試投注自己 (應成功)
        res_ok = crud.place_bet(db, player_id="p1", match_id="match_123", team=1, amount=100, bet_type="moneyline")
        self.assertEqual(res_ok["status"], "success")

if __name__ == "__main__":
    unittest.main()
