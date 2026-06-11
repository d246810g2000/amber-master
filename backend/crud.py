from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from datetime import date, datetime
import models, schemas
import random
import time
import trueskill_logic
from typing import List, Dict, Any, Optional, Union

def get_players(db: Session):
    return db.query(models.Player).options(
        joinedload(models.Player.active_title),
        joinedload(models.Player.active_frame),
        joinedload(models.Player.active_background)
    ).all()

def get_player_by_email(db: Session, email: str):
    if not email: return None
    clean_email = email.strip().lower()
    return db.query(models.Player).filter(
        func.lower(models.Player.email) == clean_email
    ).options(
        joinedload(models.Player.active_title),
        joinedload(models.Player.active_frame),
        joinedload(models.Player.active_background)
    ).first()

def get_player_stats(db: Session, target_date: date = None):
    query = db.query(models.PlayerStat).options(joinedload(models.PlayerStat.player))
    if target_date:
        query = query.filter(models.PlayerStat.date == target_date)
    return query.all()

def get_matches(db: Session, target_date: date = None):
    query = db.query(models.Match).options(
        joinedload(models.Match.t1p1),
        joinedload(models.Match.t1p2),
        joinedload(models.Match.t2p1),
        joinedload(models.Match.t2p2)
    )
    if target_date:
        query = query.filter(models.Match.match_date == target_date)
    return query.order_by(models.Match.match_no.desc(), models.Match.start_time.desc()).all()

def get_court_state(db: Session, target_date: date):
    state = db.query(models.CourtState).filter(models.CourtState.date == target_date).first()
    return state

def create_player(db: Session, player: schemas.PlayerCreate):
    pid = player.id if player.id else str(int(time.time() * 1000))
    db_player = models.Player(
        id=pid,
        name=player.name,
        avatar=player.avatar,
        type=player.type,
        email=player.email
    )
    db.add(db_player)
    db.commit()
    db.refresh(db_player)
    return db_player

def create_players_batch(db: Session, players: schemas.PlayerBatchCreate):
    db_players = []
    now_ms = int(time.time() * 1000)
    for i, p_data in enumerate(players.names):
        pid = str(now_ms + i)
        if isinstance(p_data, dict):
            name = p_data.get('name')
            avatar = p_data.get('avatar')
            ptype = p_data.get('type', 'guest')
        else:
            name = str(p_data)
            avatar = None
            ptype = 'guest'
            
        db_player = models.Player(
            id=pid,
            name=name,
            avatar=avatar,
            type=ptype
        )
        db.add(db_player)
        db_players.append(db_player)
    db.commit()
    return db_players

def update_player(db: Session, player_id: str, player: schemas.PlayerUpdate):
    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if db_player:
        update_data = player.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_player, key, value)
        db.commit()
        db.refresh(db_player)
    return db_player

def delete_player(db: Session, player_id: str):
    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if db_player:
        db.delete(db_player)
        db.commit()
        return True
    return False

def delete_players_batch(db: Session, ids: list[str]):
    db.query(models.Player).filter(models.Player.id.in_(ids)).delete(synchronize_session=False)
    db.commit()
    return True

def batch_update_players(db: Session, updates: list[schemas.PlayerBatchUpdateItem]):
    for update in updates:
        db_player = db.query(models.Player).filter(models.Player.id == update.id).first()
        if db_player:
            if update.mu is not None:
                db_player.mu = update.mu
            if update.sigma is not None:
                db_player.sigma = update.sigma
    db.commit()
    return True

def bind_player(db: Session, player_id: str, email: str):
    existing = db.query(models.Player).filter(models.Player.email == email).first()
    if existing and existing.id != player_id:
        return {"status": "error", "message": "This account is already bound to another player", "code": "ALREADY_BOUND_TO_OTHER_PLAYER"}
        
    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not db_player:
        return {"status": "error", "message": "Player not found", "code": "PLAYER_NOT_FOUND"}
        
    if db_player.email and db_player.email != email:
        return {"status": "error", "message": "This player is already bound", "code": "PLAYER_ALREADY_BOUND"}
        
    if db_player.email == email:
        return {"status": "success", "data": {"playerId": player_id, "alreadyBound": True}}
        
    db_player.email = email
    db.commit()
    return {"status": "success", "data": {"playerId": player_id, "alreadyBound": False}}

def unbind_player(db: Session, player_id: str, email: str):
    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not db_player:
        return {"status": "error", "message": "Player not found", "code": "PLAYER_NOT_FOUND"}
        
    if not db_player.email:
        return {"status": "success", "data": {"playerId": player_id, "alreadyUnbound": True}}
        
    if db_player.email != email:
        return {"status": "error", "message": "Only owner can unbind", "code": "NOT_OWNER"}
        
    db_player.email = None
    db.commit()
    return {"status": "success", "data": {"playerId": player_id, "alreadyUnbound": False}}

def record_match_and_update(db: Session, req: schemas.MatchRecordRequest):
    match_id = req.matchId if req.matchId else str(int(time.time() * 1000))
    match_date = datetime.strptime(req.matchDate, "%Y-%m-%d").date() if req.matchDate else datetime.utcnow().date()
    start_time = datetime.fromisoformat(req.date.replace('Z', '+00:00')).replace(tzinfo=None) if req.date else datetime.utcnow()
    
    winner = 1 if req.winnerTeam == 'Team 1' else 2
    
    match_no = req.matchNo
    if not match_no:
        count = db.query(func.count(models.Match.id)).filter(models.Match.match_date == match_date).scalar()
        match_no = count + 1

    # 1. 抓取球員目前的戰力 (如果前端沒給，則從 DB 抓)
    p_ids = [req.t1p1, req.t1p2, req.t2p1, req.t2p2]
    db_players_list = db.query(models.Player).filter(models.Player.id.in_(p_ids)).all()
    db_players = {p.id: p for p in db_players_list}
    
    # 確保 4 位球員都在
    for pid in p_ids:
        if pid not in db_players:
            return {"status": "error", "message": f"Player {pid} not found"}

    # 2. 自動計算 TrueSkill 更新 (如果前端沒給數據，後端自己算)
    updated_players_data = []
    
    if not req.updatedPlayers or not req.updatedStats:
        # A. 今日即時戰力 (Daily) - 每天重置
        daily_ratings = {} 
        daily_mu_before_map = {}
        
        # B. 生涯戰力 (Career) - 持續累積
        career_ratings = {}
        career_mu_before_map = {}

        for pid in p_ids:
            p = db_players[pid]
            career_ratings[pid] = (p.mu, p.sigma)
            career_mu_before_map[pid] = p.mu

            # 抓取今日統計
            db_stat = db.query(models.PlayerStat).filter(
                models.PlayerStat.date == match_date,
                models.PlayerStat.player_id == pid
            ).first()
            
            if db_stat:
                daily_ratings[pid] = (db_stat.mu, db_stat.sigma)
                daily_mu_before_map[pid] = db_stat.mu
            else:
                daily_ratings[pid] = (25.0, 8.333)
                daily_mu_before_map[pid] = 25.0

        # --- 計算生涯 TrueSkill ---
        career_team1 = [career_ratings[req.t1p1], career_ratings[req.t1p2]]
        career_team2 = [career_ratings[req.t2p1], career_ratings[req.t2p2]]
        new_career_ratings = trueskill_logic.calculate_new_ratings(career_team1, career_team2, winner=winner)
        all_new_career = new_career_ratings[0] + new_career_ratings[1]

        # --- 計算即時 TrueSkill ---
        daily_team1 = [daily_ratings[req.t1p1], daily_ratings[req.t1p2]]
        daily_team2 = [daily_ratings[req.t2p1], daily_ratings[req.t2p2]]
        new_daily_ratings = trueskill_logic.calculate_new_ratings(daily_team1, daily_team2, winner=winner)
        all_new_daily = new_daily_ratings[0] + new_daily_ratings[1]
        
        for i, pid in enumerate(p_ids):
            p = db_players[pid]
            is_win = (winner == 1 and i < 2) or (winner == 2 and i >= 2)
            
            # 更新生涯戰力 (Player 表)
            c_mu_after, c_sigma_after = all_new_career[i]
            p.mu = c_mu_after
            p.sigma = c_sigma_after
            
            # 更新今日戰力 (PlayerStat 表)
            d_mu_after, d_sigma_after = all_new_daily[i]
            db_stat = db.query(models.PlayerStat).filter(
                models.PlayerStat.date == match_date, 
                models.PlayerStat.player_id == pid
            ).first()
            
            if db_stat:
                m_count = db_stat.match_count + 1
                w_count = db_stat.win_count + (1 if is_win else 0)
                db_stat.mu = d_mu_after
                db_stat.sigma = d_sigma_after
                db_stat.match_count = m_count
                db_stat.win_count = w_count
                db_stat.win_rate = round((w_count / m_count) * 100)
            else:
                db.add(models.PlayerStat(
                    date=match_date,
                    player_id=pid,
                    mu=d_mu_after,
                    sigma=d_sigma_after,
                    match_count=1,
                    win_count=1 if is_win else 0,
                    win_rate=100 if is_win else 0
                ))
            
            # 紀錄變動明細到 Match
            updated_players_data.append({
                "id": pid, 
                "muBefore": career_mu_before_map[pid], # 生涯原本
                "muAfter": c_mu_after,                 # 生涯之後
                "dailyMuBefore": daily_mu_before_map[pid], # 即時原本
                "dailyMuAfter": d_mu_after,                # 即時之後
                "sigma": c_sigma_after
            })
    else:
        # 相容模式：使用前端傳入的數據更新
        updated_players_data = req.updatedPlayers
        # 更新 Player
        for p_up in updated_players_data:
            p_id = str(p_up.get('id'))
            db_player = db_players.get(p_id)
            if db_player:
                db_player.mu = p_up.get('muAfter', p_up.get('mu', db_player.mu))
                db_player.sigma = p_up.get('sigma', db_player.sigma)
        
        # 更新 Stats
        for stat in req.updatedStats:
            p_id = str(stat.get('id', stat.get('ID')))
            db_stat = db.query(models.PlayerStat).filter(
                models.PlayerStat.date == match_date, 
                models.PlayerStat.player_id == p_id
            ).first()
            if db_stat:
                db_stat.mu = stat.get('mu', stat.get('Mu', db_stat.mu))
                db_stat.sigma = stat.get('sigma', stat.get('Sigma', db_stat.sigma))
                db_stat.match_count = stat.get('matchCount', stat.get('MatchCount', db_stat.match_count))
                db_stat.win_count = stat.get('winCount', stat.get('WinCount', db_stat.win_count))
                db_stat.win_rate = stat.get('winRate', stat.get('WinRate', db_stat.win_rate))
            else:
                db.add(models.PlayerStat(
                    date=match_date,
                    player_id=p_id,
                    mu=stat.get('mu', stat.get('Mu')),
                    sigma=stat.get('sigma', stat.get('Sigma')),
                    match_count=stat.get('matchCount', stat.get('MatchCount')),
                    win_count=stat.get('winCount', stat.get('WinCount')),
                    win_rate=stat.get('winRate', stat.get('WinRate'))
                ))

    # 3. 儲存對戰紀錄
    db_match = models.Match(
        id=match_id,
        match_date=match_date,
        start_time=start_time,
        t1p1_id=req.t1p1,
        t1p2_id=req.t1p2,
        t2p1_id=req.t2p1,
        t2p2_id=req.t2p2,
        winner=winner,
        score=req.score,
        duration=req.duration,
        court_name=req.courtName,
        match_no=match_no,
        updated_players_json=updated_players_data
    )
    db.add(db_match)

    # 4. 版本更新 (樂觀鎖)
    today_state = get_court_state(db, match_date)
    if today_state:
        today_state.version += 1
        today_state.updated_at = datetime.now()
    
    new_version = today_state.version if today_state else 0
    
    db.commit()
    
    # 5. 結算投注
    bet_results = settle_bets(db, match_id, winner)

    # 6. V1.0 完賽獎勵 (勝方 100, 敗方 50)
    for pid in p_ids:
        db_p = db_players.get(pid)
        if db_p:
            is_winner_p = (winner == 1 and (pid == req.t1p1 or pid == req.t1p2)) or \
                         (winner == 2 and (pid == req.t2p1 or pid == req.t2p2))
            reward = 100 if is_winner_p else 50
            bonus_amount = 0
            if is_winner_p:
                bonus_rate = get_player_match_win_bonus_rate(db_p)
                bonus_amount = int(reward * bonus_rate)
            total_reward = reward + bonus_amount
            db_p.feathers = (db_p.feathers or 0) + total_reward
            
            # 孵蛋進度更新
            if db_p.active_egg_id:
                rarity = db_p.active_egg_id.replace("egg_", "")
                energy_gain = calculate_egg_energy_gain(rarity, is_winner_p)
                db_p.egg_progress_games = max(0, min(100, (db_p.egg_progress_games or 0) + energy_gain))
                db_p.egg_progress_wins = 0
            
            desc = f"完賽獎勵：{'勝場' if is_winner_p else '安慰獎'} (100/50 規則)"
            if bonus_amount > 0:
                desc += f" (寵物加成 +{bonus_amount} 根)"
            db.add(models.FeatherTransaction(
                player_id=pid,
                amount=total_reward,
                type="match_reward",
                description=desc
            ) )

    # 7. 攻擊掠奪 / 防禦減損（掠奪對手羽毛 % 數，有上限，隨機一名對手）
    winner_ids = [req.t1p1, req.t1p2] if winner == 1 else [req.t2p1, req.t2p2]
    loser_ids = [req.t2p1, req.t2p2] if winner == 1 else [req.t1p1, req.t1p2]

    for winner_id in winner_ids:
        db_winner = db_players.get(winner_id)
        if not db_winner:
            continue
        drain_rate = get_player_pet_effect(db_winner, "attack_drain", "drain_rate")
        if drain_rate <= 0:
            continue
        drain_cap = int(get_player_pet_effect(db_winner, "attack_drain", "drain_cap"))
        drain_candidates = [
            db_players[loser_id]
            for loser_id in loser_ids
            if db_players.get(loser_id) and (db_players[loser_id].feathers or 0) > 0
        ]
        if not drain_candidates:
            continue
        db_loser = random.choice(drain_candidates)
        loser_id = db_loser.id
        target_feathers = db_loser.feathers or 0
        base_drain = min(int(target_feathers * drain_rate), drain_cap, target_feathers)
        mitigate_rate = get_player_pet_effect(db_loser, "defense_shield", "mitigate_rate")
        actual_drain = int(base_drain * (1 - mitigate_rate))
        actual_drain = min(actual_drain, target_feathers)
        if actual_drain <= 0:
            continue
        db_loser.feathers = target_feathers - actual_drain
        db_winner.feathers = (db_winner.feathers or 0) + actual_drain
        db.add(models.FeatherTransaction(
            player_id=loser_id,
            amount=-actual_drain,
            type="pet_attack_drain",
            description=f"寵物掠奪：被 {db_winner.name} 偷走 {actual_drain} 根羽毛"
        ))
        db.add(models.FeatherTransaction(
            player_id=winner_id,
            amount=actual_drain,
            type="pet_attack_drain",
            description=f"寵物掠奪：從 {db_loser.name} 偷取 {actual_drain} 根羽毛"
        ))

    db.commit()
    return {
        "status": "success", 
        "data": {
            "matchId": match_id,
            "version": new_version,
            "bet_results": bet_results
        }
    }

