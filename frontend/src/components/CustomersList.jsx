import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';

function CustomersList() {
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const navigate = useNavigate();

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiInstance.get('/customers');
      setCustomers(response.data);
      setPageError('');
    } catch (err) {
      setPageError(err.response?.data?.message || 'Failed to fetch customers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleDelete = async (customerId, customerName) => {
    if (!window.confirm(`Delete customer "${customerName}"?`)) return;
    try {
      await apiInstance.delete(`/customers/${customerId}`);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed.');
    }
  };

  if (isLoading) return <Typography align="center">Loading customers...</Typography>;
  if (pageError && customers.length === 0) return <Typography color="error" align="center">{pageError}</Typography>;

  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" align="center" gutterBottom>Manage Customers</Typography>
      <Box sx={{ textAlign: 'right', mb: 2 }}>
        <Button variant="contained" color="success" component={Link} to="/dashboard/customers/new">Add New Customer</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>{customer.id}</TableCell>
                <TableCell>{customer.name}</TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell>
                  <Button variant="contained" color="primary" component={Link} to={`/dashboard/customers/edit/${customer.id}`} sx={{ mr: 1 }}>Edit</Button>
                  <Button variant="contained" color="error" onClick={() => handleDelete(customer.id, customer.name)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default CustomersList;