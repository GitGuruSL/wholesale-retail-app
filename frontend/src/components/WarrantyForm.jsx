import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Ensure apiInstance is correctly imported if not from useAuth
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid
} from '@mui/material';

function WarrantyForm() {
    const { warrantyId } = useParams();
    const navigate = useNavigate();
    // Assuming apiInstance is now directly imported or correctly provided by useAuth
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(warrantyId);

    const initialFormData = {
        name: '',
        duration_months: '',
        description: ''
    };
    const [formData, setFormData] = useState(initialFormData);
    const [initialLoading, setInitialLoading] = useState(isEditing); // For fetching existing data
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null); // For general page/loading errors
    const [formErrors, setFormErrors] = useState({}); // For field-specific errors

    const requiredPermission = isEditing ? 'warranty:update' : 'warranty:create';

    const fetchWarrantyData = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !warrantyId) return;

        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        try {
            const response = await apiInstance.get(`/warranties/${warrantyId}`);
            const data = response.data;
            setFormData({
                name: data.name || '',
                duration_months: data.duration_months?.toString() ?? '',
                description: data.description || ''
            });
        } catch (err) {
            console.error("[WarrantyForm] Error fetching warranty details:", err);
            setPageError(err.response?.data?.message || 'Failed to load warranty data.');
        } finally {
            setInitialLoading(false);
        }
    }, [warrantyId, isEditing, isAuthenticated]);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                setPageError("Please log in to manage warranties.");
                setInitialLoading(false);
                return;
            }
            if (userCan && !userCan(requiredPermission)) {
                setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} warranties.`);
                setInitialLoading(false);
                return;
            }
            if (isEditing) {
                fetchWarrantyData();
            } else {
                setFormData(initialFormData);
                setPageError(null);
                setFormErrors({});
                setInitialLoading(false);
            }
        }
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchWarrantyData]);

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
            errors.name = "Warranty name cannot be empty.";
        }
        if (formData.duration_months.trim() !== '') {
            const duration = parseInt(formData.duration_months, 10);
            if (isNaN(duration) || duration < 0) {
                errors.duration_months = "Duration must be a non-negative number or empty.";
            }
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
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this warranty.`);
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setPageError(null);

        const payload = {
            name: formData.name.trim(),
            duration_months: formData.duration_months.trim() === '' ? null : parseInt(formData.duration_months, 10),
            description: formData.description.trim() === '' ? null : formData.description.trim(),
        };

        try {
            if (isEditing) {
                await apiInstance.put(`/warranties/${warrantyId}`, payload);
            } else {
                await apiInstance.post('/warranties', payload);
            }
            navigate('/dashboard/warranties', {
                state: { message: `Warranty "${payload.name}" ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' }
            });
        } catch (err) {
            console.error("[WarrantyForm] Error saving warranty:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} warranty.`;
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
                <Typography>Loading warranty form...</Typography>
            </Paper>
        );
    }

    if ((!isAuthenticated || (userCan && !userCan(requiredPermission))) && pageError) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>
                    {isEditing ? 'Edit Warranty' : 'Add New Warranty'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/warranties')}>
                    Back to List
                </Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit Warranty (ID: ${warrantyId})` : 'Add New Warranty'}
            </Typography>
            {pageError && !Object.keys(formErrors).length && (
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            )}
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Warranty Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            error={Boolean(formErrors.name)}
                            helperText={formErrors.name || "e.g., 1 Year Limited, 6 Month RTB"}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Duration (Months)"
                            name="duration_months"
                            type="number"
                            value={formData.duration_months}
                            onChange={handleChange}
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            inputProps={{ min: "0", step: "1" }}
                            error={Boolean(formErrors.duration_months)}
                            helperText={formErrors.duration_months || "e.g., 12 (Leave blank if not applicable)"}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            fullWidth
                            multiline
                            rows={3}
                            disabled={isSubmitting || initialLoading}
                            error={Boolean(formErrors.description)}
                            helperText={formErrors.description || "Details about the warranty terms and conditions..."}
                        />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/warranties')} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || initialLoading || (userCan && !userCan(requiredPermission))}
                    >
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Warranty' : 'Create Warranty')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default WarrantyForm;