// filepath: d:\Development\wholesale-retail-app\frontend\src\services\api.js
import axios from 'axios';

// This line reads the VITE_API_URL from your frontend/.env file
// It falls back to 'http://localhost:5001/api' if VITE_API_URL is not set,
// but it's best to have it explicitly in .env
const VITE_API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

console.log('API Base URL configured to:', VITE_API_URL); // For debugging

const apiInstance = axios.create({
    baseURL: VITE_API_URL,
});

apiInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

apiInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Response Error:', error.response?.data || error.message || error);

        if (error.response && error.response.status === 401) {
            console.warn('Unauthorized (401) response detected. Logging out.');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.dispatchEvent(new CustomEvent('auth-error-401'));
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default apiInstance;