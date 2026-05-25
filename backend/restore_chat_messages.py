import os
import sys
from datetime import datetime, date

# Add backend directory to sys.path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
import models
from database import SessionLocal, engine

def restore():
    # Make sure tables exist
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Clear existing chat messages to prevent duplicates if run multiple times
        print("Clearing existing chat messages...")
        db.query(models.ChatMessage).delete()
        db.commit()

        print("Fetching all matches...")
        matches = db.query(models.Match).order_by(models.Match.start_time.asc()).all()
        print(f"Found {len(matches)} matches.")

        print("Fetching all bets...")
        all_bets = db.query(models.Bet).order_by(models.Bet.created_at.asc()).all()
        print(f"Found {len(all_bets)} bets.")

        # Reconstruct bet announcements
        for bet in all_bets:
            player = db.query(models.Player).filter(models.Player.id == bet.player_id).first()
            if not player:
                continue
            
            # Find the match
            match = db.query(models.Match).filter(models.Match.id == bet.match_id).first()
            if not match:
                continue
            
            # Get team names
            t1_players = [match.t1p1.name] if match.t1p1 else []
            if match.t1p2:
                t1_players.append(match.t1p2.name)
            t2_players = [match.t2p1.name] if match.t2p1 else []
            if match.t2p2:
                t2_players.append(match.t2p2.name)
                
            t1_str = " & ".join(t1_players)
            t2_str = " & ".join(t2_players)
            court_name = f"場地 {match.court_name}" if match.court_name else "未知"
            
            target_team_name = t1_str if bet.team == 1 else t2_str
            other_team_name = t2_str if bet.team == 1 else t1_str
            
            bet_announcement = f"📣 {player.name} 豪擲了 {bet.amount} 根羽毛，在「{court_name}」看好「{target_team_name}」會打敗「{other_team_name}」！"
            
            db_msg = models.ChatMessage(
                match_date=match.match_date,
                type="bet",
                content=bet_announcement,
                timestamp=bet.created_at
            )
            db.add(db_msg)
            
        # Reconstruct match victory announcements
        for m in matches:
            t1_players = [m.t1p1.name] if m.t1p1 else []
            if m.t1p2:
                t1_players.append(m.t1p2.name)
            t2_players = [m.t2p1.name] if m.t2p1 else []
            if m.t2p2:
                t2_players.append(m.t2p2.name)
                
            t1_str = " & ".join(t1_players)
            t2_str = " & ".join(t2_players)
            court_name = f"場地 {m.court_name}" if m.court_name else "未知"
            
            winner_team = m.winner
            winners = t1_str if winner_team == 1 else t2_str
            losers = t2_str if winner_team == 1 else t1_str
            
            announcement = f"🏆 恭喜！在「{court_name}」中，{winners} 最終擊敗了 {losers}，取得勝利！"
            
            # Recalculate payouts for betting results
            bets = db.query(models.Bet).filter(models.Bet.match_id == m.id).all()
            
            try:
                score_str = m.score or "21-0"
                s1, s2 = map(int, score_str.split("-"))
            except:
                s1, s2 = (21, 0) if winner_team == 1 else (0, 21)
                
            bet_types = ["moneyline", "handicap", "over_under"]
            winners_report = []
            calculated_odds = 1.0

            for bt in bet_types:
                type_bets = [b for b in bets if b.bet_type == bt]
                if not type_bets:
                    continue
                
                def is_bet_won(b):
                    if b.bet_type == "moneyline":
                        return b.team == winner_team
                    if b.bet_type == "handicap":
                        if b.team == 1:
                            return (s1 + b.line_value) > s2
                        else:
                            return (s2 - b.line_value) > s1
                    if b.bet_type == "over_under":
                        total = s1 + s2
                        return (total > b.line_value) if b.team == 1 else (total < b.line_value)
                    return False

                win_bets = [b for b in type_bets if is_bet_won(b)]
                lose_stake = sum(b.amount for b in type_bets if not is_bet_won(b))
                win_stake = sum(b.amount for b in win_bets)
                
                if win_stake > 0:
                    rake = int(lose_stake * 0.05)
                    bonus = int(lose_stake * 0.10)
                    net_profit = lose_stake - rake - bonus
                    odds = (win_stake + net_profit) / win_stake
                    calculated_odds = odds # Keep latest odds
                    
                    for b in win_bets:
                        payout = int(b.amount * odds)
                        p = db.query(models.Player).filter(models.Player.id == b.player_id).first()
                        if p:
                            winners_report.append({"name": p.name, "payout": payout, "type": bt})
            
            if winners_report:
                payout_details = " \n💰 賭神出世："
                # Sort payouts and take top 3
                sorted_payouts = sorted(winners_report, key=lambda x: x['payout'], reverse=True)
                for p in sorted_payouts[:3]:
                    payout_details += f" {p['name']} (+{p['payout']})"
                announcement += f"{payout_details} (賠率 {round(calculated_odds, 2)})"
            
            from datetime import timedelta
            db_msg = models.ChatMessage(
                match_date=m.match_date,
                type="announcement",
                content=announcement,
                timestamp=m.start_time - timedelta(hours=8)
            )
            db.add(db_msg)
            
        db.commit()
        print("Database commit successful. Reconstructed messages saved.")
        
    except Exception as e:
        db.rollback()
        print(f"Error during restore: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    restore()
