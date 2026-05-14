from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, text
from datetime import date, datetime
import models, schemas
import time
import trueskill_logic
from typing import List, Dict, Any, Optional, Union

def get_players(db: Session):
    return db.query(models.Player).all()

def get_player_by_email(db: Session, email: str):
    if not email: return None
    clean_email = email.strip().lower()
    return db.query(models.Player).filter(func.lower(models.Player.email) == clean_email).first()

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
            db_p.feathers = (db_p.feathers or 0) + reward
            db.add(models.FeatherTransaction(
                player_id=pid,
                amount=reward,
                type="match_reward",
                description=f"完賽獎勵：{'勝場' if is_winner_p else '安慰獎'} (100/50 規則)"
            ) )

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

    return {
        "totalMatches": total_matches,
        "activePlayerCount": active_player_count,
        "averageInstantMu": round(avg_mu, 2),
        "controller": controller_name,
        "waitingCount": waiting_count,
        "updatedAt": str(c_state.updated_at) if c_state and c_state.updated_at else str(datetime.now())
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
    db_player.feathers = (db_player.feathers or 0) + claim_amount
    db_player.last_feather_claim = today
    
    # 新增交易紀錄
    transaction = models.FeatherTransaction(
        player_id=db_player.id,
        amount=claim_amount,
        type="daily_claim",
        description=f"每日登入獎勵 ({today})"
    )
    db.add(transaction)
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
    return "Team 1", "Team 2", "未知場地"

def get_match_description(db: Session, match_id: str):
    t1, t2, court = get_match_teams(db, match_id)
    return f"[{court}] {t1} vs {t2}"

def place_bet(db: Session, player_id: str, match_id: str, team: int, amount: int, bet_type: str = "moneyline", line_value: float = 0.0):
    if amount < 50:
        return {"status": "error", "message": "最低投注金額為 50 根羽毛"}
    if amount > 500:
        return {"status": "error", "message": "最高投注金額為 500 根羽毛"}

    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not db_player:
        return {"status": "error", "message": "找不到球員資料"}
    
    if (db_player.feathers or 0) < amount:
        return {"status": "error", "message": "羽毛不足"}
    
    # 2. 檢查比賽是否已結束
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if db_match and db_match.winner:
        return {"status": "error", "message": "比賽已結束，無法投注"}

    # 3. 檢查重複投注 (同類型只能投一次)
    existing_bet = db.query(models.Bet).filter(
        models.Bet.match_id == match_id,
        models.Bet.player_id == player_id,
        models.Bet.bet_type == bet_type
    ).first()
    if existing_bet:
        return {"status": "error", "message": f"您已經投過「{bet_type}」了"}

    # 4. 防放水機制 (獨贏與讓分)
    if bet_type in ["moneyline", "handicap"]:
        from datetime import timedelta
        today = (datetime.utcnow() + timedelta(hours=8)).date()
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

    # 5. 執行投注
    db_player.feathers -= amount
    db_bet = models.Bet(
        player_id=player_id,
        match_id=match_id,
        team=team,
        amount=amount,
        bet_type=bet_type,
        line_value=line_value
    )
    db.add(db_bet)
    
    # 新增交易紀錄
    match_desc = get_match_description(db, match_id)
    transaction = models.FeatherTransaction(
        player_id=player_id,
        amount=-amount,
        type="bet_placed",
        description=f"預測投注({bet_type})：{match_desc} (選項 {team}, 盤口 {line_value})"
    )
    db.add(transaction)
    db.commit()
    
    return {"status": "success", "message": "投注成功"}

def get_bet_status(db: Session, match_id: str, player_id: Optional[str] = None):
    bets = db.query(models.Bet).filter(models.Bet.match_id == match_id).all()
    
    # 盤口計算 (對齊今日即時戰力)
    from datetime import datetime, timedelta
    today = (datetime.utcnow() + timedelta(hours=8)).date()
    
    t1_mu, t2_mu = 0.0, 0.0
    p_ids = []
    
    db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
    if db_match:
        p_ids = [db_match.t1p1_id, db_match.t1p2_id, db_match.t2p1_id, db_match.t2p2_id]
    else:
        # 如果 matches 表找不到，去 court_state 找
        cs = db.query(models.CourtState).filter(models.CourtState.date == today).first()
        if not cs:
            cs = db.query(models.CourtState).order_by(models.CourtState.date.desc()).first()
        if cs and cs.state:
            courts = cs.state.get("courts", [])
            for c in courts:
                if str(c.get("matchId")) == str(match_id):
                    p_ids = [str(pid) for pid in c.get("players", []) if pid]
                    break
    
    if p_ids:
        # 抓取今日即時戰力 (PlayerStat)
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
    
    # 1. 計算原始讓分並設定上限 (h_coeff=0.45，經 176 場回測證明此換算率最接近 50/50 平衡)
    raw_h = round((t1_mu - t2_mu) * 0.45 * 2) / 2
    handicap_line = max(-12.5, min(12.5, raw_h))
    
    # 2. 大小分計算：ou_base=41.5, ou_floor=33.5 (經回測證明此組合能達成 50% vs 50% 的大/小分分布)
    # 公式：基準 41.5 - (讓分絕對值 * 0.7)，最低不低於 33.5
    base_ou = 41.5 - (abs(handicap_line) * 0.7)
    ou_line = float(int(max(33.5, base_ou))) + 0.5
    
    # 3. 定義統一的資訊獲取函數 (包含開盤鎖定邏輯)
    def get_type_info(b_type: str, line: float):
        internal_type = "over_under" if b_type == "overUnder" else b_type
        type_bets = [b for b in bets if b.bet_type == internal_type]
        
        # 動態開盤邏輯
        is_locked = False
        abs_h = abs(handicap_line)
        if b_type == "moneyline" and abs_h > 6.0:
            is_locked = True # 實力差距超過 6 分，獨贏盤無懸念
        elif b_type == "handicap" and abs_h <= 1.0:
            is_locked = True
            
        t1_total = sum(b.amount for b in type_bets if b.team == 1)
        t2_total = sum(b.amount for b in type_bets if b.team == 2)
        total = t1_total + t2_total
        
        # 賠率計算 (簡單抽水)
        odds1 = round(max(1.05, total / t1_total * 0.85), 2) if t1_total > 0 else 2.0
        odds2 = round(max(1.05, total / t2_total * 0.85), 2) if t2_total > 0 else 2.0
        
        my_bet = next((b for b in type_bets if b.player_id == player_id), None)
        return {
            "team1Total": t1_total,
            "team2Total": t2_total,
            "odds1": odds1,
            "odds2": odds2,
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
        # 相容性處理：將前端可能傳入的 camelCase 轉為 snake_case
        db.execute(text("UPDATE bets SET bet_type = 'over_under' WHERE match_id = :mid AND bet_type = 'overUnder'"), {"mid": match_id})
        db.commit()
        
        bets = db.query(models.Bet).filter(models.Bet.match_id == match_id, models.Bet.is_settled == 0).all()
        if not bets: return {"winners": []}
        
        db_match = db.query(models.Match).filter(models.Match.id == match_id).first()
        if not db_match: return {"winners": []}
        
        # 處理分數格式
        try:
            score_str = db_match.score or "21-0"
            s1, s2 = map(int, score_str.split("-"))
        except:
            s1, s2 = (21, 0) if winner_team == 1 else (0, 21)

        bet_types = ["moneyline", "handicap", "over_under"]
        total_player_bonus = 0
        winners_report = []

        for bt in bet_types:
            type_bets = [b for b in bets if b.bet_type == bt]
            if not type_bets: continue
            
            def is_bet_won(b):
                if b.bet_type == "moneyline": return b.team == winner_team
                if b.bet_type == "handicap":
                    # 讓分邏輯：Team 1 總分 + 讓分值 vs Team 2 總分
                    if b.team == 1: return (s1 + b.line_value) > s2
                    else: return (s2 - b.line_value) > s1
                if b.bet_type == "over_under":
                    total = s1 + s2
                    return (total > b.line_value) if b.team == 1 else (total < b.line_value)
                return False

            win_bets = [b for b in type_bets if is_bet_won(b)]
            lose_stake = sum(b.amount for b in type_bets if not is_bet_won(b))
            win_stake = sum(b.amount for b in win_bets)
            
            if win_stake > 0:
                # 抽水與分紅
                rake = int(lose_stake * 0.05)
                bonus = int(lose_stake * 0.10)
                total_player_bonus += bonus
                net_profit = lose_stake - rake - bonus
                odds = (win_stake + net_profit) / win_stake
                
                for b in win_bets:
                    payout = int(b.amount * odds)
                    p = db.query(models.Player).filter(models.Player.id == b.player_id).first()
                    if p:
                        p.feathers = (p.feathers or 0) + payout
                        db.add(models.FeatherTransaction(
                            player_id=b.player_id, 
                            amount=payout, 
                            type="bet_won", 
                            description=f"預測成功({bt})：{s1}-{s2} (賠率 {round(odds, 2)})"
                        ))
                        winners_report.append({"name": p.name, "payout": payout, "type": bt})
            
            # 標記為已結算
            for b in type_bets: b.is_settled = 1

        # 6. 分紅給勝場球員 (贏球分紅)
        if total_player_bonus > 0:
            winner_p_ids = [db_match.t1p1_id, db_match.t1p2_id] if winner_team == 1 else [db_match.t2p1_id, db_match.t2p2_id]
            share = total_player_bonus // 2
            for pid in winner_p_ids:
                if pid:
                    p = db.query(models.Player).filter(models.Player.id == pid).first()
                    if p:
                        p.feathers = (p.feathers or 0) + share
                        db.add(models.FeatherTransaction(
                            player_id=pid, 
                            amount=share, 
                            type="match_reward", 
                            description=f"贏球分紅(多重獎池)：場地 {db_match.court_name or '未知'}"
                        ))

        db.commit()
        return {"winners": winners_report}
    except Exception as e:
        print(f"CRITICAL ERROR in settle_bets: {str(e)}")
        db.rollback()
        return {"winners": [], "error": str(e)}

def delete_match(db: Session, match_id: str):
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
