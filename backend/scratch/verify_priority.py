import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import trueskill_logic

def test_priority():
    # 模擬 5 位球員
    # P1, P2, P3, P4: 剛打完 1 場 (matchCount=1, wait_count=1) -> Score = 10 - 10 = 0
    # P5: 剛到場 (matchCount=0, wait_count=1) -> Score = 0 - 10 = -10
    
    players = [
        {'id': 'p1', 'name': 'P1', 'mu': 25.0, 'sigma': 8.333, 'matchCount': 1},
        {'id': 'p2', 'name': 'P2', 'mu': 25.0, 'sigma': 8.333, 'matchCount': 1},
        {'id': 'p3', 'name': 'P3', 'mu': 25.0, 'sigma': 8.333, 'matchCount': 1},
        {'id': 'p4', 'name': 'P4', 'mu': 25.0, 'sigma': 8.333, 'matchCount': 1},
        {'id': 'p5', 'name': 'P5', 'mu': 25.0, 'sigma': 8.333, 'matchCount': 0},
    ]
    
    selected_ids = ['p1', 'p2', 'p3', 'p4', 'p5']
    
    # 模擬最近一場比賽 (P1-P4 剛打完)
    recent_matches = [
        {
            'team1': [{'id': 'p1'}, {'id': 'p2'}],
            'team2': [{'id': 'p3'}, {'id': 'p4'}],
            'matchDate': '2026-05-13'
        }
    ]
    
    # 呼叫配對
    recommendations = trueskill_logic.matchmake(
        all_players=players,
        selected_ids=selected_ids,
        recent_matches=recent_matches,
        target_date='2026-05-13'
    )
    
    print("\n--- 優先權驗證測試 ---")
    # 檢查 P5 是否出現在所有推薦組合中 (因為他分數最低 -10)
    # 而 P1-P4 分數都是 0，會從中挑 3 個出來配對
    for i, rec in enumerate(recommendations[:3]):
        ids = [p['id'] for p in rec['team1'] + rec['team2']]
        print(f"推薦組合 {i+1}: {ids}")
        if 'p5' in ids:
            print(f"✅ P5 (新同學) 成功優先上場")
        else:
            print(f"❌ P5 (新同學) 漏掉了")

if __name__ == "__main__":
    test_priority()
