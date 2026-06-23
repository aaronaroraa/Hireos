import axios from 'axios';

// Ensure this matches FastAPI uvicorn host
let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Automatically append /api/v1 if it is missing (common configuration error)
if (API_URL && !API_URL.endsWith('/api/v1') && !API_URL.endsWith('/api/v1/')) {
    API_URL = API_URL.endsWith('/') ? `${API_URL}api/v1` : `${API_URL}/api/v1`;
}

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear token and redirect to login if session expires
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
