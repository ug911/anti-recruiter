from sqlmodel import SQLModel, Field

class Candidate(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    zoho_id: Optional[str] = None
    job_id: int = Field(foreign_key="jobposting.id")
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    status: str # ATS Status (e.g., "Applied", "Interviewer", "Hired")
    resume_url: Optional[str] = None
    applied_date: str
