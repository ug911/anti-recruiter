from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.database import create_db_and_tables, engine

from sqlmodel import Session, select
from app.models.user import User

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    with Session(engine) as session:
        user = session.exec(select(User).where(User.username == "admin")).first()
        if not user:
            user = User(username="admin", password_hash="dummyhash")
            session.add(user)
            session.commit()
    yield


from app.routers import jobs

app = FastAPI(
    title="Job Auto-Poster",
    lifespan=lifespan
)

from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router)

@app.get("/")
def read_root():
    return {"message": "Job Auto-Poster API is running"}
