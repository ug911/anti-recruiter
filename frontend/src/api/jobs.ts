import api from './client';

export interface JobPosting {
    id?: string;
    title: string;
    description: string;
    location: string;
    salary_range?: string;
    experience_required?: string;
}

export const fetchJobs = async () => {
    const response = await api.get<JobPosting[]>('/jobs/');
    return response.data;
};

export const createJob = async (job: JobPosting) => {
    const response = await api.post<{ id: string, message: string }>('/jobs/', job);
    return response.data;
};
