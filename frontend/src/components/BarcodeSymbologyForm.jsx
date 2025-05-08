import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, TextField, Button, Box, Alert } from '@mui/material';
import { useAuth } from '../context/AuthContext';

function BarcodeSymbologyForm() {
  const { barcodeSymbologyId } = useParams();
  const navigate = useNavigate();
  const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();
  const isEditing = Boolean(barcodeSymbologyId);

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');

  const fetchSymbologyDetails = useCallback(async () => {
    if (!isEditing || !apiInstance || !isAuthenticated || !barcodeSymbologyId) return;
    setLoading(true);
    setPageError('');
    try {
      const response = await apiInstance.get(`/barcode-symbologies/${barcodeSymbologyId}`);
      setName(response.data.name);
    } catch (err) {
      console.error("[BarcodeSymbologyForm] Failed to fetch symbology:", err);
      setPageError(err.response?.data?.message || "Failed to load symbology data.");
    } finally {
      setLoading(false);
    }
  }, [barcodeSymbologyId, apiInstance, isAuthenticated, isEditing]);

  useEffect(() => {
    if (isEditing && !authLoading && isAuthenticated && apiInstance) {
      fetchSymbologyDetails();
    } else if (isEditing && !authLoading && !isAuthenticated) {
      setPageError("Please log in to edit symbology types.");
    } else if (!isEditing) {
      setName('');
      setPageError('');
      setFormError('');
    }
  }, [isEditing, fetchSymbologyDetails, authLoading, isAuthenticated, apiInstance]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!apiInstance || !isAuthenticated) {
      setPageError("Authentication error. Please log in again.");
      return;
    }
    if (!name.trim()) {
      setFormError("Symbology name cannot be empty.");
      return;
    }
    setFormError('');
    setLoading(true);
    setPageError('');

    const symbologyData = { name: name.trim() };

    try {
      if (isEditing) {
        await apiInstance.put(`/barcode-symbologies/${barcodeSymbologyId}`, symbologyData);
      } else {
        await apiInstance.post('/barcode-symbologies', symbologyData);
      }
      navigate('/dashboard/barcode-symbologies', {
        state: {
          message: `Barcode Type "${name}" ${isEditing ? 'updated' : 'created'} successfully.`,
          type: 'success'
        }
      });
    } catch (err) {
      console.error("[BarcodeSymbologyForm] Error saving symbology:", err);
      const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} symbology.`;
      setPageError(errMsg);
      if (err.response?.data?.errors) {
        setFormError(Object.values(err.response.data.errors).join(', '));
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <Typography align="center" sx={{ p: 2 }}>Authenticating...</Typography>;
  if (isEditing && loading && !name && !pageError)
    return <Typography align="center" sx={{ p: 2 }}>Loading symbology details...</Typography>;

  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" align="center" gutterBottom>
        {isEditing ? `Edit Barcode Type (ID: ${barcodeSymbologyId})` : 'Add New Barcode Type'}
      </Typography>
      {pageError && <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField 
          label="Symbology Name"
          variant="outlined"
          fullWidth
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          placeholder="e.g., Code 128, EAN-13, QR Code"
          sx={{ mb: 2 }}
        />
        {formError && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {formError}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="contained" color="primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : isEditing ? 'Update Type' : 'Create Type'}
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/barcode-symbologies')} disabled={loading}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default BarcodeSymbologyForm;