def get_player_profile(db: Session, player_id: str):
    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not db_player:
        return None
        
    # 1. 取得生涯統計 (從 PlayerStat 聚合)
    stats_query = db.query(
        func.sum(models.PlayerStat.match_count).label('total_matches'),
        func.sum(models.PlayerStat.win_count).label('total_wins'),
        func.count(models.PlayerStat.date).label('played_days')
    ).filter(models.PlayerStat.player_id == player_id).first()
    
    total_m = stats_query.total_matches or 0
    total_w = stats_query.total_wins or 0
    played_days = stats_query.played_days or 0
    
    # 2. 取得今日數據
    today = datetime.now().date()
    today_stat = db.query(models.PlayerStat).filter(
        models.PlayerStat.player_id == player_id,
        models.PlayerStat.date == today
    ).first()

    # 取得今日總場數 (用於計算參與率/請假指數)
    session_total_matches = db.query(func.count(models.Match.id)).filter(
        models.Match.match_date == today
    ).scalar() or 0

    # 取得生涯總場數
    system_total_matches = db.query(func.count(models.Match.id)).scalar() or 0
    
    # 取得系統總天數 (開局天數)
    system_total_days = db.query(func.count(func.distinct(models.Match.match_date))).scalar() or 0
    
    # 3. 取得戰力趨勢 (最近 15 筆統計)
    history = db.query(models.PlayerStat).filter(
        models.PlayerStat.player_id == player_id
    ).order_by(models.PlayerStat.date.desc()).limit(15).all()
    
    trend = []
    for h in reversed(history):
        trend.append({
            "date": str(h.date),
            "mu": h.mu,
            "sigma": h.sigma,
            "cp": round(h.mu * 10) # 為了相容前端 CP 概念
        })
        
    # 4. 大數據分析：拍檔分析 (Teammate Analysis)
    # 找出所有參加過的比賽
    matches = db.query(models.Match).filter(
        (models.Match.t1p1_id == player_id) | 
        (models.Match.t1p2_id == player_id) | 
        (models.Match.t2p1_id == player_id) | 
        (models.Match.t2p2_id == player_id)
    ).order_by(models.Match.start_time.asc()).all() # 依時間正序排列，方便計算趨勢
    
    partners = {} # {partner_id: {wins: 0, total: 0, name: ""}}
    match_history_processed = []
    trend_per_match = []

    for m in matches:
        is_t1 = (m.t1p1_id == player_id or m.t1p2_id == player_id)
        is_winner = (is_t1 and m.winner == 1) or (not is_t1 and m.winner == 2)
        
        # 找出隊友
        partner_id = None
        if is_t1:
            partner_id = m.t1p2_id if m.t1p1_id == player_id else m.t1p1_id
        else:
            partner_id = m.t2p2_id if m.t2p1_id == player_id else m.t2p1_id
            
        if partner_id:
            if partner_id not in partners:
                p_obj = db.query(models.Player).filter(models.Player.id == partner_id).first()
                partners[partner_id] = {"wins": 0, "total": 0, "name": p_obj.name if p_obj else "Unknown"}
            partners[partner_id]["total"] += 1
            if is_winner:
                partners[partner_id]["wins"] += 1
        
        # 處理該場比賽的個人數據變動
        up_map = {str(p.get('id')): p for p in (m.updated_players_json or [])}
        my_p_up = up_map.get(str(player_id), {})
        
        # 戰力趨勢 (場次級)
        if my_p_up.get('muAfter') is not None:
            # 判斷是否有即時戰力 (新格式)
            d_mu = my_p_up.get('dailyMuAfter')
            if d_mu is None:
                # 舊格式相容性：舊資料 mu 代表即時戰力
                d_mu = my_p_up.get('muAfter')
                c_mu = 25.0 # 舊資料沒記生涯
            else:
                c_mu = my_p_up.get('muAfter')
                d_mu = my_p_up.get('dailyMuAfter')

            trend_per_match.append({
                "date": m.start_time.strftime("%Y-%m-%d %H:%M:%S") if m.start_time else str(m.match_date),
                "mu": c_mu,        # 生涯
                "dailyMu": d_mu,   # 即時
                "matchId": str(m.id)
            })

        # 組合對戰紀錄 (智慧判定新舊格式)
        # 新格式會同時有 muBefore (生涯) 與 dailyMuBefore (即時)
        # 舊格式只有 muBefore，根據使用者回饋，舊資料的 mu 代表的是「即時戰力」
        
        has_new_format = "dailyMuBefore" in my_p_up
        
        if has_new_format:
            # 新格式：分開讀取
            comp_before = my_p_up.get('muBefore') or 25.0
            comp_after = my_p_up.get('muAfter') or comp_before
            instant_before = my_p_up.get('dailyMuBefore') or 25.0
            instant_after = my_p_up.get('dailyMuAfter') or instant_before
        else:
            # 舊格式：mu 代表即時戰力，生涯戰力則顯示為固定 (或不顯示變動)
            instant_before = my_p_up.get('muBefore') or 25.0
            instant_after = my_p_up.get('muAfter') or instant_before
            # 舊資料沒記生涯變動，我們顯示為當時球員表的分數或 25.0
            comp_before = 25.0 
            comp_after = 25.0

        t1_names = [m.t1p1.name if m.t1p1 else "Unknown", m.t1p2.name if m.t1p2 else "Unknown"]
        t2_names = [m.t2p1.name if m.t2p1 else "Unknown", m.t2p2.name if m.t2p2 else "Unknown"]
        
        match_history_processed.append({
            "id": str(m.id),
            "date": m.start_time.strftime("%Y-%m-%d %H:%M:%S") if m.start_time else str(m.match_date),
            "matchDate": str(m.match_date),
            "teammate": partners[partner_id]["name"] if partner_id else "-",
            "opponents": " & ".join(t2_names if is_t1 else t1_names),
            "teamIds": [str(m.t1p1_id), str(m.t1p2_id), str(m.t2p1_id), str(m.t2p2_id)],
            "result": "W" if is_winner else "L",
            "compBefore": round(comp_before * 10),
            "compAfter": round(comp_after * 10),
            "compDiff": round((comp_after - comp_before) * 10),
            "instantBefore": round(instant_before * 10),
            "instantAfter": round(instant_after * 10),
            "instantDiff": round((instant_after - instant_before) * 10),
            "myTeamScore": round((m.t1p1.mu + m.t1p2.mu if is_t1 else m.t2p1.mu + m.t2p2.mu) * 10),
            "oppTeamScore": round((m.t2p1.mu + m.t2p2.mu if is_t1 else m.t1p1.mu + m.t1p2.mu) * 10),
        })

    # 整理拍檔清單
    partner_list = []
    for pid, s in partners.items():
        partner_list.append({
            "id": pid,
            "name": s["name"],
            "count": s["total"],
            "wins": s["wins"],
            "winRate": round((s["wins"] / s["total"]) * 100, 1)
        })
    
    best_partner = max(partner_list, key=lambda x: (x["winRate"], x["count"])) if partner_list else None
    worst_partner = min(partner_list, key=lambda x: (x["winRate"], -x["count"])) if partner_list else None

    return {
        "player": {
            "id": db_player.id,
            "name": db_player.name,
            "mu": db_player.mu,
            "sigma": db_player.sigma,
            "avatar": db_player.avatar,
            "feathers": db_player.feathers,
            "email": db_player.email,
            "active_title_id": db_player.active_title_id,
            "active_frame_id": db_player.active_frame_id,
            "active_background_id": db_player.active_background_id,
            "active_title": { "name": db_player.active_title.name } if db_player.active_title else None,
            "active_frame": { "name": db_player.active_frame.name } if db_player.active_frame else None,
            "active_background": { "name": db_player.active_background.name } if db_player.active_background else None,
            "active_pet_id": db_player.active_pet_id,
            "ability_pet_id": db_player.ability_pet_id,
            "active_egg_id": db_player.active_egg_id,
            "egg_progress_games": db_player.egg_progress_games,
            "egg_progress_wins": db_player.egg_progress_wins,
            "unlocked_pets": db_player.unlocked_pets,
            "hasBinding": db_player.email is not None,
            "isGoogleLinked": db_player.email is not None and "@" in db_player.email
        },
        "career": {
            "totalMatches": total_m,
            "systemMatches": system_total_matches,
            "playedDays": played_days,
            "systemDays": system_total_days,
            "winCount": total_w,
            "lossCount": total_m - total_w,
            "winRate": round((total_w / total_m * 100) if total_m > 0 else 0, 1)
        },
        "today": {
            "totalMatches": today_stat.match_count if today_stat else 0,
            "sessionMatches": session_total_matches,
            "playedToday": 1 if today_stat and today_stat.match_count > 0 else 0,
            "winCount": today_stat.win_count if today_stat else 0,
            "winRate": today_stat.win_rate if today_stat else 0,
            "mu": today_stat.mu if today_stat else 25.0,
            "muChange": (history[0].mu - history[1].mu) if len(history) > 1 else 0
        },
        "trend": trend_per_match[-20:], # 取最近 20 場
        "bestPartner": best_partner,
        "worstPartner": worst_partner,
        "partners": partner_list,
        "history": list(reversed(match_history_processed)) # 新的在前面
    }

