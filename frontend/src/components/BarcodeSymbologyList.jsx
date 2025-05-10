import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  Paper,
  Typography,
  Button,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  TableContainer,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';

function BarcodeSymbologyList() {
  const [symbologies, setSymbologies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [feedback, setFeedback] = useState({ message: null, type: null });
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

  // Display navigation feedback (if passed via location state)
  useEffect(() => {
    if (location.state?.message) {
      setFeedback({ message: location.state.message, type: location.state.type || 'success' });
      // Clear the location state feedback
      navigate(location.pathname, { replace: true, state: {} });
      const timeoutId = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [location, navigate]);

  const fetchSymbologies = useCallback(async () => {
    if (!isAuthenticated || !apiInstance) {
      setPageError("User not authenticated or API client not available.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      const response = await apiInstance.get('/barcode-symbologies');
      setSymbologies(response.data || []);
    } catch (err) {
      console.error("[BarcodeSymbologyList] Error fetching symbologies:", err);
      setPageError(err.response?.data?.message || 'Failed to fetch barcode symbologies.');
    } finally {
      setIsLoading(false);
    }
  }, [apiInstance, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && apiInstance) {
      fetchSymbologies();
    } else if (!authLoading && !isAuthenticated) {
      setPageError("Please log in to view barcode types.");
      setIsLoading(false);
    } else if (!authLoading && !apiInstance) {
      setPageError("API client not available. Cannot fetch barcode types.");
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, apiInstance, fetchSymbologies]);

  const handleDelete = async (symbologyId, symbologyName) => {
    if (!apiInstance || !isAuthenticated) {
      setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete symbology: "${symbologyName}" (ID: ${symbologyId})?`)) {
      return;
    }
    try {
      await apiInstance.delete(`/barcode-symbologies/${symbologyId}`);
      setFeedback({ message: `Symbology "${symbologyName}" deleted successfully.`, type: 'success' });
      setSymbologies(prev => prev.filter(s => s.id !== symbologyId));
    } catch (err) {
      console.error(`[BarcodeSymbologyList] Error deleting symbology ${symbologyId}:`, err);
      const errorMsg = err.response?.data?.message || 'Failed to delete symbology.';
      setFeedback({ message: errorMsg, type: 'error' });
    } finally {
      setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    }
  };

  if (authLoading) return <Typography align="center" sx={{ p: 2 }}>Authenticating...</Typography>;
  if (isLoading) return <Typography align="center" sx={{ p: 2 }}>Loading barcode symbologies...</Typography>;
  if (pageError && symbologies.length === 0)
    return <Typography align="center" color="error" sx={{ p: 2 }}>Error: {pageError}</Typography>;

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" align="center" gutterBottom>
        Manage Barcode Types
      </Typography>
      {feedback.message && (
        <Typography
          variant="body1"
          align="center"
          color={feedback.type === 'success' ? 'success.main' : 'error.main'}
          sx={{ mb: 2 }}
        >
          {feedback.message}
        </Typography>
      )}
      {pageError && symbologies.length > 0 && !feedback.message && (
        <Typography variant="body2" color="error" align="center" sx={{ mb: 2 }}>
          Warning: An operation failed. Error: {pageError}
        </Typography>
      )}
      <Button
        variant="contained"
        color="primary"
        component={Link}
        to="/dashboard/barcode-symbologies/new"
        sx={{ mb: 2, float: 'right' }}
      >
        Add New Barcode Type
      </Button>
      {symbologies.length === 0 ? (
        <Typography variant="body1" align="center">
          No barcode symbologies found. Click "Add New Barcode Type" to create one.
        </Typography>
      ) : (
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#e9ecef' }}>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {symbologies.map((symbology, index) => (
                <TableRow key={symbology.id} sx={{ bgcolor: index % 2 === 0 ? '#ffffff' : '#f8f9fa' }}>
                  <TableCell>{symbology.id}</TableCell>
                  <TableCell>{symbology.name}</TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      color="primary"
                      sx={{ mr: 1 }}
                      onClick={() => navigate(`/dashboard/barcode-symbologies/edit/${symbology.id}`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleDelete(symbology.id, symbology.name)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

export default BarcodeSymbologyList;