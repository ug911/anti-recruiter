import os
import pymysql
from dotenv import load_dotenv

# Load credentials from Hub's .env.local if available, otherwise use defaults
load_dotenv("/Users/findnitai/Desktop/TJ/hub/.env.local")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3307"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_NAME = os.getenv("DB_NAME", "techjapan-hub")


def run_migration():
    print(f"Connecting to {DB_HOST} / {DB_NAME} as {DB_USER}...")
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
        with connection.cursor() as cursor:
            # Create table
            sql = """
            CREATE TABLE IF NOT EXISTS agent_chat_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                session_id VARCHAR(255) NOT NULL,
                user_email VARCHAR(255),
                role VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (session_id),
                INDEX (user_email)
            );
            """
            cursor.execute(sql)
            print("Successfully created 'agent_chat_messages' table.")
        connection.commit()
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    run_migration()
