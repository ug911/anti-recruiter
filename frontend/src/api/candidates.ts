import api from './client';

export interface Candidate {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    status: string;
    resume_url?: string;
    applied_date: string;
}

export const fetchCandidates = async (jobId: string) => {
    const response = await api.get<Candidate[]>(`/jobs/${jobId}/candidates`);
    return response.data;
};