def get_dashboard_summary(db: Session, target_date: date):
    # 1. 抓取今日比賽
    matches = db.query(models.Match).filter(models.Match.match_date == target_date).all()
    
    # 2. 抓取所有球員目前的戰力統計 (用於首頁平均與分佈)
    player_stats = db.query(models.PlayerStat).filter(models.PlayerStat.date == target_date).all()
    
    # 3. 抓取場地狀態 (取得目前控制權與等候人數)
    c_state = get_court_state(db, target_date)
    all_players = db.query(models.Player).all()
    
    total_matches = len(matches)
    active_player_count = len(player_stats)
    
    # 計算平均即時戰力 (今日有打球的人)
    avg_mu = 25.0
    if active_player_count > 0:
        avg_mu = sum(p.mu for p in player_stats) / active_player_count
        
    # 取得控制者資訊
    controller_name = c_state.state.get('controllerName', '無') if c_state and c_state.state else '無'
    
    # 等候時間計算 (復用邏輯)
    active_courts_count = 0
    if c_state and 'courts' in c_state.state:
        active_courts_count = len([c for c in c_state.state['courts'] if c.get('players') and any(p for p in c['players'])])
    
    waiting_count = 0
    if c_state and 'players' in c_state.state:
        # 這裡從場地狀態抓取 Resting 的人
        waiting_count = len([p for p in c_state.state.get('players', []) if p.get('status') == 'ready'])

    house_stats = get_house_daily_stats(db, target_date)

    return {
        "totalMatches": total_matches,
        "activePlayerCount": active_player_count,
        "averageInstantMu": round(avg_mu, 2),
        "controller": controller_name,
        "waitingCount": waiting_count,
        "updatedAt": str(c_state.updated_at) if c_state and c_state.updated_at else str(datetime.now()),
        **house_stats,
    }

def get_active_match_dates(db: Session):
    results = db.query(models.Match.match_date).distinct().all()
    return [str(r[0]) for r in results]

def get_chat_context(db: Session, player_id: Optional[str], target_date: date):
    # 1. 基本球員與場地資料
    all_players = db.query(models.Player).all()
    court_state = get_court_state(db, target_date)
    matches = get_matches(db, target_date)
    
    # 2. 如果有指定球員，抓取他的個人詳情
    player_info = None
    user_recent_matches = []
    if player_id:
        p_obj = db.query(models.Player).filter(models.Player.id == player_id).first()
        if p_obj:
            # 抓取今日該球員的比賽
            user_recent_matches = [m for m in matches if player_id in [m.t1p1_id, m.t1p2_id, m.t2p1_id, m.t2p2_id]]
            player_info = {
                "name": p_obj.name,
                "mu": p_obj.mu,
                "sigma": p_obj.sigma,
                "totalMatchesToday": len(user_recent_matches)
            }
            
    # 3. 整理場地資訊
    active_courts = []
    if court_state and 'courts' in court_state.state:
        for c in court_state.state['courts']:
            if c.get('players') and any(p for p in c['players']):
                active_courts.append({
                    "name": c.get('name'),
                    "players": [p['name'] for p in c['players'] if p]
                })

    # 4. 計算預計等候時間
    avg_duration = 20 # 分鐘
    waiting_count = len([p for p in all_players if p.id not in [pid for c in active_courts for pid in c['players']]])
    court_count = len(court_state.state.get('courts', [])) if court_state else 1
    
    # 公式: (等待人數 / (場地數 * 4)) * 平均時長
    estimated_wait = round((waiting_count / (max(1, court_count) * 4)) * avg_duration)

    return {
        "user": player_info,
        "today": {
            "totalMatches": len(matches),
            "activeCourts": active_courts,
            "playerCount": len(all_players),
            "waitingCount": waiting_count,
            "estimatedWaitTime": estimated_wait
        },
        "rawMatches": [] # 不傳送原始紀錄，節省流量，由後端摘要
    }

def update_court_state(db: Session, target_date: date, state: dict, updated_by: str, expected_version: int, takeover: bool, updater_name: str = None):
    db_state = get_court_state(db, target_date)
    
    current_version = db_state.version if db_state else 0
    
    if expected_version != current_version:
        return {
            "status": "error",
            "message": "VERSION_CONFLICT",
            "data": {
                "version": current_version,
                "state": db_state.state if db_state else None,
                "updatedAt": str(db_state.updated_at) if db_state and db_state.updated_at else '',
                "updatedBy": db_state.updated_by if db_state else ''
            }
        }
        
    current_controller = db_state.state.get('controller') if db_state and db_state.state else None
    
    # 【協作模式優化】: 不再檢查控制權，任何人都可以操作
    # 我們將更新者設為最新的「控制者/操作者」
    final_state = state
    final_state['controller'] = updated_by
    final_state['controllerName'] = updater_name or updated_by

    new_version = current_version + 1
    now = datetime.now()

    if db_state:
        db_state.version = new_version
        db_state.state = final_state
        db_state.updated_by = updated_by
        db_state.updated_at = now
    else:
        db_state = models.CourtState(date=target_date, version=new_version, state=final_state, updated_by=updated_by)
        db.add(db_state)
        
    db.commit()
    db.refresh(db_state)
    
    return {
        "status": "success",
        "data": {
            "version": new_version,
            "state": final_state,
            "updatedAt": str(now),
            "updatedBy": updated_by
        }
    }

def recalibrate_all_ratings(db: Session):
    """
    重新計算所有比賽的戰力，並更新 Players, PlayerStats 與 Matches
    """
    try:
        # 0. 預先抓取姓名對照表，減少查詢次數
        all_players_base = db.query(models.Player).all()
        name_map = {p.id: p.name for p in all_players_base}
        
        # 1. 重設所有球員的生涯戰力
        db.query(models.Player).update({
            models.Player.mu: 25.0,
            models.Player.sigma: 8.333
        })
        
        # 2. 清空所有每日統計
        db.query(models.PlayerStat).delete()
        
        # 3. 按時間正序抓取所有比賽
        matches = db.query(models.Match).order_by(models.Match.start_time.asc()).all()
        
        # 用於追蹤目前生涯戰力 (跨日持續)
        career_ratings = {p.id: (25.0, 8.333) for p in all_players_base}
        
        # 用於追蹤當日戰力 (每天遇到新日期就重置)
        current_date = None
        daily_ratings = {} # {pid: (mu, sigma)}
        daily_stats = {}   # {pid: {matches: 0, wins: 0}}
        
        # 快取當日的 PlayerStat 物件，減少查詢
        today_stat_objs = {} # {pid: stat_obj}

        for m in matches:
            m_date = m.match_date
            if m_date != current_date:
                # 新的一天：重置「即時戰力」與「今日統計」
                current_date = m_date
                daily_ratings = {} # 所有人今天都從 250 (25.0) 開始
                daily_stats = {}
                today_stat_objs = {}
            
            p_ids = [m.t1p1_id, m.t1p2_id, m.t2p1_id, m.t2p2_id]
            if not all(p_ids): continue
            
            # 初始化 Mu/Sigma (如果該球員尚未在今日/生涯出現過)
            for pid in p_ids:
                if pid not in career_ratings:
                    career_ratings[pid] = (25.0, 8.333)
                if pid not in daily_ratings:
                    daily_ratings[pid] = (25.0, 8.333) # 即時戰力：每日首場從 25.0 開始
                if pid not in daily_stats:
                    daily_stats[pid] = {"matches": 0, "wins": 0}
            
            # --- 計算變動 ---
            winner = m.winner
            
            # 生涯 TrueSkill 計算 (連續)
            c_team1 = [career_ratings[m.t1p1_id], career_ratings[m.t1p2_id]]
            c_team2 = [career_ratings[m.t2p1_id], career_ratings[m.t2p2_id]]
            new_c = trueskill_logic.calculate_new_ratings(c_team1, c_team2, winner=winner)
            all_new_c = new_c[0] + new_c[1]
            
            # 即時 TrueSkill 計算 (每日獨立)
            d_team1 = [daily_ratings[m.t1p1_id], daily_ratings[m.t1p2_id]]
            d_team2 = [daily_ratings[m.t2p1_id], daily_ratings[m.t2p2_id]]
            new_d = trueskill_logic.calculate_new_ratings(d_team1, d_team2, winner=winner)
            all_new_d = new_d[0] + new_d[1]
            
            updated_json = []
            for i, pid in enumerate(p_ids):
                is_win = (winner == 1 and i < 2) or (winner == 2 and i >= 2)
                
                # 生涯更新
                c_mu_before, _ = career_ratings[pid]
                c_mu_after, c_sigma_after = all_new_c[i]
                career_ratings[pid] = (c_mu_after, c_sigma_after)
                
                # 即時更新
                d_mu_before, _ = daily_ratings[pid]
                d_mu_after, d_sigma_after = all_new_d[i]
                daily_ratings[pid] = (d_mu_after, d_sigma_after)
                
                # 更新今日統計快取
                daily_stats[pid]["matches"] += 1
                if is_win: daily_stats[pid]["wins"] += 1
                
                # 建立/取得今日 PlayerStat 紀錄
                if pid not in today_stat_objs:
                    stat = models.PlayerStat(date=m_date, player_id=pid)
                    db.add(stat)
                    today_stat_objs[pid] = stat
                
                stat = today_stat_objs[pid]
                stat.mu = d_mu_after
                stat.sigma = d_sigma_after
                stat.match_count = daily_stats[pid]["matches"]
                stat.win_count = daily_stats[pid]["wins"]
                stat.win_rate = round((stat.win_count / stat.match_count) * 100)
                
                # 準備寫入 Matches 的 JSON 變動紀錄
                updated_json.append({
                    "id": pid,
                    "name": name_map.get(pid, "Unknown"),
                    "muBefore": c_mu_before,
                    "muAfter": c_mu_after,
                    "dailyMuBefore": d_mu_before,
                    "dailyMuAfter": d_mu_after,
                    "sigma": c_sigma_after
                })
            
            # 更新 Match 的 JSON
            m.updated_players_json = updated_json
            
        # 4. 最後將所有球員最終戰力更新回 Players 表
        for pid, (mu, sigma) in career_ratings.items():
            db.query(models.Player).filter(models.Player.id == pid).update({
                models.Player.mu: mu,
                models.Player.sigma: sigma
            })
            
        db.commit()
        return {"status": "success", "message": f"Successfully recalibrated {len(matches)} matches."}
    except Exception as e:
        db.rollback()
        import traceback
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}

