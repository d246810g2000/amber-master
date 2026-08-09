from sqlalchemy import Column, Integer, String, Float, Date, DateTime, JSON, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Player(Base):
    __tablename__ = "players"
    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    avatar = Column(Text)                                    # TEXT（對齊 init_db.sql，避免長 URL 截斷）
    mu = Column(Float, default=25.0)
    sigma = Column(Float, default=8.333)
    email = Column(String(255), unique=True, index=True)     # 與 SQL 統一為 255
    type = Column(String(20), default="guest")               # resident, guest
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    feathers = Column(Integer, default=0)
    last_feather_claim = Column(Date)
    active_title_id = Column(Integer, ForeignKey("shop_items.id"), nullable=True)
    active_frame_id = Column(Integer, ForeignKey("shop_items.id"), nullable=True)
    active_background_id = Column(Integer, ForeignKey("shop_items.id"), nullable=True)
    active_pet_id = Column(String(50), nullable=True)
    ability_pet_id = Column(String(50), nullable=True)
    active_egg_id = Column(String(50), nullable=True)
    egg_progress_games = Column(Integer, default=0)
    egg_progress_wins = Column(Integer, default=0)
    unlocked_pets = Column(Text, nullable=True)

    stats = relationship("PlayerStat", back_populates="player")
    active_title = relationship("ShopItem", foreign_keys=[active_title_id])
    active_frame = relationship("ShopItem", foreign_keys=[active_frame_id])
    active_background = relationship("ShopItem", foreign_keys=[active_background_id])

class Match(Base):
    __tablename__ = "matches"
    id = Column(String(50), primary_key=True, index=True)
    match_date = Column(Date, nullable=False)
    start_time = Column(DateTime, default=datetime.utcnow)
    t1p1_id = Column(String(50), ForeignKey("players.id"))
    t1p2_id = Column(String(50), ForeignKey("players.id"))
    t2p1_id = Column(String(50), ForeignKey("players.id"))
    t2p2_id = Column(String(50), ForeignKey("players.id"))
    winner = Column(Integer)                                 # 1 or 2
    score = Column(String(50))
    duration = Column(String(50))
    court_name = Column(String(50))
    match_no = Column(Integer)
    updated_players_json = Column(JSON)

    # Relationships
    t1p1 = relationship("Player", foreign_keys=[t1p1_id])
    t1p2 = relationship("Player", foreign_keys=[t1p2_id])
    t2p1 = relationship("Player", foreign_keys=[t2p1_id])
    t2p2 = relationship("Player", foreign_keys=[t2p2_id])

class PlayerStat(Base):
    __tablename__ = "player_stats"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    player_id = Column(String(50), ForeignKey("players.id"), nullable=False)
    mu = Column(Float)
    sigma = Column(Float)
    match_count = Column(Integer)
    win_count = Column(Integer)
    win_rate = Column(Float)

    player = relationship("Player", back_populates="stats")

class CourtState(Base):
    __tablename__ = "court_state"                           # 與 init_db.sql 統一（單數）
    date = Column(Date, primary_key=True, index=True)       # 用 date 為 PK，對齊 SQL 設計（每天一筆）
    version = Column(Integer, default=0)
    state = Column(JSON)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(255))                        # 與 SQL 統一為 255

class Bet(Base):
    __tablename__ = "bets"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String(50), ForeignKey("players.id"), nullable=False)
    match_id = Column(String(50), index=True)
    team = Column(Integer) # 1 or 2 (For Over/Under: 1=Over, 2=Under)
    amount = Column(Integer, nullable=False)
    bet_type = Column(String(20), default="moneyline") # moneyline, handicap, over_under
    line_value = Column(Float, default=0.0) # e.g., -3.5 or 40.5
    locked_odds = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_settled = Column(Integer, default=0) # 0: pending, 1: settled, 2: cancelled

