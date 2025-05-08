import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiInstance from '../services/api.js'; // Ensure this path is correct

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rolesOptions, setRolesOptions] = useState([]);
    const [userPermissions, setUserPermissions] = useState(new Set()); // For userCan

    // Fetch roles from the backend
    const fetchRoles = useCallback(async () => {
        if (!apiInstance) {
            console.warn("[AuthContext] apiInstance not available for fetchRoles.");
            return;
        }
        console.log("[AuthContext] Attempting to fetch roles...");
        try {
            const response = await apiInstance.get('/roles');
            if (response.data && Array.isArray(response.data)) {
                const formattedRoles = response.data.map(role => ({
                    value: String(role.id),
                    label: role.name
                }));
                setRolesOptions(formattedRoles);
                setError(null);
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

    // Helper to set user data and permissions
    const processUserData = (userData) => {
        setUser(userData);
        setIsAuthenticated(true);
        if (userData && Array.isArray(userData.permissions)) {
            setUserPermissions(new Set(userData.permissions));
            console.log('[AuthContext] User permissions set:', userData.permissions);
        } else {
            setUserPermissions(new Set());
            console.warn('[AuthContext] User data does not contain a permissions array. userCan will always return false.');
        }
        setError(null);
    };

    // Verify token and set user state
    const verifyTokenAndSetUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const response = await apiInstance.get('/auth/me');
                // Assuming response.data or response.data.user contains the user object with a 'permissions' array
                const userData = response.data.user || response.data; 
                processUserData(userData);
                console.log('[AuthContext] Token verified, user set:', userData);
            } catch (err) {
                console.error('[AuthContext] Token verification failed:', err.response?.data?.message || err.message);
                localStorage.removeItem('token');
                setUser(null);
                setIsAuthenticated(false);
                setUserPermissions(new Set());
            }
        } else {
            console.log('[AuthContext] No token found for verification.');
            setUser(null);
            setIsAuthenticated(false);
            setUserPermissions(new Set());
        }
    }, []);

    // Effect for initial application load: verify token AND fetch roles
    useEffect(() => {
        const performInitialLoad = async () => {
            setIsLoading(true);
            await verifyTokenAndSetUser();
            await fetchRoles(); 
            setIsLoading(false);
        };
        performInitialLoad();
    }, [verifyTokenAndSetUser, fetchRoles]);

    // Login user
    const loginUser = useCallback(async (credentials) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiInstance.post('/auth/login', credentials);
            const { token, user: userDataFromLogin } = response.data;

            if (token && userDataFromLogin) {
                localStorage.setItem('token', token);
                processUserData(userDataFromLogin); // Use helper to set user and permissions
                await fetchRoles(); 
                console.log('[AuthContext] Login successful, user:', userDataFromLogin);
                setIsLoading(false);
                return { success: true, user: userDataFromLogin };
            } else {
                throw new Error("Login response did not include a token or user data.");
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Login failed. Please check credentials.";
            console.error('[AuthContext] Login failed:', errorMessage, err);
            localStorage.removeItem('token');
            setUser(null);
            setIsAuthenticated(false);
            setUserPermissions(new Set());
            setError(errorMessage);
            setIsLoading(false);
            return { success: false, error: errorMessage };
        }
    }, [fetchRoles]);

    // Logout user
    const logout = useCallback(() => {
        console.log('[AuthContext] Attempting to logout...');
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        setRolesOptions([]); 
        setUserPermissions(new Set()); // Clear permissions on logout
        setError(null); 
        console.log('[AuthContext] User logged out. isAuthenticated:', false, 'User:', null);
    }, []);

    // Effect to handle token removal from another tab/window
    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'token' && !localStorage.getItem('token')) {
                console.log('[AuthContext] Token removed from storage (external event). Logging out via storage event.');
                logout(); 
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [logout]);

    // userCan function
    const userCan = useCallback((permission) => {
        if (!isAuthenticated || !permission) {
            return false;
        }
        return userPermissions.has(permission);
    }, [isAuthenticated, userPermissions]);

    // Context value
    const value = {
        user,
        isAuthenticated,
        isLoading,
        loginUser,
        logout,
        apiInstance, 
        refreshAuth: verifyTokenAndSetUser,
        error,
        setError, 
        ROLES_OPTIONS: rolesOptions,
        userCan, // Added userCan to the context value
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
    if (context === null) { // Check for null, not undefined, as createContext(null)
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};