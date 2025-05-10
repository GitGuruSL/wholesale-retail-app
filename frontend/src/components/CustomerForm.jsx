import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box,
    Button,
    Paper,
    TextField,
    Typography,
    Alert,
    FormControlLabel,
    Checkbox,
    CircularProgress,
    Grid
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Ensure this is the only source for apiInstance

const CustomerForm = () => {
    const { customerId } = useParams();
    const navigate = useNavigate();
    // apiInstance is imported directly, remove from useAuth
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(customerId);

    const initialFormData = {
        name: '',
        email: '',
        contact_info: '',
        address: '',
        city: '',
        contact_person: '',
        telephone: '',
        fax: '',
        since_date: '', // Should be YYYY-MM-DD for date input
        tax_invoice_details: '',
        default_discount_percent: '',
        credit_limit: '',
        credit_days: '',
        active: true
    };

    const [formData, setFormData] = useState(initialFormData);
    const [initialLoading, setInitialLoading] = useState(isEditing); // For fetching existing data
    const [isSubmitting, setIsSubmitting] = useState(false); // For form submission
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const requiredPermission = isEditing ? 'customer:update' : 'customer:create';

    const fetchCustomerDetails = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !customerId) return;

        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        try {
            const response = await apiInstance.get(`/customers/${customerId}`);
            const data = response.data;
            // Ensure date is correctly formatted for input type="date"
            const sinceDate = data.since_date ? new Date(data.since_date).toISOString().split('T')[0] : '';
            setFormData({
                name: data.name || '',
                email: data.email || '',
                contact_info: data.contact_info || '',
                address: data.address || '',
                city: data.city || '',
                contact_person: data.contact_person || '',
                telephone: data.telephone || '',
                fax: data.fax || '',
                since_date: sinceDate,
                tax_invoice_details: data.tax_invoice_details || '',
                default_discount_percent: data.default_discount_percent !== null ? String(data.default_discount_percent) : '',
                credit_limit: data.credit_limit !== null ? String(data.credit_limit) : '',
                credit_days: data.credit_days !== null ? String(data.credit_days) : '',
                active: data.active !== undefined ? data.active : true
            });
        } catch (err) {
            console.error("[CustomerForm] Failed to fetch customer:", err);
            setPageError(err.response?.data?.message || "Failed to load customer data. You may not have permission or the customer does not exist.");
        } finally {
            setInitialLoading(false);
        }
    }, [customerId, isAuthenticated, isEditing]);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                setPageError("Please log in to manage customers.");
                setInitialLoading(false);
                return;
            }
            if (userCan && !userCan(requiredPermission)) {
                setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} customers.`);
                setInitialLoading(false);
                return;
            }
            if (isEditing) {
                fetchCustomerDetails();
            } else {
                setFormData(initialFormData); // Reset form for 'create' mode
                setPageError(null);
                setFormErrors({});
                setInitialLoading(false);
            }
        }
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchCustomerDetails]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = "Name is required.";
        if (!formData.email.trim()) {
            errors.email = "Email is required.";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            errors.email = "Email is invalid.";
        }
        // Add more validations as needed
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
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this customer.`);
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setPageError(null);

        const payload = {
            ...formData,
            default_discount_percent: formData.default_discount_percent === '' ? null : parseFloat(formData.default_discount_percent),
            credit_limit: formData.credit_limit === '' ? null : parseFloat(formData.credit_limit),
            credit_days: formData.credit_days === '' ? null : parseInt(formData.credit_days, 10),
            since_date: formData.since_date === '' ? null : formData.since_date,
        };


        try {
            if (isEditing) {
                await apiInstance.put(`/customers/${customerId}`, payload);
            } else {
                await apiInstance.post('/customers', payload);
            }
            navigate('/dashboard/customers', {
                state: {
                    message: `Customer "${payload.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[CustomerForm] Error saving customer:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} customer.`;
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
            <Paper sx={{ p: 3, m: 2, maxWidth: 800, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>
                    {isEditing ? 'Edit Customer' : 'Add New Customer'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/customers')}>
                    Back to Customers
                </Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? 'Edit Customer' : 'Add New Customer'}
            </Typography>
            {pageError && !Object.keys(formErrors).length && /* Show pageError if not a specific field error */
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            }
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Name" name="name" value={formData.name} onChange={handleChange} required fullWidth error={Boolean(formErrors.name)} helperText={formErrors.name} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required fullWidth error={Boolean(formErrors.email)} helperText={formErrors.email} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Contact Info (Phone/Mobile)" name="contact_info" value={formData.contact_info} onChange={handleChange} fullWidth error={Boolean(formErrors.contact_info)} helperText={formErrors.contact_info} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} fullWidth error={Boolean(formErrors.contact_person)} helperText={formErrors.contact_person} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Address" name="address" value={formData.address} onChange={handleChange} fullWidth multiline minRows={2} error={Boolean(formErrors.address)} helperText={formErrors.address} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="City" name="city" value={formData.city} onChange={handleChange} fullWidth error={Boolean(formErrors.city)} helperText={formErrors.city} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Telephone" name="telephone" value={formData.telephone} onChange={handleChange} fullWidth error={Boolean(formErrors.telephone)} helperText={formErrors.telephone} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Fax" name="fax" value={formData.fax} onChange={handleChange} fullWidth error={Boolean(formErrors.fax)} helperText={formErrors.fax} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Since Date" name="since_date" type="date" value={formData.since_date} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth error={Boolean(formErrors.since_date)} helperText={formErrors.since_date} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Tax Invoice Details" name="tax_invoice_details" value={formData.tax_invoice_details} onChange={handleChange} multiline minRows={3} fullWidth error={Boolean(formErrors.tax_invoice_details)} helperText={formErrors.tax_invoice_details} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Default Discount (%)" name="default_discount_percent" type="number" inputProps={{ step: "0.01" }} value={formData.default_discount_percent} onChange={handleChange} fullWidth error={Boolean(formErrors.default_discount_percent)} helperText={formErrors.default_discount_percent} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Credit Limit" name="credit_limit" type="number" inputProps={{ step: "0.01" }} value={formData.credit_limit} onChange={handleChange} fullWidth error={Boolean(formErrors.credit_limit)} helperText={formErrors.credit_limit} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Credit Days" name="credit_days" type="number" inputProps={{ step: "1" }} value={formData.credit_days} onChange={handleChange} fullWidth error={Boolean(formErrors.credit_days)} helperText={formErrors.credit_days} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12}>
                        <FormControlLabel
                            control={
                                <Checkbox name="active" checked={formData.active} onChange={handleChange} disabled={isSubmitting || initialLoading} />
                            }
                            label="Active Customer"
                        />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/customers')} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button variant="contained" type="submit" disabled={isSubmitting || initialLoading || (userCan && !userCan(requiredPermission))}>
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Customer' : 'Create Customer')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
};

export default CustomerForm;