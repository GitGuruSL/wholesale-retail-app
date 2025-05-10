import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Paper, Typography, Button, Table, TableHead, TableRow, TableCell,
    TableBody, TableContainer, Box, Alert, CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';

function CategoryList() {
    const [categories, setCategories] = useState([]);
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

    const fetchCategories = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Cannot fetch categories.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get('/categories');
            setCategories(response.data || []);
        } catch (err) {
            console.error("[CategoryList] Error fetching categories:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch categories.');
            setCategories([]);
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                fetchCategories();
            } else {
                setPageError("Please log in to view categories.");
                setIsLoading(false);
                setCategories([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchCategories]);

    const handleDelete = async (categoryId, categoryName) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (userCan && !userCan('category:delete')) {
            setFeedback({ message: "You do not have permission to delete categories.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (!window.confirm(`Are you sure you want to delete category: "${categoryName}" (ID: ${categoryId})?\nThis might fail if it's linked to products or sub-categories.`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/categories/${categoryId}`);
            setFeedback({ message: `Category "${categoryName}" deleted successfully.`, type: 'success' });
            setCategories(prevCategories => prevCategories.filter(cat => cat.id !== categoryId));
        } catch (err) {
            console.error(`[CategoryList] Error deleting category ${categoryId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete category.';
            setFeedback({ message: errorMsg, type: 'error' });
        }
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        // No return for cleanup here as handleDelete is an event handler
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (isLoading && !pageError && categories.length === 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && categories.length === 0) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 800, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Manage Categories</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('category:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/categories/new">
                            Add New Category
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                Manage Categories
            </Typography>
            {feedback.message && (
                <Alert severity={feedback.type === 'success' ? 'success' : 'error'} sx={{ mb: 2, width: '100%' }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && categories.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}
            {isAuthenticated && userCan && userCan('category:create') &&
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/categories/new">
                        Add New Category
                    </Button>
                </Box>
            }
            {!isLoading && categories.length === 0 && !pageError && (
                <Typography align="center" sx={{ p: 2 }}>
                    No categories found. {isAuthenticated && userCan && userCan('category:create') && "Try adding one!"}
                </Typography>
            )}
            {categories.length > 0 && (
                <TableContainer component={Paper} elevation={2}>
                    <Table sx={{ minWidth: 650 }} aria-label="categories table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow
                                    key={category.id}
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row">{category.id}</TableCell>
                                    <TableCell>{category.name}</TableCell>
                                    <TableCell>{category.description || '-'}</TableCell>
                                    <TableCell align="right">
                                        {isAuthenticated && userCan && userCan('category:update') &&
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                component={RouterLink}
                                                to={`/dashboard/categories/edit/${category.id}`}
                                                sx={{ mr: 1 }}
                                                size="small"
                                            >
                                                Edit
                                            </Button>
                                        }
                                        {isAuthenticated && userCan && userCan('category:delete') &&
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleDelete(category.id, category.name)}
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

export default CategoryList;