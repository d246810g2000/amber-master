import sys
import os
from datetime import date

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "backend"))

import models
from database import SessionLocal

def main():
    db = SessionLocal()
    try:
        target_date = date(2026, 6, 18)
        matches = db.query(models.Match).filter(models.Match.match_date == target_date).all()
        
        print(f"=== Matches and Bet outcomes on {target_date} ===")
        for m in matches:
            # Let's print players
            p1 = db.query(models.Player).filter(models.Player.id == m.t1p1_id).first()
            p2 = db.query(models.Player).filter(models.Player.id == m.t1p2_id).first()
            p3 = db.query(models.Player).filter(models.Player.id == m.t2p1_id).first()
            p4 = db.query(models.Player).filter(models.Player.id == m.t2p2_id).first()
            t1_names = f"{p1.name if p1 else ''} & {p2.name if p2 else ''}"
            t2_names = f"{p3.name if p3 else ''} & {p4.name if p4 else ''}"
            
            try:
                score_str = m.score or "21-0"
                s1, s2 = map(int, score_str.split("-"))
            except:
                s1, s2 = (21, 0) if m.winner == 1 else (0, 21)

            print(f"\nMatch ID {m.id} | Court: {m.court_name} | Winner: Team {m.winner}")
            print(f"  Team 1: {t1_names} (Score: {s1})")
            print(f"  Team 2: {t2_names} (Score: {s2})")
            
            # Fetch bets
            bets = db.query(models.Bet).filter(models.Bet.match_id == m.id).all()
            for bt in ["moneyline", "handicap", "over_under"]:
                bt_bets = [b for b in bets if b.bet_type == bt]
                if not bt_bets:
                    continue
                
                # Check outcome
                def is_bet_won(b):
                    if b.bet_type == "moneyline":
                        return b.team == m.winner
                    elif b.bet_type == "handicap":
                        if b.team == 1: return (s1 + b.line_value) > s2
                        else: return (s2 - b.line_value) > s1
                    elif b.bet_type == "over_under":
                        total = s1 + s2
                        return (total > b.line_value) if b.team == 1 else (total < b.line_value)
                    return False

                def is_bet_push(b):
                    if b.bet_type == "handicap":
                        if b.team == 1: return (s1 + b.line_value) == s2
                        return (s2 - b.line_value) == s1
                    elif b.bet_type == "over_under":
                        return (s1 + s2) == b.line_value
                    return False

                win_bets = [b for b in bt_bets if is_bet_won(b)]
                lose_bets = [b for b in bt_bets if not is_bet_won(b) and not is_bet_push(b)]
                push_bets = [b for b in bt_bets if is_bet_push(b)]
                
                win_stake = sum(b.amount for b in win_bets)
                lose_stake = sum(b.amount for b in lose_bets)
                push_stake = sum(b.amount for b in push_bets)
                
                rake = int(lose_stake * 0.05)
                bonus = int(lose_stake * 0.10)
                net_profit = lose_stake - rake - bonus
                pool_odds = (win_stake + net_profit) / win_stake if win_stake > 0 else 1.0
                
                subsidy = 0
                if win_stake > 0:
                    for b in win_bets:
                        locked = b.locked_odds or 1.0
                        house_payout = int(b.amount * locked)
                        pool_payout = int(b.amount * pool_odds)
                        subsidy += max(0, house_payout - pool_payout)
                
                print(f"    [{bt}] Total: {sum(b.amount for b in bt_bets)} | Win Stake: {win_stake} | Lose Stake: {lose_stake} | Push Stake: {push_stake}")
                print(f"      Calculated -> Rake: {rake} | Subsidy: {subsidy} | Net: {rake - subsidy}")
                
                # Print details of bets
                for b in bt_bets:
                    p = db.query(models.Player).filter(models.Player.id == b.player_id).first()
                    p_name = p.name if p else b.player_id
                    status = "WIN" if is_bet_won(b) else ("PUSH" if is_bet_push(b) else "LOSE")
                    print(f"        - {p_name}: bet {b.amount} on Team {b.team} @ {b.locked_odds} -> {status}")

    finally:
        db.close()

if __name__ == "__main__":
    main()
