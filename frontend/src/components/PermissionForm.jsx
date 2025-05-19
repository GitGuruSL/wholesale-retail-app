import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  Grid // Added Grid for layout
} from '@mui/material';

function PermissionForm() {
  const { permissionId } = useParams();
  const navigate = useNavigate();
  // apiInstance is imported directly
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
  const isEditing = Boolean(permissionId);

  const initialFormData = {
    name: '',
    display_name: '',
    description: '',
    permission_category_id: '',
    sub_group_key: '',
    sub_group_display_name: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [categories, setCategories] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const requiredPermission = isEditing ? 'permission:update' : 'permission:create';

  const fetchCategories = useCallback(async () => {
    if (!isAuthenticated) return Promise.resolve(); // Return a resolved promise
    try {
      const response = await apiInstance.get('/permission-categories?limit=all');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Failed to fetch permission categories:', err);
      setPageError('Failed to load permission categories. Please try reloading.');
      setCategories([]);
    }
  }, [isAuthenticated]); // apiInstance is module-scoped

  const fetchPermission = useCallback(async (id) => {
    if (!isAuthenticated || !id) return Promise.resolve();
    setPageError(null); // Clear previous errors
    try {
      const response = await apiInstance.get(`/permissions/${id}`);
      const permissionData = response.data;
      let categoryIdToSet = '';
      if (permissionData.permission_category_id !== null && permissionData.permission_category_id !== undefined) {
        const parsedId = parseInt(permissionData.permission_category_id, 10);
        if (!isNaN(parsedId)) {
          categoryIdToSet = parsedId;
        }
      }
      setFormData({
        name: permissionData.name || '',
        display_name: permissionData.display_name || '',
        description: permissionData.description || '',
        permission_category_id: categoryIdToSet,
        sub_group_key: permissionData.sub_group_key || '',
        sub_group_display_name: permissionData.sub_group_display_name || ''
      });
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to fetch permission details.');
      console.error('Error fetching permission:', err);
    }
  }, [isAuthenticated]); // apiInstance is module-scoped

  useEffect(() => {
    const loadInitialData = async () => {
      if (!authLoading) {
        if (!isAuthenticated) {
          setPageError("Please log in to manage permissions.");
          setInitialLoading(false);
          return;
        }
        if (typeof userCan !== 'function' || !userCan(requiredPermission)) {
          setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} permissions.`);
          setInitialLoading(false);
          return;
        }

        setInitialLoading(true);
        await fetchCategories(); // Fetch categories first

        if (isEditing && permissionId) {
          await fetchPermission(permissionId);
        } else if (!isEditing) {
          setFormData(initialFormData); // Reset form for create mode
          setFormErrors({});
        }
        setInitialLoading(false);
      }
    };
    loadInitialData();
  }, [isEditing, permissionId, authLoading, isAuthenticated, userCan, requiredPermission, fetchCategories, fetchPermission]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'permission_category_id' && value !== '') {
      const numValue = parseInt(value, 10);
      processedValue = isNaN(numValue) ? '' : numValue;
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!isEditing && !formData.name.trim()) {
      errors.name = 'Permission name (code) is required.';
    } else if (!isEditing && !/^[a-z0-9_:-]+$/.test(formData.name.trim())) {
      errors.name = 'Name can only contain lowercase letters, numbers, underscores, hyphens, and colons (e.g., user:create).';
    }
    if (!formData.display_name.trim()) errors.display_name = 'Display name is required.';
    if (formData.permission_category_id === '' || formData.permission_category_id === undefined || formData.permission_category_id === null) {
      errors.permission_category_id = 'Permission category is required.';
    }
    if (!formData.sub_group_key.trim()) {
        errors.sub_group_key = 'Sub-group key is required (e.g., user, Item_core).';
    } else if (!/^[a-z0-9_]+$/.test(formData.sub_group_key.trim())) {
        errors.sub_group_key = 'Sub-group key can only contain lowercase letters, numbers, and underscores.';
    }
    if (!formData.sub_group_display_name.trim()) errors.sub_group_display_name = 'Sub-group display name is required (e.g., User Management).';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
        setPageError("Authentication error. Please log in again.");
        return;
    }
    if (typeof userCan !== 'function' || !userCan(requiredPermission)) {
        setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this permission.`);
        return;
    }
    if (!validateForm()) return;

    setIsSubmitting(true);
    setPageError(null);
    try {
      const payload = {
        display_name: formData.display_name.trim(),
        description: formData.description.trim() || null,
        permission_category_id: parseInt(formData.permission_category_id, 10),
        sub_group_key: formData.sub_group_key.trim(),
        sub_group_display_name: formData.sub_group_display_name.trim()
      };
      if (!isEditing) {
        payload.name = formData.name.trim();
      }

      if (isEditing) {
        await apiInstance.put(`/permissions/${permissionId}`, payload);
      } else {
        await apiInstance.post('/permissions', payload);
      }
      navigate('/dashboard/permissions', {
        state: { message: `Permission "${payload.display_name}" ${isEditing ? 'updated' : 'created'} successfully!`, type: 'success' }
      });
    } catch (err) {
      const apiError = err.response?.data;
      if (apiError?.errors && Array.isArray(apiError.errors)) {
        const backendErrors = apiError.errors.reduce((acc, curr) => {
          acc[curr.path || curr.param || 'general'] = curr.msg;
          return acc;
        }, {});
        setFormErrors(prev => ({ ...prev, ...backendErrors }));
        setPageError("Please correct the errors in the form.");
      } else {
        setPageError(apiError?.message || `Failed to ${isEditing ? 'update' : 'create'} permission.`);
      }
      console.error('Error submitting permission form:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || initialLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if ((!isAuthenticated || (typeof userCan === 'function' && !userCan(requiredPermission))) && pageError && !isSubmitting) {
     return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 700, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? 'Edit Permission' : 'Create New Permission'}
            </Typography>
            <Alert severity="error">{pageError}</Alert>
             <Button variant="outlined" sx={{mt: 2}} onClick={() => navigate('/dashboard/permissions')}>
                Back to List
            </Button>
        </Paper>
     );
  }

  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 700, mx: 'auto' }}>
      <Typography variant="h5" align="center" gutterBottom>
        {isEditing ? `Edit Permission (ID: ${permissionId})` : 'Create New Permission'}
      </Typography>
      {pageError && !Object.keys(formErrors).length &&
        <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
      }
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2}>
            <Grid item xs={12}>
                <TextField
                label="Permission Name (Code)"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., user:create, Item:edit"
                disabled={isEditing || isSubmitting}
                error={Boolean(formErrors.name)}
                helperText={formErrors.name || (isEditing ? 'The permission name (code) cannot be changed after creation.' : 'Must be unique. e.g., resource:action')}
                fullWidth
                required={!isEditing}
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                label="Display Name"
                name="display_name"
                value={formData.display_name}
                onChange={handleChange}
                placeholder="e.g., Create Users, Edit Items"
                error={Boolean(formErrors.display_name)}
                helperText={formErrors.display_name}
                disabled={isSubmitting}
                fullWidth
                required
                />
            </Grid>
            <Grid item xs={12}>
                <FormControl fullWidth error={Boolean(formErrors.permission_category_id)} required>
                <InputLabel id="permission-category-label">Permission Category</InputLabel>
                <Select
                    labelId="permission-category-label"
                    name="permission_category_id"
                    value={formData.permission_category_id}
                    onChange={handleChange}
                    label="Permission Category"
                    disabled={isSubmitting}
                >
                    <MenuItem value=""><em>-- Select a Category --</em></MenuItem>
                    {categories.sort((a,b) => (a.display_order || Infinity) - (b.display_order || Infinity)).map(category => (
                    <MenuItem key={category.id} value={category.id}>
                        {category.name}
                    </MenuItem>
                    ))}
                </Select>
                {formErrors.permission_category_id && <FormHelperText>{formErrors.permission_category_id}</FormHelperText>}
                </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                label="Sub-Group Key"
                name="sub_group_key"
                value={formData.sub_group_key}
                onChange={handleChange}
                placeholder="e.g., user, Item_core"
                error={Boolean(formErrors.sub_group_key)}
                helperText={formErrors.sub_group_key || "Lowercase, use underscores. e.g. user_settings"}
                disabled={isSubmitting}
                fullWidth
                required
                />
            </Grid>
            <Grid item xs={12} sm={6}>
                <TextField
                label="Sub-Group Display Name"
                name="sub_group_display_name"
                value={formData.sub_group_display_name}
                onChange={handleChange}
                placeholder="e.g., User Management"
                error={Boolean(formErrors.sub_group_display_name)}
                helperText={formErrors.sub_group_display_name}
                disabled={isSubmitting}
                fullWidth
                required
                />
            </Grid>
            <Grid item xs={12}>
                <TextField
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Briefly describe what this permission allows"
                multiline
                rows={3}
                disabled={isSubmitting}
                fullWidth
                />
            </Grid>
        </Grid>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
          <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/permissions')} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" color="primary" disabled={isSubmitting || initialLoading || (typeof userCan === 'function' && !userCan(requiredPermission))}>
            {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Permission' : 'Create Permission')}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default PermissionForm;