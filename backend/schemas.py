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


class ShopItem(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: int
    price_permanent: int
    item_type: str
    duration_days: int
    tier: str
    image_url: Optional[str] = None

    class Config:
        from_attributes = True

class Player(PlayerBase):
    id: str
    mu: float
    sigma: float
    feathers: int
    last_feather_claim: Optional[date] = None
    active_title_id: Optional[int] = None
    active_frame_id: Optional[int] = None
    active_background_id: Optional[int] = None
    active_title: Optional[ShopItem] = None
    active_frame: Optional[ShopItem] = None
    active_background: Optional[ShopItem] = None
    active_pet_id: Optional[str] = None
    ability_pet_id: Optional[str] = None
    active_egg_id: Optional[str] = None
    egg_progress_games: int = 0
    egg_progress_wins: int = 0
    unlocked_pets: Optional[str] = None
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
    useCareerWeight: Optional[bool] = False
    targetDate: Optional[str] = None

class AdminLoginRequest(BaseModel):
    password: str

class BetBase(BaseModel):
    match_id: str
    team: int
    amount: int

class BetCreate(BetBase):
    pass

class Bet(BetBase):
    id: int
    player_id: str
    created_at: datetime
    is_settled: int

    class Config:
        from_attributes = True

class BetRequest(BaseModel):
    matchId: str
    team: int
    amount: int
    playerEmail: str
    betType: Optional[str] = "moneyline"
    lineValue: Optional[float] = 0.0

class ClaimFeathersRequest(BaseModel):
    email: str

class HouseDonateRequest(BaseModel):
    playerEmail: str
    amount: int

class MiniGameSubmitRequest(BaseModel):
    playerEmail: str
    score: int

class FeatherClaimResponse(BaseModel):
    status: str
    amount: int
    message: str

class BetTypeStatus(BaseModel):
    team1Total: int = 0
    team2Total: int = 0
    odds1: float = 1.0
    odds2: float = 1.0
    houseOdds1: float = 1.0
    houseOdds2: float = 1.0
    poolOdds1: float = 1.0
    poolOdds2: float = 1.0
    effectiveOdds1: float = 1.0
    effectiveOdds2: float = 1.0
    line: float = 0.0
    myBetAmount: int = 0
    myBetTeam: Optional[int] = None
    locked: Optional[bool] = False

class BetStatus(BaseModel):
    matchId: str
    moneyline: BetTypeStatus
    handicap: BetTypeStatus
    overUnder: BetTypeStatus


class BuyRequest(BaseModel):
    itemId: int
    userEmail: str
    isPermanent: Optional[bool] = False

class InventoryItem(BaseModel):
    id: int
    item: ShopItem
    purchased_at: datetime
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EquipRequest(BaseModel):
    itemId: int

class LoanCreateRequest(BaseModel):
    lender_id: str
    borrower_id: str
    principal: int
    interest_rate: float

class LoanRepayRequest(BaseModel):
    amount: Optional[int] = None

class PlayerLoanSchema(BaseModel):
    id: int
    lender_id: str
    borrower_id: str
    lender_name: str
    borrower_name: str
    principal: int
    interest_rate: float
    total_due: int
    repaid_amount: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class BuyEggRequest(BaseModel):
    userEmail: str
    eggType: str

class HatchRequest(BaseModel):
    userEmail: str

class EquipPetRequest(BaseModel):
    userEmail: str
    petId: Optional[str] = None
    abilityPetId: Optional[str] = None
    target: str = "both"  # display | ability | both


class ChatMessageBase(BaseModel):
    match_date: date
    type: str
    content: str

class ChatMessage(ChatMessageBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


