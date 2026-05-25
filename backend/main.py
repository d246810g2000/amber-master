from typing import List, Optional, Any, Dict
from sqlalchemy.orm import Session
from fastapi import FastAPI, Depends, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from datetime import date, datetime, timedelta
import os
import time

import models, schemas, crud, trueskill_logic
from database import engine, Base, get_db

# Create tables if they don't exist
Base.metadata.create_all(bind=engine)

# Run schema migrations and seeds sync
from sqlalchemy.inspection import inspect
from sqlalchemy import text
from database import SessionLocal

def run_db_migrations():
    # 1. Schema migration
    with engine.connect() as conn:
        inspector = inspect(engine)
        columns = [col['name'] for col in inspector.get_columns('shop_items')]
        
        if 'price_permanent' not in columns:
            print("MIGRATION: Adding price_permanent column to shop_items...")
            conn.execute(text("ALTER TABLE shop_items ADD COLUMN price_permanent INT NOT NULL DEFAULT 0"))
            conn.commit()
            
        if 'tier' not in columns:
            print("MIGRATION: Adding tier column to shop_items...")
            conn.execute(text("ALTER TABLE shop_items ADD COLUMN tier VARCHAR(20) DEFAULT 'classic'"))
            conn.commit()
            
        if 'player_loans' not in inspector.get_table_names():
            print("MIGRATION: Creating player_loans table...")
            conn.execute(text("""
                CREATE TABLE player_loans (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    lender_id VARCHAR(50) NOT NULL,
                    borrower_id VARCHAR(50) NOT NULL,
                    principal INT NOT NULL,
                    interest_rate FLOAT NOT NULL DEFAULT 0.0,
                    total_due INT NOT NULL,
                    repaid_amount INT NOT NULL DEFAULT 0,
                    status VARCHAR(20) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (lender_id) REFERENCES players(id),
                    FOREIGN KEY (borrower_id) REFERENCES players(id),
                    INDEX idx_borrower (borrower_id),
                    INDEX idx_lender (lender_id)
                )
            """))
            conn.commit()

            
    # 2. Seed data update
    db = SessionLocal()
    try:
        seeds = [
            ('球場邊緣人', '永遠在場邊等主揪叫名字', 150, 600, 'title', 7, 'classic'),
            ('撿球大師', '打球五分鐘，撿球兩小時', 150, 600, 'title', 7, 'classic'),
            ('報隊請排隊', '場邊磁鐵永遠掛最後一個', 150, 600, 'title', 7, 'classic'),
            ('發球姿勢 100 分', '姿勢很帥，但球通常沒過網', 250, 1000, 'title', 7, 'epic'),
            ('活在線上的男人', '專打壓線界內球，鷹眼都沒用', 250, 1000, 'title', 7, 'epic'),
            ('微笑殺手(肉球製造機)', '送對手滿滿的甜球（肉球）', 250, 1000, 'title', 7, 'epic'),
            ('連裁判都敢殺', '殺球直接往主審臉上砸', 500, 2000, 'title', 7, 'legendary'),
            ('撲球之鬼', '球場上移動的吸塵器', 500, 2000, 'title', 7, 'legendary'),
            ('撲球之鬼(不擦地)', '撲完球還要隊友幫忙擦地板', 500, 2000, 'title', 7, 'legendary'),
            ('跪求贊助零打券', '白嫖最高境界，全場焦點', 800, 3200, 'title', 7, 'ultimate'),
            ('羽球界戴資穎', '假動作騙到對手腳骨折', 800, 3200, 'title', 7, 'ultimate'),
            ('這個殺氣不對勁', '一站上場，全場退避三舍', 800, 3200, 'title', 7, 'ultimate'),
            ('倔強鐵牌木框', '鐵牌（暗灰色 / 粗糙木質紋理）', 250, 1000, 'frame', 7, 'classic'),
            ('不屈青銅邊框', '銅牌（古銅色 / 紅棕暗光）', 250, 1000, 'frame', 7, 'classic'),
            ('傲氣白銀邊框', '銀牌（亮銀色 / 潔淨白光）', 250, 1000, 'frame', 7, 'classic'),
            ('榮耀黃金邊框', '金牌（耀眼金黃 / 閃爍光芒）', 500, 2000, 'frame', 7, 'epic'),
            ('華麗白金邊框', '白金（青碧色 / 帶點淡綠偏藍的光澤）', 500, 2000, 'frame', 7, 'epic'),
            ('璀璨翡翠邊框', '翡翠（深邃翠綠 / 寶石螢光）', 500, 2000, 'frame', 7, 'epic'),
            ('璀璨鑽石邊框', '鑽石（亮藍色 / 鑽石高光反射）', 800, 3200, 'frame', 7, 'legendary'),
            ('大師紫羅蘭框', '大師（神祕深紫 / 尊貴紫光）', 800, 3200, 'frame', 7, 'legendary'),
            ('宗師傲紅邊框', '宗師（霸氣深紅 / 火焰微光）', 800, 3200, 'frame', 7, 'legendary'),
            ('頂尖菁英流光框', '菁英（金黃至霓虹紫動態流光漸變）', 1000, 4000, 'frame', 7, 'ultimate'),
            ('萬象星空邊框', '終極（LoL 元素使拉克絲概念，星空幻彩）', 1000, 4000, 'frame', 7, 'ultimate'),
            ('聖白羽翼邊框', '終極（天使聖光 / 飄落羽毛特效）', 1000, 4000, 'frame', 7, 'ultimate'),
            ('鐵牌：霧霾灰階', '低調暗沉的灰色煙霧特效', 500, 2000, 'background', 7, 'classic'),
            ('銅牌：大地岩落', '微弱的岩石與泥土粒子緩慢飄落', 500, 2000, 'background', 7, 'classic'),
            ('白銀：微光銀河', '乾淨、銀白色的細小流星特效', 500, 2000, 'background', 7, 'classic'),
            ('黃金：金光閃耀', '畫面四周有金色奢華粒子向上徐升', 800, 3200, 'background', 7, 'epic'),
            ('白金：海克斯科技', '青藍色的科技魔法護盾微光背景', 800, 3200, 'background', 7, 'epic'),
            ('翡翠：螢火之森', '深綠森林中帶有螢火蟲的幽綠光點', 800, 3200, 'background', 7, 'epic'),
            ('鑽石：星辰風暴', 'Hover 時觸發亮藍色鑽石折射與冰晶外發光', 1000, 4000, 'background', 7, 'legendary'),
            ('大師：虛空星河', '神祕的深紫色星空，自帶黑洞邊緣扭曲特效', 1000, 4000, 'background', 7, 'legendary'),
            ('宗師：雷霆萬鈞', '血紅色閃電偶爾劃過夜空的動態特效', 1000, 4000, 'background', 7, 'legendary'),
            ('菁英：傲世神巔', '卡片與背景完美融合，全服通告級流光', 1500, 6000, 'background', 7, 'ultimate'),
            ('終極：起源矩陣', '霓虹紫與數位矩陣程式碼流動（源計畫畫風）', 1500, 6000, 'background', 7, 'ultimate'),
            ('終極：飄零羽落', '動態羽毛飄落特效背景', 1500, 6000, 'background', 7, 'ultimate'),
        ]
        for name, desc, price, price_perm, item_type, dur_days, tier in seeds:
            item = db.query(models.ShopItem).filter(models.ShopItem.name == name).first()
            if item:
                item.description = desc
                item.price = price
                item.price_permanent = price_perm
                item.item_type = item_type
                item.duration_days = dur_days
                item.tier = tier
            else:
                item = models.ShopItem(
                    name=name,
                    description=desc,
                    price=price,
                    price_permanent=price_perm,
                    item_type=item_type,
                    duration_days=dur_days,
                    tier=tier
                )
                db.add(item)
        db.commit()
        print("MIGRATION: Shop items seeds updated successfully.")
    except Exception as e:
        db.rollback()
        print(f"MIGRATION ERROR: Failed to update shop items seeds: {e}")
    finally:
        db.close()

