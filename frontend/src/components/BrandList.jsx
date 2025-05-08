import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Box } from '@mui/material'; // Added Box here
import { useAuth } from '../context/AuthContext';

function BrandList() {
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [feedback, setFeedback] = useState({ message: null, type: null });
  const navigate = useNavigate();
  const location = useLocation();
  const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (location.state?.message) {
      setFeedback({ message: location.state.message, type: location.state.type || 'success' });
      navigate(location.pathname, { replace: true, state: {} });
      setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    }
  }, [location, navigate]);

  const fetchBrands = useCallback(async () => {
    if (!isAuthenticated || !apiInstance) {
      setPageError("User not authenticated or API client not available.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      const response = await apiInstance.get('/brands');
      setBrands(response.data || []);
    } catch (err) {
      console.error("[BrandList] Error fetching brands:", err);
      setPageError(err.response?.data?.message || 'Failed to fetch brands.');
    } finally {
      setIsLoading(false);
    }
  }, [apiInstance, isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && apiInstance) {
      fetchBrands();
    } else if (!authLoading && !isAuthenticated) {
      setPageError("Please log in to view brands.");
      setIsLoading(false);
    } else if (!authLoading && !apiInstance) {
      setPageError("API client not available. Cannot fetch brands.");
      setIsLoading(false);
    }
  }, [authLoading, isAuthenticated, apiInstance, fetchBrands]);

  const handleDelete = async (brandId, brandName) => {
    if (!apiInstance || !isAuthenticated) {
      setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete brand: "${brandName}" (ID: ${brandId})? This might fail if it's linked to products.`)) {
      return;
    }
    setPageError(null);
    try {
      await apiInstance.delete(`/brands/${brandId}`);
      setFeedback({ message: `Brand "${brandName}" deleted successfully.`, type: 'success' });
      setBrands(prevBrands => prevBrands.filter(br => br.id !== brandId));
    } catch (err) {
      console.error(`[BrandList] Error deleting brand ${brandId}:`, err);
      const errorMsg = err.response?.data?.message || 'Failed to delete brand. It might be in use.';
      setFeedback({ message: errorMsg, type: 'error' });
    } finally {
      setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    }
  };

  if (authLoading)
    return <Typography align="center" sx={{ p: 2 }}>Authenticating...</Typography>;
  if (isLoading)
    return <Typography align="center" sx={{ p: 2 }}>Loading brands...</Typography>;
  if (pageError && brands.length === 0)
    return <Typography align="center" color="error" sx={{ p: 2 }}>Error: {pageError}</Typography>;

  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" align="center" gutterBottom>
        Manage Brands
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
      {pageError && brands.length > 0 && (
        <Typography variant="body2" color="error" align="center" sx={{ mb: 2 }}>
          Warning: {pageError}
        </Typography>
      )}
      <Box sx={{ textAlign: 'right', mb: 2 }}>
        <Button variant="contained" color="success" component={Link} to="/dashboard/brands/new">
          Add New Brand
        </Button>
      </Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {brands.map((brand) => (
              <TableRow key={brand.id}>
                <TableCell>{brand.id}</TableCell>
                <TableCell>{brand.name}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    component={Link}
                    to={`/dashboard/brands/edit/${brand.id}`}
                    sx={{ mr: 1 }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleDelete(brand.id, brand.name)}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

export default BrandList;