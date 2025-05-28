import React from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton'; // <-- Import IconButton
import LogoutIcon from '@mui/icons-material/Logout'; // <-- Import LogoutIcon
import HorizontalMenu from './HorizontalMenu';
import { useAuth } from '../context/AuthContext'; // <-- Import useAuth

// Define heights for your bars - adjust as needed
const TOP_BAR_HEIGHT = 48;
const PRIMARY_NAV_HEIGHT = 64; // This should match the height of HorizontalMenu's Toolbar (minHeight: '64px')
const SECONDARY_NAV_HEIGHT = 48;

const DashboardTopBar = () => {
    const { logoutUser } = useAuth(); // <-- Get logoutUser function

    return (
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 3, height: TOP_BAR_HEIGHT, backgroundColor: '#3b3a39' }}>
            <Toolbar variant="dense">
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                    My Business App
                </Typography>
                {/* Add icons for environment, search, help, user menu here */}
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

// DashboardPrimaryNav is no longer needed as HorizontalMenu replaces it.
// const DashboardPrimaryNav = () => ( ... );

const DashboardSecondaryNav = () => (
    <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
            top: TOP_BAR_HEIGHT + PRIMARY_NAV_HEIGHT, // Adjusted top position
            zIndex: (theme) => theme.zIndex.drawer + 1,
            height: SECONDARY_NAV_HEIGHT,
            backgroundColor: (theme) => theme.palette.background.paper
        }}
    >
        <Toolbar variant="dense">
            <Button size="small" sx={{ mr: 1 }}>Customers</Button>
            <Button size="small" sx={{ mr: 1 }}>Vendors</Button>
            <Button size="small" sx={{ mr: 1 }}>Items</Button>
            <Button size="small" sx={{ mr: 1 }}>Bank Accounts</Button>
            <Button size="small" sx={{ mr: 1 }}>Chart of Accounts</Button>
        </Toolbar>
        <Divider />
    </AppBar>
);


const DashboardLayout = () => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <DashboardTopBar />
            <HorizontalMenu /> {/* HorizontalMenu is now the primary navigation bar */}
            <DashboardSecondaryNav />
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    // Adjusted paddingTop to account for all three bars
                    pt: `${TOP_BAR_HEIGHT + PRIMARY_NAV_HEIGHT + SECONDARY_NAV_HEIGHT + 24}px`,
                    background: '#f5f6fa',
                    minHeight: `calc(100vh - ${TOP_BAR_HEIGHT + PRIMARY_NAV_HEIGHT + SECONDARY_NAV_HEIGHT}px)`
                }}
            >
                <Outlet /> {/* This is where your dashboard pages (HomePage, ItemList, etc.) will render */}
            </Box>
        </Box>
    );
};

export default DashboardLayout;