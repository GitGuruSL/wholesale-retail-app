import React from 'react'; // Removed useState as 'open' and 'handleDrawerToggle' are no longer needed here
import { Outlet, Navigate } from 'react-router-dom';
// import Sidebar from './sidebar'; // No longer using vertical sidebar
import HorizontalMenu from './HorizontalMenu'; // Ensure this is correctly imported
import { useAuth } from '../context/AuthContext';
import Box from '@mui/material/Box'; // Using Box for layout
// import CircularProgress from '@mui/material/CircularProgress';

// const drawerWidth = 240; // No longer needed for horizontal menu

const MainLayout = () => {
    const { isAuthenticated, isLoading: authIsLoading } = useAuth();
    // const [open, setOpen] = useState(true); // Not needed for HorizontalMenu in this context
    // const handleDrawerToggle = () => { // Not needed
    //     setOpen(!open);
    // };

    if (authIsLoading) {
        return <div>Loading authentication...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Approximate height of the AppBar, adjust if your AppBar height is different
    const appBarHeight = '64px'; // Common MUI AppBar height

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <HorizontalMenu /> {/* Props like drawerWidth, open, handleDrawerToggle are removed */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    padding: 3, // MUI theme spacing unit
                    pt: `calc(${appBarHeight} + 20px)`, // Add AppBar height to top padding
                    // Or use marginTop: appBarHeight and padding: '20px' if you prefer
                }}
            >
                <Outlet /> {/* Renders the matched child route's component */}
            </Box>
        </Box>
    );
};

export default MainLayout;