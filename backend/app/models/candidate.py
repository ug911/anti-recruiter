from sqlmodel import SQLModel
from typing import Optional

class Candidate(SQLModel, table=False):
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    status: str # ATS Status (e.g., "Applied", "Interviewer", "Hired")
    resume_url: Optional[str] = None
    applied_date: str
