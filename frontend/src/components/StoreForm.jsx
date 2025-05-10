import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid
} from '@mui/material';

function StoreForm() {
    const { storeId } = useParams();
    const navigate = useNavigate();
    // apiInstance is imported directly, userCan for permissions
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(storeId);

    const initialFormData = { name: '', address: '', contact_info: '' };
    const [formData, setFormData] = useState(initialFormData);
    const [initialLoading, setInitialLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const requiredPermission = isEditing ? 'store:update' : 'store:create';

    const fetchStoreDetails = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !storeId) return;

        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        try {
            const response = await apiInstance.get(`/stores/${storeId}`);
            const data = response.data;
            setFormData({
                name: data.name || '',
                address: data.address || '',
                contact_info: data.contact_info || ''
            });
        } catch (err) {
            console.error("[StoreForm] Failed to fetch store:", err);
            setPageError(err.response?.data?.message || "Failed to load store data. You may not have permission or the item does not exist.");
        } finally {
            setInitialLoading(false);
        }
    }, [storeId, isAuthenticated, isEditing]);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                setPageError("Please log in to manage stores.");
                setInitialLoading(false);
                return;
            }
            if (userCan && !userCan(requiredPermission)) {
                setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} stores.`);
                setInitialLoading(false);
                return;
            }
            if (isEditing) {
                fetchStoreDetails();
            } else {
                setFormData(initialFormData);
                setPageError(null);
                setFormErrors({});
                setInitialLoading(false);
            }
        }
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchStoreDetails]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = "Store name cannot be empty.";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            setPageError("Authentication error. Please log in again.");
            return;
        }
        if (userCan && !userCan(requiredPermission)) {
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this store.`);
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setPageError(null);

        const storeDataPayload = {
            name: formData.name.trim(),
            address: formData.address.trim() === '' ? null : formData.address.trim(),
            contact_info: formData.contact_info.trim() === '' ? null : formData.contact_info.trim(),
        };

        try {
            if (isEditing) {
                await apiInstance.put(`/stores/${storeId}`, storeDataPayload);
            } else {
                await apiInstance.post('/stores', storeDataPayload);
            }
            navigate('/dashboard/stores', {
                state: {
                    message: `Store "${storeDataPayload.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[StoreForm] Error saving store:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} store.`;
            setPageError(errMsg);
            if (err.response?.data?.errors) {
                const backendErrors = {};
                for (const key in err.response.data.errors) {
                    backendErrors[key] = err.response.data.errors[key].join(', ');
                }
                setFormErrors(prev => ({ ...prev, ...backendErrors }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (initialLoading && isEditing) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    if ((!isAuthenticated || (userCan && !userCan(requiredPermission))) && pageError) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>
                    {isEditing ? 'Edit Store' : 'Add New Store'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/stores')}>
                    Back to List
                </Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit Store (ID: ${storeId})` : 'Add New Store'}
            </Typography>
            {pageError && !Object.keys(formErrors).length &&
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            }
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Store Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            placeholder="e.g., Main Branch, Downtown Outlet"
                            error={Boolean(formErrors.name)}
                            helperText={formErrors.name}
                            sx={{ mb: 1 }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Address"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            fullWidth
                            multiline
                            rows={3}
                            disabled={isSubmitting || initialLoading}
                            placeholder="e.g., 123 Main St, Anytown, USA"
                            error={Boolean(formErrors.address)}
                            helperText={formErrors.address}
                            sx={{ mb: 1 }}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Contact Info"
                            name="contact_info"
                            value={formData.contact_info}
                            onChange={handleChange}
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            placeholder="e.g., (555) 123-4567, manager@example.com"
                            error={Boolean(formErrors.contact_info)}
                            helperText={formErrors.contact_info}
                        />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => navigate('/dashboard/stores')}
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
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Store' : 'Create Store')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default StoreForm;