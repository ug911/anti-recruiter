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

export const fetchCandidateById = async (jobId: string, candidateId: string): Promise<any> => {
    const response = await apiClient.get(`/jobs/${jobId}/candidates/${candidateId}`);
    return response.data;
};

export const updateCandidateStatus = async (jobId: string, candidateId: string, status: string): Promise<any> => {
    const response = await apiClient.patch(`/jobs/${jobId}/candidates/${candidateId}/status`, { status });
    return response.data;
};