class HouseDailyStats(Base):
    __tablename__ = "house_daily_stats"
    date = Column(Date, primary_key=True, index=True)
    rake_collected = Column(Integer, default=0)
    house_subsidy = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class FeatherTransaction(Base):
    __tablename__ = "feather_transactions"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String(50), ForeignKey("players.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    type = Column(String(50)) # daily_claim, bet_placed, bet_won, etc.
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class ShopItem(Base):
    __tablename__ = "shop_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    price = Column(Integer, nullable=False)
    price_permanent = Column(Integer, nullable=False, default=0)
    item_type = Column(String(50), nullable=False) # title, frame, background
    duration_days = Column(Integer, default=7)
    tier = Column(String(20), default="classic") # classic, epic, legendary, ultimate
    image_url = Column(Text) # For frames/auras if we use specific assets
    created_at = Column(DateTime, default=datetime.utcnow)

class PlayerInventory(Base):
    __tablename__ = "player_inventory"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String(50), ForeignKey("players.id"), nullable=False)
    item_id = Column(Integer, ForeignKey("shop_items.id"), nullable=False)
    purchased_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)

    item = relationship("ShopItem")

class PlayerLoan(Base):
    __tablename__ = "player_loans"
    id = Column(Integer, primary_key=True, index=True)
    lender_id = Column(String(50), ForeignKey("players.id"), nullable=False)
    borrower_id = Column(String(50), ForeignKey("players.id"), nullable=False)
    principal = Column(Integer, nullable=False)
    interest_rate = Column(Float, nullable=False, default=0.0)
    total_due = Column(Integer, nullable=False)
    repaid_amount = Column(Integer, nullable=False, default=0)
    status = Column(String(20), default="active") # active, repaid
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    lender = relationship("Player", foreign_keys=[lender_id])
    borrower = relationship("Player", foreign_keys=[borrower_id])


class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True, index=True)
    match_date = Column(Date, nullable=False, index=True)
    type = Column(String(20), nullable=False) # 'announcement' or 'bet'
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)


class MiniGameRecord(Base):
    __tablename__ = "minigame_records"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String(50), ForeignKey("players.id"), nullable=False)
    game_type = Column(String(20), default="feather")
    score = Column(Integer, nullable=False)
    max_combo = Column(Integer, default=0)
    is_practice = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class GameRoom(Base):
    __tablename__ = "game_rooms"
    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(50), unique=True, index=True, nullable=False)
    host_player_id = Column(String(50), ForeignKey("players.id"), nullable=False)
    guest_player_id = Column(String(50), ForeignKey("players.id"), nullable=True)
    game_type = Column(String(50), nullable=False) # 'feather' or 'trivia'
    wager_amount = Column(Integer, nullable=False)
    status = Column(String(20), default="waiting") # waiting, playing, finished, cancelled
    trivia_question_ids = Column(JSON, nullable=True)  # 約戰 trivia 預存題組 [id1, id2, ...]
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    host_player = relationship("Player", foreign_keys=[host_player_id])
    guest_player = relationship("Player", foreign_keys=[guest_player_id])


class GameMatch(Base):
    __tablename__ = "game_matches"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("game_rooms.id"), nullable=False)
    host_score = Column(Integer, default=0)
    guest_score = Column(Integer, default=0)
    host_submitted = Column(Boolean, default=False)
    guest_submitted = Column(Boolean, default=False)
    winner_id = Column(String(50), ForeignKey("players.id"), nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)

    # Relationships
    room = relationship("GameRoom")
    winner = relationship("Player", foreign_keys=[winner_id])


class TriviaQuestion(Base):
    __tablename__ = "trivia_questions"
    id = Column(Integer, primary_key=True, index=True)
    chapter = Column(Integer, nullable=False, index=True)
    chapter_name = Column(String(100), nullable=False)
    question_code = Column(String(20), nullable=False, unique=True)
    question = Column(Text, nullable=False)
    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)
    answer_index = Column(Integer, nullable=False)  # 0=A, 1=B, 2=C, 3=D
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class TriviaPlayerProgress(Base):
    __tablename__ = "trivia_player_progress"
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String(50), ForeignKey("players.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("trivia_questions.id"), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    answered_at = Column(DateTime, default=datetime.utcnow)

    player = relationship("Player")
    question = relationship("TriviaQuestion")


