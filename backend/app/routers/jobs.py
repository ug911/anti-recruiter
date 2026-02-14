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
@router.get("/{job_id}/candidates/{candidate_id}", response_model=dict)
def read_candidate_details(job_id: str, candidate_id: str):
    candidate = ZohoJobService.get_candidate_details(candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate

@router.patch("/{job_id}/candidates/{candidate_id}/status", response_model=dict)
def update_candidate_status(job_id: str, candidate_id: str, status_update: dict):
    status = status_update.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Missing status in request body")
    
    try:
        ZohoJobService.update_candidate_status(job_id, candidate_id, status)
        return {"message": "Status updated successfully", "status": status}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
@router.patch("/{job_id}/archive", response_model=dict)
def archive_job(job_id: str):
    try:
        ZohoJobService.archive_job(job_id)
        return {"message": "Job archived successfully", "id": job_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
