import requests
from app.services.zoho_auth import ZohoAuthService

ZOHO_API_BASE = "https://recruit.zoho.com/recruit/v2"

class ZohoJobService:
    @staticmethod
    def _get_headers(force_refresh=False):
        token = ZohoAuthService.get_access_token(force_refresh=force_refresh)
        if not token:
            raise Exception("No active Zoho token. Please login.")
        return {
            "Authorization": f"Zoho-oauthtoken {token}",
            "Content-Type": "application/json"
        }

    @staticmethod
    def _make_request(method, url, **kwargs):
        # Initial attempt
        headers = ZohoJobService._get_headers()
        response = requests.request(method, url, headers=headers, **kwargs)
        
        # If unauthorized, refresh and retry once
        if response.status_code == 401:
            headers = ZohoJobService._get_headers(force_refresh=True)
            response = requests.request(method, url, headers=headers, **kwargs)
            
        return response

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
        
        response = ZohoJobService._make_request("POST", url, json=payload)
        if response.status_code in [200, 201]:
             data = response.json()
             if data.get('data') and data['data'][0]['status'] == 'success':
                  return data['data'][0]['details']['id'] # Return Zoho Record ID
        
        raise Exception(f"Zoho Create Failed: {response.text}")

    @staticmethod
    def get_jobs():
        url = f"{ZOHO_API_BASE}/JobOpenings"
        # Include Client_Name and Job_Opening_Status
        params = {"fields": "id,Posting_Title,City,Job_Opening_Status,Salary,Industry,Job_Type,Target_Date,Job_Description,Client_Name"} 
        response = ZohoJobService._make_request("GET", url, params=params)
        
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
                    "client_name": item.get("Client_Name").get("name") if isinstance(item.get("Client_Name"), dict) else item.get("Client_Name"),
                    "status": item.get("Job_Opening_Status"),
                })
            return jobs
        if response.status_code == 204: # Zoho 'No Content'
            return []
        raise Exception(f"Zoho API Error: {response.status_code} - {response.text}")

    @staticmethod
    def archive_job(job_id: str):
        url = f"{ZOHO_API_BASE}/JobOpenings/{job_id}"
        payload = {
            "data": [
                {
                    "Job_Opening_Status": "Cancelled" # Or "Archived" if custom, using Cancelled as standard
                }
            ]
        }
        response = ZohoJobService._make_request("PUT", url, json=payload)
        if response.status_code == 200:
            data = response.json()
            if data.get("data") and data["data"][0]["status"] == "success":
                return True
        raise Exception(f"Failed to archive job in Zoho: {response.text}")

    @staticmethod
    def get_job_details(job_id: str):
        url = f"{ZOHO_API_BASE}/JobOpenings/{job_id}"
        response = ZohoJobService._make_request("GET", url)
        if response.status_code == 200:
            data = response.json()
            if data.get("data"):
                return data["data"][0]
        return None

    @staticmethod
    def get_associated_candidates(job_id: str):
        # Use the correct related list endpoint for associated candidates
        url = f"{ZOHO_API_BASE}/Job_Openings/{job_id}/associate"
        response = ZohoJobService._make_request("GET", url)
        
        if response.status_code == 200:
            data = response.json()
            candidates = []
            for item in data.get("data", []):
                candidates.append({
                    "id": item.get("id"),
                    "first_name": item.get("First_Name"),
                    "last_name": item.get("Last_Name"),
                    "email": item.get("Email"),
                    "phone": item.get("Phone") or item.get("Mobile"),
                    "status": item.get("Application_Status") or item.get("Candidate_Stage") or "Applied",
                    "applied_date": item.get("Created_Time", "").split('T')[0],
                    "resume_url": item.get("resume_url"), # Note: Resume handle might require extra API calls
                    "job_id": job_id
                })
            return candidates
        return []

    @staticmethod
    def get_candidate_details(candidate_id: str):
        url = f"{ZOHO_API_BASE}/Candidates/{candidate_id}"
        response = ZohoJobService._make_request("GET", url)
        if response.status_code == 200:
            data = response.json()
            if data.get("data"):
                # Return raw Zoho data, mapping can be done in router or frontend if needed
                return data["data"][0]
        return None

    @staticmethod
    def update_candidate_status(job_id: str, candidate_id: str, status: str):
        # For associated candidates, the most reliable way is often updating via the association endpoint
        # or updating the 'Application_Status' if that's what we're filtering on.
        # We'll try updating both the association status and the candidate record.
        
        # 1. Update Candidate record
        url = f"{ZOHO_API_BASE}/Candidates/{candidate_id}"
        payload = {
            "data": [
                {
                    "Application_Status": status,
                    "Candidate_Stage": status # Sync both fields for safety
                }
            ]
        }
        res1 = ZohoJobService._make_request("PUT", url, json=payload)
        print(f"DEBUG: Candidate update response: {res1.status_code} - {res1.text}")

        # 2. Update Association status (this is often the one used in Kanban)
        # Zoho association update payload typically looks like this
        url_assoc = f"{ZOHO_API_BASE}/Job_Openings/{job_id}/associate"
        payload_assoc = {
            "data": [
                {
                    "id": candidate_id,
                    "Status": status # For association records, the field is often simply 'Status'
                }
            ]
        }
        response_assoc = ZohoJobService._make_request("PUT", url_assoc, json=payload_assoc)
        print(f"DEBUG: Association update response: {response_assoc.status_code} - {response_assoc.text}")
        
        if response_assoc.status_code == 200:
             return True

        raise Exception(f"Failed to update status in Zoho: {response_assoc.text}")

    @staticmethod
    def get_job_apply_url(job_id: str):
        # In a real scenario, you might query the "Publish" module or construct it
        # For now, we construct a hypothetical Career Page URL based on ID
        return f"https://jobs.zoho.com/recruit/careers/demo_company/job-details/{job_id}"
