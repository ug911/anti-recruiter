from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlmodel import Session
from app.database import engine
from app.models.job import JobPosting
from app.services.zoho_jobs import ZohoJobService

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/", response_model=dict)
def create_job(job: JobPosting):
    try:
        # 1. Create in Zoho Recruit
        zoho_id = ZohoJobService.create_job(job.model_dump())
        
        # 2. Persist to PostgreSQL
        with Session(engine) as session:
            job.zoho_id = zoho_id
            session.add(job)
            session.commit()
            session.refresh(job)
            
        return {
            "id": zoho_id, 
            "db_id": job.id,
            "message": "Job created in Zoho Recruit and persisted to PostgreSQL"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[dict])
def read_jobs():
    try:
        jobs = ZohoJobService.get_jobs()
        return jobs
    except Exception as e:
        print(f"DEBUG: Zoho Fetch Error in router: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Zoho API Error: {str(e)}")

@router.get("/{job_id}/candidates", response_model=List[dict])
def read_job_candidates(job_id: str):
    return ZohoJobService.get_associated_candidates(job_id)

@router.get("/{job_id}", response_model=dict)
def read_job(job_id: str):
    job = ZohoJobService.get_job_details(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
