import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiInstance from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                return JSON.parse(storedUser);
            }
            return null;
        } catch (error) {
            console.error("AuthContext: Error parsing stored user from localStorage:", error);
            localStorage.removeItem('user'); // Clear corrupted data
            return null;
        }
    });

    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true); // True until initial auth status is determined
    const [error, setError] = useState(null); // For auth-related errors
    const navigate = useNavigate();

    // Initial auth check
    useEffect(() => {
        // If you have a token, you might want to validate it with an API call here
        // For now, just set isLoading to false after checking localStorage
        setIsLoading(false);
    }, []);

    // Login function
    const loginUser = useCallback(async (credentials) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await apiInstance.post('/auth/login', credentials);
            if (response.data && response.data.token && response.data.user) {
                const { token: newToken, user: userData } = response.data;
                localStorage.setItem('token', newToken);
                localStorage.setItem('user', JSON.stringify(userData));
                setToken(newToken);
                setUser(userData);
                return { success: true, user: userData };
            } else {
                const errorMessage = response.data?.message || "Login failed: Invalid response from server.";
                setError(errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "An error occurred during login.";
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []); // Dependencies: setIsLoading, setError, setToken, setUser are stable. apiInstance is module-level.

    // Logout function
    const logoutUser = useCallback(() => {
        console.log("AuthContext: Performing logout.");
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
        setToken(null);
        setError(null); // Clear any auth errors on logout
        if (window.location.pathname !== '/login') {
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    // Effect to handle global 'auth-error-401' event (e.g., from API interceptor)
    useEffect(() => {
        const handleAuthError401 = () => {
            console.log("AuthContext: Caught 'auth-error-401' event. Logging out.");
            // The API interceptor might have already cleared localStorage and redirected.
            // This ensures the AuthContext state is also reset.
            if (user || token) { // Only if there was a logged-in state to clear
                logoutUser();
            }
        };

        window.addEventListener('auth-error-401', handleAuthError401);
        return () => {
            window.removeEventListener('auth-error-401', handleAuthError401);
        };
    }, [user, token, logoutUser]);

    // Permission checking function
    const userCan = useCallback((requiredPermission) => {
        // Ensure these console.log lines are present and not commented out
        console.log('[AuthContext userCan] Current user:', user); // Log the whole user object
        if (!user || !user.permissions) {
            console.log('[AuthContext userCan] User or user.permissions is null/undefined. Required:', requiredPermission, 'Result: false');
            return false;
        }
        //console.log('[AuthContext userCan] User permissions:', user.permissions); // Log the permissions array
        console.log('[AuthContext userCan] Checking if user has permission:', requiredPermission);

        const hasPerm = user.permissions.includes(requiredPermission);
        console.log(`[AuthContext userCan] User has permission '${requiredPermission}': ${hasPerm}`);
        return hasPerm;
    }, [user]); // Dependency array includes user

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        user,
        token,
        isLoading,
        error,
        isAuthenticated: !!token && !!user,
        loginUser,
        logoutUser,
        setError, // Expose setError for manual error setting if needed
        userCan,
    }), [user, token, isLoading, error, loginUser, logoutUser, userCan]); // setError from useState is stable

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};