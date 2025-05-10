import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly
import {
  Paper, Box, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Button, Alert, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

function SpecialCategoryList() {
  const [specialCategories, setSpecialCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [feedback, setFeedback] = useState({ message: null, type: null });

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

  useEffect(() => {
    if (location.state?.message) {
      setFeedback({ message: location.state.message, type: location.state.type || 'success' });
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  const fetchSpecialCategories = useCallback(async () => {
    if (!isAuthenticated) {
      setPageError("User not authenticated. Cannot fetch special categories.");
      setIsLoading(false);
      setSpecialCategories([]);
      return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      const response = await apiInstance.get('/special-categories');
      setSpecialCategories(response.data?.data || response.data || []);
    } catch (err) {
      console.error("Error fetching special categories:", err);
      setPageError(err.response?.data?.message || 'Failed to fetch special categories.');
      setSpecialCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        fetchSpecialCategories();
      } else {
        setPageError("Please log in to view special categories.");
        setIsLoading(false);
        setSpecialCategories([]);
      }
    }
  }, [authLoading, isAuthenticated, fetchSpecialCategories]);

  const handleDelete = async (categoryId, categoryName) => {
    if (!isAuthenticated) {
      setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
      return;
    }
    if (userCan && !userCan('specialcategory:delete')) { // Adjust permission string
        setFeedback({ message: "You don't have permission to delete special categories.", type: 'error' });
        setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        return;
    }
    if (window.confirm(`Are you sure you want to delete special category: "${categoryName}" (ID: ${categoryId})?`)) {
      setPageError(null);
      setIsLoading(true);
      try {
        await apiInstance.delete(`/special-categories/${categoryId}`);
        setFeedback({ message: `Special category "${categoryName}" deleted successfully.`, type: 'success' });
        setSpecialCategories(prev => prev.filter(cat => cat.id !== categoryId));
      } catch (err) {
        console.error(`Error deleting special category ${categoryId}:`, err);
        const errorMsg = err.response?.data?.message || 'Failed to delete special category.';
        setFeedback({ message: errorMsg, type: 'error' });
      } finally {
        setIsLoading(false);
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
      }
    }
  };

  const canCreate = userCan && userCan('specialcategory:create'); // Adjust
  const canEdit = userCan && userCan('specialcategory:update');   // Adjust
  const canDelete = userCan && userCan('specialcategory:delete'); // Adjust

  if (authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /><Typography sx={{ml:1}}>Authenticating...</Typography></Box>;
  }

  if (isLoading && !pageError && specialCategories.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /><Typography sx={{ml:1}}>Loading special categories...</Typography></Box>;
  }
  
  if (pageError && specialCategories.length === 0) {
     return (
        <Paper sx={{ p: 3, m: 2 }}>
            <Typography variant="h5" align="center" gutterBottom>Manage Special Categories</Typography>
            <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            {isAuthenticated && canCreate &&
                <Box sx={{ textAlign: 'right', mb: 2 }}>
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/special-categories/new" startIcon={<FaPlus />}>
                        Add New Special Category
                    </Button>
                </Box>
            }
        </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, m: 2, overflowX: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Manage Special Categories</Typography>
        {isAuthenticated && canCreate && (
          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to="/dashboard/special-categories/new"
            startIcon={<FaPlus />}
          >
            Add New Special Category
          </Button>
        )}
      </Box>

      {feedback.message && (
        <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setFeedback({ message: null, type: null })}>
          {feedback.message}
        </Alert>
      )}
      {pageError && specialCategories.length > 0 && (
         <Alert severity="warning" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      {!isLoading && specialCategories.length === 0 && !pageError && (
        <Alert severity="info" sx={{ textAlign: 'center' }}>
          No special categories found.
          {isAuthenticated && canCreate ? " Click 'Add New Special Category' to create one." : ""}
        </Alert>
      )}

      {specialCategories.length > 0 && (
        <Table sx={{ minWidth: 650 }} aria-label="special categories table">
          <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {specialCategories.map((category) => (
              <TableRow hover key={category.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row">{category.id}</TableCell>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.description || 'N/A'}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  {isAuthenticated && canEdit && (
                    <Tooltip title="Edit Special Category">
                      <IconButton
                        color="primary"
                        size="small"
                        sx={{ mr: 0.5 }}
                        onClick={() => navigate(`/dashboard/special-categories/edit/${category.id}`)}
                      >
                        <FaEdit />
                      </IconButton>
                    </Tooltip>
                  )}
                  {isAuthenticated && canDelete && (
                    <Tooltip title="Delete Special Category">
                      <IconButton
                        color="error"
                        size="small"
                        onClick={() => handleDelete(category.id, category.name)}
                        disabled={isLoading}
                      >
                        <FaTrashAlt />
                      </IconButton>
                    </Tooltip>
                  )}
                   {(!canEdit || !isAuthenticated) && (!canDelete || !isAuthenticated) && <Typography variant="caption" color="text.secondary">No actions</Typography>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

export default SpecialCategoryList;