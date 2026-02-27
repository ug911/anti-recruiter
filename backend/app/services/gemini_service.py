import os
import json
import google.generativeai as genai
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """You are a recruitment assistant that helps post jobs to Zoho Recruit.

When a user describes a job, extract the following fields into a JSON object:
- title: Job title (e.g. "Senior React Developer")
- description: Full job description
- location: City/location (e.g. "Bangalore, India")
- industry: Industry sector (default: "IT Services")
- job_type: "Full Time", "Part Time", "Contract", "Temporary", or "Freelance" (default: "Full Time")
- salary_range: Salary range as a string (e.g. "₹25L - ₹35L")
- experience_required: Experience range (e.g. "5-8 years")
- target_date: Target/deadline date in YYYY-MM-DD format (default to 30 days from today if not specified)

RULES:
1. If you have enough info to create a job posting, respond with ONLY a JSON block wrapped in ```json ... ``` markers.
2. If critical info is missing (at minimum: title and description), ask a concise follow-up question.
3. Be helpful and conversational. If the user gives a brief prompt like "React dev in Bangalore", flesh out a reasonable description.
4. Generate a professional, detailed job description from the context provided.
5. Always respond in English.
"""

class GeminiService:
    @staticmethod
    def extract_job_data(conversation_history: List[dict]) -> dict:
        """
        Send conversation to Gemini and get either structured job data or a follow-up question.
        
        conversation_history: list of {"role": "user"|"model", "parts": [{"text": "..."}]}
        
        Returns: {"type": "job_data", "data": {...}} or {"type": "message", "text": "..."}
        """
        if not GEMINI_API_KEY:
            raise Exception("GEMINI_API_KEY not configured. Add it to your .env file.")
        
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash",
            system_instruction=SYSTEM_PROMPT
        )
        
        chat = model.start_chat(history=conversation_history[:-1])
        
        # Send the latest message
        latest_message = conversation_history[-1]["parts"][0]["text"]
        response = chat.send_message(latest_message)
        
        response_text = response.text.strip()
        
        # Try to extract JSON from the response
        job_data = GeminiService._parse_job_json(response_text)
        
        if job_data:
            return {"type": "job_data", "data": job_data}
        else:
            return {"type": "message", "text": response_text}
    
    @staticmethod
    def _parse_job_json(text: str) -> Optional[dict]:
        """Try to extract a JSON object from the response text."""
        # Look for ```json ... ``` block
        if "```json" in text:
            try:
                json_str = text.split("```json")[1].split("```")[0].strip()
                return json.loads(json_str)
            except (IndexError, json.JSONDecodeError):
                pass
        
        # Try parsing the entire text as JSON
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        return None
