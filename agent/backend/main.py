"""
Agent API — FastAPI backend for the Zoho Recruit Chat Agent.

Endpoints:
  POST /chat          → synchronous JSON response (full conversation)
  POST /chat/stream   → SSE stream of agent events
  GET  /health        → health check
"""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import json
import asyncio
import uvicorn

from agent import run_agent
from db import get_db, ChatMessage as DBChatMessage
from sqlalchemy.orm import Session
from fastapi import Depends

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("main")

app = FastAPI(title="Zoho Recruit Chat Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "chrome-extension://edjldfeffmooimckdhlepdlpoogbjkah",
        "null",  # file:// origin
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files
_frontend = Path(__file__).parent.parent / "frontend"
if _frontend.exists():
    app.mount("/app", StaticFiles(directory=str(_frontend), html=True), name="frontend")


@app.get("/")
def root():
    """Redirect root to the chat UI."""
    index = _frontend / "index.html"
    if index.exists():
        return FileResponse(str(index))
    return {"message": "Zoho Recruit Agent API running. Frontend not found."}


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    session_id: Optional[str] = "default"
    user_email: Optional[str] = None
    page_context: Optional[str] = ""


class ChatResponse(BaseModel):
    response: str
    tool_calls: List[dict] = []
    session_id: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _messages_to_dicts(messages: List[ChatMessage]) -> list:
    return [{"role": m.role, "content": m.content} for m in messages]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


class ValidateTokenRequest(BaseModel):
    token: str

@app.post("/auth/validate")
async def validate_token(req: ValidateTokenRequest):
    """Validate a JWT token."""
    # For now, just check if it's a non-empty string. 
    # In a real app, we'd verify the JWT signature.
    if req.token and len(req.token) > 20:
        return {"valid": True}
    return {"valid": False}

@app.get("/chat/history")
async def get_chat_history(session_id: str, user_email: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch chat history for a session."""
    # If user_email is literal 'null' or 'undefined', treat as None
    if user_email in ['null', 'undefined', '']:
        user_email = None

    if user_email:
        # Match messages for this user OR anonymous messages in this specific session
        from sqlalchemy import or_
        query = db.query(DBChatMessage).filter(
            or_(
                DBChatMessage.user_email == user_email,
                (DBChatMessage.session_id == session_id) & (DBChatMessage.user_email == None)
            )
        )
    else:
        # If no email, only messages for this session_id (anonymous)
        query = db.query(DBChatMessage).filter(
            DBChatMessage.session_id == session_id,
            DBChatMessage.user_email == None
        )
    
    with open("/tmp/agent_history_log.txt", "a") as f:
        f.write(f"History Request: session_id={session_id}, user_email={user_email}\n")

    messages = query.order_by(DBChatMessage.created_at.asc()).all()
    with open("/tmp/agent_history_log.txt", "a") as f:
        f.write(f"  Result count: {len(messages)}\n")
    return [{"role": m.role, "content": m.content} for m in messages]


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Synchronous chat endpoint.  Runs the full agentic loop and returns
    the final assistant response plus a log of tool calls made.
    """
    messages = _messages_to_dicts(req.messages)
    final_text = ""
    tool_calls = []

    # Save the latest user message if provided
    if req.messages and req.messages[-1].role == "user":
        user_msg = req.messages[-1]
        
        # If user is now logged in, "claim" any previous anonymous messages in this session
        if req.user_email:
            db.query(DBChatMessage).filter(
                DBChatMessage.session_id == req.session_id,
                DBChatMessage.user_email == None
            ).update({DBChatMessage.user_email: req.user_email})
            db.commit()

        db.add(DBChatMessage(
            session_id=req.session_id,
            user_email=req.user_email,
            role="user",
            content=user_msg.content
        ))
        db.commit()

    try:
        async for event in run_agent(messages, session_id=req.session_id, page_context=req.page_context):
            if event["type"] == "text":
                final_text += event["content"]
            elif event["type"] == "tool_call":
                tool_calls.append({
                    "name":  event["name"],
                    "input": event["input"],
                })
            elif event["type"] == "error":
                raise HTTPException(status_code=500, detail=event["message"])
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Unhandled agent error")
        raise HTTPException(status_code=500, detail=str(exc))

    # Save final assistant response
    if final_text:
        db.add(DBChatMessage(
            session_id=req.session_id,
            user_email=req.user_email,
            role="assistant",
            content=final_text
        ))
        db.commit()

    return ChatResponse(
        response=final_text,
        tool_calls=tool_calls,
        session_id=req.session_id or "default",
    )


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest, db: Session = Depends(get_db)):
    """
    SSE streaming chat endpoint.

    Each SSE event is a JSON object:
      {"type": "text",        "content": "..."}
      {"type": "tool_call",   "name": "...", "input": {...}}
      {"type": "tool_result", "name": "...", "content": "..."}
      {"type": "done",        "message": "..."}
      {"type": "error",       "message": "..."}
    """
    messages = _messages_to_dicts(req.messages)

    # Save user message
    if req.messages and req.messages[-1].role == "user":
        user_msg = req.messages[-1]

        # Claim previous messages
        if req.user_email:
            db.query(DBChatMessage).filter(
                DBChatMessage.session_id == req.session_id,
                DBChatMessage.user_email == None
            ).update({DBChatMessage.user_email: req.user_email})
            db.commit()

        db.add(DBChatMessage(
            session_id=req.session_id,
            user_email=req.user_email,
            role="user",
            content=user_msg.content
        ))
        db.commit()

    async def event_generator():
        bot_text_buffer = ""
        try:
            async for event in run_agent(messages, session_id=req.session_id, page_context=req.page_context):
                if event["type"] == "text":
                    bot_text_buffer += event["content"]
                
                yield f"data: {json.dumps(event)}\n\n"
            
            # Save final response when done
            if bot_text_buffer:
                db.add(DBChatMessage(
                    session_id=req.session_id,
                    user_email=req.user_email,
                    role="assistant",
                    content=bot_text_buffer
                ))
                db.commit()
        except Exception as exc:
            logger.exception("Stream error")
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":          "no-cache",
            "X-Accel-Buffering":      "no",
            "Transfer-Encoding":      "chunked",
        },
    )


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
