import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid,
    FormControl, InputLabel, Select, MenuItem, FormHelperText
} from '@mui/material';

const initialFormDataState = { name: '', category_id: '' };

function SubCategoryForm() {
    const { subCategoryId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    // apiInstance is imported directly. userCan for permissions.
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(subCategoryId);

    const [formData, setFormData] = useState(initialFormDataState);
    const [categories, setCategories] = useState([]);
    const [initialLoading, setInitialLoading] = useState(isEditing); // For fetching existing data or parent categories
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({});
    const [feedback, setFeedback] = useState(null); // For success/error messages from API operations

    const requiredPermission = isEditing ? 'subcategory:update' : 'subcategory:create';

    const fetchRequiredData = useCallback(async () => {
        if (!isAuthenticated) { // Should be caught by useEffect, but defensive
            setPageError("User not authenticated.");
            setInitialLoading(false);
            return;
        }
        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        setFeedback(null);

        try {
            const categoriesResponse = await apiInstance.get('/categories?limit=all');
            setCategories(categoriesResponse.data?.data || categoriesResponse.data || []);

            if (isEditing && subCategoryId) {
                const subCategoryResponse = await apiInstance.get(`/sub-categories/${subCategoryId}`);
                const subCategoryData = subCategoryResponse.data;
                setFormData({
                    name: subCategoryData.name || '',
                    category_id: subCategoryData.category_id?.toString() || ''
                });
            } else {
                setFormData(initialFormDataState);
            }
        } catch (err) {
            console.error("[SubCategoryForm] Failed to load form data:", err);
            const errorMsg = err.response?.data?.message || err.message || "Failed to load required data for the form.";
            setPageError(errorMsg);
        } finally {
            setInitialLoading(false);
        }
    }, [isAuthenticated, isEditing, subCategoryId]); // apiInstance is not a context dependency

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                setPageError("Please log in to manage sub-categories.");
                setInitialLoading(false);
                return;
            }
            if (userCan && !userCan(requiredPermission)) {
                setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} sub-categories.`);
                setInitialLoading(false);
                return;
            }
            fetchRequiredData();
        }
    }, [authLoading, isAuthenticated, userCan, requiredPermission, fetchRequiredData, isEditing]);

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
        if (!formData.name.trim()) errors.name = "Sub-category name cannot be empty.";
        if (!formData.category_id) errors.category_id = "Please select a parent category.";
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
            setFeedback({ message: `You do not have permission to ${isEditing ? 'update' : 'create'} this sub-category.`, type: 'error' });
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setFeedback(null);
        setPageError(null);

        const subCategoryPayload = {
            name: formData.name.trim(),
            category_id: parseInt(formData.category_id, 10)
        };

        try {
            if (isEditing) {
                await apiInstance.put(`/sub-categories/${subCategoryId}`, subCategoryPayload);
            } else {
                await apiInstance.post('/sub-categories', subCategoryPayload);
            }
            navigate('/dashboard/sub-categories', {
                state: { message: `Sub-category "${subCategoryPayload.name}" ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' }
            });
        } catch (err) {
            console.error("[SubCategoryForm] Failed to save sub-category:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} sub-category.`;
            setFeedback({ message: errMsg, type: 'error' });
            if (err.response?.data?.errors) {
                const backendFieldErrors = {};
                err.response.data.errors.forEach(fieldError => {
                    backendFieldErrors[fieldError.path || fieldError.param || 'general'] = fieldError.msg;
                });
                setFormErrors(prev => ({ ...prev, ...backendFieldErrors }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || (initialLoading && !pageError)) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if (pageError && !isSubmitting) { // Show page error if not in submission process
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>
                    {isEditing ? 'Edit Sub-Category' : 'Add New Sub-Category'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/sub-categories')}>
                    Back to List
                </Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit Sub-Category (ID: ${subCategoryId})` : 'Add New Sub-Category'}
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
                            label="Sub-Category Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            error={Boolean(formErrors.name)}
                            helperText={formErrors.name}
                            autoFocus={!isEditing}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth required error={Boolean(formErrors.category_id)} disabled={isSubmitting || initialLoading || categories.length === 0}>
                            <InputLabel id="parent-category-label">Parent Category</InputLabel>
                            <Select
                                labelId="parent-category-label"
                                name="category_id"
                                value={formData.category_id}
                                label="Parent Category"
                                onChange={handleChange}
                            >
                                <MenuItem value=""><em>-- Select Parent Category --</em></MenuItem>
                                {categories.map(cat => (
                                    <MenuItem key={cat.id} value={cat.id.toString()}>{cat.name}</MenuItem>
                                ))}
                            </Select>
                            {formErrors.category_id && <FormHelperText>{formErrors.category_id}</FormHelperText>}
                            {categories.length === 0 && !initialLoading && <FormHelperText error>No parent categories available or failed to load.</FormHelperText>}
                        </FormControl>
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/sub-categories')} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || initialLoading || (userCan && !userCan(requiredPermission))}
                    >
                        {isSubmitting ? <CircularProgress size={24} sx={{color: 'white'}} /> : (isEditing ? 'Update Sub-Category' : 'Create Sub-Category')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default SubCategoryForm;