def update_match(db: Session, match_id: str, req: schemas.MatchUpdateRequest):
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if not db_match:
        return {"status": "error", "message": "Match not found"}
    
    update_data = req.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_match, key, value)
    
    db.commit()
    # 自動重新計算所有戰力，確保數據一致性
    recalibrate_all_ratings(db)

    # 結算投注 (如果 winner 有變動，但這裡 recalibrate_all_ratings 已經 commit 了，我們重新結算一次)
    if req.winner:
        settle_bets(db, match_id, req.winner)
    
    return {"status": "success", "message": "Match updated and ratings recalibrated"}


def claim_daily_feathers(db: Session, email: str):
    # 先清理過期借貸，退還金額
    check_and_expire_loans(db)

    db_player = get_player_by_email(db, email)
    if not db_player:
        return {"status": "error", "message": "Player not found", "amount": 0}
    
    # 使用台北時間判斷
    from datetime import timedelta
    today = (datetime.utcnow() + timedelta(hours=8)).date()
    
    # 生產環境：恢復週三限制 (2 is Wednesday)
    if today.weekday() != 2: 
        return {"status": "error", "message": "今天不是比賽日（週三），無法領取羽毛", "amount": 0}

    if db_player.last_feather_claim == today:
        return {"status": "error", "message": "今天已經領取過羽毛了", "amount": 0}
    
    claim_amount = 1000
    daily_bonus = get_player_daily_bonus_rate(db_player)
    bonus_amount = int(claim_amount * daily_bonus)
    total_claim = claim_amount + bonus_amount
    db_player.feathers = (db_player.feathers or 0) + total_claim
    db_player.last_feather_claim = today
    
    # 新增交易紀錄
    desc = f"週三領取獎勵 ({today})"
    if bonus_amount > 0:
        desc += f" (寵物加成 +{bonus_amount} 根)"
    transaction = models.FeatherTransaction(
        player_id=db_player.id,
        amount=total_claim,
        type="daily_claim",
        description=desc
    )
    db.add(transaction)

    # ─── 自動扣款償還借貸 ───
    active_loans = db.query(models.PlayerLoan).filter(
        models.PlayerLoan.borrower_id == db_player.id,
        models.PlayerLoan.status == 'active'
    ).order_by(models.PlayerLoan.created_at.asc()).all()

    for loan in active_loans:
        if db_player.feathers <= 0:
            break
        due = loan.total_due - loan.repaid_amount
        if due <= 0:
            continue
        
        repay_amt = min(db_player.feathers, due)
        
        # 執行扣還款
        db_player.feathers -= repay_amt
        
        lender = db.query(models.Player).filter(models.Player.id == loan.lender_id).first()
        if lender:
            lender.feathers = (lender.feathers or 0) + repay_amt
            
        loan.repaid_amount += repay_amt
        if loan.repaid_amount >= loan.total_due:
            loan.status = 'repaid'
            
        # 扣款交易紀錄
        tx_borrower = models.FeatherTransaction(
            player_id=db_player.id,
            amount=-repay_amt,
            type="loan_repayment_auto",
            description=f"週三領取羽毛時自動扣款償還給 {lender.name if lender else '好友'}"
        )
        db.add(tx_borrower)
        
        if lender:
            tx_lender = models.FeatherTransaction(
                player_id=lender.id,
                amount=repay_amt,
                type="loan_repayment_auto_received",
                description=f"週三 {db_player.name} 領取羽毛時自動扣還"
            )
            db.add(tx_lender)

    db.commit()
    db.refresh(db_player)
    
    return {"status": "success", "amount": claim_amount, "message": f"成功領取 {claim_amount} 根羽毛！"}


def get_feather_transactions(db: Session, player_id: str, limit: int = 50):
    return db.query(models.FeatherTransaction).filter(
        models.FeatherTransaction.player_id == player_id
    ).order_by(models.FeatherTransaction.created_at.desc()).limit(limit).all()
def get_match_teams(db: Session, match_id: str, return_mu: bool = False):
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if db_match:
        if return_mu:
            p_ids = [db_match.t1p1_id, db_match.t1p2_id, db_match.t2p1_id, db_match.t2p2_id]
            players = db.query(models.Player).filter(models.Player.id.in_(p_ids)).all()
            p_dict = {p.id: p.mu for p in players}
            t1_mu = (p_dict.get(db_match.t1p1_id, 25) + p_dict.get(db_match.t1p2_id, 25))
            t2_mu = (p_dict.get(db_match.t2p1_id, 25) + p_dict.get(db_match.t2p2_id, 25))
            return t1_mu, t2_mu
        t1 = [db_match.t1p1.name, db_match.t1p2.name] if db_match.t1p2 else [db_match.t1p1.name]
        t2 = [db_match.t2p1.name, db_match.t2p2.name] if db_match.t2p2 else [db_match.t2p1.name]
        c_name = db_match.court_name or "未知"
        return " & ".join(t1), " & ".join(t2), f"場地 {c_name}"
    
    # 如果 matches 表找不到，去 court_state 找 (處理正在進行中的比賽)
    from datetime import datetime, timedelta
    today = (datetime.utcnow() + timedelta(hours=8)).date()
    cs = db.query(models.CourtState).filter(models.CourtState.date == today).first()
    if not cs:
        cs = db.query(models.CourtState).order_by(models.CourtState.date.desc()).first()
    
    if cs and cs.state:
        courts = cs.state.get("courts", [])
        for c in courts:
            if str(c.get("matchId")) == str(match_id):
                p_ids = [str(pid) for pid in c.get("players", []) if pid]
                players = db.query(models.Player).filter(models.Player.id.in_(p_ids)).all()
                p_dict = {p.id: p.name for p in players}
                
                # 取得球員姓名
                t1_names = [p_dict.get(p_ids[0], "T1"), p_dict.get(p_ids[1], "")] if len(p_ids) >= 2 else ["T1"]
                t2_names = [p_dict.get(p_ids[2], "T2"), p_dict.get(p_ids[3], "")] if len(p_ids) >= 4 else ["T2"]
                
                t1_str = " & ".join([n for n in t1_names if n])
                t2_str = " & ".join([n for n in t2_names if n])
                c_name = c.get("name", "未知")
                
                if return_mu:
                    # 如果需要 Mu，則重新抓取 Mu 資料
                    mu_dict = {p.id: p.mu for p in players}
                    t1_mu = mu_dict.get(p_ids[0], 25.0) + mu_dict.get(p_ids[1], 25.0) if len(p_ids) >= 2 else 50.0
                    t2_mu = mu_dict.get(p_ids[2], 25.0) + mu_dict.get(p_ids[3], 25.0) if len(p_ids) >= 4 else 50.0
                    return t1_mu, t2_mu
                    
                return t1_str, t2_str, f"場地 {c_name}"

    if return_mu: return 50.0, 50.0
    return "未知隊伍A", "未知隊伍B", "未知場地"

def get_match_description(db: Session, match_id: str):
    res = get_match_teams(db, match_id)
    if not res:
        return f"未知比賽 ({match_id})"
    t1, t2, court = res
    return f"[{court}] {t1} vs {t2}"

# --- 莊家保底投注常數 ---
HOUSE_VIG = 0.08
HOUSE_MIN_ODDS = 1.10
HOUSE_MAX_ODDS = 8.00
HOUSE_MU_PROB_COEFF = 0.018
BET_HANDICAP_COEFF = 0.45
BET_OU_BASE = 41.5
BET_OU_FLOOR = 33.5
BET_OU_HANDICAP_FACTOR = 0.7
SYSTEM_RAKE_RATE = 0.05
PLAYER_BONUS_RATE = 0.10
BET_LOCK_SECONDS = 180

BET_TYPE_LABELS = {
    "moneyline": "獨贏",
    "handicap": "讓分",
    "over_under": "大小",
}

def normalize_bet_type(bet_type: str) -> str:
    if bet_type == "overUnder":
        return "over_under"
    return bet_type or "moneyline"

def _get_taipei_today():
    from datetime import timedelta
    return (datetime.utcnow() + timedelta(hours=8)).date()

def _get_match_player_ids(db: Session, match_id: str, today: date) -> List[str]:
    p_ids = []
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if db_match:
        p_ids = [db_match.t1p1_id, db_match.t1p2_id, db_match.t2p1_id, db_match.t2p2_id]
    else:
        cs = db.query(models.CourtState).filter(models.CourtState.date == today).first()
        if not cs:
            cs = db.query(models.CourtState).order_by(models.CourtState.date.desc()).first()
        if cs and cs.state:
            for c in cs.state.get("courts", []):
                if str(c.get("matchId")) == str(match_id):
                    for rp in c.get("players", []):
                        if not rp:
                            continue
                        if isinstance(rp, dict):
                            p_ids.append(str(rp.get("id")))
                        else:
                            p_ids.append(str(rp))
                    break
    return [pid for pid in p_ids if pid]

def _get_match_mus(db: Session, match_id: str, today: date) -> tuple:
    t1_mu, t2_mu = 0.0, 0.0
    p_ids = _get_match_player_ids(db, match_id, today)
    if not p_ids:
        return t1_mu, t2_mu

    stats = db.query(models.PlayerStat).filter(
        models.PlayerStat.player_id.in_(p_ids),
        models.PlayerStat.date == today
    ).all()
    s_dict = {s.player_id: s.mu for s in stats}

    def get_current_mu(pid):
        return s_dict.get(pid, 25.0)

    if len(p_ids) >= 4:
        t1_mu = get_current_mu(p_ids[0]) + get_current_mu(p_ids[1])
        t2_mu = get_current_mu(p_ids[2]) + get_current_mu(p_ids[3])
    elif len(p_ids) == 2:
        t1_mu = get_current_mu(p_ids[0])
        t2_mu = get_current_mu(p_ids[1])
    return t1_mu, t2_mu

