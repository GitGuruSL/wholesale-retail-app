import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid
} from '@mui/material';

function UnitForm() {
    const { unitId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(unitId);

    const initialFormData = { name: '' /*, abbreviation: '' */ }; // Add abbreviation if needed
    const [formData, setFormData] = useState(initialFormData);
    const [initialLoading, setInitialLoading] = useState(isEditing); // For fetching existing data
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({}); // For field-specific errors

    const requiredPermission = isEditing ? 'unit:update' : 'unit:create';

    const fetchUnitDetails = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !unitId) return;

        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        try {
            const response = await apiInstance.get(`/units/${unitId}`);
            setFormData({
                name: response.data.name || '',
                // abbreviation: response.data.abbreviation || '' // Uncomment if using abbreviation
            });
        } catch (err) {
            console.error("[UnitForm] Failed to fetch unit:", err);
            setPageError(err.response?.data?.message || "Failed to load unit data. You may not have permission or the item does not exist.");
        } finally {
            setInitialLoading(false);
        }
    }, [unitId, isAuthenticated, isEditing]);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                setPageError("Please log in to manage units.");
                setInitialLoading(false);
                return;
            }
            if (userCan && !userCan(requiredPermission)) {
                setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} units.`);
                setInitialLoading(false);
                return;
            }
            if (isEditing) {
                fetchUnitDetails();
            } else {
                // Reset form for 'create' mode
                setFormData(initialFormData);
                setPageError(null);
                setFormErrors({});
                setInitialLoading(false);
            }
        }
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchUnitDetails]);

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
            errors.name = "Unit name cannot be empty.";
        }
        // Add validation for abbreviation if needed
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
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this unit.`);
            return;
        }
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setPageError(null);

        const unitDataPayload = {
            name: formData.name.trim(),
            // abbreviation: formData.abbreviation.trim() === '' ? null : formData.abbreviation.trim(), // Uncomment if using
        };

        try {
            if (isEditing) {
                await apiInstance.put(`/units/${unitId}`, unitDataPayload);
            } else {
                await apiInstance.post('/units', unitDataPayload);
            }
            navigate('/dashboard/units', {
                state: {
                    message: `Unit "${unitDataPayload.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[UnitForm] Error saving unit:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} unit.`;
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
                    {isEditing ? 'Edit Unit' : 'Add New Unit'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/units')}>
                    Back to List
                </Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit Unit (ID: ${unitId})` : 'Add New Unit'}
            </Typography>
            {pageError && !Object.keys(formErrors).length &&
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            }
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Unit Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            placeholder="e.g., Kilogram, Piece, Liter"
                            error={Boolean(formErrors.name)}
                            helperText={formErrors.name}
                            sx={{ mb: 1 }}
                        />
                    </Grid>
                    {/* Uncomment if using abbreviation
                    <Grid item xs={12}>
                        <TextField
                            label="Abbreviation (Optional)"
                            name="abbreviation"
                            value={formData.abbreviation}
                            onChange={handleChange}
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            placeholder="e.g., kg, pc, L"
                            error={Boolean(formErrors.abbreviation)}
                            helperText={formErrors.abbreviation}
                        />
                    </Grid>
                    */}
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => navigate('/dashboard/units')}
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
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Unit' : 'Create Unit')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default UnitForm;