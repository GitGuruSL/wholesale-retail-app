import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom'; // Changed Link to RouterLink
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import apiInstance directly
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert // Added Alert and CircularProgress
} from '@mui/material';

function PermissionList() {
  const [permissions, setPermissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Renamed loading to isLoading for consistency
  const [pageError, setPageError] = useState(null); // Renamed error to pageError
  const [searchTerm, setSearchTerm] = useState('');
  // apiInstance is imported directly
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [feedback, setFeedback] = useState({ message: null, type: null }); // Use feedback object

  const fetchPermissionsAndCategories = useCallback(async () => {
    if (!isAuthenticated) {
        setPageError("User not authenticated. Cannot fetch data.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setPageError(null);
    try {
      const [permissionsResponse, categoriesResponse] = await Promise.all([
        apiInstance.get('/permissions/list-all'), // Ensure this endpoint exists and returns data as expected
        apiInstance.get('/permission-categories?limit=all') // Ensure this endpoint exists
      ]);
      setPermissions(permissionsResponse.data || []);
      setCategories(categoriesResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setPageError(err.response?.data?.message || 'Failed to load permissions or categories.');
      setPermissions([]);
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]); // apiInstance is module-scoped

  useEffect(() => {
    if (!authLoading) {
        if (isAuthenticated) {
            fetchPermissionsAndCategories();
        } else {
            setPageError("Please log in to view permissions.");
            setIsLoading(false);
            setPermissions([]);
            setCategories([]);
        }
    }
  }, [authLoading, isAuthenticated, fetchPermissionsAndCategories]);

  useEffect(() => {
    if (location.state?.message) {
      setFeedback({ message: location.state.message, type: location.state.type || 'success' });
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  const handleDelete = async (permissionId, permissionName) => {
    if (!isAuthenticated) {
        setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
        return;
    }
    if (typeof userCan !== 'function' || !userCan('permission:delete')) {
        setFeedback({ message: "You do not have permission to delete permissions.", type: 'error' });
        setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        return;
    }
    if (window.confirm(`Are you sure you want to delete the permission "${permissionName}"? This action cannot be undone.`)) {
      // Consider a small loading state for the delete button if needed
      try {
        await apiInstance.delete(`/permissions/${permissionId}`);
        setFeedback({ message: `Permission "${permissionName}" deleted successfully.`, type: 'success' });
        // Re-fetch or filter out locally
        setPermissions(prev => prev.filter(p => p.id !== permissionId));
      } catch (err) {
        console.error('Error deleting permission:', err);
        setFeedback({ message: err.response?.data?.message || 'Failed to delete permission.', type: 'error' });
      }
      setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    }
  };

  const handleCategoryChange = (e) => {
    setSelectedCategoryId(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const filteredPermissions = permissions.filter(permission => {
    if (selectedCategoryId && permission.permission_category_id !== parseInt(selectedCategoryId))
      return false;
    if (searchTerm) {
      return (
        permission.name.toLowerCase().includes(searchTerm) ||
        permission.display_name.toLowerCase().includes(searchTerm) ||
        (permission.sub_group_display_name && permission.sub_group_display_name.toLowerCase().includes(searchTerm))
      );
    }
    return true;
  }).sort((a, b) => {
    const categoryA = categories.find(c => c.id === a.permission_category_id);
    const categoryB = categories.find(c => c.id === b.permission_category_id);
    const displayOrderA = categoryA ? categoryA.display_order : Infinity;
    const displayOrderB = categoryB ? categoryB.display_order : Infinity;

    if (displayOrderA !== displayOrderB) return displayOrderA - displayOrderB;
    if ((a.sub_group_display_name || '') < (b.sub_group_display_name || '')) return -1;
    if ((a.sub_group_display_name || '') > (b.sub_group_display_name || '')) return 1;
    if (a.display_name < b.display_name) return -1;
    if (a.display_name > b.display_name) return 1;
    return 0;
  });

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const category = categories.find(c => c.id === permission.permission_category_id);
    const categoryName = category ? category.name : 'Uncategorized';
    const subGroupName = permission.sub_group_display_name || 'General';
    if (!acc[categoryName]) acc[categoryName] = {};
    if (!acc[categoryName][subGroupName]) acc[categoryName][subGroupName] = [];
    acc[categoryName][subGroupName].push(permission);
    return acc;
  }, {});

  if (authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }
  if (isLoading && !pageError && permissions.length === 0) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  if (pageError && permissions.length === 0) {
    return (
        <Paper sx={{ p: 3, m: 2 }}>
            <Typography variant="h5" align="center" gutterBottom>Manage Permissions</Typography>
            <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
            {isAuthenticated && typeof userCan === 'function' && userCan('permission:create') && (
              <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/permissions/new" startIcon={<FaPlus />}>
                Create New Permission
              </Button>
            )}
        </Paper>
    );
  }


  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Manage Permissions</Typography>
        {isAuthenticated && typeof userCan === 'function' && userCan('permission:create') && (
          <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/permissions/new" startIcon={<FaPlus />}>
            Create New Permission
          </Button>
        )}
      </Box>
      {feedback.message && (
        <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }}>
          {feedback.message}
        </Alert>
      )}
       {pageError && permissions.length > 0 && (
         <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
            {pageError}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: feedback.message ? 0 : 2 }}>
        <FormControl fullWidth>
          <InputLabel id="categoryFilter-label">Filter by Category</InputLabel>
          <Select
            labelId="categoryFilter-label"
            id="categoryFilter"
            value={selectedCategoryId}
            label="Filter by Category"
            onChange={handleCategoryChange}
          >
            <MenuItem value="">
              <em>All Categories</em>
            </MenuItem>
            {categories
              .sort((a, b) => (a.display_order || Infinity) - (b.display_order || Infinity))
              .map(category => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label="Search Permissions"
          placeholder="Search by name, display name, sub-group..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </Box>
      {isLoading && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress /></Box>}

      {!isLoading && Object.keys(groupedPermissions).length === 0 && (
        <Alert severity="info" sx={{ textAlign: 'center', mb: 2 }}>
          No permissions found matching your criteria.
        </Alert>
      )}

      {Object.entries(groupedPermissions).map(([categoryName, subGroups]) => (
        <Box key={categoryName} sx={{ mb: 3 }}>
          {(!selectedCategoryId || Object.keys(groupedPermissions).length > 0) && ( // Show category name if not filtering or if there are results
            <Typography variant="h6" sx={{ borderBottom: 1, borderColor: 'divider', pb: 1, mb: 2 }}>
              {categoryName}
            </Typography>
          )}
          {Object.entries(subGroups).map(([subGroupName, perms]) => (
            <Box key={subGroupName} sx={{ mb: 2, pl: 2 }}> {/* Indent sub-groups slightly */}
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1, fontWeight: 'medium' }}>
                {subGroupName}
              </Typography>
              {perms.map(permission => (
                <Box key={permission.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid', borderColor: 'grey.300', '&:last-child': { borderBottom: 0 } }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {permission.display_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      Code: {permission.name}
                    </Typography>
                    {permission.description && (
                        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
                            {permission.description}
                        </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {isAuthenticated && typeof userCan === 'function' && userCan('permission:update') && (
                      <Button variant="outlined" size="small" component={RouterLink} to={`/dashboard/permissions/edit/${permission.id}`} title="Edit">
                        <FaEdit />
                      </Button>
                    )}
                    {isAuthenticated && typeof userCan === 'function' && userCan('permission:delete') && (
                      <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(permission.id, permission.display_name)} title="Delete" disabled={isLoading}>
                        <FaTrashAlt />
                      </Button>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      ))}
    </Paper>
  );
}

export default PermissionList;