run_db_migrations()

app = FastAPI(title="Amber Badminton API")


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await self.broadcast_online_count()

    async def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            await self.broadcast_online_count()

    async def broadcast_online_count(self):
        await self.broadcast({
            "type": "online_count",
            "count": len(self.active_connections)
        })

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
    except (WebSocketDisconnect, Exception):
        await manager.disconnect(websocket)

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
    
    # 查詢當日每位球員的羽毛變化：賺羽、噴羽、淨羽
    from datetime import time
    start_utc = datetime.combine(target_date, time.min) - timedelta(hours=8)
    end_utc = datetime.combine(target_date, time.max) - timedelta(hours=8)
    
    txs = db.query(models.FeatherTransaction).filter(
        models.FeatherTransaction.created_at >= start_utc,
        models.FeatherTransaction.created_at <= end_utc
    ).all()
    
    feathers_earned_map = {}
    feathers_lost_map = {}
    feathers_net_map = {}
    
    for tx in txs:
        pid = str(tx.player_id)
        amount = tx.amount
        if pid not in feathers_earned_map:
            feathers_earned_map[pid] = 0
            feathers_lost_map[pid] = 0
            feathers_net_map[pid] = 0
            
        feathers_net_map[pid] += amount
        if amount > 0:
            feathers_earned_map[pid] += amount
        else:
            feathers_lost_map[pid] += abs(amount)
            
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
            "winRate": s.win_rate if s else 0,
            "feathersEarned": feathers_earned_map.get(pid, 0),
            "feathersLost": feathers_lost_map.get(pid, 0),
            "feathersNet": feathers_net_map.get(pid, 0)
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
        # 準備勝利公告
        match_id = req.matchId or res["data"].get("matchId")
        t1, t2, court_name = crud.get_match_teams(db, match_id)
        winner_team = 1 if req.winnerTeam == 'Team 1' else 2
        winners = t1 if winner_team == 1 else t2
        losers = t2 if winner_team == 1 else t1
        
        bet_results = res["data"].get("bet_results", {})
        odds = bet_results.get("odds", 1.0)
        payouts = bet_results.get("winners", [])
        
        announcement = f"🏆 恭喜！在「{court_name}」中，{winners} 最終擊敗了 {losers}，取得勝利！"
        
        if payouts:
            payout_details = " \n💰 賭神出世："
            # 只列出前 3 名，避免訊息太長
            sorted_payouts = sorted(payouts, key=lambda x: x['payout'], reverse=True)
            for p in sorted_payouts[:3]:
                payout_details += f" {p['name']} (+{p['payout']})"
            announcement += f"{payout_details} (賠率 {odds})"

        # 儲存對戰勝利公告到資料庫
        match_date = safe_date(req.matchDate) or (datetime.utcnow() + timedelta(hours=8)).date()
        crud.create_chat_message(
            db=db,
            match_date=match_date,
            type="announcement",
            content=announcement
        )

        await manager.broadcast({
            "type": "version_update",
            "version": res["data"].get("version"),
            "source": "match_recorded",
            "message": announcement
        })
    return res

