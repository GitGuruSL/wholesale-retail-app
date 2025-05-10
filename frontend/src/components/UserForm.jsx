import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid,
    FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, FormHelperText
} from '@mui/material';

function UserForm() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading: authLoading, userCan, ROLES_OPTIONS } = useAuth();
    const isEditing = Boolean(userId);

    const initialFormData = {
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role_id: '',
        is_active: true,
        employee_id: '',
        current_store_id: '',
    };
    const [formData, setFormData] = useState(initialFormData);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [availableStores, setAvailableStores] = useState([]);

    const [initialLoading, setInitialLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const requiredPermission = isEditing ? 'user:update_any' : 'user:create'; // Adjust as per your permission names

    useEffect(() => {
        if (ROLES_OPTIONS && Array.isArray(ROLES_OPTIONS)) {
            const roles = ROLES_OPTIONS.map(r => ({ value: String(r.value), label: r.label }));
            setAvailableRoles(roles);
            if (!isEditing && roles.length > 0 && !formData.role_id) {
                const defaultRole = roles.find(r => r.label.toLowerCase().includes('sales')) || roles[0];
                if (defaultRole) {
                    setFormData(prev => ({ ...prev, role_id: defaultRole.value }));
                }
            }
        }
    }, [ROLES_OPTIONS, isEditing, formData.role_id]);

    const fetchAvailableStores = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const response = await apiInstance.get('/stores?limit=all'); // Assuming an endpoint to get all stores
            if (response.data && Array.isArray(response.data)) {
                setAvailableStores(response.data.map(store => ({ value: String(store.id), label: store.name })));
            } else {
                setAvailableStores([]);
            }
        } catch (err) {
            console.error("[UserForm] Failed to fetch stores:", err);
            setPageError(prev => prev ? `${prev}\nFailed to load stores.` : "Failed to load stores for assignment.");
            setAvailableStores([]);
        }
    }, [isAuthenticated]);

    const fetchUserData = useCallback(async () => {
        if (!isEditing || !userId || !isAuthenticated) return;
        setPageError(null);
        try {
            const response = await apiInstance.get(`/users/${userId}`);
            const userData = response.data;
            setFormData({
                username: userData.username || '',
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                email: userData.email || '',
                password: '', // Keep password fields blank for editing
                confirmPassword: '',
                role_id: userData.role_id ? String(userData.role_id) : '',
                is_active: userData.is_active !== undefined ? userData.is_active : true,
                employee_id: userData.employee_id || '',
                current_store_id: userData.current_store_id ? String(userData.current_store_id) : '',
            });
        } catch (err) {
            console.error("[UserForm] Failed to fetch user data:", err);
            setPageError(err.response?.data?.message || "Failed to load user data.");
        }
    }, [userId, isAuthenticated, isEditing]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (!authLoading) {
                if (!isAuthenticated) {
                    setPageError("Please log in to manage users.");
                    setInitialLoading(false);
                    return;
                }
                if (userCan && !userCan(requiredPermission)) {
                    setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} users.`);
                    setInitialLoading(false);
                    return;
                }
                setInitialLoading(true);
                await fetchAvailableStores();
                if (isEditing) {
                    await fetchUserData();
                } else {
                    setFormData(prev => ({
                        ...initialFormData,
                        role_id: prev.role_id // Keep pre-selected role if any
                    }));
                    setFormErrors({});
                }
                setInitialLoading(false);
            }
        };
        loadInitialData();
    }, [authLoading, isAuthenticated, userCan, requiredPermission, isEditing, fetchAvailableStores, fetchUserData]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.username.trim()) errors.username = "Username is required.";
        if (!formData.email.trim()) errors.email = "Email is required.";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) errors.email = "Invalid email format.";

        if (!isEditing || formData.password) { // Validate password only if new or being changed
            if (!formData.password) errors.password = "Password is required for new users.";
            else if (formData.password.length < 6) errors.password = "Password must be at least 6 characters.";
            if (formData.password !== formData.confirmPassword) errors.confirmPassword = "Passwords do not match.";
        }
        if (!formData.role_id) errors.role_id = "Role is required.";

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
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this user.`);
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setPageError(null);

        const payload = {
            username: formData.username.trim(),
            first_name: formData.first_name.trim() || null,
            last_name: formData.last_name.trim() || null,
            email: formData.email.trim(),
            role_id: parseInt(formData.role_id, 10),
            is_active: formData.is_active,
            employee_id: formData.employee_id.trim() || null,
            current_store_id: formData.current_store_id ? parseInt(formData.current_store_id, 10) : null,
        };
        if (formData.password) {
            payload.password = formData.password;
        }

        try {
            if (isEditing) {
                await apiInstance.put(`/users/${userId}`, payload);
            } else {
                await apiInstance.post('/users', payload);
            }
            navigate('/dashboard/users', {
                state: { message: `User "${payload.username}" ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' }
            });
        } catch (err) {
            console.error("[UserForm] Error saving user:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} user.`;
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
                <Typography variant="h5" align="center" gutterBottom>{isEditing ? 'Edit User' : 'Add New User'}</Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/users')}>Back to List</Button>
            </Paper>
        );
    }

    const canAssignStore = userCan ? userCan('user:assign_store') : true; // Example permission

    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 700, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? `Edit User (ID: ${userId})` : 'Add New User'}
            </Typography>
            {pageError && !Object.keys(formErrors).length && <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>}

            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Username *" name="username" value={formData.username} onChange={handleChange} required fullWidth disabled={isSubmitting} error={Boolean(formErrors.username)} helperText={formErrors.username} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Email *" name="email" type="email" value={formData.email} onChange={handleChange} required fullWidth disabled={isSubmitting} error={Boolean(formErrors.email)} helperText={formErrors.email} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} fullWidth disabled={isSubmitting} error={Boolean(formErrors.first_name)} helperText={formErrors.first_name} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} fullWidth disabled={isSubmitting} error={Boolean(formErrors.last_name)} helperText={formErrors.last_name} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label={isEditing ? "New Password" : "Password *"} name="password" type="password" value={formData.password} onChange={handleChange} required={!isEditing} fullWidth disabled={isSubmitting} error={Boolean(formErrors.password)} helperText={formErrors.password || (isEditing ? "Leave blank to keep current" : "")} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label={isEditing ? "Confirm New Password" : "Confirm Password *"} name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required={!isEditing || Boolean(formData.password)} fullWidth disabled={isSubmitting} error={Boolean(formErrors.confirmPassword)} helperText={formErrors.confirmPassword} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth required error={Boolean(formErrors.role_id)} disabled={isSubmitting || availableRoles.length === 0}>
                            <InputLabel id="role-label">Role *</InputLabel>
                            <Select labelId="role-label" name="role_id" value={formData.role_id} label="Role *" onChange={handleChange}>
                                <MenuItem value=""><em>-- Select Role --</em></MenuItem>
                                {availableRoles.map(role => (<MenuItem key={role.value} value={role.value}>{role.label}</MenuItem>))}
                            </Select>
                            {formErrors.role_id && <FormHelperText>{formErrors.role_id}</FormHelperText>}
                            {availableRoles.length === 0 && <FormHelperText error>No roles available.</FormHelperText>}
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth error={Boolean(formErrors.current_store_id)} disabled={isSubmitting || availableStores.length === 0 || !canAssignStore}>
                            <InputLabel id="store-label">Current Store</InputLabel>
                            <Select labelId="store-label" name="current_store_id" value={formData.current_store_id} label="Current Store" onChange={handleChange}>
                                <MenuItem value=""><em>-- No Store Assigned --</em></MenuItem>
                                {availableStores.map(store => (<MenuItem key={store.value} value={store.value}>{store.label}</MenuItem>))}
                            </Select>
                            {formErrors.current_store_id && <FormHelperText>{formErrors.current_store_id}</FormHelperText>}
                            {availableStores.length === 0 && canAssignStore && <FormHelperText>No stores available.</FormHelperText>}
                            {!canAssignStore && <FormHelperText error>Permission to assign stores denied.</FormHelperText>}
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Employee ID" name="employee_id" value={formData.employee_id} onChange={handleChange} fullWidth disabled={isSubmitting} error={Boolean(formErrors.employee_id)} helperText={formErrors.employee_id} />
                    </Grid>
                    <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
                        <FormControlLabel control={<Checkbox name="is_active" checked={formData.is_active} onChange={handleChange} disabled={isSubmitting} />} label="User is Active" />
                    </Grid>
                </Grid>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                    <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/users')} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" variant="contained" color="primary" disabled={isSubmitting || (userCan && !userCan(requiredPermission))}>
                        {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update User' : 'Create User')}
                    </Button>
                </Box>
            </Box>
        </Paper>
    );
}

export default UserForm;