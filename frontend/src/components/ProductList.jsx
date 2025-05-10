import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Box, Paper, Typography, Button, Table, TableHead,
    TableRow, TableCell, TableBody, FormControl,
    InputLabel, Select, MenuItem, TextField, Alert,
    CircularProgress, Grid, Pagination, TableContainer
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
import apiInstance from '../services/api';

// Define formatCurrency function
const formatCurrency = (value) => {
    const number = parseFloat(value);
    return isNaN(number) ? '-' : number.toFixed(2);
};

function ProductList() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Pagination and Filtering state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [limit, setLimit] = useState(10); // Rows per page
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState('');


    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} }); // Clear location state
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    const fetchCategoriesAndSubCategories = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const [catResponse, subCatResponse] = await Promise.all([
                apiInstance.get('/categories?limit=all'),
                apiInstance.get('/sub-categories?limit=all')
            ]);
            setCategories(catResponse.data || []);
            setSubCategories(subCatResponse.data || []);
        } catch (err) {
            console.error("[ProductList] Error fetching categories/sub-categories:", err);
            setPageError(prev => prev ? `${prev}\nFailed to load category filters.` : 'Failed to load category filters.');
        }
    }, [isAuthenticated]);


    const fetchProducts = useCallback(async (page = currentPage, pageSize = limit) => {
        if (!isAuthenticated) {
            setPageError("User not authenticated. Please log in.");
            setIsLoading(false);
            setProducts([]);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const params = new URLSearchParams({
                page: page,
                limit: pageSize,
                include: 'category,subCategory,store,brand,baseUnit', 
            });
            if (selectedCategoryId) params.append('category_id', selectedCategoryId);
            if (selectedSubCategoryId) params.append('sub_category_id', selectedSubCategoryId);
            if (searchTerm.trim()) params.append('search', searchTerm.trim());

            const response = await apiInstance.get(`/products?${params.toString()}`);
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
                setPageError("Received invalid data format for products.");
            }
        } catch (err) {
            console.error("[ProductList] Error fetching products:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch products.');
            setProducts([]); 
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, currentPage, limit, selectedCategoryId, selectedSubCategoryId, searchTerm]); 

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                fetchCategoriesAndSubCategories(); 
            } else {
                setPageError("Please log in to view products.");
                setIsLoading(false);
                setProducts([]);
                setCategories([]);
                setSubCategories([]);
            }
        }
    }, [authLoading, isAuthenticated, fetchCategoriesAndSubCategories]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchProducts(currentPage, limit);
        }
    }, [currentPage, limit, selectedCategoryId, selectedSubCategoryId, searchTerm, authLoading, isAuthenticated, fetchProducts]);


    const handleDelete = async (productId, productName) => {
        if (!isAuthenticated) {
            setFeedback({ message: "Not authenticated.", type: 'error' });
            return;
        }
        if (userCan && !userCan('product:delete')) {
            setFeedback({ message: "You do not have permission to delete products.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return;
        }
        if (!window.confirm(`Are you sure you want to delete product: "${productName}" (ID: ${productId})? This action cannot be undone.`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/products/${productId}`);
            setFeedback({ message: `Product "${productName}" deleted successfully.`, type: 'success' });
            if (products.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1); 
            } else {
                fetchProducts(currentPage, limit);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to delete product.';
            setFeedback({ message: errorMsg, type: 'error' });
            setPageError(errorMsg); 
        }
        const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
    };

    const handlePageChange = (event, newPage) => {
        setCurrentPage(newPage);
    };

    const handleLimitChange = (event) => {
        setLimit(parseInt(event.target.value, 10));
        setCurrentPage(1); 
    };

    const handleCategoryChange = (e) => {
        setSelectedCategoryId(e.target.value);
        setSelectedSubCategoryId(''); 
        setCurrentPage(1);
    };
    const handleSubCategoryChange = (e) => {
        setSelectedSubCategoryId(e.target.value);
        setCurrentPage(1);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };
    const handleSearchSubmit = () => { 
        setCurrentPage(1);
    };

    const filteredSubcategories = selectedCategoryId
        ? subCategories.filter(sc => sc.category_id === parseInt(selectedCategoryId))
        : [];

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /><Typography sx={{ml:1}}>Authenticating...</Typography></Box>;
    }

    if (isLoading && products.length === 0 && categories.length === 0 && !pageError) {
         return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /><Typography sx={{ml:1}}>Loading products and filters...</Typography></Box>;
    }

    if (pageError && products.length === 0) { 
        return (
            <Paper sx={{ p: 3, m: 2 }}>
                <Typography variant="h5" align="center" gutterBottom>Product List</Typography>
                <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                {isAuthenticated && userCan && userCan('product:create') &&
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                        <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/products/new" startIcon={<FaPlus />}>
                            Add New Product
                        </Button>
                    </Box>
                }
            </Paper>
        );
    }


    return (
        <Paper sx={{ p: 3, m: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Product List</Typography>
                {isAuthenticated && userCan && userCan('product:create') && (
                    <Button variant="contained" color="primary" component={RouterLink} to="/dashboard/products/new" startIcon={<FaPlus />}>
                        Add New Product
                    </Button>
                )}
            </Box>

            {feedback.message && (
                <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && products.length > 0 && !feedback.message && (
                 <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    {pageError}
                </Alert>
            )}

            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid xs={12} sm={6} md={3}> {/* Corrected: xs, sm, md are direct props for Grid v2 items */}
                    <TextField
                        fullWidth
                        label="Search Products"
                        placeholder="By name, SKU..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchSubmit()}
                        InputProps={{
                            endAdornment: (
                                <Button onClick={handleSearchSubmit} size="small">Search</Button>
                            )
                        }}
                    />
                </Grid>
                <Grid xs={12} sm={6} md={3}> {/* Corrected */}
                    <FormControl fullWidth>
                        <InputLabel id="categoryFilter-label">Filter by Category</InputLabel>
                        <Select
                            labelId="categoryFilter-label"
                            value={selectedCategoryId}
                            label="Filter by Category"
                            onChange={handleCategoryChange}
                        >
                            <MenuItem value=""><em>All Categories</em></MenuItem>
                            {categories.map(category => (
                                <MenuItem key={category.id} value={category.id.toString()}>
                                    {category.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid xs={12} sm={6} md={3}> {/* Corrected */}
                    <FormControl fullWidth disabled={!selectedCategoryId || filteredSubcategories.length === 0}>
                        <InputLabel id="subCategoryFilter-label">Filter by Sub-Category</InputLabel>
                        <Select
                            labelId="subCategoryFilter-label"
                            value={selectedSubCategoryId}
                            label="Filter by Sub-Category"
                            onChange={handleSubCategoryChange}
                        >
                            <MenuItem value=""><em>All Sub-Categories</em></MenuItem>
                            {filteredSubcategories.map(subCategory => (
                                <MenuItem key={subCategory.id} value={subCategory.id.toString()}>
                                    {subCategory.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                 <Grid xs={12} sm={6} md={3}> {/* Corrected */}
                    <FormControl fullWidth>
                        <InputLabel id="limit-label">Items per page</InputLabel>
                        <Select
                            labelId="limit-label"
                            value={limit}
                            label="Items per page"
                            onChange={handleLimitChange}
                        >
                            <MenuItem value={10}>10</MenuItem>
                            <MenuItem value={25}>25</MenuItem>
                            <MenuItem value={50}>50</MenuItem>
                            <MenuItem value={100}>100</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>

            {isLoading && <Box sx={{display: 'flex', justifyContent: 'center', my: 2}}><CircularProgress size={24} /><Typography sx={{ml:1}}>Loading products...</Typography></Box>}

            {!isLoading && products.length === 0 && !pageError && (
                <Alert severity="info" sx={{ textAlign: 'center', mb: 2 }}>
                    No products found matching your criteria.
                </Alert>
            )}

            {products.length > 0 && (
                <TableContainer component={Paper} elevation={2} sx={{overflowX: 'auto'}}>
                    <Table sx={{ minWidth: 1200 }} aria-label="products table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>SKU</TableCell>
                                <TableCell>Category</TableCell>
                                <TableCell>Sub-Category</TableCell>
                                <TableCell>Base Unit</TableCell>
                                <TableCell>Cost</TableCell>
                                <TableCell>Retail</TableCell>
                                <TableCell>Wholesale</TableCell>
                                <TableCell>Store</TableCell>
                                <TableCell>Brand</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((product) => (
                                <TableRow hover key={product.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>{product.id}</TableCell>
                                    <TableCell sx={{minWidth: 150}}>{product.name}</TableCell>
                                    <TableCell>{product.sku || '-'}</TableCell>
                                    <TableCell>{product.category_name || 'N/A'}</TableCell> {/* CHANGED */}
                                    <TableCell>{product.sub_category_name || 'N/A'}</TableCell> {/* CHANGED (see point 3) */}
                                    <TableCell>{product.base_unit_name || 'N/A'}</TableCell> {/* CHANGED */}
                                    <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                                    <TableCell>{formatCurrency(product.retail_price)}</TableCell>
                                    <TableCell>{formatCurrency(product.wholesale_price)}</TableCell>
                                    <TableCell>{product.store_name || (product.store_id ? `ID: ${product.store_id}` : 'N/A')}</TableCell> {/* CHANGED */}
                                    <TableCell>{product.brand_name || 'N/A'}</TableCell> {/* CHANGED */}
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                        {isAuthenticated && userCan && userCan('product:update') && (
                                            <Button variant="outlined" size="small" onClick={() => navigate(`/dashboard/products/edit/${product.id}`)} sx={{ mr: 1 }} startIcon={<FaEdit />}>
                                                Edit
                                            </Button>
                                        )}
                                        {isAuthenticated && userCan && userCan('product:delete') && (
                                            <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(product.id, product.name)} startIcon={<FaTrashAlt />}>
                                                Delete
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {totalPages > 1 && products.length > 0 && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Pagination
                        count={totalPages}
                        page={currentPage}
                        onChange={handlePageChange}
                        color="primary"
                        showFirstButton
                        showLastButton
                    />
                </Box>
            )}
            {products.length > 0 &&
                <Typography sx={{ textAlign: 'center', mt: 2, fontSize: '0.9em', color: 'text.secondary' }}>
                    Page {currentPage} of {totalPages} (Total Products: {totalProducts})
                </Typography>
            }
        </Paper>
    );
}

export default ProductList;