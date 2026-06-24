import sys
import os
from datetime import date, datetime
from sqlalchemy.orm import Session
from sqlalchemy import text

# Add backend directory to python path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import models
from database import SessionLocal

def get_match_mus(db: Session, match_id: str, match_date: date):
    # Fallback/helper to get ratings before the match
    # Replicates crud.py's internal _get_match_mus
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        return 25.0, 25.0
        
    def get_player_mu_before(player_id):
        if not player_id:
            return 25.0
        # Check in match updated_players_json first
        if db_match.updated_players_json:
            for p_up in db_match.updated_players_json:
                if str(p_up.get('id')) == str(player_id):
                    if p_up.get('muBefore') is not None:
                        return p_up.get('muBefore')
        # Fallback to PlayerStat on that day
        stat = db.query(models.PlayerStat).filter(
            models.PlayerStat.player_id == player_id,
            models.PlayerStat.date == match_date
        ).first()
        if stat:
            return stat.mu
        # Fallback to Player current mu
        p = db.query(models.Player).filter(models.Player.id == player_id).first()
        return p.mu if p else 25.0

    t1p1_mu = get_player_mu_before(db_match.t1p1_id)
    t1p2_mu = get_player_mu_before(db_match.t1p2_id)
    t2p1_mu = get_player_mu_before(db_match.t2p1_id)
    t2p2_mu = get_player_mu_before(db_match.t2p2_id)
    
    return (t1p1_mu + t1p2_mu) / 2.0, (t2p1_mu + t2p2_mu) / 2.0

def compute_house_odds(t1_mu: float, t2_mu: float, bet_type: str):
    # Replicates compute_house_odds from crud.py
    HOUSE_VIG = 0.08
    HOUSE_MIN_ODDS = 1.10
    HOUSE_MAX_ODDS = 8.00
    HOUSE_MU_PROB_COEFF = 0.018
    
    if bet_type in ["moneyline", "handicap", "over_under"]:
        diff = t1_mu - t2_mu
        p_t1 = max(0.08, min(0.92, 0.5 + diff * HOUSE_MU_PROB_COEFF))
        p_t2 = 1.0 - p_t1
    else:
        p_t1 = p_t2 = 0.5

    def side_odds(p):
        return round(max(HOUSE_MIN_ODDS, min(HOUSE_MAX_ODDS, (1 - HOUSE_VIG / 2) / p)), 2)

    return side_odds(p_t1), side_odds(p_t2)

def main():
    db = SessionLocal()
    try:
        print("Starting retroactive update of house daily stats...")
        
        # 1. Fetch all matches
        matches = db.query(models.Match).order_by(models.Match.match_date.asc(), models.Match.start_time.asc()).all()
        print(f"Found {len(matches)} matches to process.")
        
        daily_stats = {} # {date: {rake: 0, subsidy: 0}}
        
        for m in matches:
            match_date = m.match_date
            if not match_date:
                continue
                
            if match_date not in daily_stats:
                daily_stats[match_date] = {"rake": 0, "subsidy": 0}
                
            # Get all bets on this match
            bets = db.query(models.Bet).filter(models.Bet.match_id == m.id, models.Bet.is_settled == 1).all()
            if not bets:
                continue
                
            try:
                score_str = m.score or "21-0"
                s1, s2 = map(int, score_str.split("-"))
            except:
                s1, s2 = (21, 0) if m.winner == 1 else (0, 21)
                
            t1_mu, t2_mu = get_match_mus(db, m.id, match_date)
            
            for bt in ["moneyline", "handicap", "over_under"]:
                type_bets = [b for b in bets if b.bet_type == bt]
                if not type_bets:
                    continue
                    
                house_o1, house_o2 = compute_house_odds(t1_mu, t2_mu, bt)
                
                def is_bet_push(b):
                    if b.bet_type == "handicap":
                        if b.team == 1: return (s1 + b.line_value) == s2
                        return (s2 - b.line_value) == s1
                    if b.bet_type == "over_under":
                        return (s1 + s2) == b.line_value
                    return False

                def is_bet_won(b):
                    if is_bet_push(b):
                        return False
                    if b.bet_type == "moneyline":
                        return b.team == m.winner
                    elif b.bet_type == "handicap":
                        if b.team == 1: return (s1 + b.line_value) > s2
                        else: return (s2 - b.line_value) > s1
                    elif b.bet_type == "over_under":
                        total = s1 + s2
                        return (total > b.line_value) if b.team == 1 else (total < b.line_value)
                    return False
                    
                win_bets = [b for b in type_bets if is_bet_won(b)]
                lose_stake = sum(b.amount for b in type_bets if not is_bet_won(b) and not is_bet_push(b))
                win_stake = sum(b.amount for b in win_bets)
                
                bonus = int(lose_stake * 0.10)
                
                if win_stake > 0:
                    rake = int(lose_stake * 0.05)
                else:
                    rake = lose_stake - bonus
                    
                net_profit = lose_stake - rake - bonus
                pool_odds = (win_stake + net_profit) / win_stake if win_stake > 0 else 1.0
                
                subsidy = 0
                if win_stake > 0:
                    for b in win_bets:
                        locked = b.locked_odds
                        if not locked:
                            locked = house_o1 if b.team == 1 else house_o2
                        house_payout = int(b.amount * locked)
                        pool_payout = int(b.amount * pool_odds)
                        subsidy += max(0, house_payout - pool_payout)
                        
                daily_stats[match_date]["rake"] += rake
                daily_stats[match_date]["subsidy"] += subsidy
                
        # 2. Update house_daily_stats table
        print("\nUpdating database table `house_daily_stats`...")
        for target_date, stats in sorted(daily_stats.items()):
            row = db.query(models.HouseDailyStats).filter(models.HouseDailyStats.date == target_date).first()
            if row:
                row.rake_collected = stats["rake"]
                row.house_subsidy = stats["subsidy"]
                row.updated_at = datetime.utcnow()
                print(f"Updated {target_date}: Rake={stats['rake']}, Subsidy={stats['subsidy']}, Net={stats['rake']-stats['subsidy']}")
            else:
                db.add(models.HouseDailyStats(
                    date=target_date,
                    rake_collected=stats["rake"],
                    house_subsidy=stats["subsidy"]
                ))
                print(f"Inserted {target_date}: Rake={stats['rake']}, Subsidy={stats['subsidy']}, Net={stats['rake']-stats['subsidy']}")
                
        db.commit()
        print("\nRetroactive update completed successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error during retroactive update: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    main()
