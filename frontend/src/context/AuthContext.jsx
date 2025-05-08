import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiInstance from '../services/api.js'; // Ensure this path is correct

const AuthContext = createContext(null);

// The formatRoleNameForDisplay helper function is NO LONGER NEEDED here.
// You can remove it.
// const formatRoleNameForDisplay = (roleName) => { ... };

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rolesOptions, setRolesOptions] = useState([]);

    const fetchRoles = useCallback(async () => {
        if (!apiInstance) {
            console.warn("[AuthContext] apiInstance not available for fetchRoles.");
            setRolesOptions([]);
            return;
        }
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('[AuthContext fetchRoles] No token found, skipping fetchRoles.');
            setRolesOptions([]);
            return;
        }

        console.log("[AuthContext fetchRoles] Attempting to fetch roles...");
        try {
            // Backend now returns roles like: [{id: 1, name: 'global_admin', display_name: 'Global Admin'}, ...]
            const response = await apiInstance.get('/roles');
            console.log('[AuthContext fetchRoles] Raw Roles API Response:', JSON.stringify(response.data, null, 2));
            
            if (response.data && Array.isArray(response.data)) {
                const formattedRoles = response.data.map(role => ({
                    value: String(role.id),       // Use the integer ID from DB as value
                    label: role.display_name,     // Use the new display_name directly from DB
                    machineName: role.name        // Keep original machine name for any internal logic
                }));
                setRolesOptions(formattedRoles);
                console.log('[AuthContext fetchRoles] Roles fetched and formatted using display_name. rolesOptions set to:', JSON.stringify(formattedRoles, null, 2));
            } else {
                console.warn('[AuthContext fetchRoles] Roles data received is empty, not an array, or in unexpected format:', response.data);
                setRolesOptions([]);
            }
        } catch (err) {
            console.error('[AuthContext fetchRoles] Failed to fetch roles:', err.response?.data?.message || err.message, err);
            setRolesOptions([]);
        }
    }, []); // Dependencies are stable

    const verifyTokenAndSetUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                console.log('[AuthContext] Verifying token...');
                const response = await apiInstance.get('/auth/me');
                setUser(response.data.user || response.data);
                setIsAuthenticated(true);
                setError(null);
                console.log('[AuthContext] Token verified, user set:', response.data.user || response.data);
                return true;
            } catch (err) {
                console.error('[AuthContext] Token verification failed:', err.response?.data?.message || err.message);
                localStorage.removeItem('token');
                setUser(null);
                setIsAuthenticated(false);
                setRolesOptions([]);
                return false;
            }
        } else {
            console.log('[AuthContext] No token found for verification.');
            setUser(null);
            setIsAuthenticated(false);
            setRolesOptions([]);
            return false;
        }
    }, []);

    useEffect(() => {
        const performInitialLoad = async () => {
            setIsLoading(true);
            console.log('[AuthContext InitialLoad] Starting...');
            const authenticated = await verifyTokenAndSetUser();
            console.log('[AuthContext InitialLoad] verifyTokenAndSetUser completed. Authenticated:', authenticated);
            if (authenticated) {
                console.log('[AuthContext InitialLoad] User is authenticated. Calling fetchRoles...');
                await fetchRoles();
            } else {
                console.log('[AuthContext InitialLoad] User NOT authenticated. Skipping fetchRoles.');
            }
            setIsLoading(false);
            console.log('[AuthContext InitialLoad] Finished.');
        };
        performInitialLoad();
    }, [verifyTokenAndSetUser, fetchRoles]);

    const loginUser = useCallback(async (credentials) => {
        setIsLoading(true);
        setError(null);
        try {
            console.log('[AuthContext loginUser] Attempting login...');
            const response = await apiInstance.post('/auth/login', credentials);
            const { token: loginToken, user: userData } = response.data; // Renamed token to loginToken to avoid conflict

            if (loginToken && userData) {
                localStorage.setItem('token', loginToken);
                setUser(userData);
                setIsAuthenticated(true);
                console.log('[AuthContext loginUser] Login successful, user:', userData);
                console.log('[AuthContext loginUser] Calling fetchRoles after login...');
                await fetchRoles();
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
            setRolesOptions([]);
            setError(errorMessage);
            setIsLoading(false);
            return { success: false, error: errorMessage };
        }
    }, [fetchRoles]);

    const logout = useCallback(() => {
        console.log('[AuthContext] Attempting to logout...');
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
        setRolesOptions([]);
        setError(null);
        setIsLoading(false); // Ensure loading is set to false on logout
        console.log('[AuthContext] User logged out.');
    }, []);

    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'token' && !localStorage.getItem('token')) {
                console.log('[AuthContext] Token removed from storage (external event). Logging out...');
                logout();
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [logout]);

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
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};