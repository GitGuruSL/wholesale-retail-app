import React from 'react';
import { Box, Typography, Paper, Grid, Divider } from '@mui/material';

const DetailItem = ({ label, value }) => (
    <Grid container item xs={12} spacing={1} sx={{ mb: 1.5 }}>
        <Grid item xs={5} sm={4}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'medium' }}>
                {label}:
            </Typography>
        </Grid>
        <Grid item xs={7} sm={8}>
            <Typography variant="body2" color="text.primary">
                {value || '-'}
            </Typography>
        </Grid>
    </Grid>
);

const WarrantyDetailsView = ({ warranty }) => {
    if (!warranty) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography>No warranty data provided.</Typography>
            </Box>
        );
    }

    return (
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, m: 0, height: '100%' }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 2, fontWeight: 'medium' }}>
                {warranty.name || 'Warranty Details'}
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem' }}>
                    General Information
                </Typography>
                <Grid container spacing={0}>
                    <DetailItem label="Warranty ID" value={warranty.id} />
                    <DetailItem label="Name" value={warranty.name} />
                    <DetailItem label="Duration" value={`${warranty.duration_months || 0} months`} />
                </Grid>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Box>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem' }}>
                    Description
                </Typography>
                <Typography variant="body2" paragraph sx={{ whiteSpace: 'pre-wrap', color: 'text.secondary' }}>
                    {warranty.description || 'No description provided.'}
                </Typography>
            </Box>

            {/* You can add more sections here as needed, e.g., for linked items, audit trail, etc. */}
            {/* Example:
            <Divider sx={{ my: 2 }} />
            <Box>
                <Typography variant="h6" gutterBottom sx={{ fontSize: '1.1rem' }}>
                    Audit Information
                </Typography>
                <Grid container spacing={0}>
                    <DetailItem label="Created At" value={warranty.created_at ? new Date(warranty.created_at).toLocaleString() : '-'} />
                    <DetailItem label="Updated At" value={warranty.updated_at ? new Date(warranty.updated_at).toLocaleString() : '-'} />
                </Grid>
            </Box>
            */}
        </Paper>
    );
};

export default WarrantyDetailsView;