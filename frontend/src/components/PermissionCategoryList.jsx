import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Paper,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

function PermissionCategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiInstance, userCan } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiInstance.get('/permission-categories');
      setCategories(response.data || []);
    } catch (err) {
      console.error('Error fetching permission categories:', err);
      setError(err.response?.data?.message || 'Failed to load permission categories.');
    } finally {
      setLoading(false);
    }
  }, [apiInstance]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [location.state, navigate, location.pathname]);

  const handleDelete = async (categoryId, categoryName) => {
    if (window.confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
      try {
        setLoading(true);
        await apiInstance.delete(`/permission-categories/${categoryId}`);
        setSuccessMessage(`Category "${categoryName}" deleted successfully.`);
        fetchCategories(); // refetch categories
      } catch (err) {
        console.error('Error deleting category:', err);
        setError(err.response?.data?.message || 'Failed to delete category.');
        setLoading(false);
      }
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Manage Permission Categories</Typography>
        {typeof userCan === 'function' && userCan('system:manage_permission_categories') && (
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/dashboard/permission-categories/new"
            startIcon={<FaPlus />}
          >
            Create New Category
          </Button>
        )}
      </Box>
      {successMessage && (
        <Box
          sx={{
            bgcolor: '#d4edda',
            border: '1px solid #c3e6cb',
            color: '#155724',
            p: 1,
            borderRadius: 1,
            mb: 2
          }}
        >
          {successMessage}
        </Box>
      )}
      {error && !successMessage && (
        <Box
          sx={{
            bgcolor: '#f8d7da',
            border: '1px solid #f5c6cb',
            color: '#721c24',
            p: 1,
            borderRadius: 1,
            mb: 2
          }}
        >
          {error}
        </Box>
      )}
      {loading && (
        <Typography align="center">Loading permission categories...</Typography>
      )}
      {!loading && categories.length === 0 && (
        <Box sx={{ textAlign: 'center', bgcolor: '#e2e3e5', p: 2, borderRadius: 1 }}>
          No permission categories found.
        </Box>
      )}
      {categories.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Display Order</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map(category => (
              <TableRow key={category.id}>
                <TableCell>{category.id}</TableCell>
                <TableCell>{category.name}</TableCell>
                <TableCell>{category.display_order}</TableCell>
                <TableCell align="center">
                  {typeof userCan === 'function' && userCan('system:manage_permission_categories') && (
                    <>
                      <Button
                        component={Link}
                        to={`/dashboard/permission-categories/edit/${category.id}`}
                        variant="outlined"
                        size="small"
                        sx={{ mr: 1 }}
                        title="Edit"
                      >
                        <FaEdit />
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        color="error"
                        onClick={() => handleDelete(category.id, category.name)}
                        disabled={loading}
                        title="Delete"
                      >
                        <FaTrashAlt />
                      </Button>
                    </>
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