def compute_bet_lines(t1_mu: float, t2_mu: float) -> tuple:
    raw_h = round((t1_mu - t2_mu) * BET_HANDICAP_COEFF * 2) / 2
    handicap_line = max(-12.5, min(12.5, raw_h))
    base_ou = BET_OU_BASE - (abs(handicap_line) * BET_OU_HANDICAP_FACTOR)
    ou_line = float(int(max(BET_OU_FLOOR, base_ou))) + 0.5
    return handicap_line, ou_line

def compute_house_odds(t1_mu: float, t2_mu: float, bet_type: str) -> tuple:
    bt = normalize_bet_type(bet_type)
    if bt == "moneyline":
        diff = t1_mu - t2_mu
        p_t1 = max(0.08, min(0.92, 0.5 + diff * HOUSE_MU_PROB_COEFF))
        p_t2 = 1.0 - p_t1
    else:
        p_t1 = p_t2 = 0.5

    def side_odds(p):
        return round(max(HOUSE_MIN_ODDS, min(HOUSE_MAX_ODDS, (1 - HOUSE_VIG / 2) / p)), 2)

    return side_odds(p_t1), side_odds(p_t2)

def compute_pool_odds(t1_total: int, t2_total: int) -> tuple:
    total = t1_total + t2_total
    pool1 = round(max(1.05, total / t1_total * 0.85), 2) if t1_total > 0 else 2.0
    pool2 = round(max(1.05, total / t2_total * 0.85), 2) if t2_total > 0 else 2.0
    return pool1, pool2

def accumulate_house_daily_stats(db: Session, target_date: date, rake: int, subsidy: int):
    if rake == 0 and subsidy == 0:
        return
    row = db.query(models.HouseDailyStats).filter(models.HouseDailyStats.date == target_date).first()
    if row:
        row.rake_collected = (row.rake_collected or 0) + rake
        row.house_subsidy = (row.house_subsidy or 0) + subsidy
        row.updated_at = datetime.utcnow()
    else:
        db.add(models.HouseDailyStats(
            date=target_date,
            rake_collected=rake,
            house_subsidy=subsidy,
        ))

def _get_match_elapsed_seconds(db: Session, match_id: str) -> Optional[float]:
    today = _get_taipei_today()
    cs = db.query(models.CourtState).filter(models.CourtState.date == today).first()
    if not cs:
        cs = db.query(models.CourtState).order_by(models.CourtState.date.desc()).first()
    if not cs or not cs.state:
        return None
    for c in cs.state.get("courts", []):
        if str(c.get("matchId")) == str(match_id):
            raw = c.get("startTime")
            if not raw:
                return None
            try:
                if isinstance(raw, str):
                    start = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                else:
                    start = raw
                start_ts = start.timestamp()
                return time.time() - start_ts
            except Exception:
                return None
    return None

def _is_bet_time_locked(db: Session, match_id: str) -> bool:
    elapsed = _get_match_elapsed_seconds(db, match_id)
    if elapsed is None:
        return False
    return elapsed > BET_LOCK_SECONDS

def get_house_daily_stats(db: Session, target_date: date) -> Dict[str, int]:
    row = db.query(models.HouseDailyStats).filter(models.HouseDailyStats.date == target_date).first()
    if not row:
        return {"houseRakeToday": 0, "houseSubsidyToday": 0, "houseNetToday": 0}
    rake = row.rake_collected or 0
    subsidy = row.house_subsidy or 0
    return {
        "houseRakeToday": rake,
        "houseSubsidyToday": subsidy,
        "houseNetToday": rake - subsidy,
    }

def place_bet(db: Session, player_id: str, match_id: str, team: int, amount: int, bet_type: str = "moneyline", line_value: float = 0.0):
    if amount < 50:
        return {"status": "error", "message": "最低投注金額為 50 根羽毛"}

    bet_type = normalize_bet_type(bet_type)

    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not db_player:
        return {"status": "error", "message": "找不到球員資料"}
    
    if (db_player.feathers or 0) < amount:
        return {"status": "error", "message": "羽毛不足"}
    
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if db_match and db_match.winner:
        return {"status": "error", "message": "比賽已結束，無法投注"}

    if _is_bet_time_locked(db, match_id):
        return {"status": "error", "message": "開打 3 分鐘後已封盤，無法投注"}

    existing_bet = db.query(models.Bet).filter(
        models.Bet.match_id == match_id,
        models.Bet.player_id == player_id,
        models.Bet.bet_type == bet_type
    ).first()
    if existing_bet:
        label = BET_TYPE_LABELS.get(bet_type, bet_type)
        return {"status": "error", "message": f"您已經投過「{label}」了"}

    if bet_type in ["moneyline", "handicap"]:
        today = _get_taipei_today()
        court_state = db.query(models.CourtState).filter(models.CourtState.date == today).first()
        if not court_state:
            court_state = db.query(models.CourtState).order_by(models.CourtState.date.desc()).first()
        
        if court_state and court_state.state:
            courts = court_state.state.get("courts", [])
            for c in courts:
                if str(c.get("matchId")) == str(match_id):
                    player_ids = [str(pid) for pid in c.get("players", []) if pid]
                    if player_id in player_ids:
                        idx = player_ids.index(player_id)
                        player_team = 1 if idx < 2 else 2
                        if team != player_team:
                            return {"status": "error", "message": "身為參賽球員，你只能看好自己贏！"}

    today = _get_taipei_today()
    t1_mu, t2_mu = _get_match_mus(db, match_id, today)
    handicap_line, ou_line = compute_bet_lines(t1_mu, t2_mu)
    if bet_type == "handicap":
        line_value = handicap_line
    elif bet_type == "over_under":
        line_value = ou_line

    house_o1, house_o2 = compute_house_odds(t1_mu, t2_mu, bet_type)
    locked_odds = house_o1 if team == 1 else house_o2

    db_player.feathers -= amount
    db_bet = models.Bet(
        player_id=player_id,
        match_id=match_id,
        team=team,
        amount=amount,
        bet_type=bet_type,
        line_value=line_value,
        locked_odds=locked_odds,
    )
    db.add(db_bet)
    
    match_desc = get_match_description(db, match_id)
    transaction = models.FeatherTransaction(
        player_id=player_id,
        amount=-amount,
        type="bet_placed",
        description=f"預測投注({bet_type})：{match_desc} (選項 {team}, 盤口 {line_value}, 賠率 {locked_odds})"
    )
    db.add(transaction)
    db.commit()

    label = BET_TYPE_LABELS.get(bet_type, bet_type)
    est_payout = int(amount * locked_odds)
    return {
        "status": "success",
        "message": f"投注成功（{label}）鎖定賠率 {locked_odds}，預估獲利 +{est_payout - amount}",
        "lockedOdds": locked_odds,
        "estimatedPayout": est_payout,
        "betType": bet_type,
    }

def get_bet_status(db: Session, match_id: str, player_id: Optional[str] = None):
    bets = db.query(models.Bet).filter(models.Bet.match_id == match_id).all()
    today = _get_taipei_today()
    t1_mu, t2_mu = _get_match_mus(db, match_id, today)
    handicap_line, ou_line = compute_bet_lines(t1_mu, t2_mu)
    
    def get_type_info(b_type: str, line: float):
        internal_type = normalize_bet_type(b_type)
        type_bets = [b for b in bets if b.bet_type == internal_type]
        
        is_locked = False
        abs_h = abs(handicap_line)
        if b_type == "moneyline" and abs_h > 6.0:
            is_locked = True
        elif b_type == "handicap" and abs_h <= 1.0:
            is_locked = True
            
        t1_total = sum(b.amount for b in type_bets if b.team == 1)
        t2_total = sum(b.amount for b in type_bets if b.team == 2)
        
        house_o1, house_o2 = compute_house_odds(t1_mu, t2_mu, internal_type)
        pool_o1, pool_o2 = compute_pool_odds(t1_total, t2_total)
        eff_o1 = round(max(house_o1, pool_o1), 2)
        eff_o2 = round(max(house_o2, pool_o2), 2)
        
        my_bet = next((b for b in type_bets if b.player_id == player_id), None)
        return {
            "team1Total": t1_total,
            "team2Total": t2_total,
            "odds1": eff_o1,
            "odds2": eff_o2,
            "houseOdds1": house_o1,
            "houseOdds2": house_o2,
            "poolOdds1": pool_o1,
            "poolOdds2": pool_o2,
            "effectiveOdds1": eff_o1,
            "effectiveOdds2": eff_o2,
            "line": line,
            "myBetAmount": my_bet.amount if my_bet else 0,
            "myBetTeam": my_bet.team if my_bet else None,
            "locked": is_locked
        }

    return {
        "matchId": match_id,
        "moneyline": get_type_info("moneyline", 0.0),
        "handicap": get_type_info("handicap", handicap_line),
        "overUnder": get_type_info("overUnder", ou_line)
    }

def settle_bets(db: Session, match_id: str, winner_team: int):
    try:
        db.execute(text("UPDATE bets SET bet_type = 'over_under' WHERE match_id = :mid AND bet_type = 'overUnder'"), {"mid": match_id})
        db.commit()
        
        bets = db.query(models.Bet).filter(models.Bet.match_id == match_id, models.Bet.is_settled == 0).all()
        if not bets: return {"winners": []}
        
        db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
        if not db_match: return {"winners": []}
        
        try:
            score_str = db_match.score or "21-0"
            s1, s2 = map(int, score_str.split("-"))
        except:
            s1, s2 = (21, 0) if winner_team == 1 else (0, 21)

        match_date = db_match.match_date or _get_taipei_today()
        t1_mu, t2_mu = _get_match_mus(db, match_id, match_date)

        bet_types = ["moneyline", "handicap", "over_under"]
        total_player_bonus = 0
        total_rake = 0
        total_subsidy = 0
        winners_report = []

        for bt in bet_types:
            type_bets = [b for b in bets if b.bet_type == bt]
            if not type_bets: continue

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
                if b.bet_type == "moneyline": return b.team == winner_team
                if b.bet_type == "handicap":
                    if b.team == 1: return (s1 + b.line_value) > s2
                    else: return (s2 - b.line_value) > s1
                if b.bet_type == "over_under":
                    total = s1 + s2
                    return (total > b.line_value) if b.team == 1 else (total < b.line_value)
                return False

            push_bets = [b for b in type_bets if is_bet_push(b)]
            for b in push_bets:
                p = db.query(models.Player).filter(models.Player.id == b.player_id).first()
                if p:
                    p.feathers = (p.feathers or 0) + b.amount
                    db.add(models.FeatherTransaction(
                        player_id=b.player_id,
                        amount=b.amount,
                        type="bet_refund",
                        description=f"走水退款({bt})：{s1}-{s2} 盤口 {b.line_value}",
                    ))

            win_bets = [b for b in type_bets if is_bet_won(b)]
            lose_stake = sum(b.amount for b in type_bets if not is_bet_won(b) and not is_bet_push(b))
            win_stake = sum(b.amount for b in win_bets)
            
            rake = int(lose_stake * SYSTEM_RAKE_RATE)
            bonus = int(lose_stake * PLAYER_BONUS_RATE)
            total_player_bonus += bonus
            total_rake += rake
            net_profit = lose_stake - rake - bonus
            pool_odds = (win_stake + net_profit) / win_stake if win_stake > 0 else 1.0
            
            if win_stake > 0:
                for b in win_bets:
                    locked = b.locked_odds
                    if not locked:
                        locked = house_o1 if b.team == 1 else house_o2
                    house_payout = int(b.amount * locked)
                    pool_payout = int(b.amount * pool_odds)
                    payout = max(house_payout, pool_payout)
                    total_subsidy += max(0, house_payout - pool_payout)

                    p = db.query(models.Player).filter(models.Player.id == b.player_id).first()
                    if p:
                        bet_win_bonus = get_player_pet_effect(p, "feather_gain", "bet_win_bonus")
                        bonus_payout = int(payout * bet_win_bonus)
                        total_payout = payout + bonus_payout
                        p.feathers = (p.feathers or 0) + total_payout

                        source = "池子" if pool_payout > house_payout else "莊家"
                        used_odds = pool_odds if pool_payout > house_payout else locked
                        desc = f"預測成功({bt})：{s1}-{s2} ({source} {round(used_odds, 2)})"
                        if bonus_payout > 0:
                            desc += f" (寵物加成 +{bonus_payout} 根)"
                        db.add(models.FeatherTransaction(
                            player_id=b.player_id, 
                            amount=total_payout, 
                            type="bet_won", 
                            description=desc
                        ))
                        winners_report.append({
                            "name": p.name,
                            "payout": total_payout,
                            "type": bt,
                            "source": source,
                            "odds": round(used_odds, 2),
                        })

            for b in type_bets: b.is_settled = 1

        accumulate_house_daily_stats(db, match_date, total_rake, total_subsidy)

        if total_player_bonus > 0:
            winner_p_ids = [db_match.t1p1_id, db_match.t1p2_id] if winner_team == 1 else [db_match.t2p1_id, db_match.t2p2_id]
            share = total_player_bonus // 2
            for pid in winner_p_ids:
                if pid:
                    p = db.query(models.Player).filter(models.Player.id == pid).first()
                    if p:
                        bonus_rate = get_player_match_win_bonus_rate(p)
                        bonus_share = int(share * bonus_rate)
                        total_share = share + bonus_share
                        p.feathers = (p.feathers or 0) + total_share
                        
                        desc = f"贏球分紅(多重獎池)：場地 {db_match.court_name or '未知'}"
                        if bonus_share > 0:
                            desc += f" (寵物加成 +{bonus_share} 根)"
                        db.add(models.FeatherTransaction(
                            player_id=pid, 
                            amount=total_share, 
                            type="match_reward", 
                            description=desc
                        ))

        db.commit()
        return {"winners": winners_report}
    except Exception as e:
        print(f"CRITICAL ERROR in settle_bets: {str(e)}")
        db.rollback()
        return {"winners": [], "error": str(e)}

