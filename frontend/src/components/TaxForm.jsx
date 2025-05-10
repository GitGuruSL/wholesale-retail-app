import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid,
    FormControl, InputLabel, Select, MenuItem, FormHelperText
} from '@mui/material';

function TaxForm() {
    const { taxId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(taxId);

    const initialFormData = { name: '', rate: '', tax_type_id: '' };
    const [formData, setFormData] = useState(initialFormData);
    const [taxTypeOptions, setTaxTypeOptions] = useState([]);

    const [initialLoading, setInitialLoading] = useState(true); // Combined loading for dropdown and tax data
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null); // For general page/loading errors
    const [formErrors, setFormErrors] = useState({}); // For field-specific errors

    const requiredPermission = isEditing ? 'tax:update' : 'tax:create';

    const fetchTaxTypes = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const response = await apiInstance.get('/tax-types?limit=all');
            setTaxTypeOptions(response.data?.data || response.data || []);
        } catch (err) {
            console.error("[TaxForm] Error fetching tax types:", err);
            setPageError(err.response?.data?.message || 'Failed to load tax type options.');
            setTaxTypeOptions([]);
        }
    }, [isAuthenticated]);

    const fetchTaxData = useCallback(async () => {
        if (!isEditing || !taxId || !isAuthenticated) return;
        setPageError(null); // Clear previous errors
        try {
            const response = await apiInstance.get(`/taxes/${taxId}`);
            const data = response.data;
            setFormData({
                name: data.name || '',
                rate: data.rate?.toString() || '',
                tax_type_id: data.tax_type_id?.toString() || ''
            });
        } catch (err) {
            console.error("[TaxForm] Error fetching tax details:", err);
            setPageError(err.response?.data?.message || 'Failed to load tax data.');
        }
    }, [isEditing, taxId, isAuthenticated]);

    useEffect(() => {
        const loadAllData = async () => {
            if (!authLoading) {
                if (!isAuthenticated) {
                    setPageError("Please log in to manage taxes.");
                    setInitialLoading(false);
                    return;
                }
                if (userCan && !userCan(requiredPermission)) {
                    setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} taxes.`);
                    setInitialLoading(false);
                    return;
                }

                setInitialLoading(true);
                setPageError(null);
                setFormErrors({});

                await fetchTaxTypes(); // Fetch types first

                if (isEditing && taxId) {
                    await fetchTaxData();
                } else if (!isEditing) {
                    setFormData(initialFormData); // Reset form for 'create' mode
                }
                setInitialLoading(false);
            }
        };
        loadAllData();
    }, [authLoading, isAuthenticated, userCan, requiredPermission, isEditing, taxId, fetchTaxTypes, fetchTaxData]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = "Tax name is required.";
        const rateVal = parseFloat(formData.rate);
        if (formData.rate.trim() === '' || isNaN(rateVal) || rateVal < 0) {
            errors.rate = "A valid non-negative rate is required.";
        }
        if (!formData.tax_type_id) errors.tax_type_id = "A tax type must be selected.";
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
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this tax.`);
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setPageError(null);

        const taxDataPayload = {
            name: formData.name.trim(),
            rate: parseFloat(formData.rate),
            tax_type_id: parseInt(formData.tax_type_id, 10)
        };

        try {
            if (isEditing) {
                await apiInstance.put(`/taxes/${taxId}`, taxDataPayload);
            } else {
                await apiInstance.post('/taxes', taxDataPayload);
            }
            navigate('/dashboard/taxes', {
                state: { message: `Tax "${taxDataPayload.name}" ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' }
            });
        } catch (err) {
            console.error("[TaxForm] Error saving tax:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} tax.`;
            setPageError(errMsg); // Show general error
            if (err.response?.data?.errors) { // For backend field-specific errors
                setFormErrors(prev => ({ ...prev, ...err.response.data.errors }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || initialLoading) {
        return (
            <Paper sx={{ p: 3, m: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <CircularProgress />
                <Typography>Loading tax form...</Typography>
            </Paper>
        );
    }

    if ((!isAuthenticated || (userCan && !userCan(requiredPermission))) && pageError) {
         return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>
                    {isEditing ? 'Edit Tax' : 'Add New Tax'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/taxes')}>
                    Back to List
                </Button>
            </Paper>
        );
    }


    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit Tax (ID: ${taxId})` : 'Add New Tax'}
            </Typography>
            {pageError && !Object.keys(formErrors).length && (
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            )}
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Tax Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={isSubmitting}
                            error={Boolean(formErrors.name)}
                            helperText={formErrors.name || "e.g., VAT 5%, GST 10%"}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Rate (%)"
                            name="rate"
                            type="number"
                            value={formData.rate}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={isSubmitting}
                            inputProps={{ step: "any", min: "0" }}
                            error={Boolean(formErrors.rate)}
                            helperText={formErrors.rate || "e.g., 5 or 10.5"}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControl fullWidth required error={Boolean(formErrors.tax_type_id)} disabled={isSubmitting || taxTypeOptions.length === 0}>
                            <InputLabel id="tax-type-label">Tax Type</InputLabel>
                            <Select
                                labelId="tax-type-label"
                                name="tax_type_id"
                                value={formData.tax_type_id}
                                label="Tax Type"
                                onChange={handleChange}
                            >
                                <MenuItem value=""><em>-- Select Type --</em></MenuItem>
                                {taxTypeOptions.map(type => (
                                    <MenuItem key={type.id} value={type.id.toString()}>{type.name}</MenuItem>
                                ))}
                            </Select>
                            {formErrors.tax_type_id && <FormHelperText>{formErrors.tax_type_id}</FormHelperText>}
                            {taxTypeOptions.length === 0 && !initialLoading && <FormHelperText error>No tax types available. Please add tax types first.</FormHelperText>}
                        </FormControl>
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/taxes')} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || (userCan && !userCan(requiredPermission))}
                    >
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Tax' : 'Create Tax')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default TaxForm;