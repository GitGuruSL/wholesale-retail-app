import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const apiInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor to add the token to every request
apiInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
            console.log('[API Interceptor] Token added to request headers.');
        } else {
            console.warn('[API Interceptor] No token found to add to request headers.');
        }
        return config;
    },
    (error) => {
        console.error('[API Interceptor] Request error:', error);
        return Promise.reject(error);
    }
);

// Response Interceptor for handling common errors like 401
apiInstance.interceptors.response.use(
    (response) => response, // Simply return the response if it's successful
    (error) => {
        console.error('[API Interceptor] Response error:', error.response || error.message);
        if (error.response && error.response.status === 401) {
            console.error('[API Interceptor] Unauthorized (401). Token might be invalid, expired, or not provided correctly.');
            // Optionally, you could trigger a logout or token refresh mechanism here
            // For example, by emitting an event or calling a logout function from AuthContext
            // if AuthContext was imported here (can lead to circular dependencies, handle carefully)
            // localStorage.removeItem('token');
            // window.location.href = '/login'; // Force redirect - can be disruptive
        }
        return Promise.reject(error);
    }
);

export default apiInstance;