import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Define your API base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api'; // Adjust if your backend runs on a different port

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [roles, setRoles] = useState([]); // Array of role names or objects
    const [permissions, setPermissions] = useState([]); // Array of permission strings
    const [isLoading, setIsLoading] = useState(true); // For initial auth check
    const [authError, setAuthError] = useState(null);
    const navigate = useNavigate();

    // Create an Axios instance for API calls
    const apiInstance = useCallback(axios.create({
        baseURL: API_BASE_URL,
    }), []);

    // Request interceptor to add the token to headers
    useEffect(() => {
        const requestInterceptor = apiInstance.interceptors.request.use(
            (config) => {
                const currentToken = localStorage.getItem('token'); // Get fresh token
                if (currentToken) {
                    config.headers['Authorization'] = `Bearer ${currentToken}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );
        return () => {
            apiInstance.interceptors.request.eject(requestInterceptor);
        };
    }, [apiInstance]);


    // Response interceptor to handle 401 errors (e.g., token expired)
    useEffect(() => {
        const responseInterceptor = apiInstance.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true; // Mark to prevent infinite loops
                    console.error("AuthContext: Received 401 Unauthorized. Token might be invalid or expired.");
                    // Here you could try to refresh the token if you have a refresh token mechanism
                    // For now, we'll just log out.
                    await logout(false); // Pass false to prevent navigation if already navigating
                    setAuthError("Your session has expired. Please log in again.");
                    if (window.location.pathname !== '/login') {
                         navigate('/login', { state: { message: "Session expired. Please log in." } });
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => {
            apiInstance.interceptors.response.eject(responseInterceptor);
        };
    }, [apiInstance, navigate]);


    const fetchUserAndPermissions = useCallback(async (currentToken) => {
        if (!currentToken) {
            setIsLoading(false);
            return;
        }
        try {
            // Ensure token is set for this specific call if it wasn't by interceptor yet
            // (though interceptor should handle it)
            const headers = { Authorization: `Bearer ${currentToken}` };
            const response = await apiInstance.get('/auth/me', { headers }); // Endpoint to get current user details, roles, and permissions
            
            const userData = response.data.user; // Assuming user details are in response.data.user
            const userRoles = response.data.roles || []; // Assuming roles are an array of strings or objects
            const userPermissions = response.data.permissions || []; // Assuming permissions are an array of strings

            setUser(userData);
            setRoles(userRoles);
            setPermissions(userPermissions);
            setAuthError(null);
        } catch (error) {
            console.error("AuthContext: Failed to fetch user data or permissions", error.response?.data || error.message);
            // If fetching user fails (e.g. token invalid), clear auth state
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setRoles([]);
            setPermissions([]);
            setAuthError(error.response?.data?.message || "Failed to verify session.");
        } finally {
            setIsLoading(false);
        }
    }, [apiInstance]);

    // Effect to run on initial app load to check for existing token
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
            fetchUserAndPermissions(storedToken);
        } else {
            setIsLoading(false); // No token, so not loading user data
        }
    }, [fetchUserAndPermissions]);


    const login = async (credentials) => {
        setIsLoading(true);
        setAuthError(null);
        try {
            const response = await apiInstance.post('/auth/login', credentials);
            const { token: newToken, user: loggedInUser, roles: userRoles, permissions: userPermissions } = response.data;

            localStorage.setItem('token', newToken);
            setToken(newToken);
            setUser(loggedInUser);
            setRoles(userRoles || []);
            setPermissions(userPermissions || []);
            setIsLoading(false);
            navigate('/dashboard', { state: { message: 'Login successful!' } }); // Navigate to dashboard or desired page
            return true;
        } catch (error) {
            console.error("AuthContext: Login failed", error.response?.data || error.message);
            const errorMessage = error.response?.data?.message || "Login failed. Please check your credentials.";
            setAuthError(errorMessage);
            setIsLoading(false);
            return false;
        }
    };

    const logout = useCallback(async (shouldNavigate = true) => {
        setUser(null);
        setToken(null);
        setRoles([]);
        setPermissions([]);
        localStorage.removeItem('token');
        setAuthError(null); // Clear any previous auth errors
        // No need to explicitly remove header from apiInstance if using interceptors correctly,
        // as the interceptor won't find a token in localStorage.
        if (shouldNavigate && window.location.pathname !== '/login') {
            navigate('/login', { state: { message: "You have been logged out." } });
        }
    }, [navigate]);

    // Function to refresh roles/permissions if needed from other parts of the app
    const refreshAuthData = useCallback(async () => {
        const currentToken = localStorage.getItem('token');
        if (currentToken) {
            setIsLoading(true); // Show loading while refreshing
            await fetchUserAndPermissions(currentToken);
        }
    }, [fetchUserAndPermissions]);


    const hasPermission = useCallback((requiredPermissions) => {
        if (!requiredPermissions || requiredPermissions.length === 0) return true; // No specific permission needed
        if (!permissions || permissions.length === 0) return false; // User has no permissions

        const userPermsSet = new Set(permissions);
        if (Array.isArray(requiredPermissions)) {
            return requiredPermissions.every(p => userPermsSet.has(p));
        }
        return userPermsSet.has(requiredPermissions); // Single permission string
    }, [permissions]);

    const hasRole = useCallback((requiredRoles) => {
        if (!requiredRoles || requiredRoles.length === 0) return true;
        if (!roles || roles.length === 0) return false;

        // Assuming roles is an array of role name strings.
        // If roles are objects, adjust accordingly (e.g., roles.map(r => r.name))
        const userRolesSet = new Set(roles);
        if (Array.isArray(requiredRoles)) {
            return requiredRoles.some(r => userRolesSet.has(r)); // Use 'some' if user needs ANY of the roles
            // return requiredRoles.every(r => userRolesSet.has(r)); // Use 'every' if user needs ALL of the roles
        }
        return userRolesSet.has(requiredRoles);
    }, [roles]);


    const value = {
        user,
        token,
        roles,
        permissions,
        isLoading,
        authError,
        apiInstance,
        login,
        logout,
        refreshAuthData,
        hasPermission,
        hasRole,
        setAuthError // Allow components to clear auth errors if needed
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};