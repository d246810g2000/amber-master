import random
import json
import os
import sys
from datetime import date
import itertools
from typing import List, Dict, Any, Optional, Tuple

# 確保可以引用到上一層的 trueskill_logic
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from trueskill_logic import matchmake, ts as trueskill_env, calculate_new_ratings

class SimulationRunner:
    def __init__(self, players: List[Dict], court_count: int, total_duration: int):
        self.players = players
        self.court_count = court_count
        self.total_duration = total_duration # minutes
        self.history = []
        self.timeline = []
        self.current_time = 0
        self.courts = [{'id': i+1, 'busy_until': 0, 'current_match': None} for i in range(court_count)]

    def run(self, target_date: str):
        self.timeline.append(f"--- 模擬開始: {target_date} ---")
        
        while self.current_time < self.total_duration:
            # 1. 釋放已結束的場地
            for court in self.courts:
                if court['busy_until'] <= self.current_time and court['current_match']:
                    m = court['current_match']
                    participants = [p['id'] for p in m['team1'] + m['team2']]
                    for p in self.players:
                        if p['id'] in participants:
                            p['status'] = 'ready'
                    court['current_match'] = None

            # 2. 檢查是否有空場地
            for court in self.courts:
                if court['current_match'] is None:
                    ready_players = [p for p in self.players if p.get('status', 'ready') == 'ready']
                    if len(ready_players) >= 4:
                        ready_ids = [p['id'] for p in ready_players]
                        suggestions = matchmake(
                            self.players, 
                            ready_ids, 
                            recent_matches=self.history,
                            target_date=target_date
                        )
                        
                        if suggestions:
                            best = suggestions[0]
                            duration = random.randint(15, 22)
                            court['busy_until'] = self.current_time + duration
                            
                            match_data = {
                                'id': f"sim_{len(self.history)+1}",
                                'matchDate': target_date,
                                'team1': [{'id': p['id']} for p in best['team1']],
                                'team2': [{'id': p['id']} for p in best['team2']],
                                'team1_names': [p['name'] for p in best['team1']],
                                'team2_names': [p['name'] for p in best['team2']],
                                'quality': best['quality']
                            }
                            court['current_match'] = match_data
                            
                            p_ids = [p['id'] for p in best['team1'] + best['team2']]
                            for p in self.players:
                                if p['id'] in p_ids:
                                    p['status'] = 'playing'
                                    p['matchCount'] = p.get('matchCount', 0) + 1
                            
                            winner = random.choice([1, 2])
                            new_ratings = calculate_new_ratings(
                                [(p['mu'], p['sigma']) for p in best['team1']],
                                [(p['mu'], p['sigma']) for p in best['team2']],
                                winner=winner
                            )
                            for i, p in enumerate(best['team1']): p['mu'], p['sigma'] = new_ratings[0][i]
                            for i, p in enumerate(best['team2']): p['mu'], p['sigma'] = new_ratings[1][i]
                                
                            self.history.insert(0, match_data)
            self.current_time += 1

def run_advanced_simulation():
    total_players = 16
    players = []
    for i in range(total_players):
        mu = 25.0
        tier = 'Mid'
        if i < 4: mu = 37.5; tier = 'Strong'
        elif i >= 12: mu = 12.5; tier = 'Weak'
        players.append({'id': str(i + 1), 'name': f"{tier}-P{i+1:02d}", 'tier': tier, 'mu': mu, 'sigma': 8.333, 'matchCount': 0, 'status': 'ready'})

    runner = SimulationRunner(players, court_count=2, total_duration=120)
    runner.run("2026-04-08")
    tier_stats = {'Strong': {'matches': 0, 'count': 4}, 'Mid': {'matches': 0, 'count': 8}, 'Weak': {'matches': 0, 'count': 4}}
    for p in players: tier_stats[p['tier']]['matches'] += p['matchCount']
    for t in tier_stats: tier_stats[t]['avg'] = tier_stats[t]['matches'] / tier_stats[t]['count']
    return {'history': runner.history, 'players': players, 'tier_stats': tier_stats}

