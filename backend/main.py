from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session
from fastapi import FastAPI, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import date, datetime
import os
import time

import models, schemas, crud, trueskill_logic
from database import engine, Base, get_db

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Amber Badminton API")


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    path = request.url.path
    query_params = request.query_params
    print(f"DEBUG: >>> {request.method} {path} | Params: {query_params}")
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    print(f"DEBUG: <<< {response.status_code} | {process_time:.2f}ms")
    return response

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper to wrap response
def success(data):
    if data is None: data = []
    return {"status": "success", "data": data}

def error(message):
    return {"status": "error", "message": message}

def safe_date(date_str: Optional[str]):
    if not date_str or date_str == "[object Object]":
        return None
    try:
        # Support both YYYY-MM-DD and full ISO strings
        return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
    except:
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except:
            return None

@app.get("/")
def read_root():
    return success({"message": "Amber Badminton API is running"})

# Players API
@app.get("/players")
@app.get("/players/")
def read_players(db: Session = Depends(get_db)):
    players = crud.get_players(db)
    return success(players)

@app.post("/players")
def create_player(player: schemas.PlayerCreate, db: Session = Depends(get_db)):
    db_player = crud.create_player(db, player)
    return success(db_player)

@app.post("/players/batch")
def create_players_batch(players: schemas.PlayerBatchCreate, db: Session = Depends(get_db)):
    db_players = crud.create_players_batch(db, players)
    return success(db_players)

@app.get("/players/rating_distribution")
def get_rating_distribution(target_date: Optional[date] = None, db: Session = Depends(get_db)):
    if not target_date:
        target_date = date.today()
    return success(crud.get_rating_distribution(db, target_date))

@app.get("/admin/daily_analytics")
def get_daily_analytics(target_date: Optional[date] = None, db: Session = Depends(get_db)):
    if not target_date:
        target_date = date.today()
    return success(crud.get_daily_analytics(db, target_date))

@app.put("/players/{player_id}")
def update_player(player_id: str, player: schemas.PlayerUpdate, db: Session = Depends(get_db)):
    db_player = crud.update_player(db, player_id, player)
    return success(db_player)

@app.get("/players/{player_id}/profile")
def get_player_profile(player_id: str, db: Session = Depends(get_db)):
    profile = crud.get_player_profile(db, player_id)
    if not profile:
        return error("Player not found", "PLAYER_NOT_FOUND")
    return success(profile)

@app.delete("/players/batch")
def delete_players_batch(req: schemas.PlayerBatchDelete, db: Session = Depends(get_db)):
    success_val = crud.delete_players_batch(db, req.ids)
    return success({"deleted": success_val})

@app.delete("/players/{player_id}")
def delete_player(player_id: str, db: Session = Depends(get_db)):
    success_val = crud.delete_player(db, player_id)
    return success({"deleted": success_val})

@app.post("/players/batch_update")
def batch_update_players(req: schemas.PlayerBatchUpdate, db: Session = Depends(get_db)):
    success_val = crud.batch_update_players(db, req.updates)
    return success({"updated": success_val})

@app.post("/players/bind")
def bind_player(req: schemas.PlayerBindRequest, db: Session = Depends(get_db)):
    res = crud.bind_player(db, req.playerId, req.userEmail)
    return res

@app.post("/players/unbind")
def unbind_player(req: schemas.PlayerBindRequest, db: Session = Depends(get_db)):
    res = crud.unbind_player(db, req.playerId, req.userEmail)
    return res

def _get_user_binding_logic(email: str, db: Session):
    if not email:
        return error("Email is required")
    player = crud.get_player_by_email(db, email)
    if not player:
        return error("USER_NOT_BOUND")
    return success({
        "isBound": True,
        "playerId": player.id,
        "playerName": player.name,
        "avatar": player.avatar
    })

@app.get("/players/user_binding")
@app.get("/players/user_binding/")
@app.get("/players/user binding")
@app.get("/players/user binding/")
def get_user_binding(email: Optional[str] = None, userEmail: Optional[str] = None, db: Session = Depends(get_db)):
    target_email = userEmail or email
    return _get_user_binding_logic(target_email, db)

