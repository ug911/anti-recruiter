import os
import sys
from datetime import date
from sqlmodel import Session, select

# Add the parent directory to sys.path to import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database import engine
from app.models.job import JobPosting
from app.services.zoho_jobs import ZohoJobService

def verify_workflow():
    print("--- Starting End-to-End Workflow Verification ---")
    
    # 1. Prepare test job data
    test_job_data = {
        "title": "E2E Test Engineer (System Check)",
        "description": "This is a dummy job created to verify the end-to-end integration of Zoho Recruit and PostgreSQL.",
        "location": "Bangalore, India",
        "industry": "IT Services",
        "job_type": "Full Time",
        "salary_range": "₹15L - ₹25L",
        "experience_required": "3-5 years",
        "target_date": date.today()
    }
    
    # We create the model instance later to avoid mixing data types (date vs str) if necessary,
    # but JobPosting expects date object for target_date.
    
    print("\n[1/3] Posting job to Zoho Recruit...")
    try:
        # Service expects target_date as string in ISO format for the API payload
        api_data = test_job_data.copy()
        api_data['target_date'] = api_data['target_date'].isoformat()
        
        zoho_id = ZohoJobService.create_job(api_data)
        print(f"✅ Successfully created job in Zoho Recruit. Zoho ID: {zoho_id}")
    except Exception as e:
        print(f"❌ Failed to create job in Zoho Recruit: {e}")
        return

    print("\n[2/3] Verifying PostgreSQL persistence...")
    try:
        with Session(engine) as session:
            test_job_model = JobPosting(**test_job_data)
            test_job_model.zoho_id = zoho_id
            session.add(test_job_model)
            session.commit()
            session.refresh(test_job_model)
            db_id = test_job_model.id
            
        print(f"✅ Successfully persisted job to PostgreSQL. Database ID: {db_id}")
        
        # Verify it can be queried back from DB
        with Session(engine) as session:
            db_job = session.exec(select(JobPosting).where(JobPosting.id == db_id)).first()
            if db_job and db_job.zoho_id == zoho_id:
                print(f"✅ Verified: Job exists in DB with correct Zoho ID.")
            else:
                print("❌ Failed to verify job in DB.")
    except Exception as e:
        print(f"❌ Database error: {e}")
        # Not returning here to try step 3 anyway
    
    print("\n[3/3] Verifying retrieval from Zoho API...")
    try:
        jobs = ZohoJobService.get_jobs()
        found = False
        for job in jobs:
            if job['id'] == zoho_id:
                found = True
                print(f"✅ Successfully fetched the new job from Zoho API.")
                print(f"   Title: {job['title']}, Location: {job['location']}")
                break
        
        if not found:
            print("❌ Created job was not found in the list fetched from Zoho API.")
    except Exception as e:
        print(f"❌ Retrieval error: {e}")

    print("\n--- Verification Complete ---")

if __name__ == "__main__":
    verify_workflow()
