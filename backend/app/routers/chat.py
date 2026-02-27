from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.gemini_service import GeminiService

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    text: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@router.post("/", response_model=dict)
def chat(request: ChatRequest):
    """Process a chat message and extract job data using Gemini."""
    try:
        # Convert to Gemini format
        conversation_history = [
            {
                "role": msg.role,
                "parts": [{"text": msg.text}]
            }
            for msg in request.messages
        ]
        
        result = GeminiService.extract_job_data(conversation_history)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
