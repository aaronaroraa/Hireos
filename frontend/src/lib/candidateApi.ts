import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
if (API_URL && !API_URL.endsWith('/api/v1') && !API_URL.endsWith('/api/v1/')) {
    API_URL = API_URL.endsWith('/') ? `${API_URL}api/v1` : `${API_URL}/api/v1`;
}

// Separate axios instance for the candidate portal — uses its own token
// and redirects to the portal login (not the admin login) on 401.
export const candidateApi = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
});

candidateApi.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('candidate_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

candidateApi.interceptors.response.use(
    (r) => r,
    (error) => {
        if (error.response?.status === 401) {
            sessionStorage.removeItem('candidate_token');
            if (!window.location.pathname.startsWith('/portal/login')) {
                window.location.href = '/portal/login';
            }
        }
        return Promise.reject(error);
    }
);
