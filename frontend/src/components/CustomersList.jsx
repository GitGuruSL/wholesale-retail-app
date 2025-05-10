import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Paper, Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Box, Alert, CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly

function CustomersList() {
    const [customers, setCustomers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation();
    // apiInstance is imported directly, remove from useAuth
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} }); // Clear location state
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    const fetchCustomers = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Cannot fetch customers.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get('/customers');
            setCustomers(response.data || []);
        } catch (err) {
            console.error("[CustomersList] Error fetching customers:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch customers.');
            setCustomers([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]); // apiInstance is module-scoped

    useEffect(() => {
        if (!authLoading) { // Wait for authentication process to complete
            if (isAuthenticated) {
                fetchCustomers();
            } else {
                setPageError("Please log in to view customers.");
                setIsLoading(false);
                setCustomers([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchCustomers]);

    const handleDelete = async (customerId, customerName) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (userCan && !userCan('customer:delete')) {
            setFeedback({ message: "You do not have permission to delete customers.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (!window.confirm(`Are you sure you want to delete customer: "${customerName}" (ID: ${customerId})?`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/customers/${customerId}`);
            setFeedback({ message: `Customer "${customerName}" deleted successfully.`, type: 'success' });
            setCustomers(prevCustomers => prevCustomers.filter(cust => cust.id !== customerId));
        } catch (err) {
            console.error(`[CustomersList] Error deleting customer ${customerId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete customer.';
            setFeedback({ message: errorMsg, type: 'error' });
        }
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        // No return for cleanup here
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (isLoading && !pageError && customers.length === 0) { // Show loading only if no page error and no customers yet
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && customers.length === 0) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Manage Customers</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('customer:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/customers/new">
                            Add New Customer
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 1000, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                Manage Customers
            </Typography>
            {feedback.message && (
                <Alert severity={feedback.type === 'success' ? 'success' : 'error'} sx={{ mb: 2, width: '100%' }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && customers.length > 0 && (
                 <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}
            {isAuthenticated && userCan && userCan('customer:create') &&
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/customers/new">
                        Add New Customer
                    </Button>
                </Box>
            }
            {!isLoading && customers.length === 0 && !pageError && (
                <Typography align="center" sx={{ p: 2 }}>
                    No customers found. {isAuthenticated && userCan && userCan('customer:create') && "Try adding one!"}
                </Typography>
            )}
            {customers.length > 0 && (
                <TableContainer component={Paper} elevation={2}>
                    <Table sx={{ minWidth: 750 }} aria-label="customers table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Contact Info</TableCell>
                                <TableCell>City</TableCell>
                                <TableCell>Active</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {customers.map((customer) => (
                                <TableRow
                                    hover
                                    key={customer.id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row">{customer.id}</TableCell>
                                    <TableCell>{customer.name}</TableCell>
                                    <TableCell>{customer.email || '-'}</TableCell>
                                    <TableCell>{customer.contact_info || '-'}</TableCell>
                                    <TableCell>{customer.city || '-'}</TableCell>
                                    <TableCell>{customer.active ? 'Yes' : 'No'}</TableCell>
                                    <TableCell align="right">
                                        {isAuthenticated && userCan && userCan('customer:update') &&
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                component={RouterLink}
                                                to={`/dashboard/customers/edit/${customer.id}`}
                                                sx={{ mr: 1 }}
                                                size="small"
                                            >
                                                Edit
                                            </Button>
                                        }
                                        {isAuthenticated && userCan && userCan('customer:delete') &&
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleDelete(customer.id, customer.name)}
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

export default CustomersList;