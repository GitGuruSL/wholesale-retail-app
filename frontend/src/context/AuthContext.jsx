import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ROLES, ROLES_OPTIONS } from "../utils/roles.js";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const api = axios.create({
        baseURL: API_BASE_URL,
    });

    api.interceptors.request.use(
        (config) => {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                config.headers.Authorization = `Bearer ${currentToken}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    const clearAuthData = useCallback(() => {
        console.log("AuthContext: clearAuthData called");
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoading(false);
    }, [setIsLoading, setUser, setToken]);

    const logoutUser = useCallback((message = "You have been logged out.") => {
        console.log("AuthContext: logoutUser called");
        clearAuthData();
        navigate('/login', { state: { message } });
    }, [navigate, clearAuthData]);

    api.interceptors.response.use(
        (response) => response,
        async (err) => {
            const originalRequest = err.config;
            if (err.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;
                console.warn('AuthContext: Token expired or invalid (interceptor). Logging out.');
                logoutUser('Your session has expired. Please log in again.');
            }
            return Promise.reject(err);
        }
    );

    const fetchUserProfile = useCallback(async (currentTokenToFetchWith) => {
        if (!currentTokenToFetchWith) {
            console.log("fetchUserProfile: No token provided, clearing auth data.");
            clearAuthData();
            return null;
        }
        console.log("fetchUserProfile: Attempting to fetch profile. Setting isLoading true.");
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.get('/auth/profile', {
                headers: { Authorization: `Bearer ${currentTokenToFetchWith}` }
            });
            
            console.log("fetchUserProfile: Raw profile response data from API:", response.data);

            const rawUserData = response.data;
            let finalUserData = rawUserData; 
            if (rawUserData && typeof rawUserData.user === 'object' && rawUserData.user !== null) {
                console.log("fetchUserProfile: User data was nested. Extracted from 'user' key:", rawUserData.user);
                finalUserData = rawUserData.user; 
            } else {
                console.log("fetchUserProfile: User data was not nested under a 'user' key. Using raw data:", rawUserData);
            }
            
            console.log("fetchUserProfile: 'finalUserData' before attempting to access username/role:", finalUserData);

            // Ensure finalUserData is an object before trying to access properties
            if (typeof finalUserData !== 'object' || finalUserData === null) {
                console.error("fetchUserProfile: 'finalUserData' is not an object or is null. Cannot proceed.", finalUserData);
                throw new Error("Processed user profile data is invalid.");
            }

            const usernameToSet = finalUserData.username || finalUserData.user_name || null;
            const roleToSet = finalUserData.role || finalUserData.user_role || null;

            console.log("fetchUserProfile: Attempting to set username from finalUserData.username:", finalUserData.username, "OR finalUserData.user_name:", finalUserData.user_name, "Resulting usernameToSet:", usernameToSet);
            console.log("fetchUserProfile: Attempting to set role from finalUserData.role:", finalUserData.role, "OR finalUserData.user_role:", finalUserData.user_role, "Resulting roleToSet:", roleToSet);

            const userDataToSet = {
                ...finalUserData, // Spread the rest of the properties from finalUserData
                username: usernameToSet, 
                role: roleToSet       
            };
            
            if (!userDataToSet.username || !userDataToSet.role) {
                console.warn("fetchUserProfile: Processed 'userDataToSet' is missing username or role. Full object:", userDataToSet);
                // If these are absolutely critical, you might throw an error to trigger the catch block
                // throw new Error("User profile data is incomplete (missing username or role after processing)."); 
            }

            console.log("fetchUserProfile: Profile processed successfully. 'userDataToSet' is:", userDataToSet);
            setUser(userDataToSet);
            setToken(currentTokenToFetchWith); 
            localStorage.setItem('user', JSON.stringify(userDataToSet));
            setIsLoading(false); 
            return userDataToSet;
        } catch (err) {
            console.error("fetchUserProfile: Failed to fetch profile or process data:", err.response?.data?.message || err.message, err);
            clearAuthData(); 
            setError(err.response?.data?.message || "Failed to fetch profile or process data.");
            return null;
        }
    }, [api, clearAuthData, setIsLoading, setError, setUser, setToken]);

    useEffect(() => {
        console.log("AuthContext useEffect [INITIAL MOUNT]: Initializing authentication...");
        const initializeAuth = async () => {
            const storedToken = localStorage.getItem('token');
            console.log("AuthContext useEffect [INITIAL MOUNT]: Stored token:", storedToken);
            if (storedToken) {
                await fetchUserProfile(storedToken);
            } else {
                console.log("AuthContext useEffect [INITIAL MOUNT]: No stored token, clearing auth.");
                clearAuthData();
            }
        };
        initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loginUser = async (credentials) => {
        console.log("AuthContext: loginUser called");
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
            const { token: newToken } = response.data;
            
            if (!newToken) {
                throw new Error("Login response missing token.");
            }
            console.log("AuthContext: loginUser - Login API success, token received.");
            localStorage.setItem('token', newToken);

            const fetchedUser = await fetchUserProfile(newToken);

            if (fetchedUser) {
                console.log("AuthContext: loginUser - Profile fetched successfully after login:", fetchedUser);
                return { success: true, user: fetchedUser };
            } else {
                console.error("AuthContext: loginUser - Profile fetch FAILED after login.");
                return { success: false, error: error || "Profile fetch failed after login. Please try again." };
            }
        } catch (err) {
            console.error("AuthContext: loginUser - Login API FAILED:", err.response?.data?.message || err.message);
            const errorMessage = err.response?.data?.message || "Login failed. Please check your credentials.";
            setError(errorMessage);
            clearAuthData();
            return { success: false, error: errorMessage };
        }
    };

    const contextValue = {
        user,
        token,
        isLoading,
        error,
        loginUser,
        logoutUser,
        api,
        ROLES,
        ROLES_OPTIONS,
        isAuthenticated: !!token && !!user,
        setError,
    };

    console.log("AuthContext: Rendering with isLoading:", isLoading, "User object:", user, "Username:", user ? user.username : null, "Role:", user ? user.role : null, "Token:", token ? 'present' : null);
    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};