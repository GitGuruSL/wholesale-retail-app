import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import apiInstance from '../services/api'; // Use apiInstance directly
import { useAuth } from '../context/AuthContext'; // Import useAuth
import {
  Paper,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip // Added Tooltip for consistency
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

function PermissionCategoryList() {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Renamed for consistency
  const [pageError, setPageError] = useState(null); // Renamed for consistency
  const [feedback, setFeedback] = useState({ message: null, type: null });

  const navigate = useNavigate();
  const location = useLocation();
  // Get isAuthenticated, authLoading, userCan from useAuth
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

  useEffect(() => {
    if (location.state?.message) {
      setFeedback({ message: location.state.message, type: location.state.type || 'success' });
      navigate(location.pathname, { replace: true, state: {} }); // Clear location state
      const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  const fetchPermissionCategories = useCallback(async () => {
    if (!isAuthenticated) { // Check authentication before fetching
      setPageError("User not authenticated. Cannot fetch permission categories.");
      setIsLoading(false);
      setCategories([]);
      return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      const response = await apiInstance.get('/permission-categories');
      // Assuming API might wrap data in a 'data' property
      setCategories(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Error fetching permission categories:', err);
      setPageError(err.response?.data?.message || 'Failed to load permission categories.');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]); // Add isAuthenticated as a dependency

  useEffect(() => {
    if (!authLoading) { // Only fetch if authentication process is complete
      if (isAuthenticated) {
        fetchPermissionCategories();
      } else {
        // If not authenticated after auth check, set an error or guide user
        setPageError("Please log in to view permission categories.");
        setIsLoading(false);
        setCategories([]);
      }
    }
  }, [authLoading, isAuthenticated, fetchPermissionCategories]);

  // Define permissions based on the single management permission
  const canManagePermissionCategories = userCan && userCan('system:manage_permission_categories');
  const canCreate = canManagePermissionCategories;
  const canEdit = canManagePermissionCategories;
  const canDelete = canManagePermissionCategories;

  const handleDelete = async (categoryId, categoryName) => {
    if (!isAuthenticated || !canDelete) {
      setFeedback({ message: "You do not have permission to delete categories or you are not logged in.", type: 'error' });
      setTimeout(() => setFeedback({ message: null, type: null }), 5000);
      return;
    }
    if (window.confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      setIsLoading(true); // Indicate loading for the delete action
      setPageError(null);
      setFeedback({ message: null, type: null });
      try {
        await apiInstance.delete(`/permission-categories/${categoryId}`);
        setFeedback({ message: `Category "${categoryName}" deleted successfully.`, type: 'success' });
        // Optimistically update UI or refetch
        setCategories(prevCategories => prevCategories.filter(cat => cat.id !== categoryId));
      } catch (err) {
        console.error('Error deleting category:', err);
        const errMsg = err.response?.data?.message || 'Failed to delete category.';
        setPageError(errMsg); // Show error related to the delete action
        setFeedback({ message: errMsg, type: 'error' }); // Also show in feedback for visibility
      } finally {
        setIsLoading(false); // Stop loading for the delete action
        // Feedback timeout is handled by its own effect or can be set here
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
      }
    }
  };

  if (authLoading) {
    return (
      <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 1 }}>Authenticating...</Typography>
      </Paper>
    );
  }

  // Initial loading state for categories, before any error or data
  if (isLoading && categories.length === 0 && !pageError && !authLoading) {
    return (
      <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 1 }}>Loading permission categories...</Typography>
      </Paper>
    );
  }

  // If there's a page error and no categories are loaded (e.g., auth failure, initial fetch failure)
  if (pageError && categories.length === 0) {
    return (
      <Paper sx={{ p: 3, m: 2 }}>
        <Typography variant="h5" align="center" gutterBottom>Manage Permission Categories</Typography>
        <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
        {isAuthenticated && canCreate && ( // Still show create button if error is not auth/permission related for creation
          <Box sx={{ textAlign: 'right', mb: 2 }}>
            <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/permission-categories/new" startIcon={<FaPlus />}>
              Create New Category
            </Button>
          </Box>
        )}
      </Paper>
    );
  }


  return (
    <Paper sx={{ p: 3, m: 2, overflowX: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Manage Permission Categories</Typography>
        {isAuthenticated && canCreate && (
          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to="/dashboard/permission-categories/new"
            startIcon={<FaPlus />}
          >
            Create New Category
          </Button>
        )}
      </Box>

      {feedback.message && (
        <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setFeedback({ message: null, type: null })}>
          {feedback.message}
        </Alert>
      )}
      {/* Display pageError if it occurred after some categories might have been loaded (e.g., delete error) */}
      {pageError && categories.length > 0 && (
         <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setPageError(null)}>
          {pageError}
        </Alert>
      )}


      {!isLoading && !pageError && categories.length === 0 && (
        <Alert severity="info" sx={{ textAlign: 'center' }}>
          No permission categories found.
          {isAuthenticated && canCreate ? " Click 'Create New Category' to add one." : ""}
        </Alert>
      )}

      {categories.length > 0 && (
        <Table sx={{ minWidth: 650 }} aria-label="permission categories table">
          <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Display Order</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map(category => (
              <TableRow hover key={category.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell component="th" scope="row">
                  {category.id}
                </TableCell>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.display_order === null || category.display_order === undefined ? 'N/A' : category.display_order}</TableCell>
                <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                  {isAuthenticated && canEdit && (
                    <Tooltip title="Edit Category">
                      <IconButton
                        component={RouterLink}
                        to={`/dashboard/permission-categories/edit/${category.id}`}
                        size="small"
                        sx={{ mr: 0.5 }}
                        color="primary"
                        disabled={isLoading} // Disable if a global loading is active (e.g. during delete)
                      >
                        <FaEdit />
                      </IconButton>
                    </Tooltip>
                  )}
                  {isAuthenticated && canDelete && (
                    <Tooltip title="Delete Category">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(category.id, category.name)}
                        disabled={isLoading} // Disable if a global loading is active
                      >
                        <FaTrashAlt />
                      </IconButton>
                    </Tooltip>
                  )}
                  {/* Show "No actions" if authenticated but lacks specific permissions */}
                  {isAuthenticated && !canEdit && !canDelete && (
                     <Typography variant="caption" color="text.secondary">No actions</Typography>
                  )}
                  {/* Show "Log in" message if not authenticated */}
                  {!isAuthenticated && (
                     <Typography variant="caption" color="text.secondary">Log in for actions</Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

export default PermissionCategoryList;