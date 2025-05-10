import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, TextField, Button, Box, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly

function DiscountTypeForm() {
    const { discountTypeId } = useParams(); // Matches route parameter
    const navigate = useNavigate();
    // apiInstance is imported directly, userCan for permissions
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(discountTypeId);

    const [name, setName] = useState('');
    const [initialLoading, setInitialLoading] = useState(isEditing); // For fetching existing data
    const [isSubmitting, setIsSubmitting] = useState(false); // For form submission
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({}); // For field-specific errors

    const requiredPermission = isEditing ? 'discount_type:update' : 'discount_type:create';

    const fetchDiscountTypeDetails = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !discountTypeId) return;

        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        try {
            const response = await apiInstance.get(`/discount-types/${discountTypeId}`);
            setName(response.data.name);
        } catch (err) {
            console.error("[DiscountTypeForm] Failed to fetch discount type:", err);
            setPageError(err.response?.data?.message || "Failed to load discount type data. You may not have permission or the item does not exist.");
        } finally {
            setInitialLoading(false);
        }
    }, [discountTypeId, isAuthenticated, isEditing]);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                setPageError("Please log in to manage discount types.");
                setInitialLoading(false);
                return;
            }
            if (userCan && !userCan(requiredPermission)) {
                setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} discount types.`);
                setInitialLoading(false);
                return;
            }
            if (isEditing) {
                fetchDiscountTypeDetails();
            } else {
                // Reset form for 'create' mode
                setName('');
                setPageError(null);
                setFormErrors({});
                setInitialLoading(false);
            }
        }
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchDiscountTypeDetails]);

    const validateForm = () => {
        const errors = {};
        if (!name.trim()) {
            errors.name = "Discount type name cannot be empty.";
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
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this discount type.`);
            return;
        }
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        setPageError(null);

        const discountTypeData = { name: name.trim() };

        try {
            if (isEditing) {
                await apiInstance.put(`/discount-types/${discountTypeId}`, discountTypeData);
            } else {
                await apiInstance.post('/discount-types', discountTypeData);
            }
            navigate('/dashboard/discount-types', {
                state: {
                    message: `Discount Type "${discountTypeData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[DiscountTypeForm] Error saving discount type:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} discount type.`;
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
                    {isEditing ? 'Edit Discount Type' : 'Add New Discount Type'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/discount-types')}>
                    Back to List
                </Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit Discount Type (ID: ${discountTypeId})` : 'Add New Discount Type'}
            </Typography>
            {pageError && !formErrors.name &&
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            }
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <TextField
                    label="Discount Type Name"
                    variant="outlined"
                    fullWidth
                    required
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        if (formErrors.name) setFormErrors(prev => ({ ...prev, name: null }));
                    }}
                    error={Boolean(formErrors.name)}
                    helperText={formErrors.name}
                    disabled={isSubmitting || initialLoading}
                    placeholder="e.g., Percentage, Fixed Amount, Seasonal"
                    sx={{ mb: 2 }}
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        onClick={() => navigate('/dashboard/discount-types')}
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
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Type' : 'Create Type')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default DiscountTypeForm;