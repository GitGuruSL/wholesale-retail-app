import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Paper, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Box, Alert } from '@mui/material'; // Added Alert
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Step 1: Import apiInstance directly

function BrandList() {
  const [brands, setBrands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [feedback, setFeedback] = useState({ message: null, type: null });
  const navigate = useNavigate();
  const location = useLocation();
  // Step 2: Remove apiInstance from useAuth destructuring. Add userCan for permissions.
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

  useEffect(() => {
    if (location.state?.message) {
      setFeedback({ message: location.state.message, type: location.state.type || 'success' });
      navigate(location.pathname, { replace: true, state: {} }); // Clear location state
      const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
      return () => clearTimeout(timer); // Cleanup timer on unmount or if effect re-runs
    }
  }, [location, navigate]);

  const fetchBrands = useCallback(async () => {
    // Step 3: apiInstance is now directly available. Only check for authentication.
    if (!isAuthenticated) {
      // This case should ideally be handled by the useEffect below,
      // which waits for authLoading to be false.
      // If somehow called when not authenticated, set an error.
      setPageError("User not authenticated. Cannot fetch brands.");
      setIsLoading(false);
      setBrands([]);
      return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      const response = await apiInstance.get('/brands'); // Use the imported apiInstance
      setBrands(response.data || []);
    } catch (err) {
      console.error("[BrandList] Error fetching brands:", err);
      setPageError(err.response?.data?.message || 'Failed to fetch brands.');
      setBrands([]); // Clear brands on error
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]); // apiInstance is no longer a dependency from context

  useEffect(() => {
    if (!authLoading) { // Wait for authentication process to complete
      if (isAuthenticated) {
        fetchBrands();
      } else {
        // If not authenticated after auth check, show appropriate message
        setPageError("Please log in to view brands.");
        setIsLoading(false);
        setBrands([]); // Ensure brands are cleared
      }
    }
    // No dependency on apiInstance here as it's module-scoped and constant
  }, [authLoading, isAuthenticated, fetchBrands]);

  const handleDelete = async (brandId, brandName) => {
    if (!isAuthenticated) { // Check authentication
      setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
      return;
    }
    // Check permission
    if (userCan && !userCan('brand:delete')) {
        setFeedback({ message: "You do not have permission to delete brands.", type: 'error' });
        setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        return;
    }

    if (!window.confirm(`Are you sure you want to delete brand: "${brandName}" (ID: ${brandId})? This might fail if it's linked to Items.`)) {
      return;
    }
    setPageError(null); // Clear previous page errors before new action
    try {
      await apiInstance.delete(`/brands/${brandId}`); // Use imported apiInstance
      setFeedback({ message: `Brand "${brandName}" (ID: ${brandId}) deleted successfully.`, type: 'success' });
      setBrands(prevBrands => prevBrands.filter(br => br.id !== brandId));
    } catch (err) {
      console.error(`[BrandList] Error deleting brand ${brandId}:`, err);
      const errorMsg = err.response?.data?.message || 'Failed to delete brand. It might be in use.';
      setFeedback({ message: errorMsg, type: 'error' });
    }
    // Set a timeout to clear feedback
    const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    // No return for cleanup here as handleDelete is an event handler, not a useEffect
  };

  if (authLoading) {
    return <Typography align="center" sx={{ p: 2 }}>Authenticating...</Typography>;
  }

  // This isLoading is for the brands data fetching
  if (isLoading && !pageError && brands.length === 0) { // Show loading only if no page error and no brands yet
    return <Typography align="center" sx={{ p: 2 }}>Loading brands...</Typography>;
  }

  // If there's a page error and no brands were loaded (or after an attempt)
  if (pageError && brands.length === 0) {
    return (
        <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" align="center" gutterBottom>Manage Brands</Typography>
            <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            {isAuthenticated && userCan && userCan('brand:create') &&
                <Box sx={{ textAlign: 'right', mb: 2 }}>
                    <Button variant="contained" color="primary" component={Link} to="/dashboard/brands/new">
                        Add New Brand
                    </Button>
                </Box>
            }
        </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, m: 2, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" align="center" gutterBottom>
        Manage Brands
      </Typography>
      {feedback.message && (
        <Alert severity={feedback.type === 'success' ? 'success' : 'error'} sx={{ mb: 2, width: '100%' }}>
          {feedback.message}
        </Alert>
      )}
      {/* Show pageError as a warning if some brands are already displayed but an issue occurred (e.g., during delete) */}
      {pageError && brands.length > 0 && (
         <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
            {pageError} {/* This could be a more generic "An error occurred" if brands are already shown */}
        </Alert>
      )}
      {isAuthenticated && userCan && userCan('brand:create') &&
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button variant="contained" color="primary" component={Link} to="/dashboard/brands/new">
                Add New Brand
            </Button>
        </Box>
      }
      {!isLoading && brands.length === 0 && !pageError && ( // Ensure not loading and no page error before showing "No brands"
        <Typography align="center" sx={{ p: 2 }}>No brands found. {isAuthenticated && userCan && userCan('brand:create') && "Try adding one!"}</Typography>
      )}
      {brands.length > 0 && (
        <TableContainer component={Paper} elevation={2}>
            <Table sx={{ minWidth: 650 }} aria-label="brands table">
            <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 'bold' } }}>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {brands.map((brand) => (
                <TableRow
                    key={brand.id}
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                    <TableCell component="th" scope="row">{brand.id}</TableCell>
                    <TableCell>{brand.name}</TableCell>
                    <TableCell align="right">
                    {isAuthenticated && userCan && userCan('brand:update') &&
                        <Button
                            variant="outlined"
                            color="primary"
                            component={Link}
                            to={`/dashboard/brands/edit/${brand.id}`}
                            sx={{ mr: 1 }}
                            size="small"
                        >
                            Edit
                        </Button>
                    }
                    {isAuthenticated && userCan && userCan('brand:delete') &&
                        <Button
                            variant="outlined"
                            color="error"
                            onClick={() => handleDelete(brand.id, brand.name)}
                            size="small"
                        >
                            Delete
                        </Button>
                    }
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

export default BrandList;