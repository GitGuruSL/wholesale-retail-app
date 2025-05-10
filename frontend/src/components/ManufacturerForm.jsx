import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Paper, Typography, TextField, Button, Box, Alert,
    CircularProgress, Grid, TextareaAutosize
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly

function ManufacturerForm() {
    const { manufacturerId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth(); // Get userCan
    const isEditing = Boolean(manufacturerId);

    const initialFormData = {
        name: '',
        contact_info: '',
        address: '',
        city: '',
        contact_person: '',
        telephone: '',
        fax: '',
        email: '',
        relationship_start_date: '', // YYYY-MM-DD
        tax_details: '',
        notes: '' // Added notes back
    };

    const [formData, setFormData] = useState(initialFormData);
    const [initialLoading, setInitialLoading] = useState(isEditing);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const requiredPermission = isEditing ? 'manufacturer:update' : 'manufacturer:create';

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0];
        } catch (e) {
            console.error("[ManufacturerForm] Error formatting date:", dateString, e);
            return '';
        }
    };

    const fetchManufacturerData = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !manufacturerId) return;

        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        try {
            const response = await apiInstance.get(`/manufacturers/${manufacturerId}`);
            const data = response.data;
            setFormData({
                name: data.name || '',
                contact_info: data.contact_info || '',
                address: data.address || '',
                city: data.city || '',
                contact_person: data.contact_person || '',
                telephone: data.telephone || '',
                fax: data.fax || '',
                email: data.email || '',
                relationship_start_date: formatDateForInput(data.relationship_start_date),
                tax_details: data.tax_details || '',
                notes: data.notes || ''
            });
        } catch (err) {
            console.error("[ManufacturerForm] Failed to fetch manufacturer:", err);
            setPageError(err.response?.data?.message || "Failed to load manufacturer data. You may not have permission or the item does not exist.");
        } finally {
            setInitialLoading(false);
        }
    }, [manufacturerId, isAuthenticated, isEditing]);

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                setPageError("Please log in to manage manufacturers.");
                setInitialLoading(false);
                return;
            }
            if (userCan && !userCan(requiredPermission)) {
                setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} manufacturers.`);
                setInitialLoading(false);
                return;
            }
            if (isEditing) {
                fetchManufacturerData();
            } else {
                setFormData(initialFormData);
                setPageError(null);
                setFormErrors({});
                setInitialLoading(false);
            }
        }
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchManufacturerData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = "Manufacturer name is required.";
        if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email.trim())) {
            errors.email = "Please enter a valid email address.";
        }
        // Add other validations as needed
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
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this manufacturer.`);
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setPageError(null);

        const payload = {
            ...formData,
            contact_info: formData.contact_info.trim() === '' ? null : formData.contact_info.trim(),
            address: formData.address.trim() === '' ? null : formData.address.trim(),
            city: formData.city.trim() === '' ? null : formData.city.trim(),
            contact_person: formData.contact_person.trim() === '' ? null : formData.contact_person.trim(),
            telephone: formData.telephone.trim() === '' ? null : formData.telephone.trim(),
            fax: formData.fax.trim() === '' ? null : formData.fax.trim(),
            email: formData.email.trim() === '' ? null : formData.email.trim(),
            relationship_start_date: formData.relationship_start_date.trim() === '' ? null : formData.relationship_start_date,
            tax_details: formData.tax_details.trim() === '' ? null : formData.tax_details.trim(),
            notes: formData.notes.trim() === '' ? null : formData.notes.trim(),
        };

        try {
            if (isEditing) {
                await apiInstance.put(`/manufacturers/${manufacturerId}`, payload);
            } else {
                await apiInstance.post('/manufacturers', payload);
            }
            navigate('/dashboard/manufacturers', {
                state: {
                    message: `Manufacturer "${payload.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[ManufacturerForm] Error saving manufacturer:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} manufacturer.`;
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
                    {isEditing ? 'Edit Manufacturer' : 'Add New Manufacturer'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/manufacturers')}>
                    Back to List
                </Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit Manufacturer (ID: ${manufacturerId})` : 'Add New Manufacturer'}
            </Typography>
            {pageError && !Object.keys(formErrors).length &&
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            }
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Manufacturer Name" name="name" value={formData.name} onChange={handleChange} required fullWidth error={Boolean(formErrors.name)} helperText={formErrors.name} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Contact Person" name="contact_person" value={formData.contact_person} onChange={handleChange} fullWidth error={Boolean(formErrors.contact_person)} helperText={formErrors.contact_person} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} fullWidth error={Boolean(formErrors.email)} helperText={formErrors.email} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Telephone" name="telephone" value={formData.telephone} onChange={handleChange} fullWidth error={Boolean(formErrors.telephone)} helperText={formErrors.telephone} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Fax" name="fax" value={formData.fax} onChange={handleChange} fullWidth error={Boolean(formErrors.fax)} helperText={formErrors.fax} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="City" name="city" value={formData.city} onChange={handleChange} fullWidth error={Boolean(formErrors.city)} helperText={formErrors.city} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Address" name="address" value={formData.address} onChange={handleChange} fullWidth multiline minRows={2} error={Boolean(formErrors.address)} helperText={formErrors.address} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Relationship Start Date" name="relationship_start_date" type="date" value={formData.relationship_start_date} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth error={Boolean(formErrors.relationship_start_date)} helperText={formErrors.relationship_start_date} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Tax Details" name="tax_details" value={formData.tax_details} onChange={handleChange} fullWidth error={Boolean(formErrors.tax_details)} helperText={formErrors.tax_details} disabled={isSubmitting || initialLoading} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="General Contact Info / Internal Notes"
                            name="contact_info"
                            value={formData.contact_info}
                            onChange={handleChange}
                            fullWidth
                            multiline
                            minRows={3}
                            error={Boolean(formErrors.contact_info)}
                            helperText={formErrors.contact_info}
                            disabled={isSubmitting || initialLoading}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Specific Notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            fullWidth
                            multiline
                            minRows={3}
                            error={Boolean(formErrors.notes)}
                            helperText={formErrors.notes}
                            disabled={isSubmitting || initialLoading}
                        />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/manufacturers')} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button variant="contained" type="submit" disabled={isSubmitting || initialLoading || (userCan && !userCan(requiredPermission))}>
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Manufacturer' : 'Create Manufacturer')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default ManufacturerForm;