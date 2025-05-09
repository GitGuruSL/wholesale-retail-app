import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText
} from '@mui/material';

function PermissionForm() {
  const { permissionId } = useParams();
  const navigate = useNavigate();
  const { apiInstance } = useAuth();
  const isEditing = Boolean(permissionId);

  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    permission_category_id: '',
    sub_group_key: '',
    sub_group_display_name: ''
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const fetchCategories = useCallback(async () => {
    try {
      const response = await apiInstance.get('/permissions/categories');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Failed to fetch permission categories:', err);
      setError('Failed to load permission categories.');
      setCategories([]);
    }
  }, [apiInstance]);

  const fetchPermission = useCallback(async (id) => {
    setLoading(true);
    setError(null);
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
      setError(err.response?.data?.message || 'Failed to fetch permission details.');
      console.error('Error fetching permission:', err);
    } finally {
      setLoading(false);
    }
  }, [apiInstance]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchCategories();
      if (isEditing && permissionId) {
        await fetchPermission(permissionId);
      } else {
        setFormData({
          name: '',
          display_name: '',
          description: '',
          permission_category_id: '',
          sub_group_key: '',
          sub_group_display_name: ''
        });
        setLoading(false);
      }
    };
    loadInitialData();
  }, [isEditing, permissionId, fetchCategories, fetchPermission]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'permission_category_id' && value !== '') {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        processedValue = numValue;
      }
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
    if (!formData.display_name.trim()) {
      errors.display_name = 'Display name is required.';
    }
    if (formData.permission_category_id === '' || formData.permission_category_id === undefined || formData.permission_category_id === null) {
      errors.permission_category_id = 'Permission category is required.';
    }
    if (!formData.sub_group_key.trim()) {
      errors.sub_group_key = 'Sub-group key is required (e.g., user, product_core).';
    }
    if (!formData.sub_group_display_name.trim()) {
      errors.sub_group_display_name = 'Sub-group display name is required (e.g., User Management).';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError(null);
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
      navigate('/dashboard/permissions', { state: { message: `Permission ${isEditing ? 'updated' : 'created'} successfully!` } });
    } catch (err) {
      const apiError = err.response?.data;
      if (apiError?.errors && Array.isArray(apiError.errors)) {
        const backendErrors = apiError.errors.reduce((acc, curr) => {
          acc[curr.path || curr.param] = curr.msg;
          return acc;
        }, {});
        setFormErrors(prev => ({ ...prev, ...backendErrors }));
        setError("Please correct the errors in the form.");
      } else {
        setError(apiError?.message || `Failed to ${isEditing ? 'update' : 'create'} permission.`);
      }
      console.error('Error submitting permission form:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing && !formData.name) {
    return (
      <Box sx={{ p: 3, m: 2, textAlign: 'center' }}>
        <Typography>Loading permission details...</Typography>
      </Box>
    );
  }
  if (loading && categories.length === 0) {
    return (
      <Box sx={{ p: 3, m: 2, textAlign: 'center' }}>
        <Typography>Loading categories...</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        {isEditing ? 'Edit Permission' : 'Create New Permission'}
      </Typography>
      {error && (
        <Box sx={{ bgcolor: '#f8d7da', color: '#721c24', p: 2, border: '1px solid #f5c6cb', borderRadius: 1, mb: 2 }}>
          Error: {error}
        </Box>
      )}
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            label="Permission Name (Code)"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., user:create, product:edit"
            disabled={isEditing}
            error={Boolean(formErrors.name)}
            helperText={formErrors.name || (isEditing && 'The permission name (code) cannot be changed after creation.')}
          />
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            label="Display Name"
            name="display_name"
            value={formData.display_name}
            onChange={handleChange}
            placeholder="e.g., Create Users, Edit Products"
            error={Boolean(formErrors.display_name)}
            helperText={formErrors.display_name}
          />
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }} error={Boolean(formErrors.permission_category_id)}>
          <InputLabel id="permission-category-label">Permission Category</InputLabel>
          <Select
            labelId="permission-category-label"
            name="permission_category_id"
            value={formData.permission_category_id}
            onChange={handleChange}
            label="Permission Category"
          >
            <MenuItem value="">
              <em>-- Select a Category --</em>
            </MenuItem>
            {categories.map(category => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
          {formErrors.permission_category_id && (
            <FormHelperText>{formErrors.permission_category_id}</FormHelperText>
          )}
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            label="Sub-Group Key"
            name="sub_group_key"
            value={formData.sub_group_key}
            onChange={handleChange}
            placeholder="e.g., user, product_core, tax_settings"
            error={Boolean(formErrors.sub_group_key)}
            helperText={formErrors.sub_group_key}
          />
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            label="Sub-Group Display Name"
            name="sub_group_display_name"
            value={formData.sub_group_display_name}
            onChange={handleChange}
            placeholder="e.g., User Management, Product Core Setup"
            error={Boolean(formErrors.sub_group_display_name)}
            helperText={formErrors.sub_group_display_name}
          />
        </FormControl>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            label="Description (Optional)"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Briefly describe what this permission allows"
            multiline
            rows={3}
          />
        </FormControl>
        <Box display="flex" gap={2} mt={2}>
          <Button type="submit" variant="contained" color="primary" disabled={loading}>
            {loading
              ? (isEditing ? 'Updating...' : 'Creating...')
              : (isEditing ? 'Update Permission' : 'Create Permission')}
          </Button>
          <Button variant="outlined" onClick={() => navigate('/dashboard/permissions')} disabled={loading}>
            Cancel
          </Button>
        </Box>
      </form>
    </Paper>
  );
}

export default PermissionForm;