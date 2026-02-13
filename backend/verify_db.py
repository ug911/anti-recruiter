import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"Connecting to: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'local'}")

engine = create_engine(DATABASE_URL)
inspector = inspect(engine)

tables = inspector.get_table_names()
print(f"Tables found: {tables}")

for table in tables:
    columns = [c['name'] for c in inspector.get_columns(table)]
    print(f"Table '{table}' columns: {columns}")

if 'jobposting' in tables and 'user' in tables:
    print("Verification SUCCESS: Tables created in PostgreSQL.")
else:
    print("Verification FAILED: Missing tables.")
