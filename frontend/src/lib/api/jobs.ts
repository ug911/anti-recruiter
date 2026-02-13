import apiClient from './client';

export interface JobPosting {
    id?: string;
    title: string;
    location: string;
    salary_range: string;
    experience_required: string;
    description: string;
    industry: string;
    job_type: string;
    target_date: string;
}

export const fetchJobs = async (): Promise<JobPosting[]> => {
    const response = await apiClient.get('/jobs/');
    return response.data;
};

export const fetchJobById = async (id: string): Promise<JobPosting> => {
    const response = await apiClient.get(`/jobs/${id}`);
    return response.data;
};

export const createJob = async (job: JobPosting): Promise<any> => {
    const response = await apiClient.post('/jobs/', job);
    return response.data;
};