def generate_report(all_results):
    num_iters = len(all_results)
    
    # 基礎指標
    avg_total_matches = sum([len(r['history']) for r in all_results]) / num_iters
    avg_quality = sum([sum([m['quality'] for m in r['history']]) / (len(r['history']) or 1) for r in all_results]) / num_iters
    
    # 多樣性與公平性統計
    total_repeat_quartets = 0
    total_repeat_partners = 0
    all_std_devs = []
    
    for r in all_results:
        # 1. 重複統計
        quartets = []
        partners = []
        for m in r['history']:
            q = sorted([p['id'] for p in m['team1'] + m['team2']])
            quartets.append("-".join(q))
            partners.append("-".join(sorted([p['id'] for p in m['team1']])))
            partners.append("-".join(sorted([p['id'] for p in m['team2']])))
        
        total_repeat_quartets += (len(quartets) - len(set(quartets)))
        total_repeat_partners += (len(partners) - len(set(partners)))
        
        # 2. 標準差 (公平性)
        m_counts = [p['matchCount'] for p in r['players']]
        mean_m = sum(m_counts) / len(m_counts)
        variance = sum((x - mean_m) ** 2 for x in m_counts) / len(m_counts)
        all_std_devs.append(variance ** 0.5)

    avg_std_dev = sum(all_std_devs) / num_iters

    report = f"# 🏸 安柏羽球後端配對引擎 - 模擬分析報告\n\n"
    report += f"> 生成時間: {date.today().isoformat()}\n"
    report += f"> 測試環境: FastAPI + TrueSkill (Python Port)\n\n"
    
    report += "```text\n"
    report += "==================================================\n"
    report += f"📊 統計分析報告 (n = {num_iters})\n"
    report += "==================================================\n"
    report += f"1. 平均每晚總場次: {avg_total_matches:.1f} 場\n"
    report += f"2. 組合多樣性 (Diversity Index):\n"
    report += f"   - 平均重複四人組次數: {total_repeat_quartets/num_iters:.1f} 次/晚\n"
    report += f"   - 平均重複搭檔次數: {total_repeat_partners/num_iters:.1f} 次/晚\n"
    report += f"3. 公平性與等候感 (Fairness Audit):\n"
    report += f"   - 平均對戰品質: {avg_quality*100:.1f}%\n"
    report += f"   - 場數標準差: {avg_std_dev:.2f} (越小代表越公平)\n"
    report += "==================================================\n"
    report += "```\n\n"
    
    report += "## 👤 分層體驗詳情\n"
    report += "| 等級 | 平均每人場次 | 狀態 |\n"
    report += "| :--- | :--- | :--- |\n"
    for tier in ['Strong', 'Mid', 'Weak']:
        avg_m = sum([r['tier_stats'][tier]['avg'] for r in all_results]) / num_iters
        ideal = (avg_total_matches * 4) / 16
        diff = avg_m - ideal
        status = "✅ 完美平衡" if abs(diff) < 0.5 else ("✅ 平衡" if abs(diff) < 1.0 else "⚠️ 需微調")
        report += f"| {tier} | {avg_m:.1f} | {status} |\n"
        
    return report

if __name__ == "__main__":
    import time
    results = []
    print(f"🚀 開始執行 10 輪模擬測試 (總時長: 120min/輪)...")
    start_all = time.time()
    for i in range(10):
        print(f"📊 正在執行第 {i+1}/10 輪...", end="", flush=True)
        start_round = time.time()
        res = run_advanced_simulation()
        results.append(res)
        end_round = time.time()
        print(f" 完成！(耗時: {end_round - start_round:.2f}s, 本輪共 {len(res['history'])} 場比賽)")
    
    end_all = time.time()
    final_report = generate_report(results)
    final_report += f"\n\n## 效能統計\n- 總執行耗時: {end_all - start_all:.2f} 秒\n- 平均每輪耗時: {(end_all - start_all)/10:.2f} 秒\n"
    
    # 建立 backend/sim 目錄
    output_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, 'README.md'), 'w', encoding='utf-8') as f:
        f.write(final_report)
    
    print(f"✅ 模擬完成！報告已輸出至: {output_dir}/README.md")
