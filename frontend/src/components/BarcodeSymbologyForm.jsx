import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, TextField, Button, Box, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';

function BarcodeSymbologyForm() {
  const { barcodeSymbologyId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
  const isEditing = Boolean(barcodeSymbologyId);

  const [name, setName] = useState('');
  const [initialLoading, setInitialLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const requiredPermission = isEditing ? 'barcode_symbology:update' : 'barcode_symbology:create';

  const fetchSymbologyDetails = useCallback(async () => {
    if (!isEditing || !isAuthenticated || !barcodeSymbologyId) return;

    setInitialLoading(true);
    setPageError(null);
    setFormErrors({});
    try {
      const response = await apiInstance.get(`/barcode-symbologies/${barcodeSymbologyId}`);
      setName(response.data.name);
    } catch (err) {
      console.error("[BarcodeSymbologyForm] Failed to fetch symbology:", err);
      setPageError(err.response?.data?.message || "Failed to load symbology data. You may not have permission or the item does not exist.");
    } finally {
      setInitialLoading(false);
    }
  }, [barcodeSymbologyId, isAuthenticated, isEditing]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setPageError("Please log in to manage barcode symbologies.");
        setInitialLoading(false);
        return;
      }
      if (userCan && !userCan(requiredPermission)) {
        setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} barcode symbologies.`);
        setInitialLoading(false);
        return;
      }
      if (isEditing) {
        fetchSymbologyDetails();
      } else {
        setName('');
        setPageError(null);
        setFormErrors({});
        setInitialLoading(false);
      }
    }
  }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchSymbologyDetails]);

  const validateForm = () => {
    const errors = {};
    if (!name.trim()) {
      errors.name = "Symbology name cannot be empty.";
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
      setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this symbology.`);
      return;
    }
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setPageError(null);

    const symbologyData = { name: name.trim() };

    try {
      if (isEditing) {
        await apiInstance.put(`/barcode-symbologies/${barcodeSymbologyId}`, symbologyData);
      } else {
        await apiInstance.post('/barcode-symbologies', symbologyData);
      }
      navigate('/dashboard/barcode-symbologies', {
        state: {
          message: `Barcode Symbology "${symbologyData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
          type: 'success'
        }
      });
    } catch (err) {
      console.error("[BarcodeSymbologyForm] Error saving symbology:", err);
      const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} symbology.`;
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
          {isEditing ? 'Edit Barcode Symbology' : 'Add New Barcode Symbology'}
        </Typography>
        <Alert severity="error">{pageError}</Alert>
        <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/barcode-symbologies')}>
          Back to List
        </Button>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" align="center" gutterBottom>
        {isEditing ? 'Edit Barcode Symbology' : 'Add New Barcode Symbology'}
      </Typography>
      {pageError && !formErrors.name &&
        <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
      }
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Symbology Name"
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
          placeholder="e.g., EAN-13, CODE 128, QR Code"
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => navigate('/dashboard/barcode-symbologies')}
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
            {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Symbology' : 'Create Symbology')}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default BarcodeSymbologyForm;