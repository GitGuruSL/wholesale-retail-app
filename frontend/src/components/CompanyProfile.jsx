import React, { useState, useEffect } from 'react';
import { Paper, TextField, Button, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

function CompanyProfile() {
  const { apiInstance } = useAuth();
  const [companyData, setCompanyData] = useState({ name: '', address: '', contact: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchCompanyProfile() {
      setLoading(true);
      try {
        const res = await apiInstance.get('/settings/company');
        // Expected structure: { name, address, contact }
        setCompanyData(res.data);
      } catch (err) {
        console.error("Error fetching company profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanyProfile();
  }, [apiInstance]);

  const handleChange = (e) => {
    setCompanyData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiInstance.put('/settings/company', companyData);
      setMessage('Company profile updated successfully.');
    } catch (err) {
      console.error("Error updating company profile:", err);
      setMessage('Failed to update company profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, margin: 'auto', mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Company Profile
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          label="Company Name"
          name="name"
          value={companyData.name}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
        />
        <TextField
          label="Address"
          name="address"
          value={companyData.address}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Contact Info"
          name="contact"
          value={companyData.contact}
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

export default CompanyProfile;