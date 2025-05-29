import React from 'react';
import { Box, Paper, Typography, IconButton, Drawer, useTheme, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Define the props for EntityFilterLayout
export interface EntityFilterLayoutProps {
    filterPanelOpen?: boolean;
    filterPanelTitle?: React.ReactNode;
    onFilterPanelClose?: () => void;
    filterPanelContent?: React.ReactNode; // This will receive the <EntityFilterPanel /> instance
    filterPanelWidth?: number | string;

    detailsPanelOpen?: boolean;
    detailsPanelTitle?: React.ReactNode;
    onDetailsPanelClose?: () => void;
    detailsPanelContent?: React.ReactNode;
    detailsPanelWidth?: number | string;

    children: React.ReactNode; // For the main content area
    mainContentSx?: object; // Optional sx for the main content paper/box
}

const EntityFilterLayout: React.FC<EntityFilterLayoutProps> = ({
    filterPanelOpen,
    filterPanelTitle = "Filters",
    onFilterPanelClose,
    filterPanelContent,
    filterPanelWidth: defaultFilterPanelWidth = 280,
    detailsPanelOpen,
    detailsPanelTitle = "Details",
    onDetailsPanelClose,
    detailsPanelContent,
    detailsPanelWidth: defaultDetailsPanelWidth = 320,
    children,
    mainContentSx,
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const filterPanelEffectiveWidth = isMobile ? '100%' : defaultFilterPanelWidth;
    const detailsPanelEffectiveWidth = isMobile ? '100%' : defaultDetailsPanelWidth;

    const drawerProps = {
        variant: isMobile ? 'temporary' : ('persistent' as 'persistent' | 'temporary'), // Type assertion
        ModalProps: isMobile ? { keepMounted: true } : undefined, // Better SEO for mobile
    };

    return (
        <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Filter Panel Drawer */}
            <Drawer
                {...drawerProps}
                anchor="left"
                open={filterPanelOpen}
                onClose={onFilterPanelClose} // For temporary drawer on mobile
                sx={{
                    width: filterPanelOpen && !isMobile ? filterPanelEffectiveWidth : (filterPanelOpen && isMobile ? '100%' : 0),
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: filterPanelEffectiveWidth,
                        boxSizing: 'border-box',
                        position: isMobile ? 'fixed' : 'relative',
                        height: '100%',
                        borderRight: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
                        zIndex: isMobile ? theme.zIndex.drawer + 1 : theme.zIndex.appBar -1, // Ensure it's above main content but below modals if any
                    },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        flexShrink: 0,
                    }}
                >
                    <Typography variant="h6" component="div" sx={{ ml: 1, fontSize: '1rem' }}>
                        {filterPanelTitle}
                    </Typography>
                    {onFilterPanelClose && (
                        <IconButton onClick={onFilterPanelClose} size="small" aria-label="close filter panel">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
                <Box sx={{ p: 1.5, overflowY: 'auto', flexGrow: 1 }}>
                    {filterPanelContent}
                </Box>
            </Drawer>

            {/* Main Content Area */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    overflowY: 'auto', // Allow main content to scroll independently
                    height: '100%',    // Take full available height
                    display: 'flex',
                    flexDirection: 'column',
                    marginLeft: 0, // Apply this for desktop, or adjust based on your mobile logic
                    transition: theme.transitions.create(['margin', 'width'], {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    ...(mainContentSx), // Allow parent to pass sx for the main content wrapper
                }}
            >
                {children}
            </Box>

            {/* Details Panel Drawer */}
            <Drawer
                {...drawerProps}
                anchor="right"
                open={detailsPanelOpen}
                onClose={onDetailsPanelClose} // For temporary drawer on mobile
                sx={{
                    width: detailsPanelOpen && !isMobile ? detailsPanelEffectiveWidth : (detailsPanelOpen && isMobile ? '100%' : 0),
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: detailsPanelEffectiveWidth,
                        boxSizing: 'border-box',
                        position: isMobile ? 'fixed' : 'relative',
                        height: '100%',
                        borderLeft: isMobile ? 'none' : `1px solid ${theme.palette.divider}`,
                        zIndex: isMobile ? theme.zIndex.drawer + 1 : theme.zIndex.appBar -1,
                    },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 1,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        flexShrink: 0,
                    }}
                >
                    <Typography variant="h6" component="div" sx={{ ml: 1, fontSize: '1rem' }}>
                        {detailsPanelTitle}
                    </Typography>
                    {onDetailsPanelClose && (
                        <IconButton onClick={onDetailsPanelClose} size="small" aria-label="close details panel">
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    )}
                </Box>
                <Box sx={{ p: 1.5, overflowY: 'auto', flexGrow: 1 }}>
                    {detailsPanelContent}
                </Box>
            </Drawer>
        </Box>
    );
};

export default EntityFilterLayout;