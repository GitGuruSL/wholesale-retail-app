import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid, FormHelperText
} from '@mui/material';

const initialSpecialCategoryFormData = { name: '', description: '' };

function SpecialCategoryForm() {
    const { specialCategoryId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    // apiInstance is imported directly. userCan for permissions.
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(specialCategoryId);

    const [formData, setFormData] = useState(initialSpecialCategoryFormData);
    const [initialLoading, setInitialLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [feedback, setFeedback] = useState(null);

    const requiredPermission = isEditing ? 'specialcategory:update' : 'specialcategory:create'; // Adjust

    const fetchSpecialCategoryDetails = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !specialCategoryId) {
            setInitialLoading(false); // Ensure loading stops if conditions not met
            return;
        }
        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        setFeedback(null);
        try {
            const response = await apiInstance.get(`/special-categories/${specialCategoryId}`);
            setFormData({
                name: response.data.name || '',
                description: response.data.description || ''
            });
        } catch (err) {
            console.error("[SpecialCategoryForm] Failed to fetch special category:", err);
            setPageError(err.response?.data?.message || "Failed to load special category data.");
        } finally {
            setInitialLoading(false);
        }
    }, [specialCategoryId, isAuthenticated, isEditing]); // apiInstance not needed as dependency

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                setPageError("Please log in to manage special categories.");
                setInitialLoading(false);
                return;
            }
            if (userCan && !userCan(requiredPermission)) {
                setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} special categories.`);
                setInitialLoading(false);
                return;
            }
            if (isEditing) {
                fetchSpecialCategoryDetails();
            } else {
                setFormData(initialSpecialCategoryFormData);
                setPageError(null);
                setFormErrors({});
                setInitialLoading(false); // Done "loading" for new form
            }
        }
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchSpecialCategoryDetails]);
    
    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} });
            const timer = setTimeout(() => setFeedback(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [location.state, navigate, location.pathname]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
        if (feedback) setFeedback(null);
        if (pageError) setPageError(null);
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = "Category name cannot be empty.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (userCan && !userCan(requiredPermission)) {
            setFeedback({ message: `You do not have permission to ${isEditing ? 'update' : 'create'} this special category.`, type: 'error' });
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setFeedback(null);
        setPageError(null);

        const categoryData = {
            name: formData.name.trim(),
            description: formData.description.trim() === '' ? null : formData.description.trim(),
        };

        try {
            if (isEditing) {
                await apiInstance.put(`/special-categories/${specialCategoryId}`, categoryData);
            } else {
                await apiInstance.post('/special-categories', categoryData);
            }
            navigate('/dashboard/special-categories', {
                state: {
                    message: `Special Category "${categoryData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[SpecialCategoryForm] Error saving special category:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} special category.`;
            setFeedback({ message: errMsg, type: 'error' });
            if (err.response?.data?.errors) {
                const backendErrors = {};
                err.response.data.errors.forEach(fieldError => {
                    backendErrors[fieldError.path || fieldError.param || 'general'] = fieldError.msg;
                });
                setFormErrors(prev => ({ ...prev, ...backendErrors }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || (initialLoading && isEditing && !pageError) ) { // Show loading if auth or fetching for edit
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && !isSubmitting) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>
                    {isEditing ? 'Edit Special Category' : 'Add New Special Category'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/special-categories')}>
                    Back to List
                </Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit Special Category (ID: ${specialCategoryId})` : 'Add New Special Category'}
            </Typography>
            {feedback && (
                <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setFeedback(null)}>
                    {feedback.message}
                </Alert>
            )}
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Category Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            placeholder="e.g., Featured, On Sale, New Arrivals"
                            error={Boolean(formErrors.name)}
                            helperText={formErrors.name}
                            autoFocus={!isEditing}
                            sx={{ mb: 1 }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Description (Optional)"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            fullWidth
                            multiline
                            rows={3}
                            disabled={isSubmitting || initialLoading}
                            placeholder="Optional: A brief description of the special category"
                            error={Boolean(formErrors.description)}
                            helperText={formErrors.description}
                        />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => navigate('/dashboard/special-categories')}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        type="submit"
                        disabled={isSubmitting || initialLoading || (userCan && !userCan(requiredPermission))}
                    >
                        {isSubmitting ? <CircularProgress size={24} sx={{color: 'white'}} /> : (isEditing ? 'Update Category' : 'Create Category')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default SpecialCategoryForm;