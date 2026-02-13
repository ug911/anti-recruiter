import requests
from app.services.zoho_auth import ZohoAuthService

ZOHO_API_BASE = "https://recruit.zoho.in/recruit/v2"

class ZohoJobService:
    @staticmethod
    def _get_headers():
        token = ZohoAuthService.get_access_token()
        if not token:
            # In a real app, try refresh token here
            raise Exception("No active Zoho token. Please login.")
        return {
            "Authorization": f"Zoho-oauthtoken {token}",
            "Content-Type": "application/json"
        }

    @staticmethod
    def create_job(job_data: dict):
        # MOCK MODE FOR TESTING WITHOUT CREDENTIALS
        return "mock_zoho_id_12345"

        url = f"{ZOHO_API_BASE}/JobOpenings"
        # ... (rest of real implementation)
        # Map our simple form data to Zoho's Expected Payload
        # Note: Field names 'Posting_Title' etc are Zoho specific (API names)
        payload = {
            "data": [
                {
                    "Posting_Title": job_data.get("title"),
                    "City": job_data.get("location"),
                    "Salary": job_data.get("salary_range"),
                    "Work_Experience": job_data.get("experience_required"),
                    "Job_Description": job_data.get("description"),
                    "Industry": job_data.get("industry"),
                    "Job_Type": job_data.get("job_type"),
                    "Target_Date": job_data.get("target_date"), # Ensure ISO format YYYY-MM-DD
                    "Job_Opening_Status": "In-progress",
                    # Add default mandatory fields if any
                }
            ]
        }
        
        response = requests.post(url, headers=ZohoJobService._get_headers(), json=payload)
        if response.status_code in [200, 201]:
             data = response.json()
             if data['data'][0]['status'] == 'success':
                 return data['data'][0]['details']['id'] # Return Zoho Record ID
        
        # Determine error
        raise Exception(f"Zoho Create Failed: {response.text}")

    @staticmethod
    def get_jobs():
        # MOCK MODE
        return [{
            "id": "mock_zoho_id_12345",
            "title": "Mock Software Engineer (Zoho)",
            "location": "Remote",
            "salary_range": "$100k - $120k",
            "industry": "IT Software",
            "job_type": "Full Time",
            "target_date": "2026-12-31",
            "description": "This is a mock job returned from Zoho Service",
        }]

        url = f"{ZOHO_API_BASE}/JobOpenings"
        params = {"fields": "id,Posting_Title,City,Job_Opening_Status,Salary"} 
        response = requests.get(url, headers=ZohoJobService._get_headers(), params=params)
        
        if response.status_code == 200:
            data = response.json()
            # Map back to our frontend model
            jobs = []
            for item in data.get("data", []):
                jobs.append({
                    "id": item.get("id"),
                    "title": item.get("Posting_Title"),
                    "location": item.get("City"),
                    "salary_range": item.get("Salary"),
                    "industry": item.get("Industry"),
                    "job_type": item.get("Job_Type"),
                    "target_date": item.get("Target_Date"),
                    "description": "Fetched from Zoho", # Description might be heavy, load on detail view
                })
            return jobs
        return []

    @staticmethod
    def get_job_details(job_id: str):
        # MOCK MODE
        return {
            "id": job_id,
            "Posting_Title": "Mock Job Details",
            "City": "Mock City",
            "Job_Description": "Mock Description"
        }

    @staticmethod
    def get_associated_candidates(job_id: str):
        # MOCK MODE
        return [
            {
                "id": "cand_001",
                "first_name": "Alice",
                "last_name": "Smith",
                "email": "alice@example.com",
                "phone": "555-0100",
                "status": "Applied",
                "resume_url": "http://example.com/resume.pdf",
                "applied_date": "2026-02-01"
            },
            {
                "id": "cand_002",
                "first_name": "Bob",
                "last_name": "Jones",
                "email": "bob@example.com",
                "phone": "555-0101",
                "status": "Interview",
                "resume_url": "http://example.com/resume2.pdf",
                "applied_date": "2026-02-05"
            }
        ]
        
        # Real Implementation Note:
        # Use `getAssociatedRecords` API: /recruit/v2/JobOpenings/{id}/Candidates
        response = requests.get(url, headers=ZohoJobService._get_headers())
        if response.status_code == 200:
             data = response.json()
             return data['data'][0]
        return None

    @staticmethod
    def get_job_apply_url(job_id: str):
        # In a real scenario, you might query the "Publish" module or construct it
        # For now, we construct a hypothetical Career Page URL based on ID
        return f"https://jobs.zoho.in/recruit/careers/demo_company/job-details/{job_id}"