@app.get("/players/{player_id}/binding")
def get_player_binding(player_id: str, email: Optional[str] = Query(None), userEmail: Optional[str] = Query(None), db: Session = Depends(get_db)):
    target_email = userEmail or email
    player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not player:
        return error("Player not found", "PLAYER_NOT_FOUND")
    
    is_bound = player.email is not None
    is_owner = player.email == target_email if target_email else False
    
    return success({
        "isBound": is_bound,
        "isOwner": is_owner
    })

# Player Stats API
@app.get("/player_stats")
@app.get("/player_stats/")
@app.get("/player stats")
@app.get("/player stats/")
def read_player_stats(date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    target_date = safe_date(date) or datetime.now().date()
    stats = crud.get_player_stats(db, target_date)
    
    # 找出當天所有比賽，用來確定每個人的「今日開局戰力」
    matches = crud.get_matches(db, target_date)
    morning_ratings = {} # {player_id: mu_before_first_match}
    
    # 比賽是按時間倒序排的，所以我們反過來找第一場
    for m in reversed(matches):
        up_json = m.updated_players_json or []
        for p_up in up_json:
            pid = str(p_up.get('id'))
            if pid not in morning_ratings:
                morning_ratings[pid] = p_up.get('muBefore')

    stats_map = {str(s.player_id): s for s in stats}
    all_players = crud.get_players(db)
    formatted_stats = []
    
    for p in all_players:
        pid = str(p.id)
        s = stats_map.get(pid)
        
        # 由於 crud.py 已經實作每日重製，s.mu 就是即時戰力
        daily_mu = s.mu if s else 25.0
        daily_sigma = s.sigma if s else 8.333
        
        formatted_stats.append({
            "date": str(target_date),
            "id": pid,
            "name": p.name,
            "mu": daily_mu, 
            "career_mu": p.mu, # Player 表裡存的是最近一次結算的戰力
            "sigma": daily_sigma,
            "matchCount": s.match_count if s else 0,
            "winCount": s.win_count if s else 0,
            "winRate": s.win_rate if s else 0
        })
    return success(formatted_stats)

@app.get("/matches/active-dates")
def get_active_match_dates(db: Session = Depends(get_db)):
    dates = crud.get_active_match_dates(db)
    return success(dates)

@app.get("/dashboard/summary")
def get_dashboard_summary(date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    target_date = safe_date(date) or datetime.now().date()
    summary = crud.get_dashboard_summary(db, target_date)
    return success(summary)

# Matches API
@app.get("/matches")
@app.get("/matches/")
def read_matches(date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    target_date = safe_date(date)
    matches = crud.get_matches(db, target_date)
    
    # 只有在指定日期時，才計算「今日即時戰力」轉換
    morning_ratings = {}
    if target_date:
        # 比賽是按時間倒序排的，反過來找第一場
        for m in reversed(matches):
            up_json = m.updated_players_json or []
            for p_up in up_json:
                pid = str(p_up.get('id'))
                if pid not in morning_ratings:
                    morning_ratings[pid] = p_up.get('muBefore')

    formatted_matches = []
    for m in matches:
        p1 = getattr(m, 't1p1', None)
        p2 = getattr(m, 't1p2', None)
        p3 = getattr(m, 't2p1', None)
        p4 = getattr(m, 't2p2', None)
        
        # 建立玩家資料查找表
        updated_players = m.updated_players_json if m.updated_players_json else []
        player_map = {str(p.get('id')): p for p in updated_players if isinstance(p, dict)}
        
        def get_player_data(player_id, player_obj):
            if not player_id: return None
            pid_str = str(player_id)
            up = player_map.get(pid_str, {})
            
            # 解析數值
            mu_career_before = up.get("muBefore") if up.get("muBefore") is not None else getattr(player_obj, "mu", 25.0)
            mu_career_after = up.get("muAfter") if up.get("muAfter") is not None else mu_career_before
            
            # 優先使用 JSON 裡的即時戰力 (Daily Mu)
            if up.get("dailyMuBefore") is not None:
                mu_display_before = up.get("dailyMuBefore")
                mu_display_after = up.get("dailyMuAfter")
            else:
                # 備用方案：手動轉換
                m_mu = morning_ratings.get(pid_str)
                if target_date and m_mu is not None:
                    mu_display_before = 25.0 + (mu_career_before - m_mu)
                    mu_display_after = 25.0 + (mu_career_after - m_mu)
                else:
                    mu_display_before = mu_career_before
                    mu_display_after = mu_career_after

            return {
                "id": pid_str,
                "name": getattr(player_obj, "name", "Unknown"),
                "avatar": getattr(player_obj, "avatar", ""),
                "muBefore": mu_display_before,
                "muAfter": mu_display_after,
                "mu": mu_display_after,
                "careerMu": mu_career_after,
                "sigma": up.get("sigma") or getattr(player_obj, "sigma", 8.333)
            }

        t1_list = [get_player_data(m.t1p1_id, p1), get_player_data(m.t1p2_id, p2)]
        t2_list = [get_player_data(m.t2p1_id, p3), get_player_data(m.t2p2_id, p4)]

        formatted_matches.append({
            "id": str(m.id),
            "date": m.start_time.isoformat() if m.start_time else str(m.match_date),
            "matchDate": str(m.match_date),
            "team1": [p for p in t1_list if p is not None],
            "team2": [p for p in t2_list if p is not None],
            "winner": m.winner,
            "score": m.score or "",
            "duration": m.duration or "",
            "courtName": m.court_name or "",
            "matchNo": m.match_no or 0
        })
    return success(formatted_matches)
    
@app.put("/matches/{match_id}")
def update_match(match_id: str, req: schemas.MatchUpdateRequest, db: Session = Depends(get_db)):
    # In a real app, you would verify admin status here
    res = crud.update_match(db, match_id, req)
    if res.get("status") == "error":
        raise HTTPException(status_code=404, detail=res["message"])
    return success(res["message"])

@app.delete("/matches/{match_id}")
def delete_match(match_id: str, db: Session = Depends(get_db)):
    # In a real app, you would verify admin status here
    res = crud.delete_match(db, match_id)
    if res.get("status") == "error":
        raise HTTPException(status_code=404, detail=res["message"])
    return success(res["message"])

@app.post("/matches/batch_update")
def batch_update_matches(req: schemas.MatchBatchUpdate, db: Session = Depends(get_db)):
    res = crud.batch_update_matches(db, req.updates)
    return success(res["message"])

@app.post("/matches/batch_delete")
def batch_delete_matches(req: schemas.MatchBatchDelete, db: Session = Depends(get_db)):
    res = crud.batch_delete_matches(db, req.match_ids)
    return success(res["message"])

@app.post("/matches")
async def record_match_and_update(req: schemas.MatchRecordRequest, db: Session = Depends(get_db)):
    res = crud.record_match_and_update(db, req)
    if res.get("status") == "success":
        await manager.broadcast({
            "type": "version_update",
            "version": res["data"].get("version"),
            "source": "match_recorded"
        })
    return res

@app.get("/chat/context")
def get_chat_context(playerId: Optional[str] = Query(None), date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    target_date = safe_date(date)
    return success(crud.get_chat_context(db, playerId, target_date))

# Court State API
@app.get("/court_state")
@app.get("/court_state/")
@app.get("/court state")
@app.get("/court state/")
def get_court_state(date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    try:
        target_date = safe_date(date) or datetime.now().date()
        db_state = crud.get_court_state(db, target_date)
        target_date_str = str(target_date)
        
        if not db_state:
            return success({"version": 0, "state": None, "targetDate": target_date_str, "estimatedWaitTime": 0})
            
        # 確保 state 是 dict
        state = db_state.state
        if isinstance(state, str):
            import json
            try:
                state = json.loads(state)
            except:
                state = {}
        
        if not isinstance(state, dict):
            state = {}

        # 計算預計等候時間
        estimated_wait = 0
        try:
            all_players = crud.get_players(db)
            active_player_ids = set()
            courts = state.get('courts', [])
            if isinstance(courts, list):
                for c in courts:
                    if isinstance(c, dict) and c.get('players'):
                        for p in c['players']:
                            if p:
                                pid = p.get('id') if isinstance(p, dict) else p
                                active_player_ids.add(str(pid))
            
            waiting_count = len([p for p in all_players if str(p.id) not in active_player_ids])
            court_count = len(courts) if isinstance(courts, list) else 1
            estimated_wait = round((waiting_count / (max(1, court_count) * 4)) * 20)
        except Exception as e:
            print(f"Error calculating wait time: {e}")

        return success({
            "version": db_state.version,
            "state": state,
            "updatedAt": db_state.updated_at,
            "updatedBy": db_state.updated_by,
            "targetDate": target_date_str,
            "estimatedWaitTime": estimated_wait
        })
    except Exception as e:
        print(f"Critical error in get_court_state: {e}")
        return error(str(e))

@app.post("/court_state")
@app.post("/court_state/")
async def update_court_state(req: schemas.CourtStateUpdate, db: Session = Depends(get_db)):
    # 優先使用請求中的日期，否則使用今天
    target_date = safe_date(req.date) or datetime.now().date()
    res = crud.update_court_state(
        db, 
        target_date=target_date, 
        state=req.state, 
        updated_by=req.updatedBy, 
        expected_version=req.expectedVersion, 
        takeover=req.takeover, 
        updater_name=req.updaterName
    )
    if res.get("status") == "success":
        await manager.broadcast({
            "type": "version_update",
            "version": res["data"].get("version"),
            "source": "state_update"
        })
    return res

@app.post("/matchmake")
def get_match_recommendations(req: schemas.MatchmakingRequest, db: Session = Depends(get_db)):
    print(f"[Matchmake] Received request: selectedIds={req.selectedIds}, ignoreFatigue={req.ignoreFatigue}")
    # 1. 獲取所有球員與最近對戰
    target_date = safe_date(req.targetDate) or datetime.now().date()
    target_date_str = str(target_date)
    
    all_players = crud.get_players(db)
    
    # 找出當天開局戰力
    matches = crud.get_matches(db, target_date)
    morning_ratings = {}
    for m in reversed(matches):
        up_json = m.updated_players_json or []
        for p_up in up_json:
            pid = str(p_up.get('id'))
            if pid not in morning_ratings:
                morning_ratings[pid] = p_up.get('muBefore')

    # 獲取今日統計
    stats = crud.get_player_stats(db, target_date)
    stats_map = {str(s.player_id): s for s in stats}

    print(f"[Matchmake] DB Players count: {len(all_players)}")
    # 轉換為 dict 格式供演算法使用
    players_dict = []
    for p in all_players:
        p_id = str(p.id)
        s = stats_map.get(p_id)
        
        # 由於 crud.py 已經實作每日重製，s.mu 就是即時戰力
        daily_mu = s.mu if s else 25.0
        daily_sigma = s.sigma if s else 8.333
        
        players_dict.append({
            "id": p_id,
            "name": p.name,
            "mu": daily_mu, # 使用今日即時戰力進行配對
            "career_mu": p.mu, # 生涯戰力供參考
            "sigma": daily_sigma,
            "matchCount": s.match_count if s else 0
        })
        
    # 2. 獲取最近對戰紀錄（用於懲罰重複組合）
    matches = crud.get_matches(db, target_date=target_date)
    recent_matches_dict = []
    for m in matches:
        recent_matches_dict.append({
            "id": m.id,
            "matchDate": str(m.match_date),
            "team1": [{"id": m.t1p1_id}, {"id": m.t1p2_id}],
            "team2": [{"id": m.t2p1_id}, {"id": m.t2p2_id}]
        })
        
    # 3. 呼叫進階演算法
    recommendations = trueskill_logic.matchmake(
        all_players=players_dict,
        selected_ids=req.selectedIds,
        recent_matches=recent_matches_dict,
        ignore_fatigue=req.ignoreFatigue,
        target_date=target_date_str
    )
    
    print(f"[Matchmake] Generated {len(recommendations)} recommendations")
    return success(recommendations)

@app.post("/admin/login")
def admin_login(req: schemas.AdminLoginRequest):
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    if req.password == admin_password:
        return success({
            "email": "admin@amber.badminton",
            "name": "超級管理員",
            "picture": "bottts:admin",
            "isAdmin": True,
            "token": "admin-mock-token"
        })
    raise HTTPException(status_code=401, detail="密碼錯誤")

@app.post("/admin/recalibrate-ratings")
async def recalibrate_ratings(db: Session = Depends(get_db)):
    result = crud.recalibrate_all_ratings(db)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["message"])
    return success(result["message"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
