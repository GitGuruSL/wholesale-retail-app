import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Paper, Typography, TextField, Button, Box, Alert } from '@mui/material';
import apiInstance from '../services/api';

function CustomerForm() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(customerId);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');

  const fetchCustomerDetails = useCallback(async () => {
    if (!isEditing) return;
    setLoading(true);
    try {
      const response = await apiInstance.get(`/customers/${customerId}`);
      setName(response.data.name);
      setEmail(response.data.email);
      setPageError('');
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to load customer data.');
    } finally {
      setLoading(false);
    }
  }, [isEditing, customerId]);

  useEffect(() => {
    if (isEditing) fetchCustomerDetails();
  }, [isEditing, fetchCustomerDetails]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    setFormError('');
    setLoading(true);
    const data = { name: name.trim(), email: email.trim() };

    try {
      if (isEditing) {
        await apiInstance.put(`/customers/${customerId}`, data);
      } else {
        await apiInstance.post('/customers', data);
      }
      navigate('/dashboard/customers', {
        state: {
          message: `Customer ${isEditing ? 'updated' : 'created'} successfully.`
        }
      });
    } catch (err) {
      setPageError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} customer.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" align="center" gutterBottom>
        {isEditing ? 'Edit Customer' : 'Add New Customer'}
      </Typography>
      {pageError && <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>}
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField label="Customer Name" variant="outlined" fullWidth required
          value={name} onChange={(e) => setName(e.target.value)} disabled={loading}
          placeholder="e.g., John Doe" sx={{ mb: 2 }} />
        <TextField label="Email" variant="outlined" fullWidth required
          value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading}
          placeholder="e.g., john@example.com" sx={{ mb: 2 }} />
        {formError && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {formError}
          </Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          <Button variant="contained" color="primary" type="submit" disabled={loading}>
            {loading ? 'Saving...' : (isEditing ? 'Update Customer' : 'Create Customer')}
          </Button>
          <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/customers')} disabled={loading}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default CustomerForm;