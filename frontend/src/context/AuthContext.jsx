import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiInstance from '../services/api.js'; // Ensure this path is correct

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // True until initial token verification is done
    const [error, setError] = useState(null);
    const [rolesOptions, setRolesOptions] = useState([]);
    const [userPermissions, setUserPermissions] = useState(new Set());

    const processUserData = useCallback((userData) => {
        if (userData && userData.user_id) { // Ensure essential userData exists
            const processedUser = {
                ...userData,
                id: userData.user_id, // Standardize on 'id' internally if preferred
                // store_id should already be present from backend
            };
            setUser(processedUser);
            setIsAuthenticated(true);
            setUserPermissions(new Set(processedUser?.permissions || []));
            setError(null);
            console.log('[AuthContext] User data processed:', processedUser);
        } else {
            setUser(null);
            setIsAuthenticated(false);
            setUserPermissions(new Set());
            // console.log('[AuthContext] No valid user data to process. User set to null.');
        }
    }, []);

    const fetchRolesAndSet = useCallback(async () => {
        try {
            const response = await apiInstance.get('/roles'); // Ensure this endpoint exists
            const formattedRoles = response.data.map(role => ({
                value: String(role.id), // Ensure value is string for select components
                label: role.display_name || role.name, // Prefer display_name
            }));
            setRolesOptions(formattedRoles);
            console.log('[AuthContext] Roles fetched:', formattedRoles);
        } catch (err) {
            console.error('[AuthContext] Failed to fetch roles:', err.response?.data?.message || err.message);
            setRolesOptions([]);
            // Optionally set an error if roles are critical and fail to load
            // setError(prev => ({ ...prev, rolesError: 'Failed to load roles.' }));
        }
    }, []);


    const verifyTokenAndSetUser = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('[AuthContext] No token found in storage.');
            processUserData(null); // Clear user state
            setIsLoading(false);
            return false; // Indicate no token/user
        }

        try {
            console.log('[AuthContext] Verifying token via /auth/profile (or /auth/me)...');
            // Assuming /auth/profile or /auth/me returns the user object directly
            // as configured in your backend (auth.js -> /profile route)
            const response = await apiInstance.get('/auth/profile'); 
            processUserData(response.data); // response.data should be the user object
            console.log('[AuthContext] Token verified, user set from profile.');
            return true; // Indicate user successfully set
        } catch (err) {
            console.error('[AuthContext] Token verification failed:', err.response?.data?.message || err.message);
            localStorage.removeItem('token'); // Crucial: remove invalid token
            processUserData(null); // Clear user state
            return false; // Indicate verification failed
        } finally {
            setIsLoading(false);
        }
    }, [processUserData]);

    useEffect(() => {
        const initializeAuth = async () => {
            setIsLoading(true); // Explicitly set loading true at the start of initialization
            const userVerified = await verifyTokenAndSetUser();
            if (userVerified) {
                // If user is verified, token exists and is valid, fetch roles
                await fetchRolesAndSet();
            }
            // setIsLoading(false) is handled within verifyTokenAndSetUser's finally block
        };
        initializeAuth();
    }, [verifyTokenAndSetUser, fetchRolesAndSet]);


    const loginUser = useCallback(async (credentials) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiInstance.post('/auth/login', credentials);
            const { token, user: userData } = response.data;

            if (token && userData) {
                localStorage.setItem('token', token);
                processUserData(userData); // This userData from login now includes store_id
                await fetchRolesAndSet(); // Fetch roles after successful login
                console.log('[AuthContext] Login successful.');
                setIsLoading(false);
                return { success: true, user: userData };
            } else {
                throw new Error('Invalid login response: Missing token or user data.');
            }
        } catch (err) {
            console.error('[AuthContext] Login failed:', err.response?.data?.message || err.message);
            localStorage.removeItem('token');
            processUserData(null);
            setError(err.response?.data?.message || err.message || 'Login failed.');
            setIsLoading(false);
            return { success: false, error: err.response?.data?.message || err.message };
        }
    }, [processUserData, fetchRolesAndSet]);

    const logout = useCallback(() => {
        console.log('[AuthContext] Logging out.');
        localStorage.removeItem('token');
        processUserData(null);
        setRolesOptions([]); // Clear roles
        setError(null);
        // No need to set isLoading here as it's a direct action, not an async init
    }, [processUserData]);

    useEffect(() => {
        const handleStorageChange = (event) => {
            if (event.key === 'token' && !localStorage.getItem('token')) {
                console.log('[AuthContext] Token removed externally. Logging out.');
                logout(); // Use the centralized logout function
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [logout]);

    const userCan = useCallback((permission) => {
        return isAuthenticated && userPermissions.has(permission);
    }, [isAuthenticated, userPermissions]);

    return (
        <AuthContext.Provider value={{
            user,
            isAuthenticated,
            isLoading, // Overall auth loading state
            error,
            setError,
            loginUser,
            logout,
            refreshAuth: verifyTokenAndSetUser, // Expose for manual refresh if needed
            ROLES_OPTIONS: rolesOptions,
            userCan,
            // apiInstance is not typically exposed directly via context unless absolutely necessary
            // and other services cannot import it.
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};