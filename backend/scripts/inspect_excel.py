import pandas as pd
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

MYSQL_USER = os.getenv("MYSQL_USER", "amber_user")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "amber_password")
MYSQL_HOST = os.getenv("MYSQL_HOST", "db")
MYSQL_PORT = os.getenv("MYSQL_PORT", "3306")
MYSQL_DB = os.getenv("MYSQL_DB", "amber_db")

SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def inspect_excel():
    excel_path = "data/安柏羽球社_正式版.xlsx"
    xl = pd.ExcelFile(excel_path)
    print(f"工作表名稱: {xl.sheet_names}")
    
    for sheet in xl.sheet_names:
        df = pd.read_excel(excel_path, sheet_name=sheet, nrows=2)
        print(f"\n工作表 [{sheet}] 欄位: {df.columns.tolist()}")

if __name__ == "__main__":
    inspect_excel()
