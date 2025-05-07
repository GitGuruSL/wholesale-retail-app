// filepath: d:\Development\wholesale-retail-app\frontend\src\components\MainLayout.jsx
import React, { useState } from 'react'; // Import useState
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from './sidebar';
import { useAuth } from '../context/AuthContext';

const drawerWidth = 240; // Define your desired drawer width

const MainLayout = () => {
    const { isAuthenticated } = useAuth();
    const [open, setOpen] = useState(true); // State for sidebar open/closed

    const handleDrawerToggle = () => {
        setOpen(!open);
    };

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
        marginLeft: open ? `${drawerWidth}px` : `calc(1em * 7 + 1px)`, // Adjust based on collapsed width
        transition: 'margin-left 0.2s ease-out', // Smooth transition for content
        // overflowY: 'auto', 
    };
    
    // Style for the sidebar container itself to handle width transition
    // This might be better handled within the Sidebar component using MUI's Drawer props
    // but if Sidebar is a simple component, you might control its width here or via its own styles.

    return (
        <div style={layoutStyle}>
            <Sidebar 
                drawerWidth={drawerWidth} 
                open={open} 
                handleDrawerToggle={handleDrawerToggle} 
            />
            <main style={contentStyle}>
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;