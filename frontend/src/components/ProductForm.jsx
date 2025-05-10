import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiInstance from '../services/api';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Grid,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    FormHelperText
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

const initialProductFormData = {
    product_name: '',
    slug: '',
    sku: '',
    selling_type: 'Wholesale',
    category_id: '',
    sub_category_id: '',
    special_category_id: '',
    inventory_type: 'Inventory',
    brand_id: '',
    base_unit_id: '',
    barcode_symbology_id: '',
    item_barcode: '',
    description: '',
    product_type: 'Standard',
    cost_price: '',
    retail_price: '',
    wholesale_price: '',
    tax_id: '',
    discount_type_id: '',
    discount_value: '',
    measurement_type: '',
    measurement_value: '',
    weight: '',
    manufacturer_id: '',
    has_expiry: false,
    warranty_id: '',
    expiry_notification_days: '',
    is_serialized: false,
    supplier_id: '',
    store_id: '',
    max_sales_qty_per_person: ''
};

const initialNewUnitConfigData = {
    unit_id: '',
    conversion_factor: '',
    is_purchase_unit: false,
    is_sales_unit: false
};

function ProductForm() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(productId);
   const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

    // Main form state
    const [formData, setFormData] = useState(initialProductFormData);
    // Dropdowns & related data
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [units, setUnits] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [taxes, setTaxes] = useState([]);
    const [warranties, setWarranties] = useState([]);
    const [barcodeSymbologies, setBarcodeSymbologies] = useState([]);
    const [specialCategories, setSpecialCategories] = useState([]);
    const [discountTypes, setDiscountTypes] = useState([]);
    const [stores, setStores] = useState([]);
    // Unit configurations
    const [productUnits, setProductUnits] = useState([]);
    const [newUnitConfig, setNewUnitConfig] = useState(initialNewUnitConfigData);
    // Loading & error state
    const [loadingProduct, setLoadingProduct] = useState(false);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [loadingUnitConfig, setLoadingUnitConfig] = useState(false);
    const [error, setError] = useState(null);
    const [unitConfigError, setUnitConfigError] = useState(null);
    const [unitConfigFeedback, setUnitConfigFeedback] = useState('');

    const commonFormControlSx = { mb: 2, minWidth: '220px' };

    const fetchDropdownData = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) return;
        setLoadingDropdowns(true);
        setError(null);
        const endpoints = {
            categories: '/categories',
            subCategories: '/sub-categories',
            brands: '/brands',
            units: '/units',
            suppliers: '/suppliers',
            manufacturers: '/manufacturers',
            taxes: '/taxes',
            warranties: '/warranties',
            barcodeSymbologies: '/barcode-symbologies',
            specialCategories: '/special-categories',
            discountTypes: '/discount-types',
            stores: '/stores'
        };
        const promises = Object.entries(endpoints).map(async ([key, endpoint]) => {
            try {
                const response = await apiInstance.get(endpoint);
                const data = Array.isArray(response.data)
                    ? response.data
                    : response.data?.data && Array.isArray(response.data.data)
                    ? response.data.data
                    : [];
                return { key, data, error: false };
            } catch (err) {
                console.warn(`Could not fetch ${key}:`, err.response?.data?.message || err.message);
                return { key, data: [], error: true };
            }
        });
        try {
            const results = await Promise.all(promises);
            results.forEach(({ key, data }) => {
                switch (key) {
                    case 'categories':
                        setCategories(data);
                        break;
                    case 'subCategories':
                        setSubCategories(data);
                        break;
                    case 'brands':
                        setBrands(data);
                        break;
                    case 'units':
                        setUnits(data);
                        break;
                    case 'suppliers':
                        setSuppliers(data);
                        break;
                    case 'manufacturers':
                        setManufacturers(data);
                        break;
                    case 'taxes':
                        setTaxes(data);
                        break;
                    case 'warranties':
                        setWarranties(data);
                        break;
                    case 'barcodeSymbologies':
                        setBarcodeSymbologies(data);
                        break;
                    case 'specialCategories':
                        setSpecialCategories(data);
                        break;
                    case 'discountTypes':
                        setDiscountTypes(data);
                        break;
                    case 'stores':
                        setStores(data);
                        break;
                    default:
                        break;
                }
            });
        } catch (overallError) {
            setError('An unexpected error occurred loading form options.');
        } finally {
            setLoadingDropdowns(false);
        }
    }, [isAuthenticated, apiInstance]);

    const fetchProductData = useCallback(async () => {
        if (!isEditing || !productId || !isAuthenticated || !apiInstance) return;
        setLoadingProduct(true);
        setError(null);
        setUnitConfigError(null);
        setUnitConfigFeedback('');
        try {
            const response = await apiInstance.get(`/products/${productId}`);
            const productData = response.data;
            const fetchedUnits = productData.product_units || [];
            delete productData.product_units;
            const preparedFormData = { ...initialProductFormData };
            for (const key in productData) {
                if (Object.prototype.hasOwnProperty.call(initialProductFormData, key)) {
                    const value = productData[key];
                    preparedFormData[key] =
                        key.endsWith('_id') && value !== null && value !== undefined
                            ? value.toString()
                            : value === null
                                ? ''
                                : value;
                }
            }
            preparedFormData.has_expiry = Boolean(productData.has_expiry);
            preparedFormData.is_serialized = Boolean(productData.is_serialized);
            setFormData(preparedFormData);
            setProductUnits(fetchedUnits);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load product data.');
            setProductUnits([]);
        } finally {
            setLoadingProduct(false);
        }
    }, [productId, isEditing, isAuthenticated, apiInstance]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchDropdownData();
            if (isEditing) fetchProductData();
            else {
                setFormData(initialProductFormData);
                setProductUnits([]);
            }
        } else if (!authLoading && !isAuthenticated) {
            setError("User not authenticated. Please log in to manage products.");
        } else if (!authLoading && isAuthenticated && !apiInstance) {
            setError("API client not available. Please try again later.");
        }
    }, [isEditing, fetchProductData, fetchDropdownData, productId, authLoading, isAuthenticated, apiInstance]);

    // Handlers
    const handleProductChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleNewUnitConfigChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewUnitConfig((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated || !apiInstance) {
            setError("Not authenticated or API client not available.");
            return;
        }
        setError(null);
        if (!formData.product_name.trim()) {
            setError("Product Name is required.");
            return;
        }
        if (!formData.base_unit_id) {
            setError("A Base Unit must be selected.");
            return;
        }
        if (!formData.category_id) {
            setError("A Category must be selected.");
            return;
        }
        if (!formData.cost_price || parseFloat(formData.cost_price) < 0) {
            setError("Cost Price is required and cannot be negative.");
            return;
        }
        if (!formData.retail_price || parseFloat(formData.retail_price) < 0) {
            setError("Retail Price is required and cannot be negative.");
            return;
        }
        setLoadingProduct(true);
        const dataToSend = { ...formData };
        const optionalFKs = ['sub_category_id', 'special_category_id', 'brand_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id', 'manufacturer_id', 'supplier_id', 'warranty_id', 'store_id'];
        const numericFields = ['cost_price', 'retail_price', 'wholesale_price', 'discount_value', 'weight'];
        const integerFields = ['expiry_notification_days', 'max_sales_qty_per_person'];
        const textFieldsToNullifyIfEmpty = ['slug', 'sku', 'item_barcode', 'measurement_type', 'measurement_value', 'description'];

        Object.keys(dataToSend).forEach((key) => {
            if ((optionalFKs.includes(key) || textFieldsToNullifyIfEmpty.includes(key)) && dataToSend[key] === '') {
                dataToSend[key] = null;
            }
            if (numericFields.includes(key)) {
                const parsed = parseFloat(dataToSend[key]);
                dataToSend[key] = (dataToSend[key] === null || dataToSend[key] === '' || isNaN(parsed)) ? null : parsed;
            }
            if (integerFields.includes(key)) {
                const parsed = parseInt(dataToSend[key], 10);
                dataToSend[key] = (dataToSend[key] === null || dataToSend[key] === '' || isNaN(parsed)) ? null : parsed;
            }
            if (['has_expiry', 'is_serialized'].includes(key)) {
                dataToSend[key] = Boolean(dataToSend[key]);
            }
            if (['base_unit_id', 'category_id'].includes(key) && dataToSend[key] !== null && dataToSend[key] !== '') {
                dataToSend[key] = parseInt(dataToSend[key], 10);
            }
            if (optionalFKs.includes(key) && dataToSend[key] !== null && dataToSend[key] !== '') {
                const parsedInt = parseInt(dataToSend[key], 10);
                dataToSend[key] = isNaN(parsedInt) ? null : parsedInt;
            }
        });

        let isSuccess = false;
        let newProdId = null;
        try {
            if (isEditing) {
                await apiInstance.put(`/products/${productId}`, dataToSend);
                isSuccess = true;
            } else {
                const response = await apiInstance.post(`/products`, dataToSend);
                newProdId = response.data?.id;
                isSuccess = Boolean(newProdId);
                if (!newProdId) setError("Created product but failed to get ID.");
            }
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} product.`);
            isSuccess = false;
        } finally {
            setLoadingProduct(false);
            if (isSuccess) {
                if (isEditing)
                    navigate('/dashboard/products', { state: { message: `Product "${dataToSend.product_name}" updated.`, type: 'success' } });
                else if (newProdId)
                    navigate(`/dashboard/products/edit/${newProdId}`, { state: { message: `Product "${dataToSend.product_name}" created.`, type: 'success' } });
            }
        }
    };

    const handleAddUnitConfig = async (e) => {
        e.preventDefault();
        if (!isAuthenticated || !isEditing || !apiInstance) {
            setUnitConfigError("Not authenticated, not editing, or API client not available.");
            return;
        }
        setLoadingUnitConfig(true);
        setUnitConfigError(null);
        setUnitConfigFeedback('');
        const factor = parseFloat(newUnitConfig.conversion_factor);
        if (!newUnitConfig.unit_id) {
            setUnitConfigError('Please select a unit.');
            setLoadingUnitConfig(false);
            return;
        }
        if (isNaN(factor) || factor <= 0) {
            setUnitConfigError('Conversion factor must be a positive number.');
            setLoadingUnitConfig(false);
            return;
        }
        const configData = {
            product_id: parseInt(productId),
            unit_id: parseInt(newUnitConfig.unit_id),
            conversion_factor: factor,
            is_purchase_unit: newUnitConfig.is_purchase_unit,
            is_sales_unit: newUnitConfig.is_sales_unit
        };
        try {
            const response = await apiInstance.post(`/product-units`, configData);
            const newConfigFromServer = response.data;
            const unitOption = units.find(u => u.id.toString() === newConfigFromServer.unit_id.toString());
            const newConfigForState = { ...newConfigFromServer, unit_name: unitOption?.name || 'Unknown Unit' };
            setProductUnits(prev => [...prev, newConfigForState]);
            setNewUnitConfig(initialNewUnitConfigData);
            setUnitConfigFeedback('Unit configuration added successfully.');
        } catch (err) {
            setUnitConfigError(err.response?.data?.message || 'Failed to add unit configuration.');
        } finally {
            setLoadingUnitConfig(false);
            setTimeout(() => setUnitConfigFeedback(''), 5000);
        }
    };

    const handleDeleteUnitConfig = async (configId, unitName) => {
        if (!isAuthenticated || !isEditing || !apiInstance) {
            setUnitConfigError("Not authenticated, not editing, or API client not available.");
            return;
        }
        if (!window.confirm(`Are you sure you want to delete the unit configuration for "${unitName}"?`)) return;
        setLoadingUnitConfig(true);
        setUnitConfigError(null);
        setUnitConfigFeedback('');
        try {
            await apiInstance.delete(`/product-units/${configId}`);
            setProductUnits(prev => prev.filter(pu => pu.id !== configId));
            setUnitConfigFeedback('Unit configuration deleted successfully.');
        } catch (err) {
            setUnitConfigError(err.response?.data?.message || 'Failed to delete unit configuration.');
        } finally {
            setLoadingUnitConfig(false);
            setTimeout(() => setUnitConfigFeedback(''), 5000);
        }
    };

    const overallLoadingState = loadingProduct || loadingDropdowns || authLoading;
    const currentCategoryId = parseInt(formData.category_id);
    const filteredSubCategories = subCategories.filter(sc => sc.category_id === currentCategoryId);

    if (authLoading) {
        return (
            <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}>
                <Typography>Authenticating...</Typography>
            </Paper>
        );
    }
    if (!isAuthenticated) {
        return (
            <Paper sx={{ p: 3, m: 2 }}>
                <Alert severity="error">You must be logged in to access this page.</Alert>
            </Paper>
        );
    }
    if (!apiInstance) {
        return (
            <Paper sx={{ p: 3, m: 2 }}>
                <Alert severity="error">API client is not available. Please try again later.</Alert>
            </Paper>
        );
    }

    return (
        <Paper sx={{ p: 3, m: 2 }}>
            <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
                {isEditing ? `Edit Product (ID: ${productId})` : 'Add New Product'}
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    Error: {error}
                </Alert>
            )}
            {overallLoadingState && !error && (
                <Typography sx={{ textAlign: 'center', py: 4 }}>Loading form data...</Typography>
            )}
            {!overallLoadingState && (
                <Box component="form" onSubmit={handleProductSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {/* Product Information Fieldset */}
                    <Box component="fieldset" sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1 }}>
                        <Typography component="legend" variant="h6" sx={{ mb: 2 }}>
                            Product Information
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="store-label">Store</InputLabel>
                                    <Select
                                        labelId="store-label"
                                        id="store_id"
                                        name="store_id"
                                        value={formData.store_id}
                                        label="Store"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- All Stores (if applicable) --</em>
                                        </MenuItem>
                                        {stores.map(o => (
                                            <MenuItem key={o.id} value={o.id.toString()}>
                                                {o.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    id="product_name"
                                    label="Product Name *"
                                    name="product_name"
                                    value={formData.product_name}
                                    onChange={handleProductChange}
                                    fullWidth
                                    required
                                    sx={{ mb: 2 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    id="slug"
                                    label="Slug"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleProductChange}
                                    fullWidth
                                    sx={{ mb: 2 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    id="sku"
                                    label="SKU"
                                    name="sku"
                                    value={formData.sku}
                                    onChange={handleProductChange}
                                    fullWidth
                                    sx={{ mb: 2 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="selling-type-label">Selling Type</InputLabel>
                                    <Select
                                        labelId="selling-type-label"
                                        id="selling_type"
                                        name="selling_type"
                                        value={formData.selling_type}
                                        label="Selling Type"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="Wholesale">Wholesale</MenuItem>
                                        <MenuItem value="Retail">Retail</MenuItem>
                                        <MenuItem value="Both">Both</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth required sx={commonFormControlSx}>
                                    <InputLabel id="category-label">Category</InputLabel>
                                    <Select
                                        labelId="category-label"
                                        id="category_id"
                                        name="category_id"
                                        value={formData.category_id}
                                        label="Category"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- Select --</em>
                                        </MenuItem>
                                        {categories.map(o => (
                                            <MenuItem key={`cat-${o.id}`} value={o.id.toString()}>
                                                {o.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth disabled={!formData.category_id || filteredSubCategories.length === 0} sx={commonFormControlSx}>
                                    <InputLabel id="sub-category-label">Sub Category</InputLabel>
                                    <Select
                                        labelId="sub-category-label"
                                        id="sub_category_id"
                                        name="sub_category_id"
                                        value={formData.sub_category_id}
                                        label="Sub Category"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- Select --</em>
                                        </MenuItem>
                                        {filteredSubCategories.map(o => (
                                            <MenuItem key={`subcat-${o.id}`} value={o.id.toString()}>
                                                {o.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="special-category-label">Special Category</InputLabel>
                                    <Select
                                        labelId="special-category-label"
                                        id="special_category_id"
                                        name="special_category_id"
                                        value={formData.special_category_id}
                                        label="Special Category"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- Select --</em>
                                        </MenuItem>
                                        {specialCategories.map(o => (
                                            <MenuItem key={`spcat-${o.id}`} value={o.id.toString()}>
                                                {o.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="inventory-type-label">Inventory / Service</InputLabel>
                                    <Select
                                        labelId="inventory-type-label"
                                        id="inventory_type"
                                        name="inventory_type"
                                        value={formData.inventory_type}
                                        label="Inventory / Service"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="Inventory">Inventory</MenuItem>
                                        <MenuItem value="Service">Service</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="brand-label">Brand</InputLabel>
                                    <Select
                                        labelId="brand-label"
                                        id="brand_id"
                                        name="brand_id"
                                        value={formData.brand_id}
                                        label="Brand"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- Select --</em>
                                        </MenuItem>
                                        {brands.map(o => (
                                            <MenuItem key={`brand-${o.id}`} value={o.id.toString()}>
                                                {o.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth required sx={commonFormControlSx}>
                                    <InputLabel id="base-unit-label">Base Unit</InputLabel>
                                    <Select
                                        labelId="base-unit-label"
                                        id="base_unit_id"
                                        name="base_unit_id"
                                        value={formData.base_unit_id}
                                        label="Base Unit"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- Select Base Unit --</em>
                                        </MenuItem>
                                        {units.map(o => (
                                            <MenuItem key={`baseunit-${o.id}`} value={o.id.toString()}>
                                                {o.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    id="item_barcode"
                                    label="Item Barcode"
                                    name="item_barcode"
                                    value={formData.item_barcode}
                                    onChange={handleProductChange}
                                    fullWidth
                                    sx={commonFormControlSx}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    id="description"
                                    label="Description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleProductChange}
                                    fullWidth
                                    multiline
                                    rows={2}
                                    sx={commonFormControlSx}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Pricing & Details Fieldset */}
                    <Box component="fieldset" sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1 }}>
                        <Typography component="legend" variant="h6" sx={{ mb: 2 }}>
                            Pricing & Details
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle1">Product Type:</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Button
                                        variant={formData.product_type === 'Standard' ? 'contained' : 'outlined'}
                                        onClick={() => setFormData(prev => ({ ...prev, product_type: 'Standard' }))}
                                    >
                                        Standard
                                    </Button>
                                    <Button
                                        variant={formData.product_type === 'Variable' ? 'contained' : 'outlined'}
                                        onClick={() => setFormData(prev => ({ ...prev, product_type: 'Variable' }))}
                                    >
                                        Variable
                                    </Button>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    id="cost_price"
                                    label="Cost Price *"
                                    type="number"
                                    name="cost_price"
                                    value={formData.cost_price}
                                    onChange={handleProductChange}
                                    fullWidth
                                    required
                                    inputProps={{ min: 0, step: 'any' }}
                                    sx={commonFormControlSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    id="retail_price"
                                    label="Retail Price *"
                                    type="number"
                                    name="retail_price"
                                    value={formData.retail_price}
                                    onChange={handleProductChange}
                                    fullWidth
                                    required
                                    inputProps={{ min: 0, step: 'any' }}
                                    sx={commonFormControlSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    id="wholesale_price"
                                    label="Wholesale Price"
                                    type="number"
                                    name="wholesale_price"
                                    value={formData.wholesale_price}
                                    onChange={handleProductChange}
                                    fullWidth
                                    inputProps={{ min: 0, step: 'any' }}
                                    sx={commonFormControlSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="tax-label">Tax</InputLabel>
                                    <Select
                                        labelId="tax-label"
                                        id="tax_id"
                                        name="tax_id"
                                        value={formData.tax_id}
                                        label="Tax"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- Select Tax --</em>
                                        </MenuItem>
                                        {taxes.map(o => (
                                            <MenuItem key={`tax-${o.id}`} value={o.id.toString()}>
                                                {`${o.name} (${o.rate}%)`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="discount-type-label">Discount Type</InputLabel>
                                    <Select
                                        labelId="discount-type-label"
                                        id="discount_type_id"
                                        name="discount_type_id"
                                        value={formData.discount_type_id}
                                        label="Discount Type"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- Select --</em>
                                        </MenuItem>
                                        {discountTypes.map(o => (
                                            <MenuItem key={`dtype-${o.id}`} value={o.id.toString()}>
                                                {o.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    id="discount_value"
                                    label="Discount Value"
                                    type="number"
                                    name="discount_value"
                                    value={formData.discount_value}
                                    onChange={handleProductChange}
                                    fullWidth
                                    inputProps={{ min: 0, step: 'any' }}
                                    sx={commonFormControlSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="measurement-type-label">Measurement Type</InputLabel>
                                    <Select
                                        labelId="measurement-type-label"
                                        id="measurement_type"
                                        name="measurement_type"
                                        value={formData.measurement_type}
                                        label="Measurement Type"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- Select --</em>
                                        </MenuItem>
                                        <MenuItem value="Weight">Weight</MenuItem>
                                        <MenuItem value="Volume">Volume</MenuItem>
                                        <MenuItem value="Length">Length</MenuItem>
                                        <MenuItem value="Area">Area</MenuItem>
                                        <MenuItem value="Other">Other</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    id="measurement_value"
                                    label="Measurement Value"
                                    name="measurement_value"
                                    value={formData.measurement_value}
                                    onChange={handleProductChange}
                                    fullWidth
                                    placeholder="e.g., 10 Kg, 500ml"
                                    sx={commonFormControlSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    id="weight"
                                    label="Weight (e.g., in Kg)"
                                    type="number"
                                    name="weight"
                                    value={formData.weight}
                                    onChange={handleProductChange}
                                    fullWidth
                                    inputProps={{ min: 0, step: 'any' }}
                                    sx={commonFormControlSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="manufacturer-label">Manufacturer</InputLabel>
                                    <Select
                                        labelId="manufacturer-label"
                                        id="manufacturer_id"
                                        name="manufacturer_id"
                                        value={formData.manufacturer_id}
                                        label="Manufacturer"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- Select --</em>
                                        </MenuItem>
                                        {manufacturers.map(o => (
                                            <MenuItem key={`manu-${o.id}`} value={o.id.toString()}>
                                                {o.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="supplier-label">Supplier</InputLabel>
                                    <Select
                                        labelId="supplier-label"
                                        id="supplier_id"
                                        name="supplier_id"
                                        value={formData.supplier_id}
                                        label="Supplier"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- Select --</em>
                                        </MenuItem>
                                        {suppliers.map(o => (
                                            <MenuItem key={`supp-${o.id}`} value={o.id.toString()}>
                                                {o.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="warranty-label">Warranty</InputLabel>
                                    <Select
                                        labelId="warranty-label"
                                        id="warranty_id"
                                        name="warranty_id"
                                        value={formData.warranty_id}
                                        label="Warranty"
                                        onChange={handleProductChange}
                                    >
                                        <MenuItem value="">
                                            <em>-- No Warranty --</em>
                                        </MenuItem>
                                        {warranties.map(o => (
                                            <MenuItem key={`warr-${o.id}`} value={o.id.toString()}>
                                                {o.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    id="expiry_notification_days"
                                    label="Expiry Notification (Days Before)"
                                    type="number"
                                    name="expiry_notification_days"
                                    value={formData.expiry_notification_days}
                                    onChange={handleProductChange}
                                    fullWidth
                                    inputProps={{ min: 0, step: 1 }}
                                    sx={commonFormControlSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="subtitle1">Flags:</Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <FormControl sx={{ width: 'auto' }}>
                                            <InputLabel shrink htmlFor="has_expiry">
                                                Has Expiry?
                                            </InputLabel>
                                            <TextField
                                                id="has_expiry"
                                                type="checkbox"
                                                name="has_expiry"
                                                checked={formData.has_expiry}
                                                onChange={handleProductChange}
                                                sx={{ width: 'auto' }}
                                            />
                                        </FormControl>
                                        <FormControl sx={{ width: 'auto' }}>
                                            <InputLabel shrink htmlFor="is_serialized">
                                                Is Serialized?
                                            </InputLabel>
                                            <TextField
                                                id="is_serialized"
                                                type="checkbox"
                                                name="is_serialized"
                                                checked={formData.is_serialized}
                                                onChange={handleProductChange}
                                                sx={{ width: 'auto' }}
                                            />
                                        </FormControl>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Button Group */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 1 }}>
                        <Button type="submit" variant="contained" color="primary" disabled={loadingProduct}>
                            {loadingProduct ? 'Saving...' : isEditing ? 'Update Product Details' : 'Create Product'}
                        </Button>
                        <Button variant="outlined" onClick={() => navigate('/dashboard/products')} disabled={loadingProduct}>
                            {isEditing ? 'Back to List' : 'Cancel'}
                        </Button>
                    </Box>
                </Box>
            )}

            {/* Unit Configuration Section */}
            {isEditing && !overallLoadingState && (
                <Box sx={{ mt: 4, borderTop: 1, borderColor: 'divider', pt: 3 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Unit Configurations for this Product
                    </Typography>
                    {unitConfigError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            Unit Config Error: {unitConfigError}
                        </Alert>
                    )}
                    {unitConfigFeedback && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {unitConfigFeedback}
                        </Alert>
                    )}
                    {productUnits.length > 0 ? (
                        <Table sx={{ mb: 3 }}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Unit</TableCell>
                                    <TableCell>Factor (vs Base)</TableCell>
                                    <TableCell>Purchase?</TableCell>
                                    <TableCell>Sales?</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {productUnits.map((pu, index) => (
                                    <TableRow key={`pu-${pu.id || index}`} sx={{ bgcolor: index % 2 === 0 ? 'background.paper' : 'grey.100' }}>
                                        <TableCell>{pu.unit_name || `Unit ID: ${pu.unit_id}`}</TableCell>
                                        <TableCell>{pu.conversion_factor}</TableCell>
                                        <TableCell>{pu.is_purchase_unit ? 'Yes' : 'No'}</TableCell>
                                        <TableCell>{pu.is_sales_unit ? 'Yes' : 'No'}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                size="small"
                                                onClick={() => handleDeleteUnitConfig(pu.id, pu.unit_name || `Unit ID: ${pu.unit_id}`)}
                                                disabled={loadingUnitConfig}
                                            >
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Typography>No specific unit configurations added yet for this product.</Typography>
                    )}
                    <Paper sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50', mt: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                            Add New Unit Configuration
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                                <FormControl variant="outlined" fullWidth required disabled={units.length === 0} sx={commonFormControlSx}>
                                    <InputLabel id="new-unit-label">Unit</InputLabel>
                                    <Select
                                        labelId="new-unit-label"
                                        id="new_unit_id"
                                        name="unit_id"
                                        value={newUnitConfig.unit_id}
                                        onChange={handleNewUnitConfigChange}
                                        label="Unit"
                                    >
                                        <MenuItem value="">
                                            <em>-- Select Unit --</em>
                                        </MenuItem>
                                        {units.map(u => (
                                            <MenuItem key={`unitopt-${u.id}`} value={u.id.toString()}>
                                                {u.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    id="new_conversion_factor"
                                    label="Conversion Factor"
                                    type="number"
                                    name="conversion_factor"
                                    value={newUnitConfig.conversion_factor}
                                    onChange={handleNewUnitConfigChange}
                                    required
                                    fullWidth
                                    inputProps={{ min: 0.000001, step: 'any' }}
                                    placeholder="How many base units in one unit?"
                                    sx={commonFormControlSx}
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <FormControl component="fieldset" fullWidth sx={commonFormControlSx}>
                                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                                        Use For:
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <FormControl sx={{ width: 'auto' }}>
                                            <InputLabel shrink htmlFor="is_purchase_unit">
                                                Purchase
                                            </InputLabel>
                                            <TextField
                                                id="is_purchase_unit"
                                                type="checkbox"
                                                name="is_purchase_unit"
                                                checked={newUnitConfig.is_purchase_unit}
                                                onChange={handleNewUnitConfigChange}
                                                sx={{ width: 'auto' }}
                                            />
                                        </FormControl>
                                        <FormControl sx={{ width: 'auto' }}>
                                            <InputLabel shrink htmlFor="is_sales_unit">
                                                Sales
                                            </InputLabel>
                                            <TextField
                                                id="is_sales_unit"
                                                type="checkbox"
                                                name="is_sales_unit"
                                                checked={newUnitConfig.is_sales_unit}
                                                onChange={handleNewUnitConfigChange}
                                                sx={{ width: 'auto' }}
                                            />
                                        </FormControl>
                                    </Box>
                                </FormControl>
                            </Grid>
                        </Grid>
                        <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={loadingUnitConfig || !newUnitConfig.unit_id} onClick={handleAddUnitConfig}>
                            {loadingUnitConfig ? 'Adding...' : 'Add Unit Configuration'}
                        </Button>
                    </Paper>
                </Box>
            )}
        </Paper>
    );
}

export default ProductForm;