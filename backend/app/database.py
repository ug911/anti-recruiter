import os
from dotenv import load_dotenv
from sqlmodel import SQLModel, create_engine

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Fallback to SQLite for development if no URL provided
    sqlite_file_name = "../database.db"
    DATABASE_URL = f"sqlite:///{sqlite_file_name}"

engine = create_engine(DATABASE_URL)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)
