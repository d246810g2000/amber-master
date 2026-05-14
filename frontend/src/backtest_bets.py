
import mysql.connector
import json

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        port=3307,
        user="root",
        password="root_password",
        database="amber_db_dev"
    )

def simulate_bet_logic(t1_mu, t2_mu):
    raw_h = round((t1_mu - t2_mu) * 2) / 2
    handicap_line = max(-12.5, min(12.5, raw_h))
    
    base_ou = 39.5 - (abs(handicap_line) * 0.85)
    ou_line = float(int(max(28.5, base_ou))) + 0.5
    return handicap_line, ou_line

def run_backtest():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # 抓取有比分的比賽
    cursor.execute("""
        SELECT m.id, m.match_date, m.score, m.t1p1_id, m.t1p2_id, m.t2p1_id, m.t2p2_id
        FROM matches m 
        WHERE m.score LIKE '%-%'
    """)
    matches = cursor.fetchall()
    
    results = {
        "handicap": {"favorite_wins": 0, "underdog_wins": 0, "pushes": 0},
        "over_under": {"over_wins": 0, "under_wins": 0},
        "total_matches": 0
    }

    for m in matches:
        p_ids = [m['t1p1_id'], m['t1p2_id'], m['t2p1_id'], m['t2p2_id']]
        p_ids = [pid for pid in p_ids if pid]
        
        # 抓取當天或最近的戰力
        placeholders = ', '.join(['%s'] * len(p_ids))
        cursor.execute(f"SELECT player_id, mu FROM player_stats WHERE player_id IN ({placeholders}) AND date <= %s ORDER BY date DESC", (*p_ids, m['match_date']))
        stats = cursor.fetchall()
        # 只取每個球員最新的一筆
        s_dict = {}
        for s in stats:
            if s['player_id'] not in s_dict:
                s_dict[s['player_id']] = s['mu']
        
        if len(p_ids) == 4:
            t1_mu = s_dict.get(m['t1p1_id'], 25.0) + s_dict.get(m['t1p2_id'], 25.0)
            t2_mu = s_dict.get(m['t2p1_id'], 25.0) + s_dict.get(m['t2p2_id'], 25.0)
        else:
            continue

        h_line, ou_line = simulate_bet_logic(t1_mu, t2_mu)
        
        # 解析比分
        try:
            s1, s2 = map(int, m['score'].split('-'))
        except:
            continue
            
        results["total_matches"] += 1
        
        # 讓分判定 (假設 Team 1 是強隊或弱隊由 H 決定)
        # 統一轉換為: (Team 1 分數 + 讓分) VS Team 2 分數
        if (s1 + h_line) > s2:
            results["handicap"]["favorite_wins" if h_line < 0 else "underdog_wins"] += 1
        elif (s1 + h_line) < s2:
            results["handicap"]["underdog_wins" if h_line < 0 else "favorite_wins"] += 1
        else:
            results["handicap"]["pushes"] += 1
            
        # 大小分判定
        if (s1 + s2) > ou_line:
            results["over_under"]["over_wins"] += 1
        else:
            results["over_under"]["under_wins"] += 1

    print(json.dumps(results, indent=2, ensure_ascii=False))
    conn.close()

if __name__ == "__main__":
    run_backtest()
