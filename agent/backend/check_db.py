import os
import pymysql
from dotenv import load_dotenv

load_dotenv("/Users/findnitai/Desktop/TJ/hub/.env.local")

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "abc")
DB_NAME = os.getenv("DB_NAME", "techjapan-hub")

def check_data():
    try:
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            cursorclass=pymysql.cursors.DictCursor
        )
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM agent_chat_messages ORDER BY created_at DESC LIMIT 10;")
            rows = cursor.fetchall()
            if not rows:
                print("No messages found in 'agent_chat_messages' table.")
            else:
                print(f"Found {len(rows)} recent messages:")
                for row in rows:
                    print(f"ID: {row['id']} | Session: {row['session_id']} | Email: {row['user_email']} | Role: {row['role']} | Content: {row['content'][:50]}...")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    check_data()
