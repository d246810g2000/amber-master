import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

MYSQL_USER = os.getenv("MYSQL_USER", "amber_user")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "amber_password")
MYSQL_HOST = os.getenv("MYSQL_HOST", "db-dev")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DB = os.getenv("MYSQL_DB", "amber_db_dev")

SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def migrate():
    with engine.connect() as conn:
        print("Checking for missing columns in 'bets' table...")
        
        # Check if bet_type exists
        res = conn.execute(text("SHOW COLUMNS FROM bets LIKE 'bet_type'"))
        if not res.fetchone():
            print("Adding column 'bet_type'...")
            conn.execute(text("ALTER TABLE bets ADD COLUMN bet_type VARCHAR(20) DEFAULT 'moneyline'"))
        else:
            print("Column 'bet_type' already exists.")

        # Check if line_value exists
        res = conn.execute(text("SHOW COLUMNS FROM bets LIKE 'line_value'"))
        if not res.fetchone():
            print("Adding column 'line_value'...")
            conn.execute(text("ALTER TABLE bets ADD COLUMN line_value FLOAT DEFAULT 0.0"))
        else:
            print("Column 'line_value' already exists.")
            
        conn.commit()
        print("Migration completed.")

if __name__ == "__main__":
    migrate()
