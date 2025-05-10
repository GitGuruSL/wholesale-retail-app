import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid
} from '@mui/material';

function TaxTypeForm() {
    const { taxTypeId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(taxTypeId);

    const initialFormData = { name: '' };
    const [formData, setFormData] = useState(initialFormData);
    const [initialLoading, setInitialLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const requiredPermission = isEditing ? 'tax_type:update' : 'tax_type:create';

    const fetchTaxTypeDetails = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !taxTypeId) return;

        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        try {
            const response = await apiInstance.get(`/tax-types/${taxTypeId}`);
            setFormData({ name: response.data.name || '' });
        } catch (err) {
            console.error("[TaxTypeForm] Failed to fetch tax type:", err);
            setPageError(err.response?.data?.message || "Failed to load tax type data.");
        } finally {
            setInitialLoading(false);
        }
    }, [taxTypeId, isAuthenticated, isEditing]);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                setPageError("Please log in to manage tax types.");
                setInitialLoading(false);
                return;
            }
            if (userCan && !userCan(requiredPermission)) {
                setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} tax types.`);
                setInitialLoading(false);
                return;
            }
            if (isEditing) {
                fetchTaxTypeDetails();
            } else {
                setFormData(initialFormData);
                setPageError(null);
                setFormErrors({});
                setInitialLoading(false);
            }
        }
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchTaxTypeDetails]);

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
            errors.name = "Tax type name cannot be empty.";
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
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this tax type.`);
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setPageError(null);

        const typeDataPayload = { name: formData.name.trim() };

        try {
            if (isEditing) {
                await apiInstance.put(`/tax-types/${taxTypeId}`, typeDataPayload);
            } else {
                await apiInstance.post('/tax-types', typeDataPayload);
            }
            navigate('/dashboard/tax-types', {
                state: { message: `Tax Type "${typeDataPayload.name}" ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' }
            });
        } catch (err) {
            console.error("[TaxTypeForm] Error saving tax type:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} tax type.`;
            setPageError(errMsg);
            if (err.response?.data?.errors) {
                setFormErrors(prev => ({ ...prev, ...err.response.data.errors }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || (initialLoading && isEditing)) {
        return (
            <Paper sx={{ p: 3, m: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress />
                <Typography>Loading tax type form...</Typography>
            </Paper>
        );
    }

    if ((!isAuthenticated || (userCan && !userCan(requiredPermission))) && pageError) {
         return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>
                    {isEditing ? 'Edit Tax Type' : 'Add New Tax Type'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/tax-types')}>
                    Back to List
                </Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit Tax Type (ID: ${taxTypeId})` : 'Add New Tax Type'}
            </Typography>
            {pageError && !Object.keys(formErrors).length &&
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            }
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Type Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            error={Boolean(formErrors.name)}
                            helperText={formErrors.name || "e.g., Percentage, Fixed Amount"}
                        />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/tax-types')} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || initialLoading || (userCan && !userCan(requiredPermission))}
                    >
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Type' : 'Create Type')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default TaxTypeForm;