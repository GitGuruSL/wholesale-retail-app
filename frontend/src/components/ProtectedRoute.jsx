import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Adjust path as needed

const ProtectedRoute = ({ children, roles }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><h2>Loading application...</h2></div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location, message: "Please log in to continue." }} replace />;
    }

    if (roles && roles.length > 0) {
        // Corrected to use user.role_name
        if (!user.role_name || !roles.includes(user.role_name)) { 
            console.warn(`User role "${user.role_name || 'undefined'}" not authorized for this route. Required: ${roles.join(', ')}`);
            return <Navigate to="/access-denied" state={{ from: location }} replace />;
        }
    }

    return children;
};

export default ProtectedRoute;