import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Box, Paper, Typography, Button, Table, TableHead,
    TableRow, TableCell, TableBody, FormControl,
    InputLabel, Select, MenuItem, TextField, Alert,
    CircularProgress, Grid, Pagination, TableContainer,
    IconButton,
    Collapse
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import apiInstance from '../services/api';

console.log('[ProductList.jsx] File loaded');

const formatCurrency = (value, currency = 'USD', locale = 'en-US') => {
    const number = parseFloat(value);
    if (isNaN(number) || value === null || value === undefined) {
        return '-';
    }
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(number);
    } catch (e) {
        console.error("[ProductList] Error formatting currency for value:", value, e);
        return String(value);
    }
};

function ProductList() {
    console.log('[ProductList] Component function start');
    const [products, setProducts] = useState([]);
    console.log('[ProductList] Initial products state:', products);
    const [isLoading, setIsLoading] = useState(true);
    console.log('[ProductList] Initial isLoading state:', isLoading);
    const [pageError, setPageError] = useState(null);
    console.log('[ProductList] Initial pageError state:', pageError);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    console.log('[ProductList] Auth context values - isAuthenticated:', isAuthenticated, 'authLoading:', authLoading);
    const navigate = useNavigate();
    const location = useLocation();

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [limit, setLimit] = useState(10);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [selectedSubCategoryId, setSelectedSubCategoryId] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [variationsData, setVariationsData] = useState(new Map());

    useEffect(() => {
        console.log('[ProductList] Feedback useEffect triggered. Location state:', location.state);
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} });
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location.state, navigate, location.pathname]);

    const fetchCategoriesAndSubCategories = useCallback(async () => {
        console.log('[ProductList] fetchCategoriesAndSubCategories called');
        try {
            const [catResponse, subCatResponse] = await Promise.all([
                apiInstance.get('/categories?limit=all'),
                apiInstance.get('/sub-categories?limit=all')
            ]);
            console.log('[ProductList] Categories response:', catResponse.data);
            console.log('[ProductList] Sub-categories response:', subCatResponse.data);
            setCategories(catResponse.data?.categories || catResponse.data || []);
            setSubCategories(subCatResponse.data?.subCategories || subCatResponse.data || []);
        } catch (error) {
            console.error("[ProductList] Error fetching categories or sub-categories:", error);
            setPageError("Could not load filter options.");
        }
    }, []);

    const fetchProducts = useCallback(async (page = currentPage, pageSize = limit) => {
        console.log(`[ProductList] fetchProducts called with page: ${page}, pageSize: ${pageSize}`);
        if (!isAuthenticated) {
            console.log('[ProductList] fetchProducts - User not authenticated.');
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
            if (selectedCategoryId) params.append('categoryId', selectedCategoryId);
            if (selectedSubCategoryId) params.append('subCategoryId', selectedSubCategoryId);
            if (searchTerm.trim()) params.append('searchTerm', searchTerm.trim());
            console.log('[ProductList] fetchProducts - API call params:', params.toString());
            const response = await apiInstance.get(`/products?${params.toString()}`);
            console.log('[ProductList] fetchProducts - API response:', response.data);
            // This part in fetchProducts should now work:
            if (response.data && Array.isArray(response.data.products)) {
                setProducts(response.data.products);
                setCurrentPage(response.data.currentPage);
                setTotalPages(response.data.totalPages);
                setTotalProducts(response.data.totalProducts); // Ensure backend sends this as totalProducts
                setLimit(response.data.limit); // Ensure backend sends this as limit
            } else {
                console.warn('[ProductList] fetchProducts - Invalid data format for products. Expected response.data.products to be an array and pagination fields.');
                setProducts([]);
                setPageError("Received invalid data format for products.");
            }
        } catch (err) {
            console.error("[ProductList] Error fetching products:", err);
            setPageError(err.response?.data?.message || 'Failed to fetch products.');
            setProducts([]);
        } finally {
            setIsLoading(false);
            console.log('[ProductList] fetchProducts - finished.');
        }
    }, [isAuthenticated, currentPage, limit, selectedCategoryId, selectedSubCategoryId, searchTerm]);

    useEffect(() => {
        console.log('[ProductList] Auth/Initial Load useEffect triggered. authLoading:', authLoading, 'isAuthenticated:', isAuthenticated);
        if (!authLoading && isAuthenticated) {
            fetchCategoriesAndSubCategories();
            fetchProducts(1, limit);
        } else if (!authLoading && !isAuthenticated) {
            setIsLoading(false);
            setPageError("Please log in to view products.");
            setProducts([]);
        }
    }, [authLoading, isAuthenticated, fetchProducts, fetchCategoriesAndSubCategories, limit]);

    useEffect(() => {
        console.log('[ProductList] Filters/Pagination useEffect triggered. isAuthenticated:', isAuthenticated);
        if (isAuthenticated) {
            fetchProducts(currentPage, limit);
        }
    }, [currentPage, limit, selectedCategoryId, selectedSubCategoryId, searchTerm, isAuthenticated, fetchProducts]);


    const fetchVariationsForProduct = async (productId) => {
        console.log(`[ProductList] fetchVariationsForProduct called for productId: ${productId}`);
        setVariationsData(prev => new Map(prev).set(productId, { isLoading: true, error: null, data: null }));
        try {
            const response = await apiInstance.get(`/products/${productId}?include=variations`);
            console.log(`[ProductList] fetchVariationsForProduct - API response for ${productId}:`, response.data);
            const fetchedVariations = response.data?.variations_data || response.data?.product?.variations_data || [];
            setVariationsData(prev => new Map(prev).set(productId, { isLoading: false, error: null, data: fetchedVariations }));
        } catch (err) {
            console.error(`[ProductList] Error fetching variations for product ${productId}:`, err);
            setVariationsData(prev => new Map(prev).set(productId, { isLoading: false, error: 'Failed to load variations.', data: null }));
        }
    };

    const handleToggleExpandRow = (productId, productType) => {
        console.log(`[ProductList] handleToggleExpandRow called for productId: ${productId}, type: ${productType}`);
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(productId)) {
            newExpandedRows.delete(productId);
        } else {
            newExpandedRows.add(productId);
            if (productType === 'Variable' && (!variationsData.has(productId) || variationsData.get(productId)?.data === null)) {
                fetchVariationsForProduct(productId);
            }
        }
        setExpandedRows(newExpandedRows);
    };

    const handleDelete = async (productId, productName) => {
        console.log(`[ProductList] handleDelete called for productId: ${productId}, name: ${productName}`);
        if (window.confirm(`Are you sure you want to delete the product "${productName}" (ID: ${productId})? This action cannot be undone.`)) {
            try {
                await apiInstance.delete(`/products/${productId}`);
                setFeedback({ message: `Product "${productName}" deleted successfully.`, type: 'success' });
                fetchProducts(currentPage, limit);
            } catch (err) {
                console.error("[ProductList] Error deleting product:", err);
                setFeedback({ message: err.response?.data?.message || 'Failed to delete product.', type: 'error' });
            }
        }
    };

    const handlePageChange = (event, newPage) => {
        console.log(`[ProductList] handlePageChange to page: ${newPage}`);
        setCurrentPage(newPage);
    };

    const handleLimitChange = (event) => {
        const newLimit = parseInt(event.target.value, 10);
        console.log(`[ProductList] handleLimitChange to limit: ${newLimit}`);
        setLimit(newLimit);
        setCurrentPage(1);
    };

    const handleCategoryChange = (event) => {
        const newCategoryId = event.target.value;
        console.log(`[ProductList] handleCategoryChange to categoryId: ${newCategoryId}`);
        setSelectedCategoryId(newCategoryId);
        setSelectedSubCategoryId('');
        setCurrentPage(1);
    };

    const handleSubCategoryChange = (event) => {
        const newSubCategoryId = event.target.value;
        console.log(`[ProductList] handleSubCategoryChange to subCategoryId: ${newSubCategoryId}`);
        setSelectedSubCategoryId(newSubCategoryId);
        setCurrentPage(1);
    };
    
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleSearchSubmit = () => {
        console.log(`[ProductList] handleSearchSubmit with term: ${searchTerm}`);
        setCurrentPage(1);
        fetchProducts(1, limit);
    };

    const filteredSubcategories = selectedCategoryId
        ? subCategories.filter(sc => sc.category_id === parseInt(selectedCategoryId))
        : [];

    console.log('[ProductList] Before authLoading check. authLoading:', authLoading);
    if (authLoading) {
        console.log('[ProductList] Rendering Authenticating state');
        return (
            <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 1 }}>Authenticating...</Typography>
            </Paper>
        );
    }

    const columnsCount = 14;
    console.log('[ProductList] Starting main render. isLoading:', isLoading, 'pageError:', pageError, 'products.length:', products.length);

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
                <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2 }} onClose={() => setFeedback({ message: null, type: null })}>
                    {feedback.message}
                </Alert>
            )}
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
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
                <Grid item xs={12} sm={6} md={3}>
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
                <Grid item xs={12} sm={6} md={3}>
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
                 <Grid item xs={12} sm={6} md={3}>
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

            {isLoading && (
                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', my: 3}}>
                    {console.log('[ProductList] Rendering Loading products state')}
                    <CircularProgress />
                    <Typography sx={{mt: 1}}>Loading products...</Typography>
                </Box>
            )}

            {!isLoading && pageError && (
                <Alert severity="error" sx={{ my: 2 }}>
                    {console.log('[ProductList] Rendering Page Error state:', pageError)}
                    {pageError}
                </Alert>
            )}

            {!isLoading && !pageError && products.length === 0 && (
                <Alert severity="info" sx={{ textAlign: 'center', my: 2 }}>
                    {console.log('[ProductList] Rendering No products found state')}
                    No products found matching your criteria.
                </Alert>
            )}

            {!isLoading && !pageError && products.length > 0 && (
                <TableContainer component={Paper} elevation={2} sx={{overflowX: 'auto'}}>
                    {console.log('[ProductList] Rendering Products Table. Number of products:', products.length)}
                    <Table sx={{ minWidth: 1400 }} aria-label="products table">
                        <TableHead sx={{ '& th': { fontWeight: 'bold' } }}>
                            <TableRow>
                                <TableCell sx={{ width: '50px' }} />
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>SKU</TableCell>
                                <TableCell>Type</TableCell>
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
                            {products.map((product, index) => {
                                if (index === 0) console.log('[ProductList] Mapping first product:', product);
                                const isExpanded = expandedRows.has(product.id);
                                const currentVariations = variationsData.get(product.id);
                                return (
                                    <React.Fragment key={product.id}>
                                        <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                                            <TableCell>
                                                {product.product_type === 'Variable' && (
                                                    <IconButton
                                                        aria-label="expand row"
                                                        size="small"
                                                        onClick={() => handleToggleExpandRow(product.id, product.product_type)}
                                                    >
                                                        {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                                                    </IconButton>
                                                )}
                                            </TableCell>
                                            <TableCell>{product.id}</TableCell>
                                            <TableCell sx={{minWidth: 150}}>{product.product_name}</TableCell>
                                            <TableCell>{product.sku || '-'}</TableCell>
                                            <TableCell>{product.product_type || 'N/A'}</TableCell>
                                            <TableCell>{product.category_name || 'N/A'}</TableCell>
                                            <TableCell>{product.sub_category_name || 'N/A'}</TableCell>
                                            <TableCell>{product.base_unit_name || 'N/A'}</TableCell>
                                            <TableCell>{product.product_type === 'Standard' ? formatCurrency(product.cost_price) : '-'}</TableCell>
                                            <TableCell>{product.product_type === 'Standard' ? formatCurrency(product.retail_price) : '-'}</TableCell>
                                            <TableCell>{product.product_type === 'Standard' ? formatCurrency(product.wholesale_price) : '-'}</TableCell>
                                            <TableCell>{product.store_name || (product.store_id ? `ID: ${product.store_id}` : 'Global')}</TableCell>
                                            <TableCell>{product.brand_name || 'N/A'}</TableCell>
                                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                                {isAuthenticated && userCan && userCan('product:update') && (
                                                    <Button variant="outlined" size="small" onClick={() => navigate(`/dashboard/products/edit/${product.id}`)} sx={{ mr: 1 }} startIcon={<FaEdit />}>
                                                        Edit
                                                    </Button>
                                                )}
                                                {isAuthenticated && userCan && userCan('product:delete') && (
                                                    <Button variant="outlined" size="small" color="error" onClick={() => handleDelete(product.id, product.product_name)} startIcon={<FaTrashAlt />}>
                                                        Delete
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                        {product.product_type === 'Variable' && (
                                            <TableRow>
                                                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={columnsCount}>
                                                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                        <Box sx={{ margin: 1, p: 2, border: '1px solid rgba(224, 224, 224, 1)', borderRadius: '4px' }}>
                                                            <Typography variant="h6" gutterBottom component="div">
                                                                Variations for {product.product_name}
                                                            </Typography>
                                                            {currentVariations?.isLoading && <CircularProgress size={20} />}
                                                            {currentVariations?.error && <Alert severity="error">{currentVariations.error}</Alert>}
                                                            {currentVariations?.data && currentVariations.data.length === 0 && <Typography>No variations found.</Typography>}
                                                            {currentVariations?.data && currentVariations.data.length > 0 && (
                                                                <Table size="small" aria-label="variations">
                                                                    <TableHead>
                                                                        <TableRow>
                                                                            <TableCell>Variation SKU</TableCell>
                                                                            <TableCell>Attributes</TableCell>
                                                                            <TableCell>Cost</TableCell>
                                                                            <TableCell>Retail</TableCell>
                                                                            <TableCell>Wholesale</TableCell>
                                                                        </TableRow>
                                                                    </TableHead>
                                                                    <TableBody>
                                                                        {currentVariations.data.map((variation) => (
                                                                            <TableRow key={variation.id || variation.sku}>
                                                                                <TableCell>{variation.sku}</TableCell>
                                                                                <TableCell>
                                                                                    {variation.attribute_combination && Object.entries(variation.attribute_combination)
                                                                                        .map(([attr, val]) => `${attr}: ${val}`)
                                                                                        .join(', ')}
                                                                                </TableCell>
                                                                                <TableCell>{formatCurrency(variation.cost_price)}</TableCell>
                                                                                <TableCell>{formatCurrency(variation.retail_price)}</TableCell>
                                                                                <TableCell>{formatCurrency(variation.wholesale_price)}</TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                    </TableBody>
                                                                </Table>
                                                            )}
                                                        </Box>
                                                    </Collapse>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

             {totalPages > 1 && products.length > 0 && !isLoading && !pageError && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    {console.log('[ProductList] Rendering Pagination')}
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
            {products.length > 0 && totalProducts > 0 && !isLoading && !pageError &&
                <Typography sx={{ textAlign: 'center', mt: 2, fontSize: '0.9em', color: 'text.secondary' }}>
                    {console.log('[ProductList] Rendering Total Products Info')}
                    Page {currentPage} of {totalPages} (Total Products: {totalProducts})
                </Typography>
            }
            {console.log('[ProductList] Component render end')}
        </Paper>
    );
}

export default ProductList;