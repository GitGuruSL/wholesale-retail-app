import React, { useState, useEffect } from 'react';
import { Paper, TextField, Button, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

function StoreSettings() {
  const { apiInstance } = useAuth();
  const [storeSettings, setStoreSettings] = useState({ defaultStore: '', currency: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchStoreSettings() {
      setLoading(true);
      try {
        const res = await apiInstance.get('/settings/store');
        // Expected structure: { defaultStore, currency }
        setStoreSettings(res.data);
      } catch (err) {
        console.error("Error fetching store settings:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStoreSettings();
  }, [apiInstance]);

  const handleChange = (e) => {
    setStoreSettings(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiInstance.put('/settings/store', storeSettings);
      setMessage('Store settings updated successfully.');
    } catch (err) {
      console.error("Error updating store settings:", err);
      setMessage('Failed to update store settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, margin: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Store Settings
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Default Store (ID)"
          name="defaultStore"
          value={storeSettings.defaultStore}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Currency"
          name="currency"
          value={storeSettings.currency}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        {message && <Typography variant="body2" sx={{ mt: 1 }}>{message}</Typography>}
        <Button type="submit" variant="contained" color="primary" disabled={loading} sx={{ mt: 2 }}>
          Save
        </Button>
      </form>
    </Paper>
  );
}

export default StoreSettings;