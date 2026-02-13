from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.models.job import JobPosting
from app.services.zoho_jobs import ZohoJobService

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/", response_model=dict)
def create_job(job: JobPosting):
    try:
        zoho_id = ZohoJobService.create_job(job.dict())
        return {"id": zoho_id, "message": "Job created in Zoho Recruit"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/", response_model=List[dict])
def read_jobs():
    try:
        jobs = ZohoJobService.get_jobs()
        return jobs
    except Exception as e:
        # If token expired or not logged in, return empty or error
        print(f"Zoho Fetch Error: {e}") 
        return []

@router.get("/{job_id}/candidates", response_model=List[dict])
def read_job_candidates(job_id: str):
    return ZohoJobService.get_associated_candidates(job_id)

@router.get("/{job_id}", response_model=dict)
def read_job(job_id: str):
    job = ZohoJobService.get_job_details(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
