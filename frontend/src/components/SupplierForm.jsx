import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid,
    FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, FormHelperText
} from '@mui/material';

function SupplierForm() {
    const { supplierId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const isEditing = Boolean(supplierId);

    const initialFormData = {
        name: '', address: '', city: '', contact_person: '', telephone: '', fax: '',
        email: '', since_date: '', main_category_id: '', tax_invoice_details: '',
        default_discount_percent: '0', credit_limit: '0.00', credit_days: '0',
        is_default_supplier: false,
    };
    const [formData, setFormData] = useState(initialFormData);
    const [categories, setCategories] = useState([]); // For main_category_id dropdown
    const [initialLoading, setInitialLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const requiredPermission = isEditing ? 'supplier:update' : 'supplier:create';

    const fetchMainCategories = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const response = await apiInstance.get('/categories?limit=all');
            setCategories(response.data?.data || response.data || []);
        } catch (err) {
            console.error("[SupplierForm] Error fetching main categories:", err);
            setPageError("Could not load main categories for selection. Please try refreshing.");
            setCategories([]);
        }
    }, [isAuthenticated]);

    const fetchSupplierDetails = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !supplierId) return;
        setPageError(null);
        setFormErrors({});
        try {
            const response = await apiInstance.get(`/suppliers/${supplierId}`);
            
            // Correctly access the supplier object from response.data.data
            const supplierData = response.data?.data; 

            if (!supplierData) {
                console.error("[SupplierForm] Error: Supplier data not found in API response.", response.data);
                setPageError("Failed to load supplier data: structure mismatch.");
                return;
            }

            const sinceDateFormatted = supplierData.since_date ? supplierData.since_date.split('T')[0] : '';
            
            setFormData({
                name: supplierData.name || '',
                address: supplierData.address || '',
                city: supplierData.city || '',
                contact_person: supplierData.contact_person || '',
                telephone: supplierData.telephone || '',
                fax: supplierData.fax || '',
                email: supplierData.email || '',
                since_date: sinceDateFormatted,
                main_category_id: supplierData.main_category_id?.toString() || '',
                tax_invoice_details: supplierData.tax_invoice_details || '',
                default_discount_percent: supplierData.default_discount_percent?.toString() ?? '0',
                credit_limit: supplierData.credit_limit?.toString() ?? '0.00',
                credit_days: supplierData.credit_days?.toString() ?? '0',
                is_default_supplier: supplierData.is_default_supplier || false,
            });
        } catch (err) {
            console.error("[SupplierForm] Error fetching supplier details:", err);
            setPageError(err.response?.data?.message || "Failed to load supplier data.");
        }
    }, [supplierId, isAuthenticated, isEditing]);

    useEffect(() => {
        const loadData = async () => {
            if (!authLoading) {
                if (!isAuthenticated) {
                    setPageError("Please log in to manage suppliers.");
                    setInitialLoading(false);
                    return;
                }
                if (userCan && !userCan(requiredPermission)) {
                    setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} suppliers.`);
                    setInitialLoading(false);
                    return;
                }
                setInitialLoading(true);
                await fetchMainCategories();
                if (isEditing) {
                    await fetchSupplierDetails();
                } else {
                    setFormData(initialFormData);
                    setFormErrors({});
                }
                setInitialLoading(false);
            }
        };
        loadData();
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchMainCategories, fetchSupplierDetails]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = "Supplier name cannot be empty.";
        if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
            errors.email = "Invalid email format.";
        }
        const discount = parseFloat(formData.default_discount_percent);
        if (formData.default_discount_percent.trim() && (isNaN(discount) || discount < 0 || discount > 100)) {
            errors.default_discount_percent = "Discount must be between 0 and 100.";
        }
        const creditLimit = parseFloat(formData.credit_limit);
        if (formData.credit_limit.trim() && (isNaN(creditLimit) || creditLimit < 0)) {
            errors.credit_limit = "Credit limit must be a non-negative number.";
        }
        const creditDays = parseInt(formData.credit_days, 10);
        if (formData.credit_days.trim() && (isNaN(creditDays) || creditDays < 0)) {
            errors.credit_days = "Credit days must be a non-negative integer.";
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
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this supplier.`);
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setPageError(null);

        const payload = { ...formData };
        const fieldsToNullifyIfEmpty = ['address', 'city', 'contact_person', 'telephone', 'fax', 'email', 'since_date', 'main_category_id', 'tax_invoice_details'];
        fieldsToNullifyIfEmpty.forEach(field => {
            if (payload[field] === '' || payload[field] === null) payload[field] = null;
        });

        payload.default_discount_percent = payload.default_discount_percent === null || payload.default_discount_percent === '' ? null : parseFloat(payload.default_discount_percent);
        payload.credit_limit = payload.credit_limit === null || payload.credit_limit === '' ? null : parseFloat(payload.credit_limit);
        payload.credit_days = payload.credit_days === null || payload.credit_days === '' ? null : parseInt(payload.credit_days, 10);
        payload.main_category_id = payload.main_category_id === null || payload.main_category_id === '' ? null : parseInt(payload.main_category_id, 10);
        payload.is_default_supplier = Boolean(payload.is_default_supplier);


        try {
            if (isEditing) {
                await apiInstance.put(`/suppliers/${supplierId}`, payload);
            } else {
                await apiInstance.post('/suppliers', payload);
            }
            navigate('/dashboard/suppliers', {
                state: { message: `Supplier "${payload.name}" ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' }
            });
        } catch (err) {
            console.error("[SupplierForm] Error saving supplier:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} supplier.`;
            setPageError(errMsg);
            if (err.response?.data?.errors) {
                setFormErrors(prev => ({ ...prev, ...err.response.data.errors }));
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || initialLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if ((!isAuthenticated || (userCan && !userCan(requiredPermission))) && pageError) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 700, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/suppliers')}>Back to List</Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 700, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>{isEditing ? `Edit Supplier (ID: ${supplierId})` : 'Add New Supplier'}</Typography>
            {pageError && !Object.keys(formErrors).length && <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>}

            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField label="Supplier Name *" name="name" value={formData.name} onChange={handleChange} required fullWidth disabled={isSubmitting || initialLoading} error={Boolean(formErrors.name)} helperText={formErrors.name} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Address" name="address" value={formData.address} onChange={handleChange} fullWidth multiline rows={2} disabled={isSubmitting || initialLoading} error={Boolean(formErrors.address)} helperText={formErrors.address} />
                    </Grid>
                    <Grid item xs={12} sm={6}><TextField label="City" name="city" value={formData.city} onChange={handleChange} fullWidth disabled={isSubmitting || initialLoading} error={Boolean(formErrors.city)} helperText={formErrors.city} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} fullWidth disabled={isSubmitting || initialLoading} error={Boolean(formErrors.contact_person)} helperText={formErrors.contact_person} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="Telephone" name="telephone" value={formData.telephone} onChange={handleChange} fullWidth disabled={isSubmitting || initialLoading} error={Boolean(formErrors.telephone)} helperText={formErrors.telephone} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="Fax" name="fax" value={formData.fax} onChange={handleChange} fullWidth disabled={isSubmitting || initialLoading} error={Boolean(formErrors.fax)} helperText={formErrors.fax} /></Grid>
                    <Grid item xs={12}><TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} fullWidth disabled={isSubmitting || initialLoading} error={Boolean(formErrors.email)} helperText={formErrors.email} /></Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Supplier Since" name="since_date" type="date" value={formData.since_date} onChange={handleChange} fullWidth InputLabelProps={{ shrink: true }} disabled={isSubmitting || initialLoading} error={Boolean(formErrors.since_date)} helperText={formErrors.since_date} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth error={Boolean(formErrors.main_category_id)} disabled={isSubmitting || initialLoading || categories.length === 0}>
                            <InputLabel id="main-category-label">Main Category</InputLabel>
                            <Select labelId="main-category-label" name="main_category_id" value={formData.main_category_id} label="Main Category" onChange={handleChange}>
                                <MenuItem value=""><em>-- Select Category --</em></MenuItem>
                                {categories.map(cat => (<MenuItem key={cat.id} value={cat.id.toString()}>{cat.name}</MenuItem>))}
                            </Select>
                            {formErrors.main_category_id && <FormHelperText>{formErrors.main_category_id}</FormHelperText>}
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}><TextField label="Tax Invoice Details" name="tax_invoice_details" value={formData.tax_invoice_details} onChange={handleChange} fullWidth disabled={isSubmitting || initialLoading} error={Boolean(formErrors.tax_invoice_details)} helperText={formErrors.tax_invoice_details} /></Grid>
                    <Grid item xs={12} sm={4}><TextField label="Default Discount %" name="default_discount_percent" type="number" value={formData.default_discount_percent} onChange={handleChange} fullWidth inputProps={{ min: 0, max: 100, step: "0.01" }} disabled={isSubmitting || initialLoading} error={Boolean(formErrors.default_discount_percent)} helperText={formErrors.default_discount_percent} /></Grid>
                    <Grid item xs={12} sm={4}><TextField label="Credit Limit" name="credit_limit" type="number" value={formData.credit_limit} onChange={handleChange} fullWidth inputProps={{ min: 0, step: "0.01" }} disabled={isSubmitting || initialLoading} error={Boolean(formErrors.credit_limit)} helperText={formErrors.credit_limit} /></Grid>
                    <Grid item xs={12} sm={4}><TextField label="Credit Days" name="credit_days" type="number" value={formData.credit_days} onChange={handleChange} fullWidth inputProps={{ min: 0, step: 1 }} disabled={isSubmitting || initialLoading} error={Boolean(formErrors.credit_days)} helperText={formErrors.credit_days} /></Grid>
                    <Grid item xs={12}>
                        <FormControlLabel control={<Checkbox name="is_default_supplier" checked={formData.is_default_supplier} onChange={handleChange} disabled={isSubmitting || initialLoading} />} label="Set as Default Supplier" />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/suppliers')} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" variant="contained" color="primary" disabled={isSubmitting || initialLoading || (userCan && !userCan(requiredPermission))}>
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Supplier' : 'Create Supplier')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default SupplierForm;