def delete_match(db: Session, match_id: str):
    try:
        print(f"DEBUG: Deleting match {match_id} and checking for bets to refund...")
        
        # 不論比賽是否已入庫 (錄入結果)，只要有投注就要退款
        bets = db.query(models.Bet).filter(models.Bet.match_id == match_id).all()
        print(f"DEBUG: Found {len(bets)} bets for match {match_id} to refund.")
        
        refund_count = 0
        for bet in bets:
            player = db.query(models.Player).filter(models.Player.id == bet.player_id).first()
            if player:
                print(f"DEBUG: Refunding {bet.amount} feathers to player {player.name} (ID: {player.id})")
                player.feathers = (player.feathers or 0) + bet.amount
                # 建立退款交易紀錄
                match_desc = get_match_description(db, match_id)
                transaction = models.FeatherTransaction(
                    player_id=player.id,
                    amount=bet.amount,
                    type="bet_refund",
                    description=f"比賽取消退款：{match_desc}"
                )
                db.add(transaction)
                refund_count += 1
            db.delete(bet)
        
        # 嘗試刪除比賽紀錄 (如果已經打完入庫了的話)
        db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
        if db_match:
            print(f"DEBUG: Match record found, deleting...")
            db.delete(db_match)
        
        db.commit()
        print(f"DEBUG: Process completed. Refunded {refund_count} players.")
        
        # 如果有刪除比賽，才需要重新校準
        if db_match:
            recalibrate_all_ratings(db)
            
        return {"status": "success", "message": f"Refunded {refund_count} bets and cleaned up match {match_id}"}
    except Exception as e:
        db.rollback()
        print(f"ERROR in delete_match: {str(e)}")
        return {"status": "error", "message": f"刪除比賽失敗: {str(e)}"}

def batch_update_matches(db: Session, updates: List[schemas.MatchBatchUpdateItem]):
    for up in updates:
        db_match = db.query(models.Match).filter(models.Match.id == up.id).first()
        if db_match:
            if up.winner is not None:
                db_match.winner = up.winner
            if up.score is not None:
                db_match.score = up.score
    
    db.commit()
    # 批次更新後統一執行一次校準
    recalibrate_all_ratings(db)
    return {"status": "success", "message": f"Successfully updated {len(updates)} matches and recalibrated ratings."}

def batch_delete_matches(db: Session, match_ids: List[str]):
    deleted_count = 0
    for m_id in match_ids:
        db_match = db.query(models.Match).filter(models.Match.id == m_id).first()
        if db_match:
            db.delete(db_match)
            deleted_count += 1
    
    db.commit()
    # 刪除後執行一次校準
    recalibrate_all_ratings(db)
    return {"status": "success", "message": f"Successfully deleted {deleted_count} matches and recalibrated ratings."}

def get_rating_distribution(db: Session, target_date: date):
    # 生涯戰力都在 players 表的 mu 欄位 (生涯戰力是當前的，不隨日期變動)
    players = db.query(models.Player).all()
    comprehensive_data = [{"name": p.name, "mu": p.mu} for p in players if p.mu is not None]
    
    # 即時戰力從指定日期的 player_stats 抓取
    stats = db.query(models.PlayerStat).filter(models.PlayerStat.date == target_date).all()
    stats_map = {s.player_id: s.mu for s in stats}
    
    instant_data = []
    for p in players:
        mu = stats_map.get(p.id, 25.0)
        instant_data.append({"name": p.name, "mu": mu})
    
    return {
        "instant": instant_data,
        "comprehensive": comprehensive_data
    }

def get_daily_analytics(db: Session, target_date: date):
    # 1. 抓取該日比賽
    matches = db.query(models.Match).filter(models.Match.match_date == target_date).all()
    
    # 2. 計算戰力異動 (從 Match 的 updated_players_json)
    player_diffs = {} # {id: {name: "", diff: 0}}
    for m in matches:
        if not m.updated_players_json: continue
        for up in m.updated_players_json:
            p_id = up.get('id')
            diff = (up.get('dailyMuAfter', 0) - up.get('dailyMuBefore', 0)) * 10
            if p_id not in player_diffs:
                player_diffs[p_id] = {"name": up.get('name', 'Unknown'), "diff": 0}
            player_diffs[p_id]["diff"] += diff
            
    sorted_diffs = sorted(player_diffs.values(), key=lambda x: x["diff"], reverse=True)
    gainers = [g for g in sorted_diffs[:3] if g["diff"] > 0]
    
    # 找出輸最多的三位，但排序改為從「輸最少」到「輸最多」
    raw_losers = sorted(player_diffs.values(), key=lambda x: x["diff"])[:3]
    losers = sorted([l for l in raw_losers if l["diff"] < 0], key=lambda x: x["diff"], reverse=True)

    # 3. 尋找今日黃金拍檔
    partnerships = {} # {"id1,id2": {names: "", wins: 0, total: 0}}
    for m in matches:
        winner = m.winner
        teams = [
            ([m.t1p1, m.t1p2], 1),
            ([m.t2p1, m.t2p2], 2)
        ]
        for players, team_no in teams:
            if not players[0] or not players[1]: continue
            p_ids = sorted([players[0].id, players[1].id])
            key = ",".join(p_ids)
            if key not in partnerships:
                names = f"{players[0].name} & {players[1].name}"
                partnerships[key] = {"names": names, "wins": 0, "total": 0}
            partnerships[key]["total"] += 1
            if winner == team_no:
                partnerships[key]["wins"] += 1
    
    best_partners = []
    if partnerships:
        # 至少打過兩場的組合優先
        sorted_partners = sorted(partnerships.values(), key=lambda x: (x["wins"]/x["total"], x["total"]), reverse=True)
        best_partners = sorted_partners[:3]

    # 4. 戰力階級分佈 (基於今日 PlayerStat)
    stats = db.query(models.PlayerStat).filter(models.PlayerStat.date == target_date).all()
    # 建立 ID -> Name 映射
    id_name_map = {p.id: p.name for p in db.query(models.Player).all()}
    
    tiers = {
        "Elite": {"count": 0, "names": []}, 
        "Advanced": {"count": 0, "names": []}, 
        "Normal": {"count": 0, "names": []},
        "Casual": {"count": 0, "names": []}
    }
    for s in stats:
        mu = s.mu * 10
        name = id_name_map.get(s.player_id, "Unknown")
        if mu >= 300:
            tiers["Elite"]["count"] += 1
            tiers["Elite"]["names"].append(name)
        elif mu >= 250:
            tiers["Advanced"]["count"] += 1
            tiers["Advanced"]["names"].append(name)
        elif mu >= 200:
            tiers["Normal"]["count"] += 1
            tiers["Normal"]["names"].append(name)
        else:
            tiers["Casual"]["count"] += 1
            tiers["Casual"]["names"].append(name)

    return {
        "gainers": gainers,
        "losers": losers,
        "bestPartners": best_partners,
        "tiers": tiers
    }

def get_shop_items(db: Session):
    return db.query(models.ShopItem).order_by(models.ShopItem.price.asc()).all()

def buy_item(db: Session, player_id: str, item_id: int, is_permanent: bool = False):
    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    db_item = db.query(models.ShopItem).filter(models.ShopItem.id == item_id).first()
    
    if not db_player or not db_item:
        return {"status": "error", "message": "球員或商品不存在"}
    
    # 檢查是否已擁有尚未過期的相同商品
    now = datetime.utcnow()
    existing_inv = db.query(models.PlayerInventory).filter(
        models.PlayerInventory.player_id == player_id,
        models.PlayerInventory.item_id == item_id,
        (models.PlayerInventory.expires_at == None) | (models.PlayerInventory.expires_at > now)
    ).first()
    
    price = db_item.price_permanent if is_permanent else db_item.price
    if existing_inv and existing_inv.expires_at is not None and is_permanent:
        # Upgrade price = permanent price - 7-day price (already paid)
        price = max(0, db_item.price_permanent - db_item.price)

    original_price = price
    discount = get_player_pet_effect(db_player, "shop_discount", "discount_rate")
    if discount > 0:
        price = int(price * (1 - discount))
        
    if db_player.feathers < price:
        return {"status": "error", "code": "INSUFFICIENT_FEATHERS", "message": "羽毛不足"}
    
    if existing_inv:
        if existing_inv.expires_at is None:
            return {"status": "error", "message": "您已永久擁有此商品，無需重複購買。"}
        else:
            if is_permanent:
                # Upgrade to permanent
                existing_inv.expires_at = None
            else:
                # Extend duration
                from datetime import timedelta
                existing_inv.expires_at = existing_inv.expires_at + timedelta(days=db_item.duration_days)
    else:
        from datetime import timedelta
        expires_at = None if is_permanent else (datetime.utcnow() + timedelta(days=db_item.duration_days))
        db_inv = models.PlayerInventory(
            player_id=player_id,
            item_id=item_id,
            expires_at=expires_at
        )
        db.add(db_inv)
    
    db_player.feathers -= price

    purchase_desc = f"購買商品：{db_item.name} ({'永久' if is_permanent else '7天'})"
    if discount > 0 and price < original_price:
        purchase_desc += f" (寵物折扣 -{original_price - price} 根)"
    
    db.add(models.FeatherTransaction(
        player_id=player_id,
        amount=-price,
        type="shop_purchase",
        description=purchase_desc
    ))
    
    # 自動裝備
    if db_item.item_type == "title":
        db_player.active_title_id = db_item.id
    elif db_item.item_type == "frame":
        db_player.active_frame_id = db_item.id
    elif db_item.item_type == "background":
        db_player.active_background_id = db_item.id
        
    db.commit()
    return {"status": "success", "message": f"成功購買 {db_item.name} ({'永久' if is_permanent else '7天'})"}

