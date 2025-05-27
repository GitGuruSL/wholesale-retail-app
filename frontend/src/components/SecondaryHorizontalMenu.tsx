import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import HorizontalMenu from './HorizontalMenu';
import SecondaryHorizontalMenu from './SecondaryHorizontalMenu'; // Import the new menu
import { useAuth } from '../context/AuthContext';
import { SecondaryMenuProvider, useSecondaryMenu } from '../context/SecondaryMenuContext'; // Import context
import Box from '@mui/material/Box';
// import CircularProgress from '@mui/material/CircularProgress'; // Uncomment if needed

const MainLayoutContent = () => {
    const { menuProps } = useSecondaryMenu(); // Consume the context

    // Approximate heights, adjust if your AppBar/Menu heights are different
    const primaryMenuHeight = '64px'; // Common MUI AppBar height for HorizontalMenu
    const secondaryMenuHeight = '52px'; // Approximate height for SecondaryHorizontalMenu (includes its padding)

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <HorizontalMenu />
            <SecondaryHorizontalMenu {...menuProps} /> {/* Pass props from context */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    // Adjust padding to account for both menus
                    // The 'p:3' will apply to all sides, then 'pt' overrides top padding.
                    p: 3, 
                    pt: `calc(${primaryMenuHeight} + ${secondaryMenuHeight} + 24px)`, // 24px is theme.spacing(3)
                    // Alternatively, if p:3 is not desired on top:
                    // paddingLeft: 3, paddingRight: 3, paddingBottom: 3,
                    // marginTop: `calc(${primaryMenuHeight} + ${secondaryMenuHeight})`,
                    
                    // Ensure content area can scroll if it overflows
                    overflowY: 'auto', 
                }}
            >
                <Outlet /> {/* Renders the matched child route's component */}
            </Box>
        </Box>
    );
};

const MainLayout = () => {
    const { isAuthenticated, isLoading: authIsLoading } = useAuth();

    if (authIsLoading) {
        // Consider a more robust loading spinner/indicator here
        return <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>{/*<CircularProgress />*/}<div>Loading authentication...</div></Box>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <SecondaryMenuProvider> {/* Wrap with the provider */}
            <MainLayoutContent />
        </SecondaryMenuProvider>
    );
};

export default MainLayout;