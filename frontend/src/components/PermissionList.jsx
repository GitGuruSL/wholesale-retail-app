import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  MenuItem
} from '@mui/material';

function PermissionList() {
  const [permissions, setPermissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { apiInstance, userCan } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

  const fetchPermissionsAndCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [permissionsResponse, categoriesResponse] = await Promise.all([
        apiInstance.get('/permissions/list-all'),
        apiInstance.get('/permissions/categories')
      ]);
      setPermissions(permissionsResponse.data || []);
      setCategories(categoriesResponse.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load permissions or categories.');
    } finally {
      setLoading(false);
    }
  }, [apiInstance]);

  useEffect(() => {
    fetchPermissionsAndCategories();
  }, [fetchPermissionsAndCategories]);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  const handleDelete = async (permissionId, permissionName) => {
    if (window.confirm(`Are you sure you want to delete the permission "${permissionName}"? This action cannot be undone.`)) {
      try {
        setLoading(true);
        await apiInstance.delete(`/permissions/${permissionId}`);
        setSuccessMessage(`Permission "${permissionName}" deleted successfully.`);
        fetchPermissionsAndCategories();
      } catch (err) {
        console.error('Error deleting permission:', err);
        setError(err.response?.data?.message || 'Failed to delete permission.');
        setLoading(false);
      }
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
        permission.display_name.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  }).sort((a, b) => {
    const categoryA = categories.find(c => c.id === a.permission_category_id);
    const categoryB = categories.find(c => c.id === b.permission_category_id);
    const displayOrderA = categoryA ? categoryA.display_order : Infinity;
    const displayOrderB = categoryB ? categoryB.display_order : Infinity;
    if (displayOrderA !== displayOrderB) {
      return displayOrderA - displayOrderB;
    }
    if (a.sub_group_display_name < b.sub_group_display_name) return -1;
    if (a.sub_group_display_name > b.sub_group_display_name) return 1;
    if (a.display_name < b.display_name) return -1;
    if (a.display_name > b.display_name) return 1;
    return 0;
  });

  const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
    const category = categories.find(c => c.id === permission.permission_category_id);
    const categoryName = category ? category.name : 'Uncategorized';
    const subGroupName = permission.sub_group_display_name || 'General';
    if (!acc[categoryName]) {
      acc[categoryName] = {};
    }
    if (!acc[categoryName][subGroupName]) {
      acc[categoryName][subGroupName] = [];
    }
    acc[categoryName][subGroupName].push(permission);
    return acc;
  }, {});

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Manage Permissions</Typography>
        {typeof userCan === 'function' && userCan('permission:create') && (
          <Button variant="contained" color="primary" component={Link} to="/dashboard/permissions/new" startIcon={<FaPlus />}>
            Create New Permission
          </Button>
        )}
      </Box>
      {successMessage && (
        <Box
          sx={{
            bgcolor: 'success.light',
            border: 1,
            borderColor: 'success.main',
            color: 'success.contrastText',
            p: 2,
            borderRadius: 1,
            mb: 2
          }}
        >
          {successMessage}
        </Box>
      )}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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
              .sort((a, b) => a.display_order - b.display_order)
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
          placeholder="Search by name, display name..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </Box>
      {loading && <Typography align="center">Updating list...</Typography>}
      {Object.keys(groupedPermissions).length === 0 && !loading && (
        <Box sx={{ bgcolor: 'info.light', p: 2, borderRadius: 1, textAlign: 'center', mb: 2 }}>
          No permissions found matching your criteria.
        </Box>
      )}
      {Object.entries(groupedPermissions).map(([categoryName, subGroups]) => (
        <Box key={categoryName} sx={{ mb: 3 }}>
          {(!selectedCategoryId || Object.keys(groupedPermissions).length > 1) && (
            <Typography variant="h6" sx={{ borderBottom: 1, borderColor: 'divider', pb: 1, mb: 2 }}>
              {categoryName}
            </Typography>
          )}
          {Object.entries(subGroups).map(([subGroupName, perms]) => (
            <Box key={subGroupName} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', mb: 1 }}>
                {subGroupName}
              </Typography>
              {perms.map(permission => (
                <Box key={permission.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField 
                      type="checkbox"
                      sx={{ mr: 1 }}
                      disabled
                      checked={false}
                      InputProps={{ disableUnderline: true }}
                    />
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {permission.display_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        Code: {permission.name}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {typeof userCan === 'function' && userCan('permission:update') && (
                      <Button variant="outlined" size="small" component={Link} to={`/dashboard/permissions/edit/${permission.id}`} title="Edit">
                        <FaEdit />
                      </Button>
                    )}
                    {typeof userCan === 'function' && userCan('permission:delete') && (
                      <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(permission.id, permission.display_name)} title="Delete" disabled={loading}>
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