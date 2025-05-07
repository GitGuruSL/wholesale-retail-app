import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiInstance from '../services/api.js'; // Ensure this path is correct

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rolesOptions, setRolesOptions] = useState([]);

    // Fetch roles from the backend
    const fetchRoles = useCallback(async () => {
        if (!apiInstance) {
            console.warn("[AuthContext] apiInstance not available for fetchRoles.");
            return;
        }
        console.log("[AuthContext] Attempting to fetch roles...");
        try {
            // Assuming apiInstance.defaults.baseURL is 'http://localhost:5001/api'
            // So, '/roles' will target 'http://localhost:5001/api/roles'
            const response = await apiInstance.get('/roles');
            if (response.data && Array.isArray(response.data)) {
                const formattedRoles = response.data.map(role => ({
                    value: String(role.id),
                    label: role.name
                }));
                setRolesOptions(formattedRoles);
                setError(null); // Clear role-specific or general error if successful
                console.log('[AuthContext] Roles fetched and formatted:', formattedRoles);
            } else {
                console.warn('[AuthContext] Roles data received is not in the expected array format:', response.data);
                setRolesOptions([]);
                setError("Failed to load roles: Unexpected data format from server.");
            }
        } catch (err) {
            console.error('[AuthContext] Failed to fetch roles:', err.response?.data?.message || err.message, err);
            setRolesOptions([]);
            setError(err.response?.data?.message || "Could not load roles. Please check API connection or endpoint.");
        }
    }, []);

    // Verify token and set user state
    const verifyTokenAndSetUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                // Assuming apiInstance.defaults.baseURL is 'http://localhost:5001/api'
                // So, '/auth/me' will target 'http://localhost:5001/api/auth/me'
                const response = await apiInstance.get('/auth/me');
                setUser(response.data.user || response.data); // Adjust if user object is nested differently
                setIsAuthenticated(true);
                setError(null);
                console.log('[AuthContext] Token verified, user set:', response.data.user || response.data);
            } catch (err) {
                console.error('[AuthContext] Token verification failed:', err.response?.data?.message || err.message);
                localStorage.removeItem('token');
                setUser(null);
                setIsAuthenticated(false);
                // setError("Session expired. Please log in again."); // Optionally set an error
            }
        } else {
            console.log('[AuthContext] No token found for verification.');
            setUser(null);
            setIsAuthenticated(false);
        }
    }, []);

    // Effect for initial application load: verify token AND fetch roles
    useEffect(() => {
        const performInitialLoad = async () => {
            setIsLoading(true);
            await verifyTokenAndSetUser();
            await fetchRoles(); // Fetch roles regardless of auth status initially, or conditionally if preferred
            setIsLoading(false);
        };
        performInitialLoad();
    }, [verifyTokenAndSetUser, fetchRoles]);

    // Login user
    const loginUser = useCallback(async (credentials) => {
        setIsLoading(true);
        setError(null);
        try {
            // Assuming apiInstance.defaults.baseURL is 'http://localhost:5001/api'
            // So, '/auth/login' will target 'http://localhost:5001/api/auth/login'
            const response = await apiInstance.post('/auth/login', credentials);
            const { token, user: userData } = response.data;

            if (token && userData) {
                localStorage.setItem('token', token);
                setUser(userData);
                setIsAuthenticated(true);
                await fetchRoles(); // Re-fetch roles after login
                console.log('[AuthContext] Login successful, user:', userData);
                setIsLoading(false);
                return { success: true, user: userData };
            } else {
                throw new Error("Login response did not include a token or user data.");
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Login failed. Please check credentials.";
            console.error('[AuthContext] Login failed:', errorMessage, err);
            localStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
            setError(errorMessage);
            setIsLoading(false);
            return { success: false, error: errorMessage };
        }
    }, [fetchRoles]); // Added fetchRoles dependency

    // Logout user
    const logout = useCallback(() => {
        console.log('[AuthContext] Attempting to logout...');
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        setRolesOptions([]); // Clear roles on logout
        setError(null); // Clear any errors
        console.log('[AuthContext] User logged out. isAuthenticated:', false, 'User:', null);
        // Navigation to login page should be handled by the component calling logout
        // or by a route guard detecting unauthenticated state.
    }, []);

    // Effect to handle token removal from another tab/window
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'token' && !localStorage.getItem('token')) {
                console.log('[AuthContext] Token removed from storage (external event). Logging out via storage event.');
                logout(); // Call the logout function to ensure all state is reset consistently
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [logout]);

    // Context value
    const value = {
        user,
        isAuthenticated,
        isLoading,
        loginUser,
        logout,
        apiInstance, // Exposing apiInstance can be useful but also consider if components should always go via context methods
        refreshAuth: verifyTokenAndSetUser,
        error,
        setError, // Expose setError for components to potentially set global errors, use with caution
        ROLES_OPTIONS: rolesOptions,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the AuthContext
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};