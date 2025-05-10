import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, TextField, Button, Box, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';

function CategoryForm() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
  const isEditing = Boolean(categoryId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const requiredPermission = isEditing ? 'category:update' : 'category:create';

  const fetchCategoryDetails = useCallback(async () => {
    if (!isEditing || !isAuthenticated || !categoryId) return;

    setInitialLoading(true);
    setPageError(null);
    setFormErrors({});
    try {
      const response = await apiInstance.get(`/categories/${categoryId}`);
      setName(response.data.name);
      setDescription(response.data.description || '');
    } catch (err) {
      console.error("[CategoryForm] Failed to fetch category:", err);
      setPageError(err.response?.data?.message || "Failed to load category data. You may not have permission or the item does not exist.");
    } finally {
      setInitialLoading(false);
    }
  }, [categoryId, isAuthenticated, isEditing]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setPageError("Please log in to manage categories.");
        setInitialLoading(false);
        return;
      }
      if (userCan && !userCan(requiredPermission)) {
        setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} categories.`);
        setInitialLoading(false);
        return;
      }
      if (isEditing) {
        fetchCategoryDetails();
      } else {
        setName('');
        setDescription('');
        setPageError(null);
        setFormErrors({});
        setInitialLoading(false);
      }
    }
  }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchCategoryDetails]);

  const validateForm = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = "Category name cannot be empty.";
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
      setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this category.`);
      return;
    }
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setPageError(null);

    const categoryData = {
      name: name.trim(),
      description: description.trim() === '' ? null : description.trim(),
    };

    try {
      if (isEditing) {
        await apiInstance.put(`/categories/${categoryId}`, categoryData);
      } else {
        await apiInstance.post('/categories', categoryData);
      }
      navigate('/dashboard/categories', {
        state: {
          message: `Category "${categoryData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
          type: 'success'
        }
      });
    } catch (err) {
      console.error("[CategoryForm] Error saving category:", err);
      const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} category.`;
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
          {isEditing ? 'Edit Category' : 'Add New Category'}
        </Typography>
        <Alert severity="error">{pageError}</Alert>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/categories')}>
          Back to List
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" align="center" gutterBottom>
        {isEditing ? 'Edit Category' : 'Add New Category'}
      </Typography>
      {pageError && !formErrors.name && !formErrors.description &&
        <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
      }
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Category Name"
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
          placeholder="e.g., Electronics, Books, Clothing"
          sx={{ mb: 2 }}
        />
        <TextField
          label="Description"
          variant="outlined"
          multiline
          minRows={3}
          fullWidth
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            if (formErrors.description) setFormErrors(prev => ({ ...prev, description: null }));
          }}
          error={Boolean(formErrors.description)}
          helperText={formErrors.description}
          disabled={isSubmitting || initialLoading}
          placeholder="Optional: A brief description of the category"
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate('/dashboard/categories')}
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
            {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Category' : 'Create Category')}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default CategoryForm;