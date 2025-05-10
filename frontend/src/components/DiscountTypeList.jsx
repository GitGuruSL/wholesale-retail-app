import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Paper, Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Box, Alert, CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly

function DiscountTypeList() {
    const [discountTypes, setDiscountTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation();
    // apiInstance is imported directly, userCan for permissions
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} }); // Clear location state
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    const fetchDiscountTypes = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Cannot fetch discount types.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get('/discount-types');
            setDiscountTypes(response.data || []);
        } catch (err) {
            console.error("[DiscountTypeList] Error fetching discount types:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch discount types.');
            setDiscountTypes([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                fetchDiscountTypes();
            } else {
                setPageError("Please log in to view discount types.");
                setIsLoading(false);
                setDiscountTypes([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchDiscountTypes]);

    const handleDelete = async (typeId, typeName) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (userCan && !userCan('discount_type:delete')) {
            setFeedback({ message: "You do not have permission to delete discount types.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (!window.confirm(`Are you sure you want to delete discount type: "${typeName}" (ID: ${typeId})?\nThis might fail if it's linked to discounts.`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/discount-types/${typeId}`);
            setFeedback({ message: `Discount type "${typeName}" deleted successfully.`, type: 'success' });
            setDiscountTypes(prevTypes => prevTypes.filter(t => t.id !== typeId));
        } catch (err) {
            console.error(`[DiscountTypeList] Error deleting discount type ${typeId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete discount type.';
            setFeedback({ message: errorMsg, type: 'error' });
        }
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        // No return for cleanup here
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (isLoading && !pageError && discountTypes.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && discountTypes.length === 0) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 800, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Manage Discount Types</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('discount_type:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/discount-types/new">
                            Add New Discount Type
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                Manage Discount Types
            </Typography>
            {feedback.message && (
                <Alert severity={feedback.type === 'success' ? 'success' : 'error'} sx={{ mb: 2, width: '100%' }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && discountTypes.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}
            {isAuthenticated && userCan && userCan('discount_type:create') &&
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/discount-types/new">
                        Add New Discount Type
                    </Button>
                </Box>
            }
            {!isLoading && discountTypes.length === 0 && !pageError && (
                <Typography align="center" sx={{ p: 2 }}>
                    No discount types found. {isAuthenticated && userCan && userCan('discount_type:create') && "Try adding one!"}
                </Typography>
            )}
            {discountTypes.length > 0 && (
                <TableContainer component={Paper} elevation={2}>
                    <Table sx={{ minWidth: 650 }} aria-label="discount types table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {discountTypes.map((type) => (
                                <TableRow
                                    hover
                                    key={type.id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row">{type.id}</TableCell>
                                    <TableCell>{type.name}</TableCell>
                                    <TableCell align="right">
                                        {isAuthenticated && userCan && userCan('discount_type:update') &&
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                component={RouterLink}
                                                to={`/dashboard/discount-types/edit/${type.id}`}
                                                sx={{ mr: 1 }}
                                                size="small"
                                            >
                                                Edit
                                            </Button>
                                        }
                                        {isAuthenticated && userCan && userCan('discount_type:delete') &&
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleDelete(type.id, type.name)}
                                                size="small"
                                            >
                                                Delete
                                            </Button>
                                        }
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

export default DiscountTypeList;