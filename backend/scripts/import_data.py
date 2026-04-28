import pandas as pd
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json
import models

# Database connection
MYSQL_USER = os.getenv("MYSQL_USER", "amber_user")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "amber_password")
MYSQL_HOST = os.getenv("MYSQL_HOST", "db")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DB = os.getenv("MYSQL_DB", "amber_db")

SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def import_excel():
    excel_path = "data/安柏羽球社_正式版.xlsx"
    db = SessionLocal()

    try:
        # 1. Import Players
        print("正在匯入 Players...")
        df_players = pd.read_excel(excel_path, sheet_name='Players')

        # 建立 PlayerID → name 及 name → PlayerID 的雙向對照表（供 Matches 使用）
        name_to_id: dict[str, str] = {}
        for _, row in df_players.iterrows():
            pid = str(row['PlayerID'])
            name = str(row['Name'])
            # PlayerID 在 Excel 可能是科學記號浮點數，需轉成整數字串
            try:
                pid = str(int(float(pid)))
            except (ValueError, TypeError):
                pass
            name_to_id[name] = pid

            player = models.Player(
                id=pid,
                name=name,
                avatar=str(row['Avatar']) if pd.notna(row['Avatar']) else None,
                mu=float(row['Mu']),
                sigma=float(row['Sigma']),
                email=str(row['Email']) if pd.notna(row['Email']) else None,
                type=str(row['Type']) if pd.notna(row['Type']) else 'guest'
            )
            db.merge(player)
        db.commit()
        print(f"  ✅ Players 匯入完成，建立 {len(name_to_id)} 筆 name→ID 對照")

        # 2. Import PlayerStats
        print("正在匯入 PlayerStats...")
        df_stats = pd.read_excel(excel_path, sheet_name='PlayerStats')
        for _, row in df_stats.iterrows():
            target_date = pd.to_datetime(row['Date']).date()

            # player_id 可能也是科學記號，需轉換
            raw_id = str(row['ID'])
            try:
                p_id = str(int(float(raw_id)))
            except (ValueError, TypeError):
                p_id = raw_id

            # Check if exists
            existing = db.query(models.PlayerStat).filter(
                models.PlayerStat.date == target_date,
                models.PlayerStat.player_id == p_id
            ).first()

            if existing:
                existing.mu = float(row['Mu'])
                existing.sigma = float(row['Sigma'])
                existing.match_count = int(row['MatchCount'])
                existing.win_count = int(row['WinCount'])
                existing.win_rate = float(row['WinRate'])
            else:
                stat = models.PlayerStat(
                    date=target_date,
                    player_id=p_id,
                    mu=float(row['Mu']),
                    sigma=float(row['Sigma']),
                    match_count=int(row['MatchCount']),
                    win_count=int(row['WinCount']),
                    win_rate=float(row['WinRate'])
                )
                db.add(stat)
        db.commit()
        print("  ✅ PlayerStats 匯入完成")

        # 3. Import Matches
        print("正在匯入 Matches...")
        df_matches = pd.read_excel(excel_path, sheet_name='Matches')
        skipped = 0

        def resolve_player_id(name_val: any, up_map: dict[str, str]) -> str | None:
            """
            優先從 UpdatedPlayers JSON 的 name→id 對照表解析，
            其次從 Players 表的 name→id 對照表查找。
            若都找不到則回傳 None（不存錯誤 ID 以避免 FK 問題）。
            """
            if pd.isna(name_val):
                return None
            name = str(name_val)
            if name in up_map:
                return up_map[name]
            if name in name_to_id:
                return name_to_id[name]
            print(f"  ⚠️  找不到球員 ID：{name!r}，該欄設為 NULL")
            return None

        for _, row in df_matches.iterrows():
            # 從 UpdatedPlayers JSON 建立此場比賽的 name→id 精確對照
            up_map: dict[str, str] = {}
            updated_raw = row.get('UpdatedPlayers')
            if pd.notna(updated_raw):
                try:
                    up_list = json.loads(updated_raw)
                    for p in up_list:
                        if 'name' in p and 'id' in p:
                            up_map[str(p['name'])] = str(int(float(str(p['id']))))
                except (json.JSONDecodeError, ValueError, TypeError):
                    pass

            winner_raw = str(row['Winner'])
            winner = 1 if '1' in winner_raw else 2

            # 解析 start_time（Excel Date 欄位包含完整 datetime）
            try:
                start_time = pd.to_datetime(row['Date'])
                if start_time.tzinfo is not None:
                    start_time = start_time.replace(tzinfo=None)
            except Exception:
                start_time = datetime.utcnow()

            match_date = start_time.date()

            match = models.Match(
                id=str(row['MatchID']),
                match_date=match_date,
                start_time=start_time,
                t1p1_id=resolve_player_id(row['T1P1'], up_map),
                t1p2_id=resolve_player_id(row['T1P2'], up_map),
                t2p1_id=resolve_player_id(row['T2P1'], up_map),
                t2p2_id=resolve_player_id(row['T2P2'], up_map),
                winner=winner,
                score=str(row['Score']) if pd.notna(row['Score']) else None,
                duration=str(row['Duration']) if pd.notna(row['Duration']) else None,
                court_name=str(row['Court']) if pd.notna(row['Court']) else None,
                match_no=int(row['Match#']) if pd.notna(row['Match#']) else None,
                updated_players_json=json.loads(updated_raw) if pd.notna(updated_raw) else None
            )
            db.merge(match)
        db.commit()
        print(f"  ✅ Matches 匯入完成（跳過 {skipped} 筆）")

        # 4. Import CourtState
        print("正在匯入 CourtState...")
        df_court = pd.read_excel(excel_path, sheet_name='CourtState')
        if not df_court.empty:
            latest = df_court.iloc[-1]
            state_val = latest['State']
            if isinstance(state_val, str):
                try:
                    state_data = json.loads(state_val)
                except Exception:
                    state_data = state_val
            else:
                state_data = state_val

            try:
                court_date = pd.to_datetime(latest['Date']).date()
            except Exception:
                court_date = datetime.utcnow().date()

            try:
                updated_at_val = pd.to_datetime(latest['UpdatedAt'])
                if updated_at_val.tzinfo is not None:
                    updated_at_val = updated_at_val.replace(tzinfo=None)
            except Exception:
                updated_at_val = datetime.utcnow()

            court_state = models.CourtState(
                date=court_date,
                version=int(latest['Version']),
                state=state_data,
                updated_at=updated_at_val,
                updated_by=str(latest['UpdatedBy'])
            )
            db.merge(court_state)
        db.commit()
        print("  ✅ CourtState 匯入完成")

        print("\n✅ 全部資料匯入完成！")

    except Exception as e:
        import traceback
        print(f"\n❌ 匯入出錯: {e}")
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import_excel()
