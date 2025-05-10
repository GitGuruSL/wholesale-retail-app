import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Keep for isAuthenticated and userCan if needed
import apiInstance from '../services/api'; // Import apiInstance directly
import {
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  FormHelperText,
  FormControl
} from '@mui/material';

const initialCategoryFormData = {
  name: '',
  display_order: '',
  description: '',
};

function PermissionCategoryForm() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  // Get isAuthenticated from useAuth. apiInstance is now imported directly.
  const { isAuthenticated, userCan, isLoading: authLoading } = useAuth();
  const isEditing = Boolean(categoryId);

  const [formData, setFormData] = useState(initialCategoryFormData);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState(null); // Renamed error to pageError for clarity
  const [formErrors, setFormErrors] = useState({});

  // Permission check (adjust permission strings as needed)
 const requiredPermission = 'system:manage_permission_categories';

  const fetchPermissionCategoryDetails = useCallback(async (id) => {
    // apiInstance is now from direct import, always available if module loads
    setLoadingDetails(true);
    setPageError(null);
    try {
      const response = await apiInstance.get(`/permission-categories/${id}`);
      const categoryData = response.data?.data || response.data; // Adjust if your API wraps data
      setFormData({
        name: categoryData.name || '',
        display_order: categoryData.display_order !== null && categoryData.display_order !== undefined ? String(categoryData.display_order) : '',
        description: categoryData.description || '',
      });
    } catch (err) {
      console.error('[PermissionCategoryForm] Error fetching permission category details:', err);
      setPageError(err.response?.data?.message || 'Failed to fetch category details.');
    } finally {
      setLoadingDetails(false);
    }
  }, []); // apiInstance from direct import is stable, not needed as dependency

  useEffect(() => {
    if (authLoading) { // Wait for authentication to resolve
        return;
    }
    if (!isAuthenticated) {
        setPageError("Please log in to manage permission categories.");
        return;
    }
    if (userCan && !userCan(requiredPermission)) {
        setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} permission categories.`);
        return;
    }

    if (isEditing && categoryId) {
      fetchPermissionCategoryDetails(categoryId);
    } else if (!isEditing) {
      setFormData(initialCategoryFormData);
      setPageError(null);
      setFormErrors({});
    }
  }, [isEditing, categoryId, fetchPermissionCategoryDetails, isAuthenticated, authLoading, userCan, requiredPermission]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
    if (pageError) setPageError(null); // Clear page error on interaction
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Category name is required.';
    }
    if (formData.display_order && isNaN(parseInt(formData.display_order, 10))) {
      errors.display_order = 'Display order must be a number.';
    } else if (formData.display_order && parseInt(formData.display_order, 10) < 0) {
      errors.display_order = 'Display order cannot be negative.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated || (userCan && !userCan(requiredPermission))) {
        setPageError("You do not have permission to perform this action or you are not logged in.");
        return;
    }
    if (!validateForm()) return;

    setSubmitting(true);
    setPageError(null);
    const payload = {
      name: formData.name.trim(),
      display_order: formData.display_order.trim() === '' ? null : parseInt(formData.display_order, 10),
      description: formData.description.trim() === '' ? null : formData.description.trim(),
    };

    try {
      if (isEditing) {
        await apiInstance.put(`/permission-categories/${categoryId}`, payload);
      } else {
        await apiInstance.post('/permission-categories', payload);
      }
      navigate('/dashboard/permission-categories', {
        state: { message: `Permission category "${payload.name}" ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' }
      });
    } catch (err) {
      console.error('[PermissionCategoryForm] Error submitting form:', err);
      const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} category.`;
      setPageError(errMsg);
      if (err.response?.data?.errors) {
        const backendFieldErrors = {};
        err.response.data.errors.forEach(fieldError => {
          backendFieldErrors[fieldError.path || fieldError.param || 'general'] = fieldError.msg;
        });
        setFormErrors(prev => ({ ...prev, ...backendFieldErrors }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 1 }}>Authenticating...</Typography>
      </Paper>
    );
  }

  // Page error takes precedence if it's a permission issue or login issue
  if (pageError && (!isAuthenticated || (userCan && !userCan(requiredPermission)))) {
    return (
      <Paper sx={{ p: 3, m: 2 }}>
        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          {isEditing ? `Edit Permission Category` : 'Create New Permission Category'}
        </Typography>
        <Alert severity="error">{pageError}</Alert>
         <Button sx={{mt: 2}} variant="outlined" onClick={() => navigate('/dashboard/permission-categories')}>
            Back to List
        </Button>
      </Paper>
    );
  }


  if (loadingDetails && isEditing) {
    return (
      <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 1 }}>Loading category details...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
        {isEditing ? `Edit Permission Category (ID: ${categoryId})` : 'Create New Permission Category'}
      </Typography>
      {pageError && ( // Display other page errors (like fetch failure)
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError(null)}>
          {pageError}
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <FormControl fullWidth sx={{ mb: 2 }} error={Boolean(formErrors.name)}>
          <TextField
            label="Category Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            disabled={submitting || (loadingDetails && isEditing)}
            autoFocus={!isEditing}
          />
          {formErrors.name && <FormHelperText>{formErrors.name}</FormHelperText>}
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }} error={Boolean(formErrors.display_order)}>
          <TextField
            label="Display Order"
            name="display_order"
            type="number"
            value={formData.display_order}
            onChange={handleChange}
            disabled={submitting || (loadingDetails && isEditing)}
            placeholder="e.g., 10 (lower numbers appear first)"
            InputProps={{ inputProps: { min: 0 } }}
          />
          {formErrors.display_order ? <FormHelperText>{formErrors.display_order}</FormHelperText> : <FormHelperText>Controls the order in lists.</FormHelperText>}
        </FormControl>

        <FormControl fullWidth sx={{ mb: 2 }}>
          <TextField
            label="Description (Optional)"
            name="description"
            value={formData.description}
            onChange={handleChange}
            disabled={submitting || (loadingDetails && isEditing)}
            multiline
            rows={3}
          />
        </FormControl>

        <Box display="flex" gap={2} mt={3}>
          <Button type="submit" variant="contained" color="primary" disabled={submitting || (loadingDetails && isEditing) || (userCan && !userCan(requiredPermission))}>
            {submitting
              ? (isEditing ? 'Updating...' : 'Creating...')
              : (isEditing ? 'Update Category' : 'Create Category')}
            {(submitting) && <CircularProgress size={20} sx={{ ml: 1, color: 'white' }} />}
          </Button>
          <Button variant="outlined" onClick={() => navigate('/dashboard/permission-categories')} disabled={submitting || (loadingDetails && isEditing)}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default PermissionCategoryForm;