import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';
import {
    Paper, Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Box, Alert, CircularProgress, IconButton
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus, FaEye } from 'react-icons/fa';

function UserList() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, isLoading: authLoading, userCan, user: loggedInUser } = useAuth();

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} });
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    const fetchUsers = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Cannot fetch users.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            // Assuming API returns role_name and current_store_name or similar
            const response = await apiInstance.get('/users?include=role,store');
            setUsers(response.data || []);
        } catch (err) {
            console.error("[UserList] Error fetching users:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch users.');
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                fetchUsers();
            } else {
                setPageError("Please log in to view users.");
                setIsLoading(false);
                setUsers([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchUsers]);

    const handleDelete = async (userIdToDelete, username) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        // Adjust permission name as needed, e.g., 'user:delete_any'
        if (userCan && !userCan('user:delete')) {
            setFeedback({ message: "You do not have permission to delete users.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (loggedInUser && loggedInUser.id === userIdToDelete) {
            setFeedback({ message: "You cannot delete your own account.", type: 'error'});
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (!window.confirm(`Are you sure you want to delete user "${username}" (ID: ${userIdToDelete})?`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/users/${userIdToDelete}`);
            setFeedback({ message: `User "${username}" deleted successfully.`, type: 'success' });
            setUsers(prev => prev.filter(u => u.id !== userIdToDelete));
        } catch (err) {
            console.error(`[UserList] Error deleting user ${userIdToDelete}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete user.';
            setFeedback({ message: errorMsg, type: 'error' });
        }
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (isLoading && !pageError && users.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && users.length === 0) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 1000, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Manage Users</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('user:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/users/new" startIcon={<FaPlus />}>
                            Add New User
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }

    const canCreate = userCan ? userCan('user:create') : false;
    const canUpdate = userCan ? userCan('user:update_any') : false; // Or 'user:update_self'
    const canDelete = userCan ? userCan('user:delete') : false; // Or 'user:delete_any'
    const canView = userCan ? userCan('user:read_any') : false; // Or 'user:read_self'

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Manage Users</Typography>
                {isAuthenticated && canCreate && (
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/users/new" startIcon={<FaPlus />}>
                        Add New User
                    </Button>
                )}
            </Box>

            {feedback.message && (
                <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && users.length > 0 && (
                 <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}

            {isLoading && users.length > 0 && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress size={24} /><Typography sx={{ml:1}}>Updating list...</Typography></Box>}

            {!isLoading && users.length === 0 && !pageError && (
                <Alert severity="info" sx={{ textAlign: 'center', mb: 2 }}>
                    No users found. {isAuthenticated && canCreate && "Click 'Add New User' to create one."}
                </Alert>
            )}

            {users.length > 0 && (
                <TableContainer component={Paper} elevation={2}>
                    <Table sx={{ minWidth: 750 }} aria-label="users table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Username</TableCell>
                                <TableCell>Full Name</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Role</TableCell>
                                <TableCell>Store</TableCell>
                                <TableCell>Active</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {users.map(user => (
                                <TableRow hover key={user.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>{user.id}</TableCell>
                                    <TableCell>{user.username}</TableCell>
                                    <TableCell>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>{user.role?.name || 'N/A'}</TableCell>
                                    <TableCell>{user.store?.name || 'N/A'}</TableCell>
                                    <TableCell>{user.is_active ? 'Yes' : 'No'}</TableCell>
                                    <TableCell align="right">
                                        {isAuthenticated && canView && (
                                            <IconButton size="small" component={RouterLink} to={`/dashboard/users/view/${user.id}`} title="View User">
                                                <FaEye />
                                            </IconButton>
                                        )}
                                        {isAuthenticated && canUpdate && ( // Or check if user.id === loggedInUser.id for self-edit
                                            <IconButton size="small" component={RouterLink} to={`/dashboard/users/edit/${user.id}`} title="Edit User" sx={{ ml: 0.5 }}>
                                                <FaEdit />
                                            </IconButton>
                                        )}
                                        {isAuthenticated && canDelete && loggedInUser?.id !== user.id && (
                                            <IconButton size="small" onClick={() => handleDelete(user.id, user.username)} title="Delete User" color="error" sx={{ ml: 0.5 }}>
                                                <FaTrashAlt />
                                            </IconButton>
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

export default UserList;