def get_player_inventory(db: Session, player_id: str):
    now = datetime.utcnow()
    return db.query(models.PlayerInventory).filter(
        models.PlayerInventory.player_id == player_id,
        (models.PlayerInventory.expires_at == None) | (models.PlayerInventory.expires_at > now)
    ).options(joinedload(models.PlayerInventory.item)).all()

def equip_item(db: Session, player_id: str, item_id: int):
    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not db_player:
        return {"status": "error", "message": "Player not found"}
    
    now = datetime.utcnow()
    inv_item = db.query(models.PlayerInventory).filter(
        models.PlayerInventory.player_id == player_id,
        models.PlayerInventory.item_id == item_id,
        (models.PlayerInventory.expires_at == None) | (models.PlayerInventory.expires_at > now)
    ).first()
    
    if not inv_item:
        return {"status": "error", "message": "未擁有該商品或已過期"}
    
    db_item = db.query(models.ShopItem).filter(models.ShopItem.id == item_id).first()
    if db_item.item_type == "title":
        db_player.active_title_id = item_id
    elif db_item.item_type == "frame":
        db_player.active_frame_id = item_id
    elif db_item.item_type == "background":
        db_player.active_background_id = item_id
        
    db.commit()
    return {"status": "success", "message": "裝備成功"}

def create_loan(db: Session, lender_id: str, borrower_id: str, principal: int, interest_rate: float):
    if lender_id == borrower_id:
        return {"status": "error", "message": "不能借款給自己"}
    if principal <= 0:
        return {"status": "error", "message": "借款本金必須大於 0"}
    if interest_rate < 0 or interest_rate > 100:
        return {"status": "error", "message": "利息比例必須介於 0% 到 100% 之間"}

    lender = db.query(models.Player).filter(models.Player.id == lender_id).first()
    borrower = db.query(models.Player).filter(models.Player.id == borrower_id).first()

    if not lender:
        return {"status": "error", "message": "貸方球員不存在"}
    if not borrower:
        return {"status": "error", "message": "借方球員不存在"}

    if (lender.feathers or 0) < principal:
        return {"status": "error", "message": f"您的羽毛餘額不足 (目前: {lender.feathers or 0} 根)"}

    # 計算應還總額
    total_due = int(principal * (1 + interest_rate / 100.0))

    # 執行扣款（暫扣，待借方確認）
    lender.feathers = (lender.feathers or 0) - principal

    # 建立合約
    loan = models.PlayerLoan(
        lender_id=lender_id,
        borrower_id=borrower_id,
        principal=principal,
        interest_rate=interest_rate,
        total_due=total_due,
        repaid_amount=0,
        status="pending"
    )
    db.add(loan)

    # 寫入交易紀錄 (僅貸方)
    tx_lender = models.FeatherTransaction(
        player_id=lender_id,
        amount=-principal,
        type="loan_pending_out",
        description=f"借貸發起：出借 {principal} 根羽毛給 {borrower.name} (等待對方接受，約定利息 {interest_rate}%, 應還 {total_due})"
    )
    db.add(tx_lender)

    db.commit()
    db.refresh(loan)

    return {"status": "success", "message": f"已發起借貸，等待 {borrower.name} 確認接受！", "loan_id": loan.id}

def check_and_expire_loans(db: Session):
    from datetime import timedelta
    today_local = (datetime.utcnow() + timedelta(hours=8)).date()
    
    pending_loans = db.query(models.PlayerLoan).filter(models.PlayerLoan.status == "pending").all()
    for loan in pending_loans:
        loan_local_date = (loan.created_at + timedelta(hours=8)).date()
        if loan_local_date < today_local:
            loan.status = "expired"
            # 退還貸方
            lender = db.query(models.Player).filter(models.Player.id == loan.lender_id).first()
            borrower = db.query(models.Player).filter(models.Player.id == loan.borrower_id).first()
            if lender:
                lender.feathers = (lender.feathers or 0) + loan.principal
                tx_refund = models.FeatherTransaction(
                    player_id=lender.id,
                    amount=loan.principal,
                    type="loan_refund",
                    description=f"借貸失效退回：與 {borrower.name if borrower else '未知'} 的借貸當天未被接收，已自動失效退還本金 {loan.principal} 根羽毛"
                )
                db.add(tx_refund)
    db.commit()

def accept_loan(db: Session, loan_id: int):
    # 先執行過期檢查
    check_and_expire_loans(db)

    loan = db.query(models.PlayerLoan).filter(models.PlayerLoan.id == loan_id, models.PlayerLoan.status == "pending").first()
    if not loan:
        return {"status": "error", "message": "找不到該筆待確認借貸，或合約已過期/處理完成"}

    lender = db.query(models.Player).filter(models.Player.id == loan.lender_id).first()
    borrower = db.query(models.Player).filter(models.Player.id == loan.borrower_id).first()

    if not lender or not borrower:
        return {"status": "error", "message": "貸方或借方球員不存在"}

    # 轉移本金給借方
    borrower.feathers = (borrower.feathers or 0) + loan.principal
    loan.status = "active"

    # 寫入借方交易紀錄
    tx_borrower = models.FeatherTransaction(
        player_id=borrower.id,
        amount=loan.principal,
        type="loan_received",
        description=f"接受借貸：從 {lender.name} 借入 {loan.principal} 根羽毛 (約定利息 {loan.interest_rate}%, 應還 {loan.total_due})"
    )
    db.add(tx_borrower)
    db.commit()

    return {"status": "success", "message": f"您已成功接受來自 {lender.name} 的 {loan.principal} 根羽毛借貸！"}

def reject_loan(db: Session, loan_id: int):
    loan = db.query(models.PlayerLoan).filter(models.PlayerLoan.id == loan_id, models.PlayerLoan.status == "pending").first()
    if not loan:
        return {"status": "error", "message": "找不到該筆待確認借貸合約"}

    lender = db.query(models.Player).filter(models.Player.id == loan.lender_id).first()
    borrower = db.query(models.Player).filter(models.Player.id == loan.borrower_id).first()

    if not lender or not borrower:
        return {"status": "error", "message": "貸方或借方球員不存在"}

    # 退還本金給貸方
    lender.feathers = (lender.feathers or 0) + loan.principal
    loan.status = "rejected"

    # 寫入貸方退款紀錄
    tx_refund = models.FeatherTransaction(
        player_id=lender.id,
        amount=loan.principal,
        type="loan_refund",
        description=f"借貸遭拒退回：{borrower.name} 拒絕了您的借貸，已退還本金 {loan.principal} 根羽毛"
    )
    db.add(tx_refund)
    db.commit()

    return {"status": "success", "message": f"已拒絕來自 {lender.name} 的借貸申請，本金已退還給對方。"}

def cancel_loan(db: Session, loan_id: int):
    loan = db.query(models.PlayerLoan).filter(models.PlayerLoan.id == loan_id, models.PlayerLoan.status == "pending").first()
    if not loan:
        return {"status": "error", "message": "找不到該筆待確認借貸合約"}

    lender = db.query(models.Player).filter(models.Player.id == loan.lender_id).first()
    borrower = db.query(models.Player).filter(models.Player.id == loan.borrower_id).first()

    if not lender or not borrower:
        return {"status": "error", "message": "貸方或借方球員不存在"}

    # 退還本金給貸方
    lender.feathers = (lender.feathers or 0) + loan.principal
    loan.status = "cancelled"

    # 寫入貸方退款紀錄
    tx_refund = models.FeatherTransaction(
        player_id=lender.id,
        amount=loan.principal,
        type="loan_refund",
        description=f"借貸取消退回：您取消了給 {borrower.name} 的借貸，已退還本金 {loan.principal} 根羽毛"
    )
    db.add(tx_refund)
    db.commit()

    return {"status": "success", "message": "已成功取消該筆借貸發起，本金已退回您的帳戶。"}


def repay_loan(db: Session, loan_id: int, repay_amount: Optional[int] = None):
    loan = db.query(models.PlayerLoan).filter(models.PlayerLoan.id == loan_id, models.PlayerLoan.status == "active").first()
    if not loan:
        return {"status": "error", "message": "找不到該筆未結清借貸合約"}

    lender = db.query(models.Player).filter(models.Player.id == loan.lender_id).first()
    borrower = db.query(models.Player).filter(models.Player.id == loan.borrower_id).first()

    if not lender or not borrower:
        return {"status": "error", "message": "貸方或借方球員不存在"}

    due = loan.total_due - loan.repaid_amount
    if due <= 0:
        return {"status": "error", "message": "此筆借貸已清償"}

    # 決定實際還款金額
    limit_repay = repay_amount if repay_amount is not None else due
    actual_repay = min(borrower.feathers or 0, due, limit_repay)

    if actual_repay <= 0:
        return {"status": "error", "message": "餘額不足，無法還款"}

    # 執行轉帳
    borrower.feathers = (borrower.feathers or 0) - actual_repay
    lender.feathers = (lender.feathers or 0) + actual_repay

    # 更新合約
    loan.repaid_amount += actual_repay
    if loan.repaid_amount >= loan.total_due:
        loan.status = "repaid"

    # 寫入交易紀錄
    tx_borrower = models.FeatherTransaction(
        player_id=borrower.id,
        amount=-actual_repay,
        type="loan_repayment",
        description=f"借貸手動還款：歸還 {actual_repay} 根羽毛給 {lender.name} (尚欠 {max(0, loan.total_due - loan.repaid_amount)})"
    )
    tx_lender = models.FeatherTransaction(
        player_id=lender.id,
        amount=actual_repay,
        type="loan_repayment_received",
        description=f"借貸收款：收到 {borrower.name} 歸還 {actual_repay} 根羽毛"
    )
    db.add(tx_borrower)
    db.add(tx_lender)

    db.commit()

    return {"status": "success", "message": f"成功還款 {actual_repay} 根羽毛給 {lender.name}！"}


HATCH_CONFIG = {
    "classic": {"participation": 25, "win": 15},
    "epic": {"participation": 18, "win": 12},
    "legendary": {"participation": 14, "win": 10},
    "ultimate": {"participation": 10, "win": 8},
}

def calculate_egg_energy_gain(rarity: str, is_win: bool) -> int:
    cfg = HATCH_CONFIG.get(rarity, {"participation": 0, "win": 0})
    return cfg["participation"] + (cfg["win"] if is_win else 0)


