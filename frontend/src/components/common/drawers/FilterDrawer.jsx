import React from 'react';
import { Drawer, Box, Typography, IconButton, Toolbar, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useFilterDrawer } from '../../../context/FilterDrawerContext'; // Adjust path as needed

const DRAWER_WIDTH = 280; // Or your desired width for the filter drawer

// Define your header heights here or import them if they are constants
// Ensure these are the same as in DetailsDrawer.jsx or from a shared constants file
const PRIMARY_NAV_HEIGHT = 64;
const HORIZONTAL_MENU_HEIGHT = 48;
const SECONDARY_HORIZONTAL_MENU_HEIGHT = 48;

const TOTAL_HEADER_HEIGHT = PRIMARY_NAV_HEIGHT + HORIZONTAL_MENU_HEIGHT + SECONDARY_HORIZONTAL_MENU_HEIGHT;

const FilterDrawer = () => {
    // Consuming the context now
    const { isOpen, title, content, closeDrawer } = useFilterDrawer();

    return (
        <Drawer
            variant="persistent" // Changed to persistent
            anchor="left"       // Anchored to the left
            open={isOpen}
            // onClose={closeDrawer} // Optional: if you want backdrop click/Esc to close
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    top: `${TOTAL_HEADER_HEIGHT}px`, // Position below all headers
                    height: `calc(100% - ${TOTAL_HEADER_HEIGHT}px)`, // Fill remaining height
                    borderRight: (theme) => `1px solid ${theme.palette.divider}`, // Optional: visual separation
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Toolbar sx={{ justifyContent: 'space-between', pl: 2, pr: 1, flexShrink: 0, minHeight: '48px !important' }}>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        {title} {/* Title from context */}
                    </Typography>
                    <IconButton onClick={closeDrawer} aria-label="close filter drawer">
                        <CloseIcon />
                    </IconButton>
                </Toolbar>
                <Divider sx={{ flexShrink: 0 }} />
                <Box sx={{ p: 2, overflowY: 'auto', flexGrow: 1 }}>
                    {content} {/* Content from context */}
                </Box>
                {/* If you had footerContent, it would also come from context or be part of 'content' */}
            </Box>
        </Drawer>
    );
};

export default FilterDrawer;