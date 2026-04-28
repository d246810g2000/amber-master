from database import engine, Base
import models
import import_data

def reset_and_import():
    print("⚠️  正在重製資料庫表結構 (Drop & Recreate)...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("✅ 表結構重製完成。")
    
    print("\n🚀 開始從 Excel 匯入初始資料...")
    import_data.import_excel()
    print("\n✨ 全部操作已完成！")

if __name__ == "__main__":
    reset_and_import()
