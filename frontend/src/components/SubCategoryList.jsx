import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly
import {
  Paper, Box, Typography, Table, TableHead, TableRow, TableCell,
  TableBody, Button, Alert, CircularProgress, IconButton, Tooltip
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

function SubCategoryList() {
  const [subCategories, setSubCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [feedback, setFeedback] = useState({ message: null, type: null });

  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

  console.log('[SubCategoryList] Auth State: isAuthenticated:', isAuthenticated, 'authLoading:', authLoading, 'userCan available:', !!userCan);

  useEffect(() => {
    if (location.state?.message) {
      setFeedback({ message: location.state.message, type: location.state.type || 'success' });
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  const fetchSubCategories = useCallback(async () => {
    if (!isAuthenticated) {
      setPageError("User not authenticated. Cannot fetch sub-categories.");
      setIsLoading(false);
      setSubCategories([]);
      return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      console.log('[SubCategoryList] Fetching sub-categories with include=category...');
      const response = await apiInstance.get('/sub-categories?include=category');
      console.log('[SubCategoryList] API Response for sub-categories:', response.data);
      const dataToSet = response.data?.data || response.data || [];
      setSubCategories(dataToSet);
      if (dataToSet.length > 0) {
        console.log('[SubCategoryList] First sub-category data for inspection (parent category):', dataToSet[0]);
      }
    } catch (err) {
      console.error("[SubCategoryList] Error fetching sub-categories:", err);
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch sub-categories.';
      setPageError(errorMsg);
      setSubCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading) {
      if (isAuthenticated) {
        fetchSubCategories();
      } else {
        setPageError("Please log in to view sub-categories.");
        setIsLoading(false);
        setSubCategories([]);
      }
    }
  }, [authLoading, isAuthenticated, fetchSubCategories]);

  const handleDelete = async (subCategoryId, subCategoryName) => {
    // ... (keep existing handleDelete logic)
    if (!isAuthenticated) {
      setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
      return;
    }
    if (userCan && !userCan('sub_category:delete')) {
        setFeedback({ message: "You don't have permission to delete sub-categories.", type: 'error' });
        setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        return;
    }
    if (window.confirm(`Are you sure you want to delete sub-category: "${subCategoryName}" (ID: ${subCategoryId})?`)) {
      setPageError(null);
      setIsLoading(true);
      try {
        await apiInstance.delete(`/sub-categories/${subCategoryId}`);
        setFeedback({ message: `Sub-category "${subCategoryName}" deleted successfully.`, type: 'success' });
        setSubCategories(prevSubCategories => prevSubCategories.filter(sc => sc.id !== subCategoryId));
      } catch (err) {
        console.error(`Error deleting sub-category ${subCategoryId}:`, err);
        const errorMsg = err.response?.data?.message || err.message || 'Failed to delete sub-category.';
        setFeedback({ message: errorMsg, type: 'error' });
      } finally {
        setIsLoading(false);
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
      }
    }
  };

  const canCreate = userCan && userCan('subcategory:create');
  const canEdit = userCan && userCan('subcategory:update');
  const canDelete = userCan && userCan('subcategory:delete');

  console.log('[SubCategoryList] Permissions: canCreate:', canCreate, 'canEdit:', canEdit, 'canDelete:', canDelete);

  if (authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /><Typography sx={{ml:1}}>Authenticating...</Typography></Box>;
  }

  if (isLoading && !pageError && subCategories.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /><Typography sx={{ml:1}}>Loading sub-categories...</Typography></Box>;
  }

  if (pageError && subCategories.length === 0) {
    return (
        <Paper sx={{ p: 3, m: 2 }}>
            <Typography variant="h5" align="center" gutterBottom>Manage Sub-Categories</Typography>
            <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            {isAuthenticated && canCreate &&
                <Box sx={{ textAlign: 'right', mb: 2 }}>
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/sub-categories/new" startIcon={<FaPlus />}>
                        Add New Sub-Category
                    </Button>
                </Box>
            }
        </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, m: 2, overflowX: 'auto' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Manage Sub-Categories</Typography>
        {isAuthenticated && canCreate && (
          <Button
            variant="contained"
            color="primary"
            component={RouterLink}
            to="/dashboard/sub-categories/new"
            startIcon={<FaPlus />}
          >
            Add New Sub-Category
          </Button>
        )}
      </Box>

      {feedback.message && (
        <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setFeedback({ message: null, type: null })}>
          {feedback.message}
        </Alert>
      )}
      {pageError && subCategories.length > 0 && (
         <Alert severity="warning" sx={{ mb: 2 }}>
          {pageError}
        </Alert>
      )}

      {!isLoading && subCategories.length === 0 && !pageError && (
        <Alert severity="info" sx={{ textAlign: 'center' }}>
          No sub-categories found.
          {isAuthenticated && canCreate ? " Click 'Add New Sub-Category' to create one." : ""}
        </Alert>
      )}

      {subCategories.length > 0 && (
        <Table sx={{ minWidth: 650 }} aria-label="sub-categories table">
          <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Parent Category</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {subCategories.map((subCategory) => {
              // Log the subCategory object to inspect its structure, especially for the parent category
             if (subCategories.indexOf(subCategory) === 0) { // Log only the first one to avoid flooding console
                console.log('[SubCategoryList] Rendering subCategory item:', subCategory);
              }
              // Updated to use the direct field from your API response
              const parentCategoryName = subCategory.category_name || 'N/A';

              return (
                <TableRow hover key={subCategory.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row">{subCategory.id}</TableCell>
                  <TableCell>{subCategory.name}</TableCell>
                  <TableCell>{parentCategoryName}</TableCell>
                  <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                    {/* This section will only render if canEdit and canDelete become true after fixing permissions */}
                    {isAuthenticated && canEdit && (
                      <Tooltip title="Edit Sub-Category">
                        <IconButton
                          color="primary"
                          size="small"
                          sx={{ mr: 0.5 }}
                          onClick={() => navigate(`/dashboard/sub-categories/edit/${subCategory.id}`)}
                        >
                          <FaEdit />
                        </IconButton>
                      </Tooltip>
                    )}
                    {isAuthenticated && canDelete && (
                      <Tooltip title="Delete Sub-Category">
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => handleDelete(subCategory.id, subCategory.name)}
                          disabled={isLoading} // Disable during general loading state
                        >
                          <FaTrashAlt />
                        </IconButton>
                      </Tooltip>
                    )}
                    {/* Simplified "No actions" text condition */}
                    {isAuthenticated && !canEdit && !canDelete && (
                      <Typography variant="caption" color="text.secondary">No actions</Typography>
                    )}
                    {!isAuthenticated && ( // If not authenticated, show no actions
                         <Typography variant="caption" color="text.secondary">Log in for actions</Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

export default SubCategoryList;