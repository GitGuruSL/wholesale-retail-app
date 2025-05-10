import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, TextField, Button, Box, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly

function BrandForm() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
  const isEditing = Boolean(brandId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [initialLoading, setInitialLoading] = useState(isEditing); // For fetching existing data
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission
  const [pageError, setPageError] = useState(null);
  const [formErrors, setFormErrors] = useState({}); // For field-specific errors

  const requiredPermission = isEditing ? 'brand:update' : 'brand:create';

  const fetchBrandDetails = useCallback(async () => {
    if (!isEditing || !isAuthenticated) return; // apiInstance is always available via import

    setInitialLoading(true);
    setPageError(null);
    setFormErrors({});
    try {
      const response = await apiInstance.get(`/brands/${brandId}`);
      setName(response.data.name);
      setDescription(response.data.description || '');
    } catch (err) {
      console.error("[BrandForm] Failed to fetch brand:", err);
      setPageError(err.response?.data?.message || "Failed to load brand data. You may not have permission or the brand does not exist.");
    } finally {
      setInitialLoading(false);
    }
  }, [brandId, isAuthenticated, isEditing]); // Removed apiInstance from dependencies

  useEffect(() => {
    if (!authLoading) { // Wait for authentication to settle
      if (!isAuthenticated) {
        setPageError("Please log in to manage brands.");
        setInitialLoading(false);
        return;
      }
      if (userCan && !userCan(requiredPermission)) {
        setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} brands.`);
        setInitialLoading(false);
        return;
      }
      if (isEditing) {
        fetchBrandDetails();
      } else {
        // Reset form for 'create' mode
        setName('');
        setDescription('');
        setPageError(null);
        setFormErrors({});
        setInitialLoading(false);
      }
    }
  }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchBrandDetails]);


  const validateForm = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = "Brand name cannot be empty.";
    }
    // Add other validations if needed
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
        setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this brand.`);
        return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setPageError(null); // Clear previous page errors

    const brandData = {
      name: name.trim(),
      description: description.trim() === '' ? null : description.trim(),
    };

    try {
      if (isEditing) {
        await apiInstance.put(`/brands/${brandId}`, brandData);
      } else {
        await apiInstance.post('/brands', brandData);
      }
      navigate('/dashboard/brands', {
        state: {
          message: `Brand "${brandData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
          type: 'success'
        }
      });
    } catch (err) {
      console.error("[BrandForm] Error saving brand:", err);
      const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} brand.`;
      setPageError(errMsg);
      if (err.response?.data?.errors) { // Handle specific field errors from backend
        const backendErrors = {};
        for (const key in err.response.data.errors) {
            backendErrors[key] = err.response.data.errors[key].join(', ');
        }
        setFormErrors(prev => ({...prev, ...backendErrors}));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }
  if (initialLoading && isEditing) { // Show loading only when fetching existing data for edit
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  // If user is not authenticated or doesn't have permission, and pageError is set from useEffect
  if ((!isAuthenticated || (userCan && !userCan(requiredPermission))) && pageError) {
     return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>
                {isEditing ? 'Edit Brand' : 'Add New Brand'}
            </Typography>
            <Alert severity="error">{pageError}</Alert>
             <Button variant="outlined" sx={{mt: 2}} onClick={() => navigate('/dashboard/brands')}>
                Back to Brands
            </Button>
        </Paper>
     );
  }


  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" align="center" gutterBottom>
        {isEditing ? 'Edit Brand' : 'Add New Brand'}
      </Typography>
      {pageError && !formErrors.name && !formErrors.description && /* Show pageError if not a specific field error */
        <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
      }
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Brand Name"
          variant="outlined"
          fullWidth
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (formErrors.name) setFormErrors(prev => ({...prev, name: null}));
          }}
          error={Boolean(formErrors.name)}
          helperText={formErrors.name}
          disabled={isSubmitting || initialLoading}
          placeholder="e.g., Sony, Apple, Samsung"
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
            if (formErrors.description) setFormErrors(prev => ({...prev, description: null}));
          }}
          error={Boolean(formErrors.description)}
          helperText={formErrors.description}
          disabled={isSubmitting || initialLoading}
          placeholder="Optional: A brief description of the brand"
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate('/dashboard/brands')}
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
            {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Brand' : 'Create Brand')}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default BrandForm;