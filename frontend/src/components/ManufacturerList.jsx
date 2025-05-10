import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Paper, Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Box, Alert, CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly

function ManufacturerList() {
    const [manufacturers, setManufacturers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth(); // Get userCan

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} });
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    const fetchManufacturers = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Cannot fetch manufacturers.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get('/manufacturers');
            setManufacturers(response.data || []);
        } catch (err) {
            console.error("[ManufacturerList] Error fetching manufacturers:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch manufacturers.');
            setManufacturers([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                fetchManufacturers();
            } else {
                setPageError("Please log in to view manufacturers.");
                setIsLoading(false);
                setManufacturers([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchManufacturers]);

    const handleDelete = async (manufacturerId, manufacturerName) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (userCan && !userCan('manufacturer:delete')) {
            setFeedback({ message: "You do not have permission to delete manufacturers.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (!window.confirm(`Are you sure you want to delete manufacturer: "${manufacturerName}" (ID: ${manufacturerId})?`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/manufacturers/${manufacturerId}`);
            setFeedback({ message: `Manufacturer "${manufacturerName}" deleted successfully.`, type: 'success' });
            setManufacturers(prevManufacturers => prevManufacturers.filter(m => m.id !== manufacturerId));
        } catch (err) {
            console.error(`[ManufacturerList] Error deleting manufacturer ${manufacturerId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete manufacturer.';
            setFeedback({ message: errorMsg, type: 'error' });
        }
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (isLoading && !pageError && manufacturers.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && manufacturers.length === 0) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Manage Manufacturers</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('manufacturer:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/manufacturers/new">
                            Add New Manufacturer
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 1000, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                Manage Manufacturers
            </Typography>
            {feedback.message && (
                <Alert severity={feedback.type === 'success' ? 'success' : 'error'} sx={{ mb: 2, width: '100%' }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && manufacturers.length > 0 && (
                 <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}
            {isAuthenticated && userCan && userCan('manufacturer:create') &&
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/manufacturers/new">
                        Add New Manufacturer
                    </Button>
                </Box>
            }
            {!isLoading && manufacturers.length === 0 && !pageError && (
                <Typography align="center" sx={{ p: 2 }}>
                    No manufacturers found. {isAuthenticated && userCan && userCan('manufacturer:create') && "Try adding one!"}
                </Typography>
            )}
            {manufacturers.length > 0 && (
                <TableContainer component={Paper} elevation={2}>
                    <Table sx={{ minWidth: 750 }} aria-label="manufacturers table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Contact Person</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Telephone</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {manufacturers.map((manufacturer) => (
                                <TableRow
                                    hover
                                    key={manufacturer.id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row">{manufacturer.id}</TableCell>
                                    <TableCell>{manufacturer.name}</TableCell>
                                    <TableCell>{manufacturer.contact_person || '-'}</TableCell>
                                    <TableCell>{manufacturer.email || '-'}</TableCell>
                                    <TableCell>{manufacturer.telephone || '-'}</TableCell>
                                    <TableCell align="right">
                                        {isAuthenticated && userCan && userCan('manufacturer:update') &&
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                component={RouterLink}
                                                to={`/dashboard/manufacturers/edit/${manufacturer.id}`}
                                                sx={{ mr: 1 }}
                                                size="small"
                                            >
                                                Edit
                                            </Button>
                                        }
                                        {isAuthenticated && userCan && userCan('manufacturer:delete') &&
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleDelete(manufacturer.id, manufacturer.name)}
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

export default ManufacturerList;