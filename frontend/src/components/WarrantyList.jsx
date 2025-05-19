import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Ensure apiInstance is correctly imported
import {
    Paper, Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Box, Alert, CircularProgress
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

function WarrantyList() {
    const [warranties, setWarranties] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} });
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    const fetchWarranties = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Cannot fetch warranties.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get('/warranties');
            setWarranties(response.data || []);
        } catch (err) {
            console.error("[WarrantyList] Error fetching warranties:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch warranties.');
            setWarranties([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                fetchWarranties();
            } else {
                setPageError("Please log in to view warranties.");
                setIsLoading(false);
                setWarranties([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchWarranties]);

    const handleDelete = async (warrantyId, warrantyName) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (userCan && !userCan('warranty:delete')) {
            setFeedback({ message: "You do not have permission to delete warranties.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (!window.confirm(`Are you sure you want to delete warranty: "${warrantyName}" (ID: ${warrantyId})?\nThis might fail if it's linked to Items.`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/warranties/${warrantyId}`);
            setFeedback({ message: `Warranty "${warrantyName}" deleted successfully.`, type: 'success' });
            setWarranties(prev => prev.filter(w => w.id !== warrantyId));
        } catch (err) {
            console.error(`[WarrantyList] Error deleting warranty ${warrantyId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete warranty. It might be in use.';
            setFeedback({ message: errorMsg, type: 'error' });
        }
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (isLoading && !pageError && warranties.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && warranties.length === 0) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Manage Warranties</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('warranty:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/warranties/new" startIcon={<FaPlus />}>
                            Add New Warranty
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Manage Warranties</Typography>
                {isAuthenticated && userCan && userCan('warranty:create') && (
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/warranties/new" startIcon={<FaPlus />}>
                        Add New Warranty
                    </Button>
                )}
            </Box>

            {feedback.message && (
                <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && warranties.length > 0 && (
                 <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}

            {isLoading && warranties.length > 0 && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress size={24} /><Typography sx={{ml:1}}>Updating list...</Typography></Box>}

            {!isLoading && warranties.length === 0 && !pageError && (
                <Alert severity="info" sx={{ textAlign: 'center', mb: 2 }}>
                    No warranties found. {isAuthenticated && userCan && userCan('warranty:create') && "Click 'Add New Warranty' to create one."}
                </Alert>
            )}

            {warranties.length > 0 && (
                <TableContainer component={Paper} elevation={2}>
                    <Table sx={{ minWidth: 650 }} aria-label="warranties table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Duration (Months)</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {warranties.map(warranty => (
                                <TableRow hover key={warranty.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component="th" scope="row">{warranty.id}</TableCell>
                                    <TableCell>{warranty.name}</TableCell>
                                    <TableCell>{warranty.duration_months ?? '-'}</TableCell>
                                    <TableCell sx={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={warranty.description || ''}>
                                        {warranty.description || '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {isAuthenticated && userCan && userCan('warranty:update') && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => navigate(`/dashboard/warranties/edit/${warranty.id}`)}
                                                sx={{ mr: 1 }}
                                                startIcon={<FaEdit />}
                                            >
                                                Edit
                                            </Button>
                                        )}
                                        {isAuthenticated && userCan && userCan('warranty:delete') && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete(warranty.id, warranty.name)}
                                                startIcon={<FaTrashAlt />}
                                            >
                                                Delete
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
}

export default WarrantyList;