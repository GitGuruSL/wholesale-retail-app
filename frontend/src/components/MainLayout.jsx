import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './sidebar'; // Assuming Sidebar is correctly imported
import { useAuth } from '../context/AuthContext';
// import CircularProgress from '@mui/material/CircularProgress'; // Example for loading
// import Box from '@mui/material/Box'; // Example for centering loading

const drawerWidth = 240;

const MainLayout = () => {
    const { isAuthenticated, isLoading: authIsLoading } = useAuth();
    const [open, setOpen] = useState(true);

    const handleDrawerToggle = () => {
        setOpen(!open);
    };

    if (authIsLoading) {
        // Optional: Show a loading spinner or a blank page while auth state is being determined
        // return (
        //     <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        //         <CircularProgress />
        //     </Box>
        // );
        return <div>Loading authentication...</div>; // Simple loading indicator
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const layoutStyle = {
        display: 'flex',
        minHeight: '100vh',
    };

    const contentStyle = {
        flexGrow: 1,
        padding: '20px',
        marginLeft: open ? `${drawerWidth}px` : `calc(1em * 7 + 1px)`, // Adjust if your collapsed sidebar width is different
        transition: 'margin-left 0.2s ease-out',
        // overflowY: 'auto', // Consider if content might overflow
    };
    
    return (
        <div style={layoutStyle}>
            <Sidebar 
                drawerWidth={drawerWidth} 
                open={open} 
                handleDrawerToggle={handleDrawerToggle} 
            />
            <main style={contentStyle}>
                <Outlet /> {/* Renders the matched child route's component */}
            </main>
        </div>
    );
};

export default MainLayout;