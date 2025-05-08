import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

function BrandForm() {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();
  const isEditing = Boolean(brandId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false); // submission and data fetching loading state
  const [pageError, setPageError] = useState(null); // page-level errors
  const [formError, setFormError] = useState(''); // field-specific validation error

  const fetchBrandDetails = useCallback(async () => {
    if (!isEditing || !apiInstance || !isAuthenticated) return;
    setLoading(true);
    setPageError(null);
    try {
      const response = await apiInstance.get(`/brands/${brandId}`);
      setName(response.data.name);
      setDescription(response.data.description || '');
    } catch (err) {
      console.error("[BrandForm] Failed to fetch brand:", err);
      setPageError(err.response?.data?.message || "Failed to load brand data.");
    } finally {
      setLoading(false);
    }
  }, [brandId, apiInstance, isAuthenticated, isEditing]);

  useEffect(() => {
    if (isEditing && !authLoading && isAuthenticated && apiInstance) {
      fetchBrandDetails();
    } else if (isEditing && !authLoading && !isAuthenticated) {
      setPageError("Please log in to edit brands.");
    } else if (!isEditing) {
      setName('');
      setDescription('');
      setPageError(null);
      setFormError('');
    }
  }, [isEditing, fetchBrandDetails, authLoading, isAuthenticated, apiInstance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiInstance || !isAuthenticated) {
      setPageError("Authentication error. Please log in again.");
      return;
    }
    if (!name.trim()) {
      setFormError("Brand name cannot be empty.");
      return;
    }
    setFormError('');
    setLoading(true);
    setPageError(null);

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
          message: `Brand "${name}" ${isEditing ? 'updated' : 'created'} successfully.`,
          type: 'success'
        }
      });
    } catch (err) {
      console.error("[BrandForm] Error saving brand:", err);
      const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} brand.`;
      setPageError(errMsg);
      if (err.response?.data?.errors) {
        setFormError(Object.values(err.response.data.errors).join(', '));
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading)
    return <Typography align="center" sx={{ p: 2 }}>Authenticating...</Typography>;
  if (isEditing && loading && !name && !pageError)
    return <Typography align="center" sx={{ p: 2 }}>Loading brand details...</Typography>;

  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" align="center" gutterBottom>
        {isEditing ? 'Edit Brand' : 'Add New Brand'}
      </Typography>
      {pageError && <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Brand Name"
          variant="outlined"
          fullWidth
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          placeholder="e.g., Sony, Apple, Samsung"
          sx={{ mb: 2 }}
        />
        {formError && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {formError}
          </Typography>
        )}
        <TextField
          label="Description"
          variant="outlined"
          multiline
          minRows={3}
          fullWidth
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          placeholder="Optional: A brief description of the brand"
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="contained" color="primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : (isEditing ? 'Update Brand' : 'Create Brand')}
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/brands')} disabled={loading}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default BrandForm;