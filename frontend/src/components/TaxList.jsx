import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';
import {
    Paper, Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Box, Alert, CircularProgress
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

function TaxList() {
    const [taxes, setTaxes] = useState([]);
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

    const fetchTaxes = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Cannot fetch taxes.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            // Assuming your API returns tax_type_name or similar with the tax object
            const response = await apiInstance.get('/taxes?include=tax_type');
            setTaxes(response.data || []);
        } catch (err) {
            console.error("[TaxList] Error fetching taxes:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch taxes.');
            setTaxes([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                fetchTaxes();
            } else {
                setPageError("Please log in to view taxes.");
                setIsLoading(false);
                setTaxes([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchTaxes]);

    const handleDelete = async (taxId, taxName) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (userCan && !userCan('tax:delete')) {
            setFeedback({ message: "You do not have permission to delete taxes.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (!window.confirm(`Are you sure you want to delete tax: "${taxName}" (ID: ${taxId})?\nThis might fail if it's linked to products.`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/taxes/${taxId}`);
            setFeedback({ message: `Tax "${taxName}" deleted successfully.`, type: 'success' });
            setTaxes(prev => prev.filter(t => t.id !== taxId));
        } catch (err) {
            console.error(`[TaxList] Error deleting tax ${taxId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete tax. It might be in use.';
            setFeedback({ message: errorMsg, type: 'error' });
        }
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (isLoading && !pageError && taxes.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && taxes.length === 0) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Manage Taxes</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('tax:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/taxes/new" startIcon={<FaPlus />}>
                            Add New Tax
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Manage Taxes</Typography>
                {isAuthenticated && userCan && userCan('tax:create') && (
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/taxes/new" startIcon={<FaPlus />}>
                        Add New Tax
                    </Button>
                )}
            </Box>

            {feedback.message && (
                <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && taxes.length > 0 && (
                 <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}

            {isLoading && taxes.length > 0 && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress size={24} /><Typography sx={{ml:1}}>Updating list...</Typography></Box>}

            {!isLoading && taxes.length === 0 && !pageError && (
                <Alert severity="info" sx={{ textAlign: 'center', mb: 2 }}>
                    No taxes found. {isAuthenticated && userCan && userCan('tax:create') && "Click 'Add New Tax' to create one."}
                </Alert>
            )}

            {taxes.length > 0 && (
                <TableContainer component={Paper} elevation={2}>
                    <Table sx={{ minWidth: 650 }} aria-label="taxes table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Rate (%)</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {taxes.map(tax => (
                                <TableRow hover key={tax.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component="th" scope="row">{tax.id}</TableCell>
                                    <TableCell>{tax.name}</TableCell>
                                    <TableCell>{tax.rate}</TableCell>
                                    <TableCell>{tax.tax_type?.name || `Type ID: ${tax.tax_type_id}`}</TableCell>
                                    <TableCell align="right">
                                        {isAuthenticated && userCan && userCan('tax:update') && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => navigate(`/dashboard/taxes/edit/${tax.id}`)}
                                                sx={{ mr: 1 }}
                                                startIcon={<FaEdit />}
                                            >
                                                Edit
                                            </Button>
                                        )}
                                        {isAuthenticated && userCan && userCan('tax:delete') && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete(tax.id, tax.name)}
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

export default TaxList;