@app.get("/chat/context")
def get_chat_context(playerId: Optional[str] = Query(None), date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    target_date = safe_date(date)
    return success(crud.get_chat_context(db, playerId, target_date))

@app.get("/chat/messages")
def read_chat_messages(date: Optional[str] = Query(None), db: Session = Depends(get_db)):
    target_date = safe_date(date) or (datetime.utcnow() + timedelta(hours=8)).date()
    messages = crud.get_chat_messages(db, target_date)
    formatted = [
        {
            "id": str(msg.id),
            "type": msg.type,
            "content": msg.content,
            "timestamp": int(msg.timestamp.timestamp() * 1000)
        }
        for msg in messages
    ]
    return success(formatted)

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
        use_career_weight=req.useCareerWeight,
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

# Feathers & Betting API
@app.post("/feathers/claim")
def claim_feathers(req: schemas.ClaimFeathersRequest, db: Session = Depends(get_db)):
    result = crud.claim_daily_feathers(db, req.email)
    return success(result)

@app.get("/players/{player_id}/feathers")
def get_player_feathers(player_id: str, limit: int = 50, db: Session = Depends(get_db)):
    transactions = crud.get_feather_transactions(db, player_id, limit)
    return success(transactions)

@app.get("/players/{player_id}/loans")
def get_player_loans(player_id: str, db: Session = Depends(get_db)):
    # 先主動清理過期借貸
    crud.check_and_expire_loans(db)

    lent = db.query(models.PlayerLoan).filter(models.PlayerLoan.lender_id == player_id).order_by(models.PlayerLoan.created_at.desc()).all()
    borrowed = db.query(models.PlayerLoan).filter(models.PlayerLoan.borrower_id == player_id).order_by(models.PlayerLoan.created_at.desc()).all()
    
    def to_dict(loan):
        lender = db.query(models.Player).filter(models.Player.id == loan.lender_id).first()
        borrower = db.query(models.Player).filter(models.Player.id == loan.borrower_id).first()
        return {
            "id": loan.id,
            "lender_id": loan.lender_id,
            "borrower_id": loan.borrower_id,
            "lender_name": lender.name if lender else "未知",
            "borrower_name": borrower.name if borrower else "未知",
            "principal": loan.principal,
            "interest_rate": loan.interest_rate,
            "total_due": loan.total_due,
            "repaid_amount": loan.repaid_amount,
            "status": loan.status,
            "created_at": loan.created_at.isoformat() if loan.created_at else None
        }
        
    return success({
        "lent": [to_dict(l) for l in lent],
        "borrowed": [to_dict(b) for b in borrowed]
    })

@app.post("/loans")
def create_loan(req: schemas.LoanCreateRequest, db: Session = Depends(get_db)):
    res = crud.create_loan(db, req.lender_id, req.borrower_id, req.principal, req.interest_rate)
    if res["status"] == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return success(res)

@app.post("/loans/{loan_id}/accept")
def accept_loan(loan_id: int, db: Session = Depends(get_db)):
    res = crud.accept_loan(db, loan_id)
    if res["status"] == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return success(res)

@app.post("/loans/{loan_id}/reject")
def reject_loan(loan_id: int, db: Session = Depends(get_db)):
    res = crud.reject_loan(db, loan_id)
    if res["status"] == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return success(res)

@app.post("/loans/{loan_id}/cancel")
def cancel_loan(loan_id: int, db: Session = Depends(get_db)):
    res = crud.cancel_loan(db, loan_id)
    if res["status"] == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return success(res)

@app.post("/loans/{loan_id}/repay")
def repay_loan(loan_id: int, req: schemas.LoanRepayRequest, db: Session = Depends(get_db)):
    res = crud.repay_loan(db, loan_id, req.amount)
    if res["status"] == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return success(res)


@app.post("/bets")
async def place_bet(req: schemas.BetRequest, db: Session = Depends(get_db)):
    player = crud.get_player_by_email(db, req.playerEmail)
    if not player:
        return error("找不到球員資料，請確認是否已綁定帳號")
    
    result = crud.place_bet(db, player.id, req.matchId, req.team, req.amount)
    if result.get("status") == "error":
        return error(result.get("message"))
    
    # 廣播更新 (廣播公用狀態與尬廣訊息)
    t1, t2, court_name = crud.get_match_teams(db, req.matchId)
    bet_status = crud.get_bet_status(db, req.matchId, None)
    
    target_team_name = t1 if req.team == 1 else t2
    other_team_name = t2 if req.team == 1 else t1
    announcement = f"📣 {player.name} 豪擲了 {req.amount} 根羽毛，在「{court_name}」看好「{target_team_name}」會打敗「{other_team_name}」！"
    
    # 儲存投注公告到資料庫
    db_match = db.query(models.Match).filter(models.Match.id == req.matchId).first()
    match_date = db_match.match_date if db_match else (datetime.utcnow() + timedelta(hours=8)).date()
    crud.create_chat_message(
        db=db,
        match_date=match_date,
        type="bet",
        content=announcement
    )

    await manager.broadcast({
        "type": "bet_update",
        "matchId": req.matchId,
        "status": bet_status,
        "message": announcement
    })
    
    return success(result)

@app.get("/bets/status")
def get_bet_status(matchId: str, email: Optional[str] = None, db: Session = Depends(get_db)):
    player_id = None
    if email:
        player = crud.get_player_by_email(db, email)
        if player:
            player_id = player.id
            
    result = crud.get_bet_status(db, matchId, player_id)
    return success(result)

# Shop API
@app.get("/shop/items")
def get_shop_items(db: Session = Depends(get_db)):
    items = crud.get_shop_items(db)
    return success(items)

@app.post("/shop/buy")
def buy_item(req: schemas.BuyRequest, db: Session = Depends(get_db)):
    player = crud.get_player_by_email(db, req.userEmail)
    if not player:
        return error("USER_NOT_BOUND")
    return crud.buy_item(db, player.id, req.itemId, req.isPermanent)

@app.get("/players/{player_id}/inventory")
def get_inventory(player_id: str, db: Session = Depends(get_db)):
    items = crud.get_player_inventory(db, player_id)
    return success(items)

@app.post("/players/{player_id}/equip")
def equip_item(player_id: str, req: schemas.EquipRequest, db: Session = Depends(get_db)):
    return crud.equip_item(db, player_id, req.itemId)

@app.post("/players/buy-egg")
def buy_egg(req: schemas.BuyEggRequest, db: Session = Depends(get_db)):
    try:
        result = crud.buy_egg(db, req.userEmail, req.eggType)
        return success(result)
    except ValueError as e:
        return error(str(e))

@app.post("/players/hatch")
def hatch_egg(req: schemas.HatchRequest, db: Session = Depends(get_db)):
    try:
        result = crud.hatch_egg(db, req.userEmail)
        return success(result)
    except ValueError as e:
        return error(str(e))

@app.post("/players/equip-pet")
def equip_pet(req: schemas.EquipPetRequest, db: Session = Depends(get_db)):
    try:
        result = crud.equip_pet(db, req.userEmail, req.petId)
        return success(result)
    except ValueError as e:
        return error(str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
