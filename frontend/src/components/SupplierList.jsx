import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';
import {
    Paper, Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Box, Alert, CircularProgress
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

function SupplierList() {
    const [suppliers, setSuppliers] = useState([]);
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

    const fetchSuppliers = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Cannot fetch suppliers.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get('/suppliers');
            setSuppliers(response.data || []);
        } catch (err) {
            console.error("[SupplierList] Error fetching suppliers:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch suppliers.');
            setSuppliers([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                fetchSuppliers();
            } else {
                setPageError("Please log in to view suppliers.");
                setIsLoading(false);
                setSuppliers([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchSuppliers]);

    const handleDelete = async (supplierId, supplierName) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (userCan && !userCan('supplier:delete')) {
            setFeedback({ message: "You do not have permission to delete suppliers.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (!window.confirm(`Are you sure you want to delete supplier: "${supplierName}" (ID: ${supplierId})?\nThis might fail if the supplier is linked to products.`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/suppliers/${supplierId}`);
            setFeedback({ message: `Supplier "${supplierName}" deleted successfully.`, type: 'success' });
            setSuppliers(prev => prev.filter(s => s.id !== supplierId));
        } catch (err) {
            console.error(`[SupplierList] Error deleting supplier ${supplierId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete supplier. It might be in use.';
            setFeedback({ message: errorMsg, type: 'error' });
        }
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (isLoading && !pageError && suppliers.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && suppliers.length === 0) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 1000, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Manage Suppliers</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('supplier:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/suppliers/new" startIcon={<FaPlus />}>
                            Add New Supplier
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Manage Suppliers</Typography>
                {isAuthenticated && userCan && userCan('supplier:create') && (
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/suppliers/new" startIcon={<FaPlus />}>
                        Add New Supplier
                    </Button>
                )}
            </Box>

            {feedback.message && (
                <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && suppliers.length > 0 && (
                 <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}

            {isLoading && suppliers.length > 0 && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress size={24} /><Typography sx={{ml:1}}>Updating list...</Typography></Box>}

            {!isLoading && suppliers.length === 0 && !pageError && (
                <Alert severity="info" sx={{ textAlign: 'center', mb: 2 }}>
                    No suppliers found. {isAuthenticated && userCan && userCan('supplier:create') && "Click 'Add New Supplier' to create one."}
                </Alert>
            )}

            {suppliers.length > 0 && (
                <TableContainer component={Paper} elevation={2}>
                    <Table sx={{ minWidth: 750 }} aria-label="suppliers table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Contact Person</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Telephone</TableCell>
                                <TableCell>City</TableCell>
                                <TableCell>Default?</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {suppliers.map(supplier => (
                                <TableRow hover key={supplier.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component="th" scope="row">{supplier.id}</TableCell>
                                    <TableCell>{supplier.name}</TableCell>
                                    <TableCell>{supplier.contact_person || '-'}</TableCell>
                                    <TableCell>{supplier.email || '-'}</TableCell>
                                    <TableCell>{supplier.telephone || '-'}</TableCell>
                                    <TableCell>{supplier.city || '-'}</TableCell>
                                    <TableCell>{supplier.is_default_supplier ? 'Yes' : 'No'}</TableCell>
                                    <TableCell align="right">
                                        {isAuthenticated && userCan && userCan('supplier:update') && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => navigate(`/dashboard/suppliers/edit/${supplier.id}`)}
                                                sx={{ mr: 1 }}
                                                startIcon={<FaEdit />}
                                            >
                                                Edit
                                            </Button>
                                        )}
                                        {isAuthenticated && userCan && userCan('supplier:delete') && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete(supplier.id, supplier.name)}
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

export default SupplierList;