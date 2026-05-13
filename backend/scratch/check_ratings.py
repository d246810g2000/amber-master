from sqlalchemy.orm import Session
from database import SessionLocal
import models

db = SessionLocal()
players = db.query(models.Player).all()
print(f"{'Name':<15} | {'Career Mu':<10} | {'Daily Mu (Today)':<10}")
print("-" * 45)
for p in players:
    stat = db.query(models.PlayerStat).filter(models.PlayerStat.player_id == p.id).order_by(models.PlayerStat.date.desc()).first()
    daily_mu = stat.mu if stat else "N/A"
    print(f"{p.name:<15} | {p.mu:<10.2f} | {daily_mu}")
db.close()
