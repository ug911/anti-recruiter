import apiClient from './client';

export interface JobPosting {
    id: string;
    title: string;
    description: string;
    location: string;
    salary_range?: string;
    experience_required?: string;
    industry?: string;
    job_type?: string;
    target_date?: string;
    client_name?: string;
    status?: string;
}

export const fetchJobs = async (): Promise<JobPosting[]> => {
    const response = await apiClient.get('/jobs/');
    return response.data;
};

export const fetchJobById = async (id: string): Promise<JobPosting> => {
    const response = await apiClient.get(`/jobs/${id}`);
    return response.data;
};

export const createJob = async (job: Omit<JobPosting, 'id'>) => {
    const response = await apiClient.post('/jobs/', job);
    return response.data;
};

export const archiveJob = async (id: string) => {
    const response = await apiClient.patch(`/jobs/${id}/archive`);
    return response.data;
};
