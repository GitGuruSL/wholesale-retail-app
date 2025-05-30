import React from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LogoutIcon from '@mui/icons-material/Logout';
import HorizontalMenu from './HorizontalMenu'; // Your primary navigation
import SecondaryHorizontalMenu from './SecondaryHorizontalMenu'; // The new contextual menu
import { useAuth } from '../context/AuthContext';

// Define heights for your bars
const TOP_BAR_HEIGHT = 48; // As per your existing DashboardTopBar
const PRIMARY_NAV_HEIGHT = 64; // Height of HorizontalMenu (adjust if different)
const CONTEXTUAL_MENU_HEIGHT = 48; // Expected height of SecondaryHorizontalMenu (dense Toolbar)

const DashboardTopBar = () => {
    const { logoutUser } = useAuth();

    return (
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 3, height: TOP_BAR_HEIGHT, backgroundColor: '#3b3a39' }}>
            <Toolbar variant="dense">
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                    Main Menu {/* Changed from "My Business App" to match image */}
                </Typography>
                <IconButton
                    color="inherit"
                    onClick={() => {
                        if (typeof logoutUser === 'function') {
                            logoutUser();
                        } else {
                            console.error('Logout function not available');
                        }
                    }}
                    title="Logout"
                >
                    <LogoutIcon />
                </IconButton>
            </Toolbar>
        </AppBar>
    );
};

// DashboardSecondaryNav is removed as its functionality is replaced by SecondaryHorizontalMenu

const DashboardLayout = () => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <DashboardTopBar />
            <HorizontalMenu />
            <SecondaryHorizontalMenu />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 0,
                    pt: `${TOP_BAR_HEIGHT + PRIMARY_NAV_HEIGHT + CONTEXTUAL_MENU_HEIGHT}px`,
                    mt: 0,
                    mb: 0,
                    background: '#f5f6fa',
                    minHeight: `calc(100vh - ${TOP_BAR_HEIGHT}px - ${PRIMARY_NAV_HEIGHT}px - ${CONTEXTUAL_MENU_HEIGHT}px)`
                }}
            >
                <Outlet />
            </Box>
        </Box>
    );
};

export default DashboardLayout;

// In SecondaryHorizontalMenu.jsx (or .tsx)
<Toolbar
    variant="dense"
    sx={{ minHeight: `${CONTEXTUAL_MENU_HEIGHT}px !important`, p: 0, m: 0 }}
>
    {/* ...menu content... */}
</Toolbar>