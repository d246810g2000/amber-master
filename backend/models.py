from sqlalchemy import Column, Integer, String, Float, Date, DateTime, JSON, ForeignKey, Text
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

    stats = relationship("PlayerStat", back_populates="player")

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
