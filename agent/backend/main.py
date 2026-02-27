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


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Synchronous chat endpoint.  Runs the full agentic loop and returns
    the final assistant response plus a log of tool calls made.
    """
    messages = _messages_to_dicts(req.messages)
    final_text = ""
    tool_calls = []

    try:
        async for event in run_agent(messages, session_id=req.session_id):
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

    return ChatResponse(
        response=final_text,
        tool_calls=tool_calls,
        session_id=req.session_id or "default",
    )


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
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

    async def event_generator():
        try:
            async for event in run_agent(messages, session_id=req.session_id):
                yield f"data: {json.dumps(event)}\n\n"
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
