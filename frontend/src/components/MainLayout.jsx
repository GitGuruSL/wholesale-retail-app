import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import HorizontalMenu from './HorizontalMenu';
import SecondaryHorizontalMenu from './SecondaryHorizontalMenu';
import { SecondaryMenuProvider } from '../context/SecondaryMenuContext';
import { useAuth } from '../context/AuthContext';
import Box from '@mui/material/Box';

const MAIN_MENU_HEIGHT = 64;
const SECONDARY_MENU_HEIGHT = 56;

const MainLayout = () => {
    const { isAuthenticated, isLoading: authIsLoading } = useAuth();

    if (authIsLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                Loading authentication...
            </Box>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return (
        <SecondaryMenuProvider>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <HorizontalMenu />
                <SecondaryHorizontalMenu />
                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        pt: `${MAIN_MENU_HEIGHT + SECONDARY_MENU_HEIGHT + 16}px`,
                        background: '#f5f6fa',
                        minHeight: '100vh',
                    }}
                >
                    <Outlet />
                </Box>
            </Box>
        </SecondaryMenuProvider>
    );
};

export default MainLayout;