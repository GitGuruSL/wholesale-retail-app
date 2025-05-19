import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly
import {
    Paper, Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Box, Alert, CircularProgress
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

function UnitList() {
    const [units, setUnits] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} }); // Clear location state
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    const fetchUnits = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Cannot fetch units.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get('/units');
            setUnits(response.data || []);
        } catch (err) {
            console.error("[UnitList] Error fetching units:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch units.');
            setUnits([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                fetchUnits();
            } else {
                setPageError("Please log in to view units.");
                setIsLoading(false);
                setUnits([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchUnits]);

    const handleDelete = async (unitId, unitName) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (userCan && !userCan('unit:delete')) {
            setFeedback({ message: "You do not have permission to delete units.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (!window.confirm(`Are you sure you want to delete unit: "${unitName}" (ID: ${unitId})?\nThis might fail if it's linked to Items.`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/units/${unitId}`);
            setFeedback({ message: `Unit "${unitName}" deleted successfully.`, type: 'success' });
            setUnits(prevUnits => prevUnits.filter(u => u.id !== unitId));
        } catch (err) {
            console.error(`[UnitList] Error deleting unit ${unitId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete unit. It might be in use.';
            setFeedback({ message: errorMsg, type: 'error' });
        }
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (isLoading && !pageError && units.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && units.length === 0) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 800, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Manage Units</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('unit:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/units/new" startIcon={<FaPlus />}>
                            Add New Unit
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Manage Units</Typography>
                {isAuthenticated && userCan && userCan('unit:create') && (
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/units/new" startIcon={<FaPlus />}>
                        Add New Unit
                    </Button>
                )}
            </Box>

            {feedback.message && (
                <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && units.length > 0 && (
                 <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}

            {isLoading && units.length > 0 && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress size={24} /><Typography sx={{ml:1}}>Updating list...</Typography></Box>}

            {!isLoading && units.length === 0 && !pageError && (
                <Alert severity="info" sx={{ textAlign: 'center', mb: 2 }}>
                    No units found. {isAuthenticated && userCan && userCan('unit:create') && "Click 'Add New Unit' to create one."}
                </Alert>
            )}

            {units.length > 0 && (
                <TableContainer component={Paper} elevation={2}>
                    <Table sx={{ minWidth: 650 }} aria-label="units table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                {/* <TableCell>Abbreviation</TableCell> Uncomment if using */}
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {units.map(unit => (
                                <TableRow hover key={unit.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component="th" scope="row">{unit.id}</TableCell>
                                    <TableCell>{unit.name}</TableCell>
                                    {/* <TableCell>{unit.abbreviation || '-'}</TableCell> Uncomment if using */}
                                    <TableCell align="right">
                                        {isAuthenticated && userCan && userCan('unit:update') && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => navigate(`/dashboard/units/edit/${unit.id}`)}
                                                sx={{ mr: 1 }}
                                                startIcon={<FaEdit />}
                                            >
                                                Edit
                                            </Button>
                                        )}
                                        {isAuthenticated && userCan && userCan('unit:delete') && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete(unit.id, unit.name)}
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

export default UnitList;