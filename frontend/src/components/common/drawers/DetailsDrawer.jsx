import React from 'react';
import { Drawer, Box, Typography, IconButton, Toolbar, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useDetailsDrawer } from '../../../context/DetailsDrawerContext'; // Adjust path as needed

const DRAWER_WIDTH = 320;
// Define your header heights here or import them if they are constants
const PRIMARY_NAV_HEIGHT = 64; // Example: Height of DashboardTopBar
const HORIZONTAL_MENU_HEIGHT = 48; // Example: Height of HorizontalMenu
const SECONDARY_HORIZONTAL_MENU_HEIGHT = 48; // Example: Height of SecondaryHorizontalMenu

const TOTAL_HEADER_HEIGHT = PRIMARY_NAV_HEIGHT + HORIZONTAL_MENU_HEIGHT + SECONDARY_HORIZONTAL_MENU_HEIGHT;

const DetailsDrawer = () => {
    const { isOpen, title, content, closeDrawer } = useDetailsDrawer();

    return (
        <Drawer
            variant="persistent"
            anchor="right"
            open={isOpen}
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    top: `${TOTAL_HEADER_HEIGHT}px`, // Position below all headers
                    height: `calc(100% - ${TOTAL_HEADER_HEIGHT}px)`, // Fill remaining height
                    borderLeft: (theme) => `1px solid ${theme.palette.divider}`, // Optional: visual separation
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Toolbar sx={{ justifyContent: 'space-between', pl: 2, pr: 1, flexShrink: 0, minHeight: '48px !important' }}>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {title || "Details"}
                    </Typography>
                    <IconButton onClick={closeDrawer} aria-label="close details drawer">
                        <CloseIcon />
                    </IconButton>
                </Toolbar>
                <Divider sx={{ flexShrink: 0 }} />
                <Box sx={{ p: 2, overflowY: 'auto', flexGrow: 1 }}>
                    {content}
                </Box>
            </Box>
        </Drawer>
    );
};

export default DetailsDrawer;