from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date

class JobPosting(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    zoho_id: Optional[str] = None
    title: str
    description: str
    location: str
    industry: str = "IT Services"
    job_type: str = "Full Time" 
    salary_range: Optional[str] = None
    experience_required: Optional[str] = None
    target_date: date
    # Add more fields as needed: Account Manager, Contact Name etc.
