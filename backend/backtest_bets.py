
import mysql.connector
import json
import os

def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "db-dev"),
        user=os.getenv("MYSQL_USER", "amber_user"),
        password=os.getenv("MYSQL_PASSWORD", "amber_password"),
        database=os.getenv("MYSQL_DB", "amber_db_dev")
    )

def simulate_bet_logic(t1_mu, t2_mu, h_coeff):
    # 修正：強隊讓分，所以是用 t2 - t1
    raw_h = round((t2_mu - t1_mu) * h_coeff * 2) / 2
    handicap_line = max(-10.5, min(10.5, raw_h))
    
    ou_base = 41.5
    ou_floor = 33.5
    base_ou = ou_base - (abs(handicap_line) * 0.7)
    ou_line = float(int(max(ou_floor, base_ou))) + 0.5
    return handicap_line, ou_line

def run_backtest():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT m.id, m.match_date, m.score, m.t1p1_id, m.t1p2_id, m.t2p1_id, m.t2p2_id FROM matches m WHERE m.score LIKE '%-%'")
    matches = cursor.fetchall()
    
    configs = [0.2, 0.3, 0.4, 0.5] # 測試更合理的換算率
    final_report = {}

    for h_c in configs:
        results = {"fav_wins": 0, "und_wins": 0, "pushes": 0, "total": 0}
        
        for m in matches:
            p_ids = [m['t1p1_id'], m['t1p2_id'], m['t2p1_id'], m['t2p2_id']]
            p_ids = [pid for pid in p_ids if pid]
            
            placeholders = ', '.join(['%s'] * len(p_ids))
            cursor.execute(f"SELECT player_id, mu FROM player_stats WHERE player_id IN ({placeholders}) AND date <= %s ORDER BY date DESC", (*p_ids, m['match_date']))
            stats = cursor.fetchall()
            s_dict = {}
            for s in stats:
                if s['player_id'] not in s_dict: s_dict[s['player_id']] = s['mu']
            
            if len(p_ids) == 4:
                t1_mu = s_dict.get(m['t1p1_id'], 25.0) + s_dict.get(m['t1p2_id'], 25.0)
                t2_mu = s_dict.get(m['t2p1_id'], 25.0) + s_dict.get(m['t2p2_id'], 25.0)
            else: continue

            h_line, _ = simulate_bet_logic(t1_mu, t2_mu, h_c)
            if h_line == 0: continue
            
            try:
                s1, s2 = map(int, m['score'].split('-'))
            except: continue
            
            results["total"] += 1
            # 讓分盤判定：(s1 + h_line) vs s2
            # 如果 h_line < 0, 代表 Team 1 是強隊 (Favorite)
            # 如果 h_line > 0, 代表 Team 2 是強隊 (Favorite)
            score_diff = (s1 + h_line) - s2
            
            if h_line < 0: # Team 1 是強隊
                if score_diff > 0: results["fav_wins"] += 1
                elif score_diff < 0: results["und_wins"] += 1
                else: results["pushes"] += 1
            else: # Team 2 是強隊
                if score_diff < 0: results["fav_wins"] += 1
                elif score_diff > 0: results["und_wins"] += 1
                else: results["pushes"] += 1
            
        final_report[f"Coeff {h_c}"] = results

    print(json.dumps(final_report, indent=2, ensure_ascii=False))
    conn.close()

if __name__ == "__main__":
    run_backtest()
