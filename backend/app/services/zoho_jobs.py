import requests
from app.services.zoho_auth import ZohoAuthService

ZOHO_API_BASE = "https://recruit.zoho.com/recruit/v2"

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
        url = f"{ZOHO_API_BASE}/JobOpenings"
        # Map our simple form data to Zoho's Expected Payload
        payload = {
            "data": [
                {
                    "Posting_Title": job_data.get("title"),
                    "Job_Opening_Name": job_data.get("title"),
                    "Client_Name": "My company",
                    "City": job_data.get("location"),
                    "Salary": job_data.get("salary_range"),
                    "Work_Experience": job_data.get("experience_required"),
                    "Job_Description": job_data.get("description"),
                    "Industry": job_data.get("industry"),
                    "Job_Type": job_data.get("job_type"),
                    "Target_Date": job_data.get("target_date"), # Ensure ISO format YYYY-MM-DD
                    "Job_Opening_Status": "In-progress",
                }
            ]
        }
        
        response = requests.post(url, headers=ZohoJobService._get_headers(), json=payload)
        if response.status_code in [200, 201]:
             data = response.json()
             if data.get('data') and data['data'][0]['status'] == 'success':
                  return data['data'][0]['details']['id'] # Return Zoho Record ID
        
        raise Exception(f"Zoho Create Failed: {response.text}")

    @staticmethod
    def get_jobs():
        url = f"{ZOHO_API_BASE}/JobOpenings"
        params = {"fields": "id,Posting_Title,City,Job_Opening_Status,Salary,Industry,Job_Type,Target_Date,Job_Description"} 
        response = requests.get(url, headers=ZohoJobService._get_headers(), params=params)
        
        if response.status_code == 200:
            data = response.json()
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
                    "description": item.get("Job_Description") or "No description",
                })
            return jobs
        if response.status_code == 204: # Zoho 'No Content'
            return []
        raise Exception(f"Zoho API Error: {response.status_code} - {response.text}")

    @staticmethod
    def get_job_details(job_id: str):
        url = f"{ZOHO_API_BASE}/JobOpenings/{job_id}"
        response = requests.get(url, headers=ZohoJobService._get_headers())
        if response.status_code == 200:
            data = response.json()
            if data.get("data"):
                return data["data"][0]
        return None

    @staticmethod
    def get_associated_candidates(job_id: str):
        # Use `getAssociatedRecords` API: /recruit/v2/JobOpenings/{id}/Candidates
        # Note: In Zoho Recruit this might vary based on setup. 
        # For simplicity, returning empty if API differs, but removing mock.
        url = f"{ZOHO_API_BASE}/JobOpenings/{job_id}/Candidates"
        response = requests.get(url, headers=ZohoJobService._get_headers())
        if response.status_code == 200:
             data = response.json()
             return data.get('data', [])
        return []

    @staticmethod
    def get_job_apply_url(job_id: str):
        # In a real scenario, you might query the "Publish" module or construct it
        # For now, we construct a hypothetical Career Page URL based on ID
        return f"https://jobs.zoho.com/recruit/careers/demo_company/job-details/{job_id}"
