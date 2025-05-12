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

import ProductInformationFields from './ProductInformationFields.jsx';
import StandardProductPricingFields from './StandardProductPricingFields.jsx';
import VariableProductFields from './VariableProductFields.jsx';
import ProductUnitConfigurationFields from './ProductUnitConfigurationFields.jsx';

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
    product_type: 'Standard', // 'Standard' or 'Variable'
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
    attributes_config: [] // For Variable products
};

const initialNewUnitConfigData = {
    unit_id: '',
    conversion_factor: '',
    is_purchase_unit: false,
    is_sales_unit: false
};

const commonFormControlSx = { mb: 2, minWidth: '220px' }; // Consistent styling for form controls

function ProductForm() {
    const { productId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(productId);
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();

    // Form Data States
    const [formData, setFormData] = useState(initialProductFormData);
    const [productUnits, setProductUnits] = useState([]); // For unit configurations
    const [newUnitConfig, setNewUnitConfig] = useState(initialNewUnitConfigData);
    const [productVariations, setProductVariations] = useState([]); // For variable products

    // Dropdown Data States
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
    const [allSystemAttributes, setAllSystemAttributes] = useState([]);

    // Loading and Error/Feedback States
    const [loadingProduct, setLoadingProduct] = useState(false); // For main product save/load
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [loadingUnitConfig, setLoadingUnitConfig] = useState(false); // For individual unit config API calls (edit mode)
    const [loadingVariations, setLoadingVariations] = useState(false);
    const [error, setError] = useState(null); // General form error
    const [unitConfigError, setUnitConfigError] = useState(null); // Error for unit config section
    const [unitConfigFeedback, setUnitConfigFeedback] = useState('');
    const [variationGenerationError, setVariationGenerationError] = useState(null);

    // Fetch system attributes (for variable products)
    useEffect(() => {
        const fetchSystemAttributes = async () => {
            if (!isAuthenticated || !apiInstance) return;
            try {
                const response = await apiInstance.get('/attributes?include=values');
                const attributesData = Array.isArray(response.data?.data) ? response.data.data : Array.isArray(response.data) ? response.data : [];
                setAllSystemAttributes(attributesData);
            } catch (err) {
                console.error("Error fetching system attributes:", err);
                // setError("Could not load product attributes."); // Optionally set a general error
            }
        };
        fetchSystemAttributes();
    }, [isAuthenticated]);

    // Fetch all dropdown data
    const fetchDropdownData = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) return;
        setLoadingDropdowns(true);
        setError(null);
        const endpoints = {
            categories: '/categories', subCategories: '/sub-categories', brands: '/brands',
            units: '/units', suppliers: '/suppliers', manufacturers: '/manufacturers',
            taxes: '/taxes', warranties: '/warranties', barcodeSymbologies: '/barcode-symbologies',
            specialCategories: '/special-categories', discountTypes: '/discount-types', stores: '/stores'
        };
        try {
            const results = await Promise.all(
                Object.entries(endpoints).map(async ([key, endpoint]) => {
                    const response = await apiInstance.get(endpoint);
                    const data = Array.isArray(response.data?.data) ? response.data.data : Array.isArray(response.data) ? response.data : [];
                    return { key, data };
                })
            );
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
        } catch (err) {
            console.error('Error fetching dropdown data:', err);
            setError('Failed to load form options. Please try refreshing.');
        } finally {
            setLoadingDropdowns(false);
        }
    }, [isAuthenticated]);

    // Fetch existing product data if in editing mode
    const fetchProductData = useCallback(async () => {
        console.log('[fetchProductData] START. productId:', productId, 'isEditing:', isEditing);
        if (!isEditing || !productId || !isAuthenticated || !apiInstance || units.length === 0) {
            console.warn('[fetchProductData] Aborting: Preconditions not met. isEditing:', isEditing, 'productId:', productId, 'isAuthenticated:', isAuthenticated, 'apiInstance:', !!apiInstance, 'units.length:', units.length);
            return;
        }
        setLoadingProduct(true);
        console.log('[fetchProductData] setLoadingProduct(true)');
        setError(null);
        try {
            console.log(`[fetchProductData] Fetching product with ID: ${productId} via API`);
            const response = await apiInstance.get(`/products/${productId}?include=attributes,variations,product_units`);
            const productData = response.data;
            console.log('[fetchProductData] Product data RECEIVED from API:', JSON.stringify(productData, null, 2));

            const preparedFormData = { ...initialProductFormData };
            for (const key in initialProductFormData) {
                if (Object.prototype.hasOwnProperty.call(productData, key)) {
                    const value = productData[key];
                    preparedFormData[key] = (key.endsWith('_id')) && value !== null && value !== undefined
                        ? String(value)
                        : value === null || value === undefined ? '' : value;
                }
            }
            preparedFormData.has_expiry = Boolean(productData.has_expiry);
            preparedFormData.is_serialized = Boolean(productData.is_serialized);
            preparedFormData.attributes_config = productData.attributes_config || [];

            setFormData(preparedFormData);
            console.log('[fetchProductData] setFormData called with:', JSON.stringify(preparedFormData, null, 2));
            
            const fetchedUnits = (productData.product_units || []).map(pu => ({
                ...pu,
                unit_name: units.find(u => u.id.toString() === pu.unit_id.toString())?.name || 'Unknown Unit'
            }));
            setProductUnits(fetchedUnits);
            console.log('[fetchProductData] setProductUnits called with:', JSON.stringify(fetchedUnits, null, 2));

            if (productData.product_type === 'Variable') {
                setProductVariations(productData.variations_data || []);
                console.log('[fetchProductData] setProductVariations called for Variable product.');
            }

        } catch (err) {
            console.error('[fetchProductData] Error fetching product data:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Failed to load product data.');
        } finally {
            setLoadingProduct(false);
            console.log('[fetchProductData] setLoadingProduct(false) in finally block.');
        }
    }, [productId, isEditing, isAuthenticated, apiInstance, units]); // Added apiInstance, units was already there

    // Initial data loading effect
    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchDropdownData();
        }
    }, [authLoading, isAuthenticated, fetchDropdownData]);

    // Effect for fetching product data when dropdowns (especially units) are loaded
    useEffect(() => {
        console.log('[Effect for fetchProductData] Running. isEditing:', isEditing, 'productId:', productId, 'loadingDropdowns:', loadingDropdowns, 'units.length:', units.length);
        if (isEditing && productId && !loadingDropdowns && units.length > 0) {
            console.log('[Effect for fetchProductData] Conditions MET. Calling fetchProductData.');
            fetchProductData();
        } else if (!isEditing) {
            console.log('[Effect for fetchProductData] In !isEditing block. Form should be for new product.');
            // If you want to explicitly reset the form when navigating to "create new" from somewhere else:
            // setFormData(initialProductFormData);
            // setProductUnits([]);
            // setProductVariations([]);
        } else {
            console.log('[Effect for fetchProductData] Conditions NOT MET for fetch. isEditing:', isEditing, 'productId:', productId, 'loadingDropdowns:', loadingDropdowns, 'units.length:', units.length);
        }
    }, [isEditing, productId, fetchProductData, loadingDropdowns, units]);


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
                updatedFormData.attributes_config = []; // Clear attributes
                setProductVariations([]); // Clear variations
                setVariationGenerationError(null);
            }
            return updatedFormData;
        });
    };

    // --- Attribute and Variation Handlers ---
    const handleAddProductAttribute = (systemAttribute) => {
        if (!systemAttribute || formData.attributes_config.find(ac => ac.attribute_id === systemAttribute.id)) return;
        setFormData(prev => ({
            ...prev,
            attributes_config: [...prev.attributes_config, { attribute_id: systemAttribute.id, name: systemAttribute.name, values: [] }]
        }));
    };

    const handleProductAttributeValuesChange = (configIndex, selectedValues) => {
        setFormData(prev => {
            const newConfig = [...prev.attributes_config];
            newConfig[configIndex].values = selectedValues;
            return { ...prev, attributes_config: newConfig };
        });
    };

    const handleRemoveProductAttributeConfig = (configIndex) => {
        setFormData(prev => ({
            ...prev,
            attributes_config: prev.attributes_config.filter((_, i) => i !== configIndex)
        }));
        setProductVariations([]); // Clear variations if an attribute config is removed
    };

    const generateVariationCombinations = () => {
        if (!formData.attributes_config || formData.attributes_config.length === 0) {
            setVariationGenerationError("Add and configure at least one attribute."); return [];
        }
        if (formData.attributes_config.some(attr => !attr.values || attr.values.length === 0)) {
            setVariationGenerationError("All configured attributes must have values selected."); return [];
        }
        setVariationGenerationError(null);
        const attributesWithOptions = formData.attributes_config.map(attr =>
            attr.values.map(val => ({ attributeName: attr.name, value: val }))
        );
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
        const combinations = generateVariationCombinations();
        if (variationGenerationError && combinations.length === 0) { // Check if error was set by generateVariationCombinations
            setLoadingVariations(false);
            return;
        }
        const newVariations = combinations.map((combo, index) => {
            const comboValuesString = Object.values(combo).join('-').toLowerCase().replace(/\s+/g, '-');
            const defaultSku = formData.sku ? `${formData.sku}-${comboValuesString}` : `VAR-${comboValuesString || index + 1}`;
            return {
                id: `tempVar_${Date.now()}_${index}`, // Temporary client-side ID
                attribute_combination: combo,
                sku: defaultSku, cost_price: '', retail_price: '', wholesale_price: '',
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

    // --- Unit Configuration Handlers ---
    const handleAddLocalUnitConfig = (event) => {
        if (event) event.preventDefault();
        setUnitConfigError(null);
        if (!newUnitConfig.unit_id || !newUnitConfig.conversion_factor) {
            setUnitConfigError("Please select a unit and enter a conversion factor."); return;
        }
        if (parseFloat(newUnitConfig.conversion_factor) <= 0) {
            setUnitConfigError("Conversion factor must be a positive number."); return;
        }
        if (productUnits.some(pu => pu.unit_id === newUnitConfig.unit_id)) {
            setUnitConfigError("This unit has already been added."); return;
        }
        
        const unitDetails = units.find(u => u.id.toString() === newUnitConfig.unit_id);
        setProductUnits(prevUnits => [
            ...prevUnits,
            {
                id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary local ID
                unit_id: newUnitConfig.unit_id,
                unit_name: unitDetails ? unitDetails.name : 'Unknown Unit',
                conversion_factor: parseFloat(newUnitConfig.conversion_factor),
                is_purchase_unit: newUnitConfig.is_purchase_unit,
                is_sales_unit: newUnitConfig.is_sales_unit,
            }
        ]);
        setNewUnitConfig(initialNewUnitConfigData); // Reset input form
        setUnitConfigFeedback("Unit configuration added locally.");
        setTimeout(() => setUnitConfigFeedback(''), 3000);
    };
    
    const handleDeleteLocalUnitConfig = (tempIdOrUnitId) => { // For new product, uses temp ID
        setProductUnits(prev => prev.filter(pu => pu.id !== tempIdOrUnitId));
        setUnitConfigFeedback('Local unit configuration removed.');
        setTimeout(() => setUnitConfigFeedback(''), 3000);
    };

    // For EDITING mode - API call to add unit config
    const handleAddUnitConfigAPI = async (event) => {
        if (event) event.preventDefault();
        if (!isEditing || !productId) { setUnitConfigError("Cannot add unit: Not in edit mode or no product ID."); return; }
        setLoadingUnitConfig(true); setUnitConfigError(null); setUnitConfigFeedback('');

        const factor = parseFloat(newUnitConfig.conversion_factor);
        if (!newUnitConfig.unit_id) { setUnitConfigError('Please select a unit.'); setLoadingUnitConfig(false); return; }
        if (isNaN(factor) || factor <= 0) { setUnitConfigError('Conversion factor must be positive.'); setLoadingUnitConfig(false); return; }
        
        const configData = {
            product_id: parseInt(productId), unit_id: parseInt(newUnitConfig.unit_id),
            conversion_factor: factor, is_purchase_unit: newUnitConfig.is_purchase_unit,
            is_sales_unit: newUnitConfig.is_sales_unit
        };
        try {
            const response = await apiInstance.post(`/product-units`, configData);
            if (response.status === 201 && response.data?.productUnit) {
                const addedUnit = response.data.productUnit;
                const unitName = units.find(u => u.id.toString() === addedUnit.unit_id.toString())?.name || 'Unknown';
                setProductUnits(prev => [...prev, { ...addedUnit, unit_name: unitName }]);
                setNewUnitConfig(initialNewUnitConfigData);
                setUnitConfigFeedback('Unit configuration saved.');
            } else { throw new Error('Unexpected response from server.'); }
        } catch (err) {
            setUnitConfigError(err.response?.data?.message || 'Failed to save unit configuration.');
        } finally {
            setLoadingUnitConfig(false);
            setTimeout(() => setUnitConfigFeedback(''), 3000);
        }
    };

    // For EDITING mode - API call to delete unit config
    const handleDeleteUnitConfigAPI = async (configIdToDelete) => {
        if (!isEditing || !productId) { setUnitConfigError("Cannot delete unit: Not in edit mode."); return; }
        if (!window.confirm("Are you sure you want to delete this unit configuration?")) return;
        setLoadingUnitConfig(true); setUnitConfigError(null); setUnitConfigFeedback('');
        try {
            await apiInstance.delete(`/product-units/${configIdToDelete}`);
            setProductUnits(prev => prev.filter(pu => pu.id !== configIdToDelete));
            setUnitConfigFeedback('Unit configuration deleted.');
        } catch (err) {
            setUnitConfigError(err.response?.data?.message || 'Failed to delete unit configuration.');
        } finally {
            setLoadingUnitConfig(false);
            setTimeout(() => setUnitConfigFeedback(''), 3000);
        }
    };

    // --- Main Product Submission ---
    const handleProductSubmit = async (e) => {
        console.log("--- handleProductSubmit STARTED ---"); // <-- ADD THIS LINE
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

        // Add this log to see the value just before the check
        console.log('Validating base_unit_id. Current value:', `'${formData.base_unit_id}'`, 'Type:', typeof formData.base_unit_id);

        if (!formData.base_unit_id) {
            setError("A Base Unit must be selected.");
            return;
        }
        if (!formData.category_id) {
            setError("A Category must be selected.");
            return;
        }
        // REMOVE these unconditional checks for main cost and retail price
        // if (!formData.cost_price || parseFloat(formData.cost_price) < 0) {
        //     setError("Cost Price is required and cannot be negative.");
        //     return;
        // }
        // if (!formData.retail_price || parseFloat(formData.retail_price) < 0) {
        //     setError("Retail Price is required and cannot be negative.");
        //     return;
        // }
        // END OF REMOVAL

        setLoadingProduct(true);
        let currentError = null; // Use a local variable to track the first error encountered

        // --- START OF VALIDATIONS ---
        // 1. Product Name
        if (!formData.product_name.trim()) {
            currentError = "Product Name is required.";
        }

        // 2. Category
        if (!currentError && !formData.category_id) {
            currentError = "A Category must be selected.";
        }

        // 3. Base Unit (from Product Information section) - This is CRITICAL
        if (!currentError && !formData.base_unit_id) {
            console.error("[VALIDATION FAIL] formData.base_unit_id is missing or empty. Value:", `'${formData.base_unit_id}'`);
            currentError = "The 'Base Unit' in the 'Product Information' section is required (e.g., Piece, Box). This is the main unit for the product itself.";
        }

        // 4. Product Unit Configurations list (for new products)
        if (!currentError && !isEditing) {
            // Log current state for debugging this specific check
            console.log("[Validation Debug] Checking unit configurations list. formData.base_unit_id:", formData.base_unit_id, "productUnits.length:", productUnits.length);
            console.log("[Validation Debug] productUnits content:", JSON.stringify(productUnits, null, 2));

            if (productUnits.length === 0) {
                console.error("[VALIDATION TRIGGERED] Product Unit Configurations list IS EMPTY.");
                currentError = "At least one unit configuration must be added to the 'Product Unit Configurations' list. Typically, this includes adding the product's selected base unit (from Product Information) with a conversion factor of 1.";
            }
        }
        
        // 5. Price and SKU Validations for Standard Product
        if (!currentError && formData.product_type === 'Standard') {
            if (formData.cost_price === '' || parseFloat(formData.cost_price) < 0) { 
                currentError = "Valid Cost Price is required for Standard products.";
            }
            if (!currentError && (formData.retail_price === '' || parseFloat(formData.retail_price) < 0)) { 
                currentError = "Valid Retail Price is required for Standard products.";
            }
            if (!currentError && parseFloat(formData.retail_price) < parseFloat(formData.cost_price)) { 
                currentError = "Retail Price cannot be less than Cost Price for Standard products.";
            }
        } 
        // 6. Validations for Variable Product
        else if (!currentError && formData.product_type === 'Variable') {
            if (!formData.attributes_config || formData.attributes_config.length === 0) { 
                currentError = "Configure at least one attribute for Variable products.";
            }
            if (!currentError && (!productVariations || productVariations.length === 0)) { 
                currentError = "Generate variations for Variable products.";
            }
            if (!currentError && productVariations) {
                for (const variation of productVariations) {
                    if (!variation.sku || !variation.sku.trim()) { 
                        currentError = `SKU is required for all variations.`; break; 
                    }
                    if (variation.cost_price === '' || variation.cost_price === null || parseFloat(variation.cost_price) < 0) { 
                        currentError = `Valid Cost Price is required for variation SKU ${variation.sku}.`; break; 
                    }
                    if (variation.retail_price === '' || variation.retail_price === null || parseFloat(variation.retail_price) < 0) { 
                        currentError = `Valid Retail Price is required for variation SKU ${variation.sku}.`; break; 
                    }
                    if (parseFloat(variation.retail_price) < parseFloat(variation.cost_price)) { 
                        currentError = `Retail Price cannot be less than Cost Price for variation SKU ${variation.sku}.`; break; 
                    }
                    if (currentError) break; // Exit loop if an error was found in variations
                }
            }
        }
        // --- END OF VALIDATIONS ---

        if (currentError) {
            setError(currentError); // Set the React state for error display
            // Log detailed information at the exact moment of validation failure
            console.error("SUBMISSION HALTED. Validation Error:", currentError);
            console.log("--- State at time of validation error ---");
            console.log("formData:", JSON.stringify(formData, null, 2));
            console.log("productUnits:", JSON.stringify(productUnits, null, 2));
            console.log("-----------------------------------------");
            return; 
        }

        setLoadingProduct(true);
        const dataToSend = { ...formData };

        // Data type conversions and nullifications
        const optionalFKs = ['sub_category_id', 'special_category_id', 'brand_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id', 'manufacturer_id', 'supplier_id', 'warranty_id', 'store_id'];
        const numericFields = ['cost_price', 'retail_price', 'wholesale_price', 'discount_value', 'weight'];
        const integerFields = ['expiry_notification_days', 'max_sales_qty_per_person'];
        const textFieldsToNullifyIfEmpty = ['slug', 'sku', 'item_barcode', 'measurement_type', 'measurement_value', 'description'];

        Object.keys(dataToSend).forEach((key) => {
            if ((optionalFKs.includes(key) || textFieldsToNullifyIfEmpty.includes(key)) && dataToSend[key] === '') {
                dataToSend[key] = null;
            }
            if (numericFields.includes(key) || integerFields.includes(key)) {
                const parsed = parseFloat(dataToSend[key]); // Use parseFloat for all, backend can handle int conversion if needed
                dataToSend[key] = (dataToSend[key] === null || dataToSend[key] === '' || isNaN(parsed)) ? null : parsed;
            }
            if (['has_expiry', 'is_serialized'].includes(key)) {
                dataToSend[key] = Boolean(dataToSend[key]);
            }
            // Ensure main foreign keys are integers if not null/empty
            if (['base_unit_id', 'category_id', ...optionalFKs].includes(key) && dataToSend[key] !== null && dataToSend[key] !== '') {
                 const parsedInt = parseInt(dataToSend[key], 10);
                 dataToSend[key] = isNaN(parsedInt) ? null : parsedInt;
            }
        });
        
        // Handle Variable Product specific data
        if (dataToSend.product_type === 'Variable') {
            dataToSend.attributes_config = formData.attributes_config.map(attr => ({
                attribute_id: attr.attribute_id, // Ensure attribute_id is sent
                name: attr.name, 
                values: attr.values
            }));
            dataToSend.variations_data = productVariations.map(v => {
                const { id, ...variationData } = v; // Exclude temporary client-side ID
                variationData.cost_price = variationData.cost_price !== '' && variationData.cost_price !== null ? parseFloat(variationData.cost_price) : null;
                variationData.retail_price = variationData.retail_price !== '' && variationData.retail_price !== null ? parseFloat(variationData.retail_price) : null;
                variationData.wholesale_price = variationData.wholesale_price !== '' && variationData.wholesale_price !== null ? parseFloat(variationData.wholesale_price) : null;
                return variationData;
            });
            // Nullify base prices for variable products as they are per-variation
            dataToSend.cost_price = null;
            dataToSend.retail_price = null;
            dataToSend.wholesale_price = null;
        } else { // Standard Product
            delete dataToSend.attributes_config; // Remove if not variable
            delete dataToSend.variations_data;   // Remove if not variable
        }

        // Add product_units_config for NEW products
        if (!isEditing && productUnits.length > 0) {
            dataToSend.product_units_config = productUnits.map(pu => ({
                unit_id: parseInt(pu.unit_id, 10),
                conversion_factor: parseFloat(pu.conversion_factor),
                is_purchase_unit: Boolean(pu.is_purchase_unit),
                is_sales_unit: Boolean(pu.is_sales_unit)
            }));
        }
        // For editing, unit configs are handled by separate API calls via handleAddUnitConfigAPI / handleDeleteUnitConfigAPI

        console.log("Data being sent to backend:", JSON.stringify(dataToSend, null, 2));

        try {
            let response;
            if (isEditing) {
                response = await apiInstance.put(`/products/${productId}`, dataToSend);
            } else {
                response = await apiInstance.post('/products', dataToSend);
            }

            const responseData = response.data;
            const successMessage = `Product "${dataToSend.product_name}" ${isEditing ? 'updated' : 'created'} successfully.`;
            
            if (isEditing) { // If editing, go back to product list or stay (depending on your preference)
                navigate('/dashboard/products', { state: { message: successMessage, type: 'success' } });
            } else { // If creating, go to product list
                navigate('/dashboard/products', { state: { message: successMessage, type: 'success' } });
                // Optionally, if you wanted to stay on the form and clear it for another entry:
                // setFormData(initialProductFormData);
                // setProductUnits([]);
                // setProductVariations([]);
                // setError(null); // Clear any previous errors
                // You might show the success message differently in this case
            }

        } catch (err) {
            console.error(`Error ${isEditing ? 'updating' : 'creating'} product:`, err.response || err);
            // Log the raw error from backend if possible
            if (err.response) {
                console.error("Backend error response data:", err.response.data);
            }
            const apiError = err.response?.data;
            let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} product.`;
            if (apiError) {
                if (typeof apiError.message === 'string') {
                    errorMessage = apiError.message;
                } else if (typeof apiError.message === 'object') { // Handle Laravel validation errors
                    errorMessage = Object.values(apiError.message).flat().join(' ');
                } else if (apiError.errors && Array.isArray(apiError.errors)) { // Handle express-validator style errors
                    errorMessage = apiError.errors.map(e => e.msg).join(' ');
                }
            }
            setError(errorMessage);
        } finally {
            setLoadingProduct(false);
        }
    };

    // --- Render Logic ---
    const overallLoadingState = loadingProduct || loadingDropdowns || authLoading;

    if (authLoading) return <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}><CircularProgress /><Typography sx={{mt:1}}>Authenticating...</Typography></Paper>;
    if (!isAuthenticated) return <Paper sx={{ p: 3, m: 2 }}><Alert severity="error">You must be logged in to access this page.</Alert></Paper>;
    if (!apiInstance && !authLoading) return <Paper sx={{ p: 3, m: 2 }}><Alert severity="error">API client is not available. Please try again later.</Alert></Paper>;

    const currentCategoryId = formData.category_id ? parseInt(formData.category_id) : null;
    const filteredSubCategories = currentCategoryId ? subCategories.filter(sc => sc.category_id === currentCategoryId) : [];

    return (
        <Paper sx={{ p: 3, m: 2, boxShadow: 3 }}>
            <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', fontWeight: 'medium' }}>
                {isEditing ? `Edit Product (ID: ${productId})` : 'Add New Product'}
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
            
            {overallLoadingState && !error && (
                 <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, flexDirection: 'column'}}>
                    <CircularProgress />
                    <Typography sx={{ml:1, mt:1}}>Loading form data...</Typography>
                 </Box>
            )}

            {!overallLoadingState && (
                <Box component="form" onSubmit={handleProductSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }} noValidate> {/* <-- ADD noValidate HERE */}
                    <ProductInformationFields
                        formData={formData}
                        onFormChange={handleProductChange}
                        onProductTypeChange={handleProductTypeChange}
                        stores={stores}
                        categories={categories}
                        subCategories={subCategories} // Pass all subcategories
                        filteredSubCategories={filteredSubCategories} // Pass filtered for direct use
                        specialCategories={specialCategories}
                        brands={brands}
                        units={units}
                        manufacturers={manufacturers}
                        commonFormControlSx={commonFormControlSx}
                    />
                
                {/* Unit Configuration Section - Rendered for both new and edit */}
                {/* For new products, it uses local state handlers. For edit, it uses API handlers. */}
                <ProductUnitConfigurationFields
                    productId={isEditing ? productId : null}
                    productUnits={productUnits}
                    newUnitConfig={newUnitConfig}
                    onNewUnitConfigChange={handleNewUnitConfigChange}
                    onAddUnitConfig={isEditing ? handleAddUnitConfigAPI : handleAddLocalUnitConfig}
                    onDeleteUnitConfig={isEditing ? handleDeleteUnitConfigAPI : handleDeleteLocalUnitConfig}
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
                        <Box sx={{ mb: 3, p:2, border: '1px solid', borderColor: 'divider', borderRadius: 1}}>
                            <Typography variant="h6" sx={{mb:1}}>Configure Product Attributes</Typography>
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Add Attribute to Product</InputLabel>
                                <Select
                                    value=""
                                    label="Add Attribute to Product"
                                    onChange={(e) => {
                                        const selectedSysAttr = allSystemAttributes.find(attr => attr.id === e.target.value);
                                        if (selectedSysAttr) handleAddProductAttribute(selectedSysAttr);
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
                                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1, border: '1px dashed lightgray', borderRadius: 1 }}>
                                        <Typography sx={{ minWidth: '120px', fontWeight: '500' }}>{config.name}:</Typography>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Select Values for {config.name}</InputLabel>
                                            <Select
                                                multiple
                                                value={config.values}
                                                onChange={(e) => handleProductAttributeValuesChange(index, e.target.value)}
                                                input={<OutlinedInput label={`Select Values for ${config.name}`} />}
                                                renderValue={(selected) => (
                                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                        {selected.map((value) => <Chip key={value} label={value} size="small" />)}
                                                    </Box>
                                                )}
                                            >
                                                {systemAttributeDetails?.values?.map(attrValue => (
                                                    <MenuItem key={attrValue.id || attrValue.value} value={attrValue.value}>
                                                        {attrValue.value}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <IconButton onClick={() => handleRemoveProductAttributeConfig(index)} color="error" size="small">
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                );
                            })}
                        </Box>
                        <Box sx={{ mb: 3, p:2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Typography variant="h6" sx={{mb:1}}>Product Variations</Typography>
                            <VariableProductFields
                                formData={formData} // Pass full formData if needed by VariableProductFields
                                productVariations={productVariations}
                                onGenerateVariations={handleGenerateVariations}
                                onVariationChange={handleVariationChange}
                                onRemoveVariation={handleRemoveVariation}
                                loadingVariations={loadingVariations}
                                variationGenerationError={variationGenerationError}
                                setVariationGenerationError={setVariationGenerationError} // Allow child to clear/set error
                                // setError={setError} // Pass general setError if child needs to set form-wide errors
                            />
                        </Box>
                    </>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 2, mt:1, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Button 
                        variant="outlined" 
                        onClick={() => navigate('/dashboard/products')} 
                        disabled={loadingProduct}
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary" 
                        disabled={loadingProduct || (formData.product_type === 'Variable' && loadingVariations)}
                    >
                        {loadingProduct ? <CircularProgress size={24} color="inherit"/> : isEditing ? 'Update Product' : 'Create Product'}
                    </Button>
                </Box>
                </Box>
            )}
        </Paper>
    );
}
export default ProductForm;