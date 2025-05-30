import React, { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

// Define the validation schema using Yup
const warrantySchema = yup.object().shape({
    name: yup.string().trim().required('Warranty name is required.'),
    duration_months: yup.number()
        .transform(value => (isNaN(value) || value === null || value === '' ? undefined : Number(value)))
        .nullable()
        .min(0, 'Duration must be a non-negative number.')
        .typeError('Duration must be a number.'), // Handles non-numeric input better
    description: yup.string().trim().nullable(),
});

function WarrantyForm() {
    const { warrantyId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(warrantyId);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isLoading: formLoading }, // isLoading from RHF for async defaultValues
        setError: setFormError // For API errors
    } = useForm({
        resolver: yupResolver(warrantySchema),
        defaultValues: { // Default values for React Hook Form
            name: '',
            duration_months: '', // Keep as string for TextField, Yup will transform
            description: ''
        }
    });

    const [pageError, setPageError] = React.useState(null); // For general page/loading errors not tied to fields

    const requiredPermission = isEditing ? 'warranty:update' : 'warranty:create';

    const fetchWarrantyData = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !warrantyId) return null;
        try {
            const response = await apiInstance.get(`/warranties/${warrantyId}`);
            const data = response.data;
            return {
                name: data.name || '',
                duration_months: data.duration_months?.toString() ?? '',
                description: data.description || ''
            };
        } catch (err) {
            console.error("[WarrantyForm] Error fetching warranty details:", err);
            setPageError(err.response?.data?.message || 'Failed to load warranty data.');
            return null;
        }
    }, [warrantyId, isEditing, isAuthenticated]);

    useEffect(() => {
        const initializeForm = async () => {
            if (!authLoading) {
                if (!isAuthenticated) {
                    setPageError("Please log in to manage warranties.");
                    return;
                }
                if (userCan && !userCan(requiredPermission)) {
                    setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} warranties.`);
                    return;
                }

                if (isEditing) {
                    const data = await fetchWarrantyData();
                    if (data) {
                        reset(data); // Reset form with fetched data
                    }
                } else {
                    reset({ name: '', duration_months: '', description: '' }); // Reset to initial for new form
                    setPageError(null);
                }
            }
        };
        initializeForm();
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchWarrantyData, reset]);


    const onSubmit = async (data) => {
        if (!isAuthenticated) {
            setPageError("Authentication error. Please log in again.");
            return;
        }
        if (userCan && !userCan(requiredPermission)) {
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this warranty.`);
            return;
        }
        setPageError(null);

        const payload = {
            name: data.name.trim(),
            duration_months: data.duration_months === '' || data.duration_months === null ? null : parseInt(data.duration_months, 10),
            description: data.description?.trim() === '' ? null : data.description?.trim(),
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
            setPageError(errMsg); // General error
            if (err.response?.data?.errors) { // Field-specific errors from API
                Object.entries(err.response.data.errors).forEach(([field, message]) => {
                    setFormError(field, { type: 'server', message });
                });
            }
        }
    };

    // Combines authLoading (initial auth check) and formLoading (RHF async defaultValues loading)
    const isPageLoading = authLoading || formLoading;

    if (isPageLoading) {
        return (
            <Paper sx={{ p: 3, m: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress />
                <Typography>Loading warranty form...</Typography>
            </Paper>
        );
    }

    // Display error if not authenticated or no permission, and a pageError exists
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
            {pageError && ( // Display general page errors if any
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            )}
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <Controller
                            name="name"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Warranty Name"
                                    required
                                    fullWidth
                                    disabled={isSubmitting}
                                    error={Boolean(errors.name)}
                                    helperText={errors.name?.message || "e.g., 1 Year Limited, 6 Month RTB"}
                                />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Controller
                            name="duration_months"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Duration (Months)"
                                    type="number" // Still use number for keyboard, Yup handles conversion
                                    fullWidth
                                    disabled={isSubmitting}
                                    inputProps={{ min: "0", step: "1" }}
                                    error={Boolean(errors.duration_months)}
                                    helperText={errors.duration_months?.message || "e.g., 12 (Leave blank if not applicable)"}
                                />
                            )}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Description"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    disabled={isSubmitting}
                                    error={Boolean(errors.description)}
                                    helperText={errors.description?.message || "Details about the warranty terms and conditions..."}
                                />
                            )}
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
                        disabled={isSubmitting || (userCan && !userCan(requiredPermission))}
                    >
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Warranty' : 'Create Warranty')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default WarrantyForm;