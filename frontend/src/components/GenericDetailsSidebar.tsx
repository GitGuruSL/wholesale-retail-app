import React from 'react';
import { Paper, Typography, Divider, Box, CircularProgress } from '@mui/material';

interface GenericDetailsSidebarProps {
    title: string;
    isLoading?: boolean;
    children: React.ReactNode; // The content to display
    placeholder?: React.ReactNode | string; // Content to show if children is null/empty
}

const GenericDetailsSidebar: React.FC<GenericDetailsSidebarProps> = ({
    title,
    isLoading = false,
    children,
    placeholder = "Select an item to see details."
}) => {
    return (
        <Paper 
            sx={{ 
                p: 2, 
                height: '100%', 
                maxHeight: 'calc(100vh - 160px)', // Added: Adjust 160px as needed
                display: 'flex', 
                flexDirection: 'column' 
            }}
        >
            <Typography variant="h6" gutterBottom>
                {title}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                        <CircularProgress />
                    </Box>
                ) : children ? (
                    children
                ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', textAlign: 'center' }}>
                        {typeof placeholder === 'string' ? (
                            <Typography color="text.secondary">{placeholder}</Typography>
                        ) : (
                            placeholder
                        )}
                    </Box>
                )}
            </Box>
        </Paper>
    );
};

export default GenericDetailsSidebar;