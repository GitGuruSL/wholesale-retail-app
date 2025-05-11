import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiInstance from '../services/api';
import {
    Box,
    Paper,
    Typography,
    Button,
    Alert,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    OutlinedInput,
    Chip,
    IconButton
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import DeleteIcon from '@mui/icons-material/Delete';

// Import the new sub-components
// Ensure these files are created in the same directory (frontend/src/components/)
import ProductInformationFields from './ProductInformationFields.jsx'; // CORRECTED PATH & Ensure this file is created
import StandardProductPricingFields from './StandardProductPricingFields.jsx'; // Ensure this file is created
import VariableProductFields from './VariableProductFields.jsx'; // Ensure this file is created
import ProductUnitConfigurationFields from './ProductUnitConfigurationFields.jsx'; // Ensure this file is created

// ... rest of your ProductForm.jsx code (initialProductFormData, ProductForm function, etc.)
// The existing code in ProductForm.jsx from your attachment (state, handlers, useEffects, and the main return structure calling these sub-components)
// should remain as it is, because it's set up to work with these sub-components.
// The key is that the sub-components themselves must exist.

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
    max_sales_qty_per_person: '',
    attributes_config: [] // Added to store product attributes
};

const initialNewUnitConfigData = {
    unit_id: '',
    conversion_factor: '',
    is_purchase_unit: false,
    is_sales_unit: false
};

const commonFormControlSx = { mb: 2, minWidth: '220px' };

