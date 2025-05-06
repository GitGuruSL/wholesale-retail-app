import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api'; // Ensure this port is correct

const apiInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Modified Interceptor to log request headers
apiInstance.interceptors.request.use(
  (config) => {
    // Log all headers for debugging. Deep copy headers for reliable logging.
    // Note: 'common' headers in defaults might not show up here if overridden or not applicable to the request type.
    // We are most interested in the final 'Authorization' header.
    console.log('[API Interceptor] Making request to:', config.url);
    console.log('[API Interceptor] Request Headers:', JSON.parse(JSON.stringify(config.headers)));

    // AuthContext is primarily responsible for setting the default Authorization header on apiInstance.
    // This log helps verify if it was set.
    if (config.headers.Authorization) {
      console.log('[API Interceptor] Authorization header found:', config.headers.Authorization);
    } else {
      console.warn('[API Interceptor] Authorization header MISSING for request to:', config.url);
      // As a fallback, you could try to set it from localStorage here if it's missing,
      // but ideally, AuthContext should handle this.
      // const tokenFromStorage = localStorage.getItem('token');
      // if (tokenFromStorage) {
      //   console.log('[API Interceptor] Fallback: Setting Authorization header from localStorage.');
      //   config.headers.Authorization = `Bearer ${tokenFromStorage}`;
      // }
    }
    return config;
  },
  (error) => {
    console.error('[API Interceptor] Request Error:', error);
    return Promise.reject(error);
  }
);

export default apiInstance;