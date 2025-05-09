import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Box, Paper, Typography, Button, Table, TableHead, 
  TableRow, TableCell, TableBody, FormControl, 
  InputLabel, Select, MenuItem, TextField, Alert 
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

const formatCurrency = (value) => {
  const number = parseFloat(value);
  return isNaN(number) ? '-' : number.toFixed(2);
};

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState({ message: null, type: null });
  const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [limit, setLimit] = useState(10);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (location.state?.message) {
      setFeedback({ message: location.state.message, type: location.state.type || 'success' });
      navigate(location.pathname, { replace: true, state: {} });
      setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    }
  }, [location, navigate]);

  const fetchProducts = useCallback(async (page = 1, pageSize = 10) => {
    if (!isAuthenticated || !apiInstance) {
      setProducts([]);
      setLoading(false);
      setError("User not authenticated or API client not available. Please log in.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await apiInstance.get(`/products?page=${page}&limit=${pageSize}`);
      if (response.data && Array.isArray(response.data.data)) {
        setProducts(response.data.data);
        if (response.data.pagination) {
          setCurrentPage(response.data.pagination.page);
          setTotalPages(response.data.pagination.totalPages);
          setTotalProducts(response.data.pagination.total);
          setLimit(response.data.pagination.limit);
        } else {
          setTotalPages(1);
          setTotalProducts(response.data.data.length);
        }
      } else {
        setProducts([]);
        setError("Received invalid data format for products.");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, apiInstance]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && apiInstance) {
      fetchProducts(currentPage, limit);
      // Optionally, fetch categories for filtering
      apiInstance.get('/categories').then(res => setCategories(res.data || []))
        .catch(err => console.warn('Error fetching categories:', err));
    } else if (!authLoading && !isAuthenticated) {
      setError("Please log in to view products.");
      setLoading(false);
    } else if (!authLoading && !apiInstance && isAuthenticated) {
      setError("API client not available. Please try again later.");
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, apiInstance, currentPage, limit, fetchProducts]);

  const handleDelete = async (productId, productName) => {
    if (!isAuthenticated || !apiInstance) {
      setFeedback({ message: "Not authenticated or API client not available.", type: 'error' });
      return;
    }
    if (!window.confirm(`Are you sure you want to delete product: ${productName} (ID: ${productId})? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiInstance.delete(`/products/${productId}`);
      setFeedback({ message: `Product "${productName}" deleted successfully.`, type: 'success' });
      if (products.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchProducts(currentPage, limit);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to delete product.';
      setFeedback({ message: errorMsg, type: 'error' });
      setError(errorMsg);
    } finally {
      setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
    }
  };

  const handleCategoryChange = (e) => {
    setSelectedCategoryId(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const filteredProducts = products.filter(product => {
    if (selectedCategoryId && product.category_id !== parseInt(selectedCategoryId)) return false;
    if (searchTerm) {
      return (
        product.name.toLowerCase().includes(searchTerm) ||
        product.product_name.toLowerCase().includes(searchTerm)
      );
    }
    return true;
  });

  if (authLoading) {
    return <Box sx={{ textAlign: 'center', py: 4 }}>Authenticating...</Box>;
  }
  if (loading && !products.length) {
    return <Box sx={{ textAlign: 'center', py: 4 }}>Loading products...</Box>;
  }
  if (error && products.length === 0) {
    return <Box sx={{ textAlign: 'center', py: 4, color: 'error.main', fontWeight: 'bold' }}>Error: {error}</Box>;
  }

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Product List</Typography>
        {typeof apiInstance !== 'undefined' && (
          <Button variant="contained" color="primary" component={Link} to="/dashboard/products/new" startIcon={<FaPlus />}>
            Add New Product
          </Button>
        )}
      </Box>
      {feedback.message && (
        <Alert severity={feedback.type} sx={{ mb: 2 }}>
          {feedback.message}
        </Alert>
      )}
      {error && products.length > 0 && !feedback.message && (
        <Typography sx={{ textAlign: 'center', color: 'error.main' }}>Warning: {error}</Typography>
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
            {categories.sort((a, b) => a.display_order - b.display_order).map(category => (
              <MenuItem key={category.id} value={category.id}>
                {category.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label="Search Permissions"
          placeholder="Search by name or display name..."
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </Box>
      {filteredProducts.length === 0 && !loading && (
        <Alert severity="info" sx={{ p: 2, mb: 2, textAlign: 'center' }}>
          No products found matching your criteria.
        </Alert>
      )}
      <Box sx={{ overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Base Unit</TableCell>
              <TableCell>Cost</TableCell>
              <TableCell>Retail</TableCell>
              <TableCell>Wholesale</TableCell>
              <TableCell>Store</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((product, index) => (
              <TableRow key={product.id || index} sx={{ bgcolor: index % 2 === 0 ? 'background.paper' : 'grey.100' }}>
                <TableCell>{product.id}</TableCell>
                <TableCell>{product.product_name || product.name}</TableCell>
                <TableCell>{product.sku || '-'}</TableCell>
                <TableCell>{product.category_name || 'N/A'}</TableCell>
                <TableCell>{product.base_unit_name || 'N/A'}</TableCell>
                <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                <TableCell>{formatCurrency(product.retail_price)}</TableCell>
                <TableCell>{formatCurrency(product.wholesale_price)}</TableCell>
                <TableCell>{product.store_name || (product.store_id ? `ID: ${product.store_id}` : 'N/A')}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  <Button variant="outlined" size="small" onClick={() => navigate(`/dashboard/products/edit/${product.id}`)} sx={{ mr: 1 }}>
                    <FaEdit />
                  </Button>
                  <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(product.id, product.product_name || product.name)}>
                    <FaTrashAlt />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {totalPages > 1 && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} sx={{ mr: 1 }}>
            Previous
          </Button>
          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              onClick={() => handlePageChange(i + 1)}
              sx={{
                mx: 0.5,
                ...(currentPage === i + 1 && { bgcolor: 'primary.main', color: 'white' })
              }}
            >
              {i + 1}
            </Button>
          ))}
          <Button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} sx={{ ml: 1 }}>
            Next
          </Button>
        </Box>
      )}
      <Typography sx={{ textAlign: 'center', mt: 2, fontSize: '0.9em', color: 'text.secondary' }}>
        Page {currentPage} of {totalPages} (Total Products: {totalProducts})
      </Typography>
    </Paper>
  );
}

export default ProductList;