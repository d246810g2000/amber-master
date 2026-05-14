
import random
import statistics

# --- 模擬參數 (核心團 + 高強度 6 場版) ---
NUM_PLAYERS = 16          # 核心球員 16 人
WEEKS = 13                # 模擬一季
WEEKLY_WAGE = 1000        
ATTENDANCE_RATE = 0.95    # 穩定出席
MATCHES_PER_PERSON = 6    # 高強度 (每人 6 場)
WIN_REWARD = 100          
LOSS_REWARD = 50          
SYSTEM_RAKE_RATE = 0.05   
PLAYER_BONUS_RATE = 0.10  

class Player:
    def __init__(self, id):
        self.id = id
        self.feathers = 0
        self.type = random.choice(["賭神", "一般", "保守"]) # 玩家類型
        self.total_match_rewards = 0
        self.total_player_bonus = 0 # 贏球領的分紅

def run_simulation():
    players = [Player(i) for i in range(NUM_PLAYERS)]
    history = []
    
    total_raked = 0
    total_bonus_paid = 0
    
    for week in range(1, WEEKS + 1):
        weekly_minted = 0
        
        # 1. 領工資
        attending = [p for p in players if random.random() < ATTENDANCE_RATE]
        for p in attending:
            p.feathers += WEEKLY_WAGE
            weekly_minted += WEEKLY_WAGE
            
        # 2. 模擬比賽
        num_matches = (len(attending) * MATCHES_PER_PERSON) // 4
        for _ in range(num_matches):
            match_players = random.sample(attending, 4)
            team1, team2 = match_players[:2], match_players[2:]
            winner_team = team1 if random.random() < 0.5 else team2
            
            # 比賽獎勵
            for p in attending: # 這裡修正為僅場上球員領獎
                if p in winner_team: 
                    p.feathers += WIN_REWARD
                    weekly_minted += WIN_REWARD
                elif p in (team1 if winner_team == team2 else team2):
                    p.feathers += LOSS_REWARD
                    weekly_minted += LOSS_REWARD

            # 3. 投注
            others = [p for p in attending if p not in match_players]
            t1_bets, t2_bets = [], []
            
            for b in others:
                # 每場都會有人預測 (機率設為 1.0)
                prob = 1.0
                if random.random() < prob and b.feathers >= 50:
                    max_b = 500 if b.type == "賭神" else 200
                    amt = random.randint(5, max_b // 10) * 10
                    amt = min(amt, b.feathers)
                    side = 1 if random.random() < 0.5 else 2
                    b.feathers -= amt
                    if side == 1: t1_bets.append((b, amt))
                    else: t2_bets.append((b, amt))
            
            # 結算
            win_side = 1 if winner_team == team1 else 2
            win_bets = t1_bets if win_side == 1 else t2_bets
            lose_bets = t2_bets if win_side == 1 else t1_bets
            w_total, l_total = sum(a for p,a in win_bets), sum(a for p,a in lose_bets)
            
            if w_total > 0 and l_total > 0:
                bonus = int(l_total * PLAYER_BONUS_RATE)
                rake = int(l_total * SYSTEM_RAKE_RATE)
                total_raked += rake
                total_bonus_paid += bonus
                
                for p in winner_team: 
                    p.feathers += bonus // 2
                    p.total_player_bonus += bonus // 2
                
                net = l_total - bonus - rake
                for p, amt in win_bets:
                    p.feathers += amt + int((amt/w_total) * net)
            else:
                # 退款
                for p, a in win_bets: p.feathers += a
                for p, a in lose_bets: p.feathers += a

        history.append({"week": week, "total": sum(p.feathers for p in players)})

    print(f"\n=== 🏸 一季 (13週) 經濟模擬報告 (全員投注版) ===")
    print(f"期末總流通量: {history[-1]['total']:,} 羽毛")
    print(f"全體平均餘額: {history[-1]['total']/NUM_PLAYERS:,.0f} 羽毛")
    print(f"系統總回收 (規費): {total_raked:,} 羽毛")
    print(f"球員總分紅 (激勵): {total_bonus_paid:,} 羽毛")
    
    print("\n--- 16 位球員最終清單 (由富到貧) ---")
    print("名次 | 類型 | 最終餘額 | 累計贏球分紅")
    sorted_p = sorted(players, key=lambda x: x.feathers, reverse=True)
    for i, p in enumerate(sorted_p, 1):
        print(f"#{i:2d}  | {p.type} | {p.feathers:8,d} | {p.total_player_bonus:8,d}")

    print("\n--- 商店定價建議 ---")
    print(f"1. 普及型商品 (大家買得起): {history[-1]['total']/NUM_PLAYERS * 0.2:,.0f} 羽毛")
    print(f"2. 尊榮型商品 (僅 P10 買得起): {sorted_p[2].feathers * 0.8:,.0f} 羽毛")

if __name__ == "__main__":
    run_simulation()
