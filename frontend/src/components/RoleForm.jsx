import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiInstance from '../services/api'; // Import apiInstance directly
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid
} from '@mui/material';

function RoleForm() {
    const { roleId } = useParams();
    const isEditing = Boolean(roleId);
    const navigate = useNavigate();
    // apiInstance is imported directly, userCan for permissions
    const { isAuthenticated, isLoading: authLoading, userCan, fetchRoles: fetchRolesFromContext } = useAuth();

    const initialFormData = { name: '', display_name: '', description: '' };
    const [formData, setFormData] = useState(initialFormData);
    const [initialLoading, setInitialLoading] = useState(isEditing); // For fetching existing data
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const requiredPermission = isEditing ? 'role:update' : 'role:create';

    const fetchRoleDetails = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !roleId) return;

        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        try {
            const response = await apiInstance.get(`/roles/${roleId}`);
            const roleData = response.data;
            setFormData({
                name: roleData.name || '',
                display_name: roleData.display_name || '',
                description: roleData.description || ''
            });
        } catch (err) {
            setPageError(err.response?.data?.message || `Failed to fetch details for role ID ${roleId}.`);
            console.error("Error fetching role details:", err);
        } finally {
            setInitialLoading(false);
        }
    }, [roleId, isAuthenticated, isEditing]); // apiInstance is module-scoped

    useEffect(() => {
        if (!authLoading) {
            if (!isAuthenticated) {
                setPageError("Please log in to manage roles.");
                setInitialLoading(false);
                return;
            }
            if (userCan && !userCan(requiredPermission)) {
                setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} roles.`);
                setInitialLoading(false);
                return;
            }
            if (isEditing) {
                fetchRoleDetails();
            } else {
                setFormData(initialFormData); // Reset for 'create' mode
                setPageError(null);
                setFormErrors({});
                setInitialLoading(false);
            }
        }
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchRoleDetails]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) errors.name = "Machine Name is required.";
        else if (!/^[a-z0-9_]+$/.test(formData.name.trim())) {
            errors.name = "Machine Name can only contain lowercase letters, numbers, and underscores.";
        }
        if (!formData.display_name.trim()) errors.display_name = "Display Name is required.";
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
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this role.`);
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setPageError(null);

        const roleDataPayload = {
            name: formData.name.toLowerCase().trim(),
            display_name: formData.display_name.trim(),
            description: formData.description.trim() || null, // Send null if empty
        };

        try {
            let responseMessage = '';
            if (isEditing) {
                const response = await apiInstance.put(`/roles/${roleId}`, roleDataPayload);
                responseMessage = `Role "${response.data.display_name}" updated successfully!`;
            } else {
                const response = await apiInstance.post('/roles', roleDataPayload);
                responseMessage = `Role "${response.data.display_name}" created successfully!`;
            }

            if (typeof fetchRolesFromContext === 'function') { // If context needs update
                await fetchRolesFromContext();
            }
            navigate('/dashboard/roles', { state: { message: responseMessage, type: 'success' } });

        } catch (err) {
            const apiError = err.response?.data;
            if (apiError?.errors && Array.isArray(apiError.errors)) { // Handle array of errors from backend validation
                const backendErrors = apiError.errors.reduce((acc, curr) => {
                    acc[curr.path || curr.param || 'general'] = curr.msg;
                    return acc;
                }, {});
                setFormErrors(prev => ({ ...prev, ...backendErrors }));
                setPageError("Please correct the errors in the form.");
            } else {
                setPageError(apiError?.message || `Failed to ${isEditing ? 'update' : 'create'} role.`);
            }
            console.error(`Error ${isEditing ? 'updating' : 'creating'} role:`, err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (initialLoading && isEditing) { // Show loading only if editing and fetching details
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    // If user doesn't have permission and there's a page error (like permission denied message)
    if ((!isAuthenticated || (userCan && !userCan(requiredPermission))) && pageError) {
        return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>
                    {isEditing ? 'Edit Role' : 'Add New Role'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/roles')}>
                    Back to Roles List
                </Button>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit Role (ID: ${roleId})` : 'Add New Role'}
            </Typography>
            {pageError && !Object.keys(formErrors).length && /* Show pageError if not a specific field error */
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            }
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <TextField
                            label="Machine Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            placeholder="e.g., inventory_manager"
                            error={Boolean(formErrors.name)}
                            helperText={formErrors.name || "Lowercase letters, numbers, and underscores only."}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Display Name"
                            name="display_name"
                            value={formData.display_name}
                            onChange={handleChange}
                            required
                            fullWidth
                            disabled={isSubmitting || initialLoading}
                            placeholder="e.g., Inventory Manager"
                            error={Boolean(formErrors.display_name)}
                            helperText={formErrors.display_name}
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
                            placeholder="Optional: A brief description of the role's purpose."
                            error={Boolean(formErrors.description)}
                            helperText={formErrors.description}
                        />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/roles')} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting || initialLoading || (userCan && !userCan(requiredPermission))}
                    >
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Role' : 'Create Role')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default RoleForm;