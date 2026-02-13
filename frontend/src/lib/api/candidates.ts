import apiClient from './client';

export interface Candidate {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    status: string;
    applied_date: string;
    resume_url?: string;
    job_id: string;
}

export const fetchCandidates = async (jobId: string): Promise<Candidate[]> => {
    const response = await apiClient.get(`/jobs/${jobId}/candidates`);
    return response.data;
};