def buy_egg(db: Session, email: str, egg_type: str):
    player = get_player_by_email(db, email)
    if not player:
        raise ValueError("USER_NOT_BOUND")
        
    egg_costs = {
        "egg_classic": 500,
        "egg_epic": 1000,
        "egg_legendary": 1500,
        "egg_ultimate": 2000
    }
    
    if egg_type not in egg_costs:
        raise ValueError("無效的蛋種類")
        
    cost = egg_costs[egg_type]
    original_cost = cost
    discount = get_player_pet_effect(player, "shop_discount", "discount_rate")
    if discount > 0:
        cost = int(cost * (1 - discount))
    if (player.feathers or 0) < cost:
        raise ValueError("羽毛不足")
        
    prev_display = player.active_pet_id
    player.feathers = (player.feathers or 0) - cost
    player.active_egg_id = egg_type
    player.active_pet_id = egg_type
    if prev_display and prev_display.startswith("pet_"):
        player.ability_pet_id = prev_display
    player.egg_progress_games = 0
    player.egg_progress_wins = 0
    
    egg_desc = f"購買寵物蛋：{egg_type}"
    if discount > 0 and cost < original_cost:
        egg_desc += f" (寵物折扣 -{original_cost - cost} 根)"
    db.add(models.FeatherTransaction(
        player_id=player.id,
        amount=-cost,
        type="buy_egg",
        description=egg_desc
    ))
    db.commit()
    return {"status": "success", "player": player}


def hatch_egg(db: Session, email: str):
    import random
    player = get_player_by_email(db, email)
    if not player:
        raise ValueError("USER_NOT_BOUND")
        
    if not player.active_egg_id:
        raise ValueError("你目前沒有正在孵化的蛋")
        
    egg_requirements = EGG_PET_POOL
    
    egg_id = player.active_egg_id
    if egg_id not in egg_requirements:
        raise ValueError("無效的蛋種類")
        
    reqs = egg_requirements[egg_id]
    current_energy = player.egg_progress_games or 0
    
    if current_energy < 100:
        raise ValueError("孵化條件未達成 (能量未滿 100%)")
        
    unlocked_list = [p.strip() for p in player.unlocked_pets.split(",") if p.strip()] if player.unlocked_pets else []
    tier_pets = reqs["pets"]
    unowned_pets = [p for p in tier_pets if p not in unlocked_list]
    
    if unowned_pets:
        new_pet = _weighted_pet_choice(unowned_pets)
    else:
        new_pet = _weighted_pet_choice(tier_pets)
        
    if new_pet not in unlocked_list:
        unlocked_list.append(new_pet)
        player.unlocked_pets = ",".join(unlocked_list)
        
    player.active_pet_id = new_pet
    player.ability_pet_id = new_pet
    player.active_egg_id = None
    player.egg_progress_games = 0
    player.egg_progress_wins = 0
    
    db.commit()
    return {
        "status": "success",
        "pet_id": new_pet,
        "hatched_pet": new_pet,
        "active_pet_id": player.active_pet_id,
        "ability_pet_id": player.ability_pet_id,
        "unlocked_pets": player.unlocked_pets,
        "active_egg_id": None
    }


def _get_unlocked_pets_list(player) -> list[str]:
    if not player.unlocked_pets:
        return []
    return [p.strip() for p in player.unlocked_pets.split(",") if p.strip()]


def _validate_pet_equip(player, pet_id: str, allow_egg: bool = True):
    if pet_id.startswith("egg_"):
        if not allow_egg:
            raise ValueError("寵物蛋無法提供能力加成")
        if player.active_egg_id != pet_id:
            raise ValueError("未擁有或未在孵化該寵物蛋")
    else:
        if pet_id not in _get_unlocked_pets_list(player):
            raise ValueError("未解鎖該寵物")


def equip_pet(
    db: Session,
    email: str,
    pet_id: str | None,
    ability_pet_id: str | None = None,
    target: str = "both",
):
    player = get_player_by_email(db, email)
    if not player:
        raise ValueError("USER_NOT_BOUND")

    if target not in ("display", "ability", "both"):
        raise ValueError("無效的裝備目標")

    if target == "display":
        if pet_id:
            _validate_pet_equip(player, pet_id, allow_egg=True)
            prev_display = player.active_pet_id
            player.active_pet_id = pet_id
            if pet_id.startswith("egg_") and prev_display and prev_display.startswith("pet_"):
                player.ability_pet_id = prev_display
        else:
            player.active_pet_id = None

    elif target == "ability":
        ability_id = ability_pet_id or pet_id
        if ability_id:
            _validate_pet_equip(player, ability_id, allow_egg=False)
            player.ability_pet_id = ability_id
        else:
            player.ability_pet_id = None

    elif target == "both":
        if pet_id:
            _validate_pet_equip(player, pet_id, allow_egg=True)
            prev_display = player.active_pet_id
            player.active_pet_id = pet_id
            if pet_id.startswith("egg_"):
                if prev_display and prev_display.startswith("pet_"):
                    player.ability_pet_id = prev_display
            else:
                player.ability_pet_id = pet_id
        else:
            player.active_pet_id = None

    db.commit()
    return {"status": "success", "player": player}


def create_chat_message(db: Session, match_date: date, type: str, content: str, timestamp: datetime = None):
    db_msg = models.ChatMessage(
        match_date=match_date,
        type=type,
        content=content,
        timestamp=timestamp or datetime.utcnow()
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg


def get_chat_messages(db: Session, target_date: date):
    return db.query(models.ChatMessage).filter(
        models.ChatMessage.match_date == target_date
    ).order_by(models.ChatMessage.timestamp.asc()).all()


EGG_PET_POOL = {
    "egg_classic": {"pets": [
        "pet_green_slime", "pet_black_cat", "pet_mushroom",
        "pet_rabbit_warrior", "pet_pikachu",
    ]},
    "egg_epic": {"pets": [
        "pet_finalfantasy_moogle", "pet_slime_king", "pet_sonic_rings",
        "pet_metroid_metroid", "pet_scarab",
    ]},
    "egg_legendary": {"pets": [
        "pet_ribbon_pig", "pet_shiba_king", "pet_chick",
        "pet_fox_fire", "pet_dragon_thunder",
    ]},
    "egg_ultimate": {"pets": [
        "pet_ice_fire_siblings", "pet_panda_master", "pet_kingdomehearts_shadow",
        "pet_unicorn", "pet_yugioh_kuriboh",
    ]},
}

PET_HATCH_WEIGHTS = {
    # Classic: 好=黑貓/綠水靈, 普通=電光鼠, 爛=蘑菇/打鬼兔
    "pet_black_cat": 1.35,
    "pet_green_slime": 1.35,
    "pet_pikachu": 1.0,
    "pet_mushroom": 0.70,
    "pet_rabbit_warrior": 0.70,
    # Epic: 好=利姆路/莫古利, 普通=聖甲蟲, 爛=消極鬼魂/銀河戰士
    "pet_slime_king": 1.35,
    "pet_finalfantasy_moogle": 1.35,
    "pet_scarab": 1.0,
    "pet_sonic_rings": 0.70,
    "pet_metroid_metroid": 0.70,
    # Legendary: 好=櫻星卡比/緞帶肥肥, 普通=永眠卡比獸, 爛=小可/守護龍貓
    "pet_shiba_king": 1.35,
    "pet_ribbon_pig": 1.35,
    "pet_dragon_thunder": 1.0,
    "pet_chick": 0.70,
    "pet_fox_fire": 0.70,
    # Ultimate: 好=太極武神/冰火姊弟, 普通=栗子球, 爛=無心者/帕克
    "pet_panda_master": 1.35,
    "pet_ice_fire_siblings": 1.35,
    "pet_yugioh_kuriboh": 1.0,
    "pet_kingdomehearts_shadow": 0.70,
    "pet_unicorn": 0.70,
}

PET_EFFECTS = {
    # Classic
    "pet_green_slime": {"type": "feather_gain", "daily_bonus": 0.05, "bet_win_bonus": 0.03},
    "pet_black_cat": {"type": "match_win_bonus", "bonus_rate": 0.10},
    "pet_mushroom": {"type": "shop_discount", "discount_rate": 0.05, "daily_bonus": 0.02},
    "pet_rabbit_warrior": {"type": "attack_drain", "drain_rate": 0.04, "drain_cap": 50},
    "pet_pikachu": {"type": "defense_shield", "mitigate_rate": 0.45, "bonus_rate": 0.08},
    # Epic
    "pet_finalfantasy_moogle": {"type": "feather_gain", "daily_bonus": 0.10, "bet_win_bonus": 0.05},
    "pet_slime_king": {"type": "match_win_bonus", "bonus_rate": 0.18},
    "pet_sonic_rings": {"type": "shop_discount", "discount_rate": 0.10, "daily_bonus": 0.03},
    "pet_metroid_metroid": {"type": "attack_drain", "drain_rate": 0.05, "drain_cap": 70},
    "pet_scarab": {"type": "defense_shield", "mitigate_rate": 0.50, "bonus_rate": 0.12},
    # Legendary
    "pet_ribbon_pig": {"type": "feather_gain", "daily_bonus": 0.15, "bet_win_bonus": 0.08},
    "pet_shiba_king": {"type": "match_win_bonus", "bonus_rate": 0.26},
    "pet_chick": {"type": "shop_discount", "discount_rate": 0.15, "daily_bonus": 0.04},
    "pet_fox_fire": {"type": "attack_drain", "drain_rate": 0.06, "drain_cap": 90},
    "pet_dragon_thunder": {"type": "defense_shield", "mitigate_rate": 0.55, "bonus_rate": 0.16},
    # Ultimate
    "pet_ice_fire_siblings": {"type": "feather_gain", "daily_bonus": 0.20, "bet_win_bonus": 0.10},
    "pet_panda_master": {"type": "match_win_bonus", "bonus_rate": 0.32},
    "pet_kingdomehearts_shadow": {"type": "shop_discount", "discount_rate": 0.20, "daily_bonus": 0.05},
    "pet_unicorn": {"type": "attack_drain", "drain_rate": 0.07, "drain_cap": 110},
    "pet_yugioh_kuriboh": {"type": "defense_shield", "mitigate_rate": 0.60, "bonus_rate": 0.20},
}

def _weighted_pet_choice(candidates: list[str]) -> str:
    weights = [PET_HATCH_WEIGHTS.get(p, 1.0) for p in candidates]
    return random.choices(candidates, weights=weights, k=1)[0]

def get_player_daily_bonus_rate(player) -> float:
    rate = get_player_pet_effect(player, "feather_gain", "daily_bonus")
    if rate > 0:
        return rate
    return get_player_pet_effect(player, "shop_discount", "daily_bonus")

def get_player_match_win_bonus_rate(player) -> float:
    rate = get_player_pet_effect(player, "match_win_bonus", "bonus_rate")
    if rate > 0:
        return rate
    return get_player_pet_effect(player, "defense_shield", "bonus_rate")

def get_player_pet_effect(player, effect_type: str, key: str) -> float:
    if not player or not player.ability_pet_id:
        return 0.0
    cfg = PET_EFFECTS.get(player.ability_pet_id)
    if not cfg or cfg.get("type") != effect_type:
        return 0.0
    return cfg.get(key, 0.0)




