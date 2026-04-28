from database import engine, Base
import models # Import models to ensure they are registered

def init_db():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database initialization complete.")

if __name__ == "__main__":
    init_db()
