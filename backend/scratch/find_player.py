import sqlite3
import os

db_path = 'backend/data/badminton.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, name FROM players WHERE name LIKE '%張銘%';")
players = cursor.fetchall()

if not players:
    print("No players found with name '張銘'")
else:
    for p in players:
        print(f"ID: {p[0]}, Name: {p[1]}")

conn.close()
