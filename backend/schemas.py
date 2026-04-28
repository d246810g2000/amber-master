from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any
from datetime import datetime, date

class PlayerBase(BaseModel):
    name: str
    avatar: Optional[str] = None
    type: Optional[str] = "guest"
    email: Optional[str] = None

class PlayerCreate(PlayerBase):
    id: Optional[str] = None

class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    type: Optional[str] = None
    mu: Optional[float] = None
    sigma: Optional[float] = None
    email: Optional[str] = None

class PlayerBatchCreate(BaseModel):
    names: List[Any]

class PlayerBatchUpdateItem(BaseModel):
    id: str
    mu: Optional[float] = None
    sigma: Optional[float] = None

class PlayerBatchUpdate(BaseModel):
    updates: List[PlayerBatchUpdateItem]

class PlayerBatchDelete(BaseModel):
    ids: List[str]

class PlayerBindRequest(BaseModel):
    playerId: str
    userEmail: str


class Player(PlayerBase):
    id: str
    mu: float
    sigma: float
    hasBinding: bool = False
    isGoogleLinked: bool = False

    class Config:
        from_attributes = True

class MatchBase(BaseModel):
    match_date: date
    t1p1_id: str
    t1p2_id: str
    t2p1_id: str
    t2p2_id: str
    winner: int
    score: Optional[str] = None
    duration: Optional[str] = None
    court_name: Optional[str] = None
    match_no: Optional[int] = None

class MatchCreate(MatchBase):
    id: Optional[str] = None
    updated_players: Optional[List[Any]] = None

class MatchRecordRequest(BaseModel):
    matchId: Optional[str] = None
    date: str
    matchDate: Optional[str] = None
    t1p1: str
    t1p2: str
    t2p1: str
    t2p2: str
    winnerTeam: str
    updatedPlayers: Optional[List[Any]] = None
    updatedStats: Optional[List[Any]] = None
    duration: Optional[str] = None
    score: Optional[str] = None
    courtName: Optional[str] = None
    matchNo: Optional[int] = None

class MatchUpdateRequest(BaseModel):
    winner: Optional[int] = None
    score: Optional[str] = None
    duration: Optional[str] = None
    court_name: Optional[str] = None
    t1p1_id: Optional[str] = None
    t1p2_id: Optional[str] = None
    t2p1_id: Optional[str] = None
    t2p2_id: Optional[str] = None

class MatchBatchUpdateItem(BaseModel):
    id: str
    winner: Optional[int] = None
    score: Optional[str] = None

class MatchBatchUpdate(BaseModel):
    updates: List[MatchBatchUpdateItem]

class MatchBatchDelete(BaseModel):
    match_ids: List[str]

class Match(MatchBase):
    id: str
    start_time: datetime
    updated_players_json: Optional[Any] = None

    class Config:
        from_attributes = True

class PlayerStatBase(BaseModel):
    date: date
    player_id: str
    mu: float
    sigma: float
    match_count: int
    win_count: int
    win_rate: float

class PlayerStat(PlayerStatBase):
    id: int

    class Config:
        from_attributes = True

class CourtStateBase(BaseModel):
    date: date
    version: int
    state: Any
    updated_by: Optional[str] = None

class CourtStateUpdate(BaseModel):
    expectedVersion: int
    state: Any
    updatedBy: str
    date: Optional[str] = None
    takeover: Optional[bool] = False
    updaterName: Optional[str] = None
    enableLine: Optional[bool] = True

class CourtStateResponse(BaseModel):
    status: str
    data: Optional[Any] = None
    message: Optional[str] = None

class MatchmakingRequest(BaseModel):
    selectedIds: List[str]
    ignoreFatigue: Optional[bool] = False
    targetDate: Optional[str] = None

class AdminLoginRequest(BaseModel):
    password: str