function ProductForm() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(productId);
    const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

    const [formData, setFormData] = useState(initialProductFormData);
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
    const [productUnits, setProductUnits] = useState([]);
    const [newUnitConfig, setNewUnitConfig] = useState(initialNewUnitConfigData);
    const [loadingProduct, setLoadingProduct] = useState(false);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [loadingUnitConfig, setLoadingUnitConfig] = useState(false);
    const [error, setError] = useState(null);
    const [unitConfigError, setUnitConfigError] = useState(null);
    const [unitConfigFeedback, setUnitConfigFeedback] = useState('');

    const [productVariations, setProductVariations] = useState([]);
    const [loadingVariations, setLoadingVariations] = useState(false);
    const [variationGenerationError, setVariationGenerationError] = useState(null);

    const [allSystemAttributes, setAllSystemAttributes] = useState([]); // To store {id, name, values: [{id, value}]}

    useEffect(() => {
        // Fetch all system attributes with their values
        const fetchSystemAttributes = async () => {
            try {
                const response = await apiInstance.get('/attributes?include=values');
                // Ensure we are setting an array to allSystemAttributes
                const attributesData = Array.isArray(response.data)
                    ? response.data
                    : response.data?.data && Array.isArray(response.data.data)
                    ? response.data.data // Handles if data is in response.data.data
                    : response.data?.attributes && Array.isArray(response.data.attributes)
                    ? response.data.attributes // Handles if data is in response.data.attributes
                    : []; // Default to empty array if no suitable array structure found
                setAllSystemAttributes(attributesData);
            } catch (error) {
                console.error("Error fetching system attributes:", error);
                setAllSystemAttributes([]); // Ensure it's an array even on error
            }
        };
        fetchSystemAttributes();
    }, []);

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
                    case 'categories': setCategories(data); break;
                    case 'subCategories': setSubCategories(data); break;
                    case 'brands': setBrands(data); break;
                    case 'units': setUnits(data); break;
                    case 'suppliers': setSuppliers(data); break;
                    case 'manufacturers': setManufacturers(data); break;
                    case 'taxes': setTaxes(data); break;
                    case 'warranties': setWarranties(data); break;
                    case 'barcodeSymbologies': setBarcodeSymbologies(data); break;
                    case 'specialCategories': setSpecialCategories(data); break;
                    case 'discountTypes': setDiscountTypes(data); break;
                    case 'stores': setStores(data); break;
                    default: break;
                }
            });
        } catch (overallError) {
            setError('An unexpected error occurred loading form options.');
        } finally {
            setLoadingDropdowns(false);
        }
    }, [isAuthenticated]);

    const fetchProductData = useCallback(async () => {
        if (!isEditing || !productId || !isAuthenticated || !apiInstance) return;
        setLoadingProduct(true);
        setError(null);
        setUnitConfigError(null);
        setUnitConfigFeedback('');
        try {
            const response = await apiInstance.get(`/products/${productId}?include=attributes,variations,product_units`);
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
            setProductUnits(fetchedUnits.map(pu => ({...pu, unit_name: units.find(u => u.id.toString() === pu.unit_id.toString())?.name || 'Unknown Unit'})));


            if (productData.product_type === 'Variable') {
                setFormData(prev => ({ ...prev, attributes_config: productData.attributes_config || [] }));
                setProductVariations(productData.variations_data || []);
            } else {
                setFormData(prev => ({ ...prev, attributes_config: [] }));
                setProductVariations([]);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load product data.');
            setProductUnits([]);
            setFormData(prev => ({ ...prev, attributes_config: [] }));
            setProductVariations([]);
        } finally {
            setLoadingProduct(false);
        }
    }, [productId, isEditing, isAuthenticated, units]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchDropdownData();
        } else if (!authLoading && !isAuthenticated) {
            setError("User not authenticated. Please log in to manage products.");
        } else if (!authLoading && isAuthenticated && !apiInstance) {
            setError("API client not available. Please try again later.");
        }
    }, [authLoading, isAuthenticated, fetchDropdownData]);

    useEffect(() => {
        if (isEditing && !loadingDropdowns && units.length > 0) {
            fetchProductData();
        } else if (!isEditing) {
            setFormData(initialProductFormData);
            setProductUnits([]);
            setProductVariations([]);
        }
    }, [isEditing, fetchProductData, loadingDropdowns, units]);

    const handleProductChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleNewUnitConfigChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewUnitConfig((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleProductTypeChange = (newType) => {
        setFormData(prev => {
            const updatedFormData = { ...prev, product_type: newType };
            if (newType === 'Standard') {
                updatedFormData.attributes_config = []; // Clear attributes_config for standard product
                setProductVariations([]);
                setVariationGenerationError(null);
            }
            return updatedFormData;
        });
    };

    const generateVariationCombinations = () => {
        // Use formData.attributes_config instead of productAttributes
        if (!formData.attributes_config || formData.attributes_config.length === 0) {
            setVariationGenerationError("Please add and configure at least one attribute before generating variations.");
            setProductVariations([]);
            return [];
        }
        if (formData.attributes_config.some(attr => !attr.values || attr.values.length === 0)) {
            setVariationGenerationError("One or more configured attributes have no values selected.");
            setProductVariations([]);
            return [];
        }

        setVariationGenerationError(null);
        // Use formData.attributes_config
        const attributesWithOptions = formData.attributes_config.map(attr =>
            attr.values.map(val => ({ attributeName: attr.name, value: val }))
        );

        if (attributesWithOptions.some(optList => optList.length === 0)) {
            setVariationGenerationError("One or more attributes have no values defined after mapping.");
            setProductVariations([]);
            return [];
        }
        let combinations = [{}];
        for (const optionList of attributesWithOptions) {
            const newCombinations = [];
            for (const existingCombination of combinations) {
                for (const option of optionList) {
                    newCombinations.push({ ...existingCombination, [option.attributeName]: option.value });
                }
            }
            combinations = newCombinations;
        }
        return combinations;
    };
    
    const handleGenerateVariations = () => {
        setLoadingVariations(true);
        const combinations = generateVariationCombinations(); // This now uses formData.attributes_config
        if (variationGenerationError && combinations.length === 0) { // Check error only if no combinations
            setLoadingVariations(false);
            return;
        }
        const newVariations = combinations.map((combo, index) => {
            const defaultSku = formData.sku ? `${formData.sku}-${Object.values(combo).join('-').toLowerCase().replace(/\s+/g, '-')}` : `VAR-${index + 1}`;
            return {
                id: `tempVar_${Date.now()}_${index}`,
                attribute_combination: combo,
                sku: defaultSku,
                cost_price: '', // Default to empty, user fills this
                retail_price: '', // Default to empty
                wholesale_price: '', // Default to empty
            };
        });
        setProductVariations(newVariations);
        setLoadingVariations(false);
    };
    
    const handleVariationChange = (index, field, value) => {
        setProductVariations(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleRemoveVariation = (variationIdToRemove) => {
        setProductVariations(prev => prev.filter(v => v.id !== variationIdToRemove));
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated || !apiInstance) {
            setError("Not authenticated or API client not available.");
            return;
        }
        setError(null);
        if (!formData.product_name.trim()) { setError("Product Name is required."); return; }
        if (!formData.base_unit_id) { setError("A Base Unit must be selected."); return; }
        if (!formData.category_id) { setError("A Category must be selected."); return; }
        
        if (formData.product_type === 'Standard') {
            if (!formData.cost_price || parseFloat(formData.cost_price) < 0) { setError("Cost Price is required and cannot be negative for Standard Product."); return; }
            if (!formData.retail_price || parseFloat(formData.retail_price) < 0) { setError("Retail Price is required and cannot be negative for Standard Product."); return; }
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

        if (dataToSend.product_type === 'Variable') {
            // Use formData.attributes_config, ensuring the backend gets {name, values}
            dataToSend.attributes_config = formData.attributes_config.map(attr => ({
                name: attr.name, // Name comes from the selected system attribute
                values: attr.values
            }));
            dataToSend.variations_data = productVariations.map(v => {
                const { id, ...variationData } = v; 
                variationData.cost_price = variationData.cost_price !== '' ? parseFloat(variationData.cost_price) : null;
                variationData.retail_price = variationData.retail_price !== '' ? parseFloat(variationData.retail_price) : null;
                variationData.wholesale_price = variationData.wholesale_price !== '' ? parseFloat(variationData.wholesale_price) : null;
                return variationData;
            });
            if (productVariations.length === 0 && formData.attributes_config.length > 0) {
                setError("Variable product selected, but no variations have been generated or defined.");
                setLoadingProduct(false);
                return;
            }
            for (const variation of productVariations) {
                if (!variation.sku || variation.retail_price === '' || variation.cost_price === '') {
                    setError(`All variations must have at least SKU, Cost Price, and Retail Price. Check variation for: ${Object.values(variation.attribute_combination).join('/')}`);
                    setLoadingProduct(false);
                    return;
                }
            }
            dataToSend.sku = dataToSend.sku || null; 
            dataToSend.cost_price = null;
            dataToSend.retail_price = null;
            dataToSend.wholesale_price = null;

        } else {
            delete dataToSend.attributes_config;
            delete dataToSend.variations_data;
        }

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
            const apiError = err.response?.data;
            if (apiError && typeof apiError.message === 'object') {
                const messages = Object.values(apiError.message).flat().join(' ');
                setError(messages || `Failed to ${isEditing ? 'update' : 'create'} product.`);
            } else {
                setError(apiError?.message || err.message || `Failed to ${isEditing ? 'update' : 'create'} product.`);
            }
            isSuccess = false;
        } finally {
            setLoadingProduct(false);
            if (isSuccess) {
                const message = `Product "${dataToSend.product_name}" ${isEditing ? 'updated' : 'created'}.`;
                if (isEditing)
                    navigate('/dashboard/products', { state: { message, type: 'success' } });
                else if (newProdId)
                    navigate(`/dashboard/products/edit/${newProdId}`, { state: { message, type: 'success' } });
                else 
                    navigate('/dashboard/products', { state: { message, type: 'success' } });
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
            const newConfigFromServer = response.data.data || response.data;
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

    const handleAddProductAttribute = (systemAttribute) => {
        if (!systemAttribute) return;
        // Check if attribute already added to prevent duplicates
        if (formData.attributes_config.find(ac => ac.attribute_id === systemAttribute.id)) {
            // Optionally, notify user it's already added
            return;
        }
        setFormData(prev => ({
            ...prev,
            attributes_config: [
                ...prev.attributes_config,
                { attribute_id: systemAttribute.id, name: systemAttribute.name, values: [] } // Initialize with empty values
            ]
        }));
    };

    const handleProductAttributeValuesChange = (configIndex, selectedValues) => {
        setFormData(prev => {
            const newConfig = [...prev.attributes_config];
            newConfig[configIndex].values = selectedValues;
            return { ...prev, attributes_config: newConfig };
        });
    };

    const handleRemoveProductAttributeConfig = (configIndex) => { // Renamed to avoid conflict if old one was still there
        setFormData(prev => ({
            ...prev,
            attributes_config: prev.attributes_config.filter((_, i) => i !== configIndex)
        }));
        // Optionally, regenerate variations or clear them if an attribute config is removed
        setProductVariations([]); 
    };

    const overallLoadingState = loadingProduct || loadingDropdowns || authLoading;
    const currentCategoryId = formData.category_id ? parseInt(formData.category_id) : null;
    const filteredSubCategories = currentCategoryId ? subCategories.filter(sc => sc.category_id === currentCategoryId) : [];

    if (authLoading) {
        return <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}><CircularProgress /><Typography sx={{mt:1}}>Authenticating...</Typography></Paper>;
    }
    if (!isAuthenticated) {
        return <Paper sx={{ p: 3, m: 2 }}><Alert severity="error">You must be logged in to access this page.</Alert></Paper>;
    }
    if (!apiInstance) {
        return <Paper sx={{ p: 3, m: 2 }}><Alert severity="error">API client is not available. Please try again later.</Alert></Paper>;
    }

    return (
        <Paper sx={{ p: 3, m: 2 }}>
            <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
                {isEditing ? `Edit Product (ID: ${productId})` : 'Add New Product'}
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 3 }}>Error: {error}</Alert>}
            
            {overallLoadingState && !error && (
                 <Box sx={{display: 'flex', justifyContent: 'center', py: 4}}><CircularProgress /><Typography sx={{ml:1}}>Loading form data...</Typography></Box>
            )}

            {!overallLoadingState && (
                <Box component="form" onSubmit={handleProductSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <ProductInformationFields
                        formData={formData}
                        onFormChange={handleProductChange}
                        onProductTypeChange={handleProductTypeChange}
                        stores={stores}
                        categories={categories}
                        subCategories={subCategories} // Pass all subCategories
                        specialCategories={specialCategories}
                        brands={brands}
                        units={units}
                        manufacturers={manufacturers} // Pass manufacturers
                        filteredSubCategories={filteredSubCategories} // Pass pre-filtered for convenience
                        commonFormControlSx={commonFormControlSx}
                    />

                    {formData.product_type === 'Standard' && (
                        <StandardProductPricingFields
                            formData={formData}
                            onFormChange={handleProductChange}
                            commonFormControlSx={commonFormControlSx}
                            taxes={taxes}
                            discountTypes={discountTypes}
                        />
                    )}

                    {formData.product_type === 'Variable' && (
                        <>
                            {/* Desired New Order */}
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6">Configure Product Attributes</Typography>
                                {/* ... JSX for selecting/configuring attributes for variations ... */}
                                {/* This section might involve selecting attributes that will be used to generate variations */}
                                <Box component="fieldset" sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1, mt: 2 }}>
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel>Add Attribute to Product</InputLabel>
                                        <Select
                                            value=""
                                            label="Add Attribute to Product"
                                            onChange={(e) => {
                                                const selectedSysAttr = allSystemAttributes.find(attr => attr.id === e.target.value);
                                                if (selectedSysAttr) {
                                                    handleAddProductAttribute(selectedSysAttr); // Uses the NEW handler
                                                }
                                            }}
                                        >
                                            <MenuItem value="" disabled><em>Select an attribute</em></MenuItem>
                                            {allSystemAttributes
                                                .filter(sysAttr => !formData.attributes_config.find(ac => ac.attribute_id === sysAttr.id))
                                                .map(sysAttr => (
                                                    <MenuItem key={sysAttr.id} value={sysAttr.id}>{sysAttr.name}</MenuItem>
                                                ))}
                                        </Select>
                                    </FormControl>

                                    {formData.attributes_config.map((config, index) => {
                                        const systemAttributeDetails = allSystemAttributes.find(sa => sa.id === config.attribute_id);
                                        return (
                                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1, border: '1px solid lightgray', borderRadius: 1 }}>
                                                <Typography sx={{ minWidth: '100px' }}>{config.name}:</Typography>
                                                <FormControl fullWidth>
                                                    <InputLabel>Select Values for {config.name}</InputLabel>
                                                    <Select
                                                        multiple
                                                        value={config.values}
                                                        onChange={(e) => handleProductAttributeValuesChange(index, e.target.value)} // Uses the NEW handler
                                                        input={<OutlinedInput label={`Select Values for ${config.name}`} />}
                                                        renderValue={(selected) => (
                                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                {selected.map((value) => (
                                                                    <Chip key={value} label={value} />
                                                                ))}
                                                            </Box>
                                                        )}
                                                    >
                                                        {systemAttributeDetails?.values?.map(attrValue => ( // Added optional chaining for values
                                                            <MenuItem key={attrValue.id || attrValue.value} value={attrValue.value}>
                                                                {attrValue.value}
                                                            </MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                                <IconButton onClick={() => handleRemoveProductAttributeConfig(index)} color="error"> {/* Uses the NEW handler */}
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6">Product Variations</Typography>
                                {/* ... JSX for managing variations (e.g., price, SKU per variation) ... */}
                                {/* This section would likely depend on the attributes configured above */}
                                <VariableProductFields
                                    formData={formData}
                                    productVariations={productVariations}
                                    onGenerateVariations={handleGenerateVariations}
                                    onVariationChange={handleVariationChange}
                                    onRemoveVariation={handleRemoveVariation}
                                    loadingVariations={loadingVariations}
                                    variationGenerationError={variationGenerationError}
                                    setVariationGenerationError={setVariationGenerationError}
                                    setError={setError}
                                />
                            </Box>

                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h6">Additional Details</Typography>
                                {/* ... JSX for warranty, manufacturer, tax, supplier, etc. ... */}
                                <Box component="fieldset" sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1 }}>
                                    <Typography component="legend" variant="h6" sx={{ mb: 2 }}>Additional Details</Typography>
                                    {/* Placeholder for other fields. You can create another sub-component or add fields directly here if few. */}
                                    {/* For example: Warranty, Supplier, Serialized, Expiry */}
                                    <Typography variant="body2">Additional product details (warranty, supplier, etc.) can be added here or in a dedicated sub-component.</Typography>
                                </Box>
                            </Box>
                        </>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 1 }}>
                        <Button type="submit" variant="contained" color="primary" disabled={loadingProduct || (formData.product_type === 'Variable' && loadingVariations)}>
                            {loadingProduct ? <CircularProgress size={24} sx={{color: 'white'}}/> : isEditing ? 'Update Product Details' : 'Create Product'}
                        </Button>
                        <Button variant="outlined" onClick={() => navigate('/dashboard/products')} disabled={loadingProduct}>
                            {isEditing ? 'Back to List' : 'Cancel'}
                        </Button>
                    </Box>
                </Box>
            )}

            {isEditing && !overallLoadingState && (
                <ProductUnitConfigurationFields
                    productId={productId}
                    productUnits={productUnits}
                    newUnitConfig={newUnitConfig}
                    onNewUnitConfigChange={handleNewUnitConfigChange}
                    onAddUnitConfig={handleAddUnitConfig}
                    onDeleteUnitConfig={handleDeleteUnitConfig}
                    units={units}
                    baseUnitId={formData.base_unit_id}
                    loadingUnitConfig={loadingUnitConfig}
                    unitConfigError={unitConfigError}
                    setUnitConfigError={setUnitConfigError}
                    unitConfigFeedback={unitConfigFeedback}
                    setUnitConfigFeedback={setUnitConfigFeedback}
                    commonFormControlSx={commonFormControlSx}
                    isAuthenticated={isAuthenticated}
                />
            )}
        </Paper>
    );
}

export default ProductForm;
