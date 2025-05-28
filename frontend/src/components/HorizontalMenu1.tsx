import React, { useState, useEffect } from 'react'; // Added useEffect for logging
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation for logging
import {
    AppBar, Toolbar, Typography, Button, IconButton, Box, Breadcrumbs, Link,
    Menu, MenuItem, Badge, Tooltip
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import FilterListIcon from '@mui/icons-material/FilterList';
import AccountCircle from '@mui/icons-material/AccountCircle';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

import { useSecondaryMenu } from '../context/SecondaryMenuContext';
import { useAuth } from '../context/AuthContext';

const HorizontalMenu = () => {
    const { menuProps } = useSecondaryMenu();
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation(); // For logging current path

    const [userMenuAnchorEl, setUserMenuAnchorEl] = useState<null | HTMLElement>(null);
    const isUserMenuOpen = Boolean(userMenuAnchorEl);

    // Log menuProps whenever they change or component re-renders
    useEffect(() => {
        console.log('[HorizontalMenu] Current Path:', location.pathname);
        console.log('[HorizontalMenu] menuProps received:', JSON.stringify(menuProps));
        console.log('[HorizontalMenu] menuProps.hideStandardRightIcons:', menuProps.hideStandardRightIcons);
        console.log('[HorizontalMenu] isAuthenticated:', isAuthenticated, 'User:', user ? user.id : 'No User');
    }, [menuProps, location.pathname, isAuthenticated, user]);

    const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        console.log('[HorizontalMenu] handleUserMenuOpen clicked');
        setUserMenuAnchorEl(event.currentTarget);
    };

    const handleUserMenuClose = () => {
        console.log('[HorizontalMenu] handleUserMenuClose called');
        setUserMenuAnchorEl(null);
    };

    const handleLogout = () => {
        console.log('[HorizontalMenu] handleLogout called');
        logout();
        handleUserMenuClose();
        navigate('/login');
    };
    
    const menuId = 'primary-search-account-menu';

    // Log when the user menu is about to be rendered and its open state
    useEffect(() => {
        if (userMenuAnchorEl) {
            console.log('[HorizontalMenu] User menu anchor is set. isUserMenuOpen:', isUserMenuOpen);
        }
    }, [userMenuAnchorEl, isUserMenuOpen]);

    const renderUserMenu = (
        <Menu
            anchorEl={userMenuAnchorEl}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            id={menuId}
            keepMounted
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            open={isUserMenuOpen}
            onClose={handleUserMenuClose}
            sx={{ mt: '45px' }}
        >
            <MenuItem onClick={() => { console.log('Profile clicked'); handleUserMenuClose(); /* navigate to profile */ }}>Profile</MenuItem>
            <MenuItem onClick={() => { console.log('My account clicked'); handleUserMenuClose(); /* navigate to account */ }}>My account</MenuItem>
            <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
    );

    const shouldShowStandardIcons = !menuProps.hideStandardRightIcons && isAuthenticated && user;
    console.log('[HorizontalMenu] Calculated shouldShowStandardIcons:', shouldShowStandardIcons);


    return (
        <AppBar position="fixed" sx={{ 
            zIndex: (theme) => theme.zIndex.drawer + 1, 
            backgroundColor: '#ffffff', 
            color: '#333',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' 
        }}>
            <Toolbar sx={{ justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {/* Breadcrumbs and Page Title from Primary Menu (if any, usually Secondary handles this) */}
                    {/* This part seems more related to SecondaryHorizontalMenu's props, ensure clarity */}
                    {menuProps.breadcrumbs && menuProps.breadcrumbs.length > 0 && !menuProps.pageTitle && ( // Example condition
                        <Breadcrumbs aria-label="breadcrumb" sx={{ mr: 2 }}>
                            {menuProps.breadcrumbs.map((crumb, index) =>
                                crumb.path ? (
                                    <Link component={RouterLink} to={crumb.path} color="inherit" key={index} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' }}}>
                                        {crumb.label}
                                    </Link>
                                ) : (
                                    <Typography color="text.primary" key={index}>
                                        {crumb.label}
                                    </Typography>
                                )
                            )}
                        </Breadcrumbs>
                    )}
                    {menuProps.pageTitle && ( // This pageTitle is from SecondaryMenuContext
                        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'medium' }}>
                            {/* This might be confusing if HorizontalMenu is not supposed to show page titles */}
                            {/* Consider if this title should be here or only in SecondaryHorizontalMenu */}
                            {/* For now, let's assume it's intentional for some layouts */}
                            {/* {menuProps.pageTitle} */}
                        </Typography>
                    )}
                     {/* Fallback or App Name if no page title from context */}
                    {!menuProps.pageTitle && (
                        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 'bold' }}>
                            My App
                        </Typography>
                    )}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {/* Action Buttons from context - These are usually for SecondaryHorizontalMenu */}
                    {/* If HorizontalMenu also needs actions, ensure context provides them distinctly */}
                    {/* {menuProps.actions && menuProps.actions.map((action) => ( ... ))} */}

                    {/* Filter Icon - This is usually for SecondaryHorizontalMenu */}
                    {/* {menuProps.showFilter && ( ... )} */}
                    
                    {/* Standard Right Icons (Notifications, User Profile) */}
                    {shouldShowStandardIcons ? (
                        <>
                            <Tooltip title="Notifications">
                                <IconButton
                                    size="large"
                                    aria-label="show new notifications"
                                    color="inherit"
                                    sx={{ ml: 1 }}
                                    onClick={() => console.log('Notifications icon clicked')}
                                >
                                    <Badge badgeContent={0} color="error">
                                        <NotificationsIcon />
                                    </Badge>
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="User Account">
                                <IconButton
                                    size="large"
                                    edge="end"
                                    aria-label="account of current user"
                                    aria-controls={menuId}
                                    aria-haspopup="true"
                                    onClick={handleUserMenuOpen}
                                    color="inherit"
                                    sx={{ ml: 1 }}
                                >
                                    <AccountCircle />
                                </IconButton>
                            </Tooltip>
                        </>
                    ) : (
                        <Box sx={{ml:1}}>{/* Placeholder to maintain layout if icons are hidden */}</Box>
                    )}
                </Box>
                {isAuthenticated && user && renderUserMenu} {/* Ensure menu is only rendered if user is authenticated */}
            </Toolbar>
        </AppBar>
    );
};

export default HorizontalMenu;