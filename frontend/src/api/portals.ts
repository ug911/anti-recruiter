import api from './client';

export const fetchPortals = async () => {
    const response = await api.get<string[]>('/portals/');
    return response.data;
};

export const postJobToPortals = async (jobId: string, portals: string[]) => {
    const response = await api.post(`/portals/post/${jobId}`, portals);
    return response.data;
};
