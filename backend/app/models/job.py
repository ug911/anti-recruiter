from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import date

class JobPosting(SQLModel, table=False):
    # We use table=False because we are not storing this in our local DB anymore.
    # It is just a Pydantic model for validation.
    
    id: Optional[str] = None
    title: str
    description: str
    location: str
    industry: str = "IT Services"
    job_type: str = "Full Time" 
    salary_range: Optional[str] = None
    experience_required: Optional[str] = None
    target_date: date
    # Add more fields as needed: Account Manager, Contact Name etc.
