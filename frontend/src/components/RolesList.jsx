import React, { useState, useEffect, useCallback } from "react";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiInstance from '../services/api'; // Import apiInstance directly
import {
    Paper, Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Box, Alert, CircularProgress
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

function RolesList() {
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null }); // For general feedback
    // apiInstance is imported directly, userCan for permissions
    const { isAuthenticated, isLoading: authLoading, userCan, fetchRoles: fetchRolesFromContext } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        // Display feedback from navigation state (e.g., after create/edit)
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} }); // Clear location state
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    const fetchRolesList = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Cannot fetch roles.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        // setFeedback({ message: null, type: null }); // Clear previous feedback on new fetch
        try {
            const response = await apiInstance.get('/roles');
            setRoles(response.data || []);
        } catch (err) {
            setPageError(err.response?.data?.message || 'Failed to fetch roles.');
            console.error("Error fetching roles:", err.response?.data || err.message);
            setRoles([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]); // apiInstance is module-scoped

    useEffect(() => {
        if (!authLoading) { // Wait for authentication process to complete
            if (isAuthenticated) {
                fetchRolesList();
            } else {
                setPageError("Please log in to view roles.");
                setIsLoading(false);
                setRoles([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchRolesList]);

    const handleDelete = async (roleId, roleName) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (userCan && !userCan('role:delete')) {
            setFeedback({ message: "You do not have permission to delete roles.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (window.confirm(`Are you sure you want to delete the role "${roleName}" (ID: ${roleId})? This action cannot be undone.`)) {
            // Indicate loading state for delete operation if needed, e.g., by disabling buttons
            setPageError(null);
            try {
                await apiInstance.delete(`/roles/${roleId}`);
                setFeedback({ message: `Role "${roleName}" (ID: ${roleId}) deleted successfully.`, type: 'success' });
                setRoles(prevRoles => prevRoles.filter(role => role.id !== roleId)); // Update local state
                if (typeof fetchRolesFromContext === 'function') { // If context needs update
                    fetchRolesFromContext();
                }
            } catch (err) {
                const errMsg = err.response?.data?.message || `Failed to delete role "${roleName}".`;
                setFeedback({ message: errMsg, type: 'error' });
                console.error(`Error deleting role ID ${roleId}:`, err.response?.data || err.message);
            }
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            // No return for cleanup here
        }
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (isLoading && !pageError && roles.length === 0) { // Show loading only if no page error and no roles yet
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && roles.length === 0) { // If there's a page error and no roles to show
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Manage Roles</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('role:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/roles/add" startIcon={<FaPlus />}>
                            Add New Role
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Manage Roles</Typography>
                {isAuthenticated && userCan && userCan('role:create') && (
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/roles/add" startIcon={<FaPlus />}>
                        Add New Role
                    </Button>
                )}
            </Box>

            {feedback.message && (
                <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && roles.length > 0 && ( // Show pageError as warning if roles are already displayed
                 <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}

            {isLoading && roles.length > 0 && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress size={24} /><Typography sx={{ml:1}}>Updating list...</Typography></Box>}

            {!isLoading && roles.length === 0 && !pageError && (
                <Alert severity="info" sx={{ textAlign: 'center', mb: 2 }}>
                    No roles found. {isAuthenticated && userCan && userCan('role:create') && "Click 'Add New Role' to create one."}
                </Alert>
            )}

            {roles.length > 0 && (
                <TableContainer component={Paper} elevation={2}>
                    <Table sx={{ minWidth: 650 }} aria-label="roles table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Display Name</TableCell>
                                <TableCell>Machine Name</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {roles.map(role => (
                                <TableRow hover key={role.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell component="th" scope="row">{role.id}</TableCell>
                                    <TableCell>{role.display_name}</TableCell>
                                    <TableCell>{role.name}</TableCell>
                                    <TableCell>{role.description || '-'}</TableCell>
                                    <TableCell align="right">
                                        {isAuthenticated && userCan && userCan('role:update') && (
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => navigate(`/dashboard/roles/edit/${role.id}`)}
                                                sx={{ mr: 1 }}
                                                startIcon={<FaEdit />}
                                            >
                                                Edit
                                            </Button>
                                        )}
                                        {isAuthenticated && userCan && userCan('role:delete') && (
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                size="small"
                                                onClick={() => handleDelete(role.id, role.display_name)}
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

export default RolesList;