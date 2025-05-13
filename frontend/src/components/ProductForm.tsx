import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiInstance from '../services/api.js';
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
    IconButton,
    Grid,
    TextField,
    Checkbox,
    FormControlLabel,
    RadioGroup,
    Radio,
    InputAdornment,
    Tooltip,
    Divider
} from '@mui/material';
import { useAuth } from '../context/AuthContext.jsx';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCamera from '@mui/icons-material/PhotoCamera';

import VariableProductFields from './VariableProductFields.jsx';
import ProductUnitConfigurationFields from './ProductUnitConfigurationFields.jsx';

interface ProductFormData {
    product_name: string;
    slug: string;
    sku: string;
    selling_type: 'Wholesale' | 'Retail' | 'Both' | 'Not For Sale';
    category_id: string;
    sub_category_id: string;
    special_category_id: string;
    inventory_type: 'Inventory' | 'Non-Inventory' | 'Service';
    brand_id: string;
    base_unit_id: string;
    barcode_symbology_id: string;
    item_barcode: string;
    description: string;
    product_type: 'Standard' | 'Variable';
    cost_price: string;
    retail_price: string;
    wholesale_price: string;
    tax_id: string;
    discount_type_id: string;
    discount_value: string;
    measurement_type: string;
    measurement_value: string;
    weight: string;
    manufacturer_id: string;
    has_expiry: boolean;
    warranty_id: string;
    expiry_notification_days: string;
    is_serialized: boolean;
    supplier_id: string;
    store_id: string;
    max_sales_qty_per_person: string;
    attributes_config: { attribute_id: number; name: string; values: string[] }[];
    barcode_image_path?: string | null;
}

interface NewUnitConfigData {
    unit_id: string;
    conversion_factor: string;
    is_purchase_unit: boolean;
    is_sales_unit: boolean;
}

interface ProductUnit {
    id: string | number;
    unit_id: string;
    unit_name: string;
    conversion_factor: number;
    is_purchase_unit: boolean;
    is_sales_unit: boolean;
}

interface ProductVariation {
    id: string;
    attribute_combination: Record<string, string>;
    sku: string;
    cost_price: string;
    retail_price: string;
    wholesale_price: string;
}

interface Category {
    id: number;
    name: string;
}

interface SubCategory {
    id: number;
    name: string;
    category_id: number;
}

interface Brand {
    id: number;
    name: string;
}

interface Unit {
    id: number;
    name: string;
    short_name: string;
}

interface Supplier {
    id: number;
    name: string;
}

interface Manufacturer {
    id: number;
    name: string;
}

interface Tax {
    id: number;
    name: string;
    rate: number;
}

interface Warranty {
    id: number;
    name: string;
    duration: number;
    duration_type: string;
}

interface BarcodeSymbology {
    id: number;
    name: string;
}

interface SpecialCategory {
    id: number;
    name: string;
}

interface DiscountType {
    id: number;
    name: string;
    type: 'Percentage' | 'Fixed';
}

interface Store {
    id: number;
    name: string;
}

interface AttributeValue {
    id?: number;
    value: string;
}

interface SystemAttribute {
    id: number;
    name: string;
    values: AttributeValue[];
}

const initialProductFormData: ProductFormData = {
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
    attributes_config: [],
};

const initialNewUnitConfigData: NewUnitConfigData = {
    unit_id: '',
    conversion_factor: '',
    is_purchase_unit: false,
    is_sales_unit: false
};

const commonFormControlSx = { mb: 2, width: '100%' };
// const sectionSpacingSx = { mt: 3, mb: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }; // Not actively used, section boxes have own mt

const sellingTypeOptions: ('Wholesale' | 'Retail' | 'Both' | 'Not For Sale')[] = ['Wholesale', 'Retail', 'Both', 'Not For Sale'];
const inventoryTypeOptions: ('Inventory' | 'Non-Inventory' | 'Service')[] = ['Inventory', 'Non-Inventory', 'Service'];


function ProductForm() {
    const { productId } = useParams<{ productId?: string }>();
    const navigate = useNavigate();
    const isEditing = Boolean(productId);
    const { isAuthenticated, isLoading: authLoading } = useAuth();

    const [formData, setFormData] = useState<ProductFormData>(initialProductFormData);
    const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
    const [newUnitConfig, setNewUnitConfig] = useState<NewUnitConfigData>(initialNewUnitConfigData);
    const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
    const [barcodeImageFile, setBarcodeImageFile] = useState<File | null>(null);
    const [barcodeImagePreview, setBarcodeImagePreview] = useState<string | null>(null);

    const [categories, setCategories] = useState<Category[]>([]);
    const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
    const [taxes, setTaxes] = useState<Tax[]>([]);
    const [warranties, setWarranties] = useState<Warranty[]>([]);
    const [barcodeSymbologies, setBarcodeSymbologies] = useState<BarcodeSymbology[]>([]);
    const [specialCategories, setSpecialCategories] = useState<SpecialCategory[]>([]);
    const [discountTypes, setDiscountTypes] = useState<DiscountType[]>([]);
    const [stores, setStores] = useState<Store[]>([]);
    const [allSystemAttributes, setAllSystemAttributes] = useState<SystemAttribute[]>([]);

    const [loadingProduct, setLoadingProduct] = useState<boolean>(false);
    const [loadingDropdowns, setLoadingDropdowns] = useState<boolean>(false);
    const [loadingUnitConfig, setLoadingUnitConfig] = useState<boolean>(false);
    const [loadingVariations, setLoadingVariations] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [unitConfigError, setUnitConfigError] = useState<string | null>(null);
    const [unitConfigFeedback, setUnitConfigFeedback] = useState<string>('');
    const [variationGenerationError, setVariationGenerationError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSystemAttributes = async () => {
            if (!isAuthenticated || !apiInstance) return;
            try {
                const response = await apiInstance.get('/attributes?include=values');
                const attributesData = Array.isArray(response.data?.data) ? response.data.data : Array.isArray(response.data) ? response.data : [];
                setAllSystemAttributes(attributesData);
            } catch (err: any) {
                console.error("Error fetching system attributes:", err);
            }
        };
        fetchSystemAttributes();
    }, [isAuthenticated]);

    const fetchDropdownData = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) return;
        setLoadingDropdowns(true);
        setError(null);
        const endpoints: Record<string, string> = {
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
                    case 'categories': setCategories(data as Category[]); break;
                    case 'subCategories': setSubCategories(data as SubCategory[]); break;
                    case 'brands': setBrands(data as Brand[]); break;
                    case 'units': setUnits(data as Unit[]); break;
                    case 'suppliers': setSuppliers(data as Supplier[]); break;
                    case 'manufacturers': setManufacturers(data as Manufacturer[]); break;
                    case 'taxes': setTaxes(data as Tax[]); break;
                    case 'warranties': setWarranties(data as Warranty[]); break;
                    case 'barcodeSymbologies': setBarcodeSymbologies(data as BarcodeSymbology[]); break;
                    case 'specialCategories': setSpecialCategories(data as SpecialCategory[]); break;
                    case 'discountTypes': setDiscountTypes(data as DiscountType[]); break;
                    case 'stores': setStores(data as Store[]); break;
                    default: break;
                }
            });
        } catch (err: any) {
            console.error('Error fetching dropdown data:', err);
            setError('Failed to load form options. Please try refreshing.');
        } finally {
            setLoadingDropdowns(false);
        }
    }, [isAuthenticated]);

    const fetchProductData = useCallback(async () => {
        if (!isEditing || !productId || !isAuthenticated || !apiInstance || units.length === 0) return;
        setLoadingProduct(true);
        setError(null);
        try {
            const response = await apiInstance.get(`/products/${productId}?include=attributes,variations,product_units`);
            const productData = response.data as any; // Adjust type if backend response is well-defined

            const preparedFormData: ProductFormData = { ...initialProductFormData };
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
            preparedFormData.barcode_image_path = productData.barcode_image_path || null;

            setFormData(preparedFormData);
            if (productData.barcode_image_path) {
                setBarcodeImagePreview(productData.barcode_image_path);
            }

            const fetchedUnits = (productData.product_units || []).map((pu: any) => ({
                ...pu,
                unit_name: units.find(u => u.id.toString() === pu.unit_id.toString())?.name || 'Unknown Unit'
            }));
            setProductUnits(fetchedUnits);

            if (productData.product_type === 'Variable') {
                setProductVariations(productData.variations_data || []);
            }
        } catch (err: any) {
            console.error('[fetchProductData] Error fetching product data:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Failed to load product data.');
        } finally {
            setLoadingProduct(false);
        }
    }, [productId, isEditing, isAuthenticated, units]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchDropdownData();
        }
    }, [authLoading, isAuthenticated, fetchDropdownData]);

    useEffect(() => {
        if (isEditing && productId && !loadingDropdowns && units.length > 0) {
            fetchProductData();
        }
    }, [isEditing, productId, fetchProductData, loadingDropdowns, units]);

    const handleProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLCheckboxElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleBarcodeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setBarcodeImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setBarcodeImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setBarcodeImageFile(null);
            setBarcodeImagePreview(null);
        }
    };

    const handleProductTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newType = event.target.value as 'Standard' | 'Variable';
        setFormData(prev => {
            const updatedFormData = { ...prev, product_type: newType };
            if (newType === 'Standard') {
                updatedFormData.attributes_config = [];
                setProductVariations([]);
                setVariationGenerationError(null);
            }
            return updatedFormData;
        });
    };

    const handleAddProductAttribute = (systemAttribute: SystemAttribute) => {
        if (!systemAttribute || formData.attributes_config.find(ac => ac.attribute_id === systemAttribute.id)) return;
        setFormData(prev => ({
            ...prev,
            attributes_config: [...prev.attributes_config, { attribute_id: systemAttribute.id, name: systemAttribute.name, values: [] }]
        }));
    };
    const handleProductAttributeValuesChange = (configIndex: number, selectedValues: string[]) => {
        setFormData(prev => {
            const newConfig = [...prev.attributes_config];
            newConfig[configIndex].values = selectedValues;
            return { ...prev, attributes_config: newConfig };
        });
    };
    const handleRemoveProductAttributeConfig = (configIndex: number) => {
        setFormData(prev => ({
            ...prev,
            attributes_config: prev.attributes_config.filter((_, i) => i !== configIndex)
        }));
        setProductVariations([]);
    };
    const generateVariationCombinations = (): Record<string, string>[] => {
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
        let combinations: Record<string, string>[] = [{}];
        for (const optionList of attributesWithOptions) {
            const newCombinations: Record<string, string>[] = [];
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
        if (variationGenerationError && combinations.length === 0) {
            setLoadingVariations(false);
            return;
        }
        const newVariations = combinations.map((combo, index) => {
            const comboValuesString = Object.values(combo).join('-').toLowerCase().replace(/\s+/g, '-');
            const defaultSku = formData.sku ? `${formData.sku}-${comboValuesString}` : `VAR-${comboValuesString || index + 1}`;
            return {
                id: `tempVar_${Date.now()}_${index}`,
                attribute_combination: combo,
                sku: defaultSku, cost_price: '', retail_price: '', wholesale_price: '',
            };
        });
        setProductVariations(newVariations);
        setLoadingVariations(false);
    };
    const handleVariationChange = (index: number, field: keyof ProductVariation, value: string) => {
        setProductVariations(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };
    const handleRemoveVariation = (variationIdToRemove: string) => {
        setProductVariations(prev => prev.filter(v => v.id !== variationIdToRemove));
    };

    const handleNewUnitConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLCheckboxElement>) => {
        const { name, value, type, checked } = e.target;
        setNewUnitConfig((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    const handleAddLocalUnitConfig = (event: React.FormEvent | null) => {
        if (event) event.preventDefault();
        setUnitConfigError(null);
        if (!newUnitConfig.unit_id || !newUnitConfig.conversion_factor) { setUnitConfigError("Please select a unit and enter a conversion factor."); return; }
        if (parseFloat(newUnitConfig.conversion_factor) <= 0) { setUnitConfigError("Conversion factor must be a positive number."); return; }
        if (productUnits.some(pu => pu.unit_id === newUnitConfig.unit_id)) { setUnitConfigError("This unit has already been added."); return; }
        const unitDetails = units.find(u => u.id.toString() === newUnitConfig.unit_id);
        setProductUnits(prevUnits => [...prevUnits, { id: `local-${Date.now()}`, unit_id: newUnitConfig.unit_id, unit_name: unitDetails ? unitDetails.name : 'Unknown Unit', conversion_factor: parseFloat(newUnitConfig.conversion_factor), is_purchase_unit: newUnitConfig.is_purchase_unit, is_sales_unit: newUnitConfig.is_sales_unit }]);
        setNewUnitConfig(initialNewUnitConfigData);
        setUnitConfigFeedback("Unit configuration added locally."); setTimeout(() => setUnitConfigFeedback(''), 3000);
    };
    const handleDeleteLocalUnitConfig = (tempIdOrUnitId: string | number) => {
        setProductUnits(prev => prev.filter(pu => pu.id !== tempIdOrUnitId));
        setUnitConfigFeedback('Local unit configuration removed.'); setTimeout(() => setUnitConfigFeedback(''), 3000);
    };
    const handleAddUnitConfigAPI = async (event: React.FormEvent) => { /* Similar to original */ };
    const handleDeleteUnitConfigAPI = async (configIdToDelete: number) => { /* Similar to original */ };


    const handleProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !apiInstance) { setError("Not authenticated or API client not available."); return; }
        setError(null);

        let currentError: string | null = null;
        if (!formData.product_name.trim()) currentError = "Product Name is required.";
        if (!currentError && !formData.category_id) currentError = "A Category must be selected.";
        if (!currentError && !formData.base_unit_id) currentError = "A Base Unit is required.";
        if (!currentError && !isEditing && productUnits.length === 0) currentError = "At least one unit configuration is required for new products.";

        if (formData.product_type === 'Standard') {
            if (!currentError && (formData.cost_price === '' || parseFloat(formData.cost_price) < 0)) currentError = "Valid Cost Price is required for Standard products.";
            if (!currentError && (formData.retail_price === '' || parseFloat(formData.retail_price) < 0)) currentError = "Valid Retail Price is required for Standard products.";
        } else if (formData.product_type === 'Variable') {
            if (!currentError && (!formData.attributes_config || formData.attributes_config.length === 0)) currentError = "Configure at least one attribute for Variable products.";
            if (!currentError && (!productVariations || productVariations.length === 0)) currentError = "Generate variations for Variable products.";
        }

        if (currentError) { setError(currentError); setLoadingProduct(false); return; }

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
            if (numericFields.includes(key) || integerFields.includes(key)) {
                const parsed = parseFloat(dataToSend[key]);
                dataToSend[key] = (dataToSend[key] === null || dataToSend[key] === '' || isNaN(parsed)) ? null : parsed;
            }
            if (['has_expiry', 'is_serialized'].includes(key)) {
                dataToSend[key] = Boolean(dataToSend[key]);
            }
            if (['base_unit_id', 'category_id', ...optionalFKs].includes(key) && dataToSend[key] !== null && dataToSend[key] !== '') {
                const parsedInt = parseInt(dataToSend[key], 10);
                dataToSend[key] = isNaN(parsedInt) ? null : parsedInt;
            }
        });

        const payload = new FormData();
        Object.keys(dataToSend).forEach(key => {
            if (dataToSend[key] !== null && dataToSend[key] !== undefined) {
                if (key === 'attributes_config' || key === 'variations_data' || key === 'product_units_config') {
                    payload.append(key, JSON.stringify(dataToSend[key]));
                } else if (typeof dataToSend[key] === 'boolean') {
                    payload.append(key, dataToSend[key] ? '1' : '0');
                }
                else {
                    payload.append(key, dataToSend[key]);
                }
            }
        });

        if (barcodeImageFile) {
            payload.append('barcode_image', barcodeImageFile);
        } else if (isEditing && formData.barcode_image_path === null && barcodeImagePreview === null) {
            // payload.append('remove_barcode_image', '1');
        }


        if (dataToSend.product_type === 'Variable') {
            payload.set('cost_price', '');
            payload.set('retail_price', '');
            payload.set('wholesale_price', '');
        } else {
            if (payload.has('attributes_config')) payload.delete('attributes_config');
            if (payload.has('variations_data')) payload.delete('variations_data');
        }

        if (!isEditing && productUnits.length > 0) {
            const unitsConfig = productUnits.map(pu => ({
                unit_id: parseInt(pu.unit_id, 10),
                conversion_factor: parseFloat(pu.conversion_factor),
                is_purchase_unit: Boolean(pu.is_purchase_unit),
                is_sales_unit: Boolean(pu.is_sales_unit)
            }));
            payload.append('product_units_config', JSON.stringify(unitsConfig));
        }

        try {
            let response;
            if (isEditing) {
                payload.append('_method', 'PUT');
                response = await apiInstance.post(`/products/${productId}`, payload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                response = await apiInstance.post('/products', payload, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            const successMessage = `Product "${formData.product_name}" ${isEditing ? 'updated' : 'created'} successfully.`;
            navigate('/dashboard/products', { state: { message: successMessage, type: 'success' } });
        } catch (err: any) {
            console.error(`Error ${isEditing ? 'updating' : 'creating'} product:`, err.response || err);
            const apiError = err.response?.data;
            let errorMessage = `Failed to ${isEditing ? 'update' : 'create'} product.`;
            if (apiError) {
                if (typeof apiError.message === 'string') errorMessage = apiError.message;
                else if (typeof apiError.message === 'object') errorMessage = Object.values(apiError.message).flat().join(' ');
                else if (apiError.errors && Array.isArray(apiError.errors)) errorMessage = apiError.errors.map((e: any) => e.msg).join(' ');
            }
            setError(errorMessage);
        } finally {
            setLoadingProduct(false);
        }
    };

    const overallLoadingState = loadingProduct || loadingDropdowns || authLoading;
    if (authLoading) return <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}><CircularProgress /><Typography sx={{mt:1}}>Authenticating...</Typography></Paper>;
    if (!isAuthenticated) return <Paper sx={{ p: 3, m: 2 }}><Alert severity="error">You must be logged in to access this page.</Alert></Paper>;

    const currentCategoryId = formData.category_id ? parseInt(formData.category_id) : null;
    const filteredSubCategories = currentCategoryId ? subCategories.filter(sc => sc.category_id === currentCategoryId) : [];

    return (
        <Paper sx={{ p: { xs: 2, md: 3 }, m: { xs: 1, md: 2 }, boxShadow: 3 }}>
            <Typography variant="h4" sx={{ mb: 3, textAlign: 'center', fontWeight: 'medium' }}>
                {isEditing ? `Edit Product (ID: ${productId})` : 'Add New Product'}
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}

            {overallLoadingState && !error && (
                <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', py: 4, flexDirection: 'column'}}>
                    <CircularProgress /> <Typography sx={{ml:1, mt:1}}>Loading form data...</Typography>
                </Box>
            )}

            {!overallLoadingState && (
                <Box component="form" onSubmit={handleProductSubmit} sx={{ display: 'flex', flexDirection: 'column' }} noValidate> {/* Removed gap: 2 here, rely on section margin */}

                    {/* Basic Information Section */}
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mt:0 }}> {/* First section mt:0 or adjust */}
                        <Typography variant="h6" sx={{ mb: 2 }}>Basic Information</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth required label="Product Name" name="product_name" value={formData.product_name} onChange={handleProductChange} sx={commonFormControlSx} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth label="Product Slug" name="slug" value={formData.slug} onChange={handleProductChange} sx={commonFormControlSx} helperText="URL-friendly version of name (auto-generated if empty)" />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth label="SKU (Stock Keeping Unit)" name="sku" value={formData.sku} onChange={handleProductChange} sx={commonFormControlSx} helperText="Unique product identifier" />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl component="fieldset" sx={commonFormControlSx}>
                                    <Typography component="legend" variant="body2" sx={{mb:0.5, color: 'text.secondary'}}>Product Type*</Typography>
                                    <RadioGroup row name="product_type" value={formData.product_type} onChange={handleProductTypeChange}>
                                        <FormControlLabel value="Standard" control={<Radio />} label="Standard" />
                                        <FormControlLabel value="Variable" control={<Radio />} label="Variable" />
                                    </RadioGroup>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth required sx={commonFormControlSx}>
                                    <InputLabel id="category-select-label">Category</InputLabel>
                                    <Select labelId="category-select-label" name="category_id" value={formData.category_id} label="Category" onChange={handleProductChange}>
                                        {categories.map(cat => <MenuItem key={cat.id} value={cat.id.toString()}>{cat.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth sx={commonFormControlSx} disabled={!formData.category_id || filteredSubCategories.length === 0}>
                                    <InputLabel id="subcategory-select-label">Sub-Category</InputLabel>
                                    <Select labelId="subcategory-select-label" name="sub_category_id" value={formData.sub_category_id} label="Sub-Category" onChange={handleProductChange}>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {filteredSubCategories.map(subCat => <MenuItem key={subCat.id} value={subCat.id.toString()}>{subCat.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="brand-select-label">Brand</InputLabel>
                                    <Select labelId="brand-select-label" name="brand_id" value={formData.brand_id} label="Brand" onChange={handleProductChange}>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {brands.map(brand => <MenuItem key={brand.id} value={brand.id.toString()}>{brand.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="store-select-label">Store (if applicable)</InputLabel>
                                    <Select labelId="store-select-label" name="store_id" value={formData.store_id} label="Store (if applicable)" onChange={handleProductChange}>
                                        <MenuItem value=""><em>All Stores / Global</em></MenuItem>
                                        {stores.map(store => <MenuItem key={store.id} value={store.id.toString()}>{store.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Description & Classifications Section */}
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mt: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Description & Classifications</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField fullWidth label="Description" name="description" value={formData.description} onChange={handleProductChange} multiline rows={4} sx={commonFormControlSx} />
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <FormControl fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="sellingtype-select-label">Selling Type</InputLabel>
                                    <Select labelId="sellingtype-select-label" name="selling_type" value={formData.selling_type} label="Selling Type" onChange={handleProductChange}>
                                        {sellingTypeOptions.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <FormControl fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="inventorytype-select-label">Inventory Type</InputLabel>
                                    <Select labelId="inventorytype-select-label" name="inventory_type" value={formData.inventory_type} label="Inventory Type" onChange={handleProductChange}>
                                        {inventoryTypeOptions.map(type => <MenuItem key={type} value={type}>{type}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={12} md={4}> {/* Adjusted sm for better flow before md */}
                                <FormControl fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="specialcategory-select-label">Special Category</InputLabel>
                                    <Select labelId="specialcategory-select-label" name="special_category_id" value={formData.special_category_id} label="Special Category (e.g., Featured, New)" onChange={handleProductChange}>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {specialCategories.map(sc => <MenuItem key={sc.id} value={sc.id.toString()}>{sc.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Supplier & Manufacturer Section */}
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mt: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Supplier & Manufacturer</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="supplier-select-label">Supplier</InputLabel>
                                    <Select labelId="supplier-select-label" name="supplier_id" value={formData.supplier_id} label="Supplier" onChange={handleProductChange}>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {suppliers.map(s => <MenuItem key={s.id} value={s.id.toString()}>{s.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="manufacturer-select-label">Manufacturer</InputLabel>
                                    <Select labelId="manufacturer-select-label" name="manufacturer_id" value={formData.manufacturer_id} label="Manufacturer" onChange={handleProductChange}>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {manufacturers.map(m => <MenuItem key={m.id} value={m.id.toString()}>{m.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Units & Measurement Section */}
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mt: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Units & Measurement</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth required sx={commonFormControlSx}>
                                    <InputLabel id="baseunit-select-label">Base Unit (Smallest Unit)</InputLabel>
                                    <Select labelId="baseunit-select-label" name="base_unit_id" value={formData.base_unit_id} label="Base Unit (Smallest Unit)" onChange={handleProductChange}>
                                        {units.map(unit => <MenuItem key={unit.id} value={unit.id.toString()}>{unit.name} ({unit.short_name})</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth label="Weight" name="weight" type="number" value={formData.weight} onChange={handleProductChange} sx={commonFormControlSx} InputProps={{ endAdornment: <InputAdornment position="end">kg</InputAdornment> }} helperText="Enter weight in kilograms" />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth label="Measurement Type (e.g., Dimensions)" name="measurement_type" value={formData.measurement_type} onChange={handleProductChange} sx={commonFormControlSx} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth label="Measurement Value (e.g., 10x20x5 cm)" name="measurement_value" value={formData.measurement_value} onChange={handleProductChange} sx={commonFormControlSx} />
                            </Grid>
                        </Grid>
                        <Box sx={{mt: 2}}>
                            <ProductUnitConfigurationFields
                                productId={isEditing ? parseInt(productId || '0') : null}
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
                        </Box>
                    </Box>

                    {/* Barcode & Serialization Section */}
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mt: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Barcode & Serialization</Typography>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="barcodesymbology-select-label">Barcode Symbology</InputLabel>
                                    <Select labelId="barcodesymbology-select-label" name="barcode_symbology_id" value={formData.barcode_symbology_id} label="Barcode Symbology" onChange={handleProductChange}>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {barcodeSymbologies.map(bs => <MenuItem key={bs.id} value={bs.id.toString()}>{bs.name}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField fullWidth label="Item Barcode Number" name="item_barcode" value={formData.item_barcode} onChange={handleProductChange} sx={commonFormControlSx} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" gutterBottom>Barcode Image</Typography>
                                <Button variant="outlined" component="label" startIcon={<PhotoCamera />} sx={{textTransform: 'none', mb: barcodeImagePreview ? 0 : 2 }}> {/* Adjusted margin */}
                                    Upload Barcode Image
                                    <input type="file" hidden accept="image/*" onChange={handleBarcodeImageChange} />
                                </Button>
                                {barcodeImagePreview && (
                                    <Box sx={{ mt: 1, border: '1px solid lightgray', p:1, display: 'inline-block' }}>
                                        <img src={barcodeImagePreview} alt="Barcode Preview" style={{ maxHeight: '100px', maxWidth: '200px', display: 'block' }} />
                                        <Button size="small" color="error" onClick={() => { setBarcodeImageFile(null); setBarcodeImagePreview(null); setFormData(prev => ({...prev, barcode_image_path: null})); }} sx={{mt:0.5}}>Remove</Button>
                                    </Box>
                                )}
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControlLabel control={<Checkbox name="is_serialized" checked={formData.is_serialized} onChange={handleProductChange} />} label="Product is Serialized (tracks individual serial numbers)" sx={{...commonFormControlSx, mt: {xs: 0, md: 2}}} /> {/* Adjusted margin for alignment */}
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Pricing, Tax & Discount Section */}
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mt: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Pricing, Tax & Discount</Typography>
                        {formData.product_type === 'Standard' && (
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField fullWidth required label="Cost Price" name="cost_price" type="number" value={formData.cost_price} onChange={handleProductChange} sx={commonFormControlSx} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <TextField fullWidth required label="Retail Price" name="retail_price" type="number" value={formData.retail_price} onChange={handleProductChange} sx={commonFormControlSx} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                                </Grid>
                                <Grid item xs={12} sm={12} md={4}> {/* Adjusted sm for full row before md */}
                                    <TextField fullWidth label="Wholesale Price" name="wholesale_price" type="number" value={formData.wholesale_price} onChange={handleProductChange} sx={commonFormControlSx} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <FormControl fullWidth sx={commonFormControlSx}>
                                        <InputLabel id="tax-select-label">Tax</InputLabel>
                                        <Select labelId="tax-select-label" name="tax_id" value={formData.tax_id} label="Tax" onChange={handleProductChange}>
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {taxes.map(tax => <MenuItem key={tax.id} value={tax.id.toString()}>{tax.name} ({tax.rate}%)</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6} md={4}>
                                    <FormControl fullWidth sx={commonFormControlSx}>
                                        <InputLabel id="discounttype-select-label">Discount Type</InputLabel>
                                        <Select labelId="discounttype-select-label" name="discount_type_id" value={formData.discount_type_id} label="Discount Type" onChange={handleProductChange}>
                                            <MenuItem value=""><em>None</em></MenuItem>
                                            {discountTypes.map(dt => <MenuItem key={dt.id} value={dt.id.toString()}>{dt.name}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={12} md={4}> {/* Adjusted sm */}
                                    <TextField fullWidth label="Discount Value" name="discount_value" type="number" value={formData.discount_value} onChange={handleProductChange} sx={commonFormControlSx} InputProps={{ startAdornment: <InputAdornment position="start">{discountTypes.find(dt => dt.id.toString() === formData.discount_type_id)?.type === 'Percentage' ? '%' : '$'}</InputAdornment> }} />
                                </Grid>
                            </Grid>
                        )}
                        {formData.product_type === 'Variable' && (
                            <>
                                <Box sx={{ mb: 3, p:2, border: '1px solid', borderColor: 'divider', borderRadius: 1}}>
                                    <Typography variant="h6" sx={{mb:1}}>Configure Product Attributes</Typography>
                                    <FormControl fullWidth margin="normal"> {/* Consider commonFormControlSx here if needed */}
                                        <InputLabel id="addattribute-select-label">Add Attribute to Product</InputLabel>
                                        <Select labelId="addattribute-select-label" value="" label="Add Attribute to Product" onChange={(e) => { const selectedSysAttr = allSystemAttributes.find(attr => attr.id === parseInt(e.target.value as string, 10)); if (selectedSysAttr) handleAddProductAttribute(selectedSysAttr); }}>
                                            <MenuItem value="" disabled><em>Select an attribute</em></MenuItem>
                                            {allSystemAttributes.filter(sysAttr => !formData.attributes_config.find(ac => ac.attribute_id === sysAttr.id)).map(sysAttr => (<MenuItem key={sysAttr.id} value={sysAttr.id}>{sysAttr.name}</MenuItem>))}
                                        </Select>
                                    </FormControl>
                                    {formData.attributes_config.map((config, index) => {
                                        const systemAttributeDetails = allSystemAttributes.find(sa => sa.id === config.attribute_id);
                                        const labelId = `attribute-value-select-label-${index}`;
                                        return (
                                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, p: 1, border: '1px dashed lightgray', borderRadius: 1 }}>
                                                <Typography sx={{ minWidth: '120px', fontWeight: '500' }}>{config.name}:</Typography>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel id={labelId}>Select Values for {config.name}</InputLabel>
                                                    <Select multiple labelId={labelId} value={config.values} onChange={(e) => handleProductAttributeValuesChange(index, e.target.value as string[])} input={<OutlinedInput label={`Select Values for ${config.name}`} />} renderValue={(selected) => (<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>{selected.map((value) => <Chip key={value} label={value} size="small" />)}</Box>)}>
                                                        {systemAttributeDetails?.values?.map(attrValue => (<MenuItem key={attrValue.id || attrValue.value} value={attrValue.value}>{attrValue.value}</MenuItem>))}
                                                    </Select>
                                                </FormControl>
                                                <IconButton onClick={() => handleRemoveProductAttributeConfig(index)} color="error" size="small"><DeleteIcon /></IconButton>
                                            </Box>
                                        );
                                    })}
                                </Box>
                                <Box sx={{ mb: 1, p:2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                    <Typography variant="h6" sx={{mb:1}}>Product Variations</Typography>
                                    <VariableProductFields
                                        formData={formData}
                                        productVariations={productVariations}
                                        onGenerateVariations={handleGenerateVariations}
                                        onVariationChange={handleVariationChange}
                                        onRemoveVariation={handleRemoveVariation}
                                        loadingVariations={loadingVariations}
                                        variationGenerationError={variationGenerationError}
                                        setVariationGenerationError={setVariationGenerationError}
                                    />
                                </Box>
                            </>
                        )}
                    </Box>

                    {/* Stock Control & Warranty Section */}
                    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, mt: 2 }}>
                        <Typography variant="h6" sx={{ mb: 2 }}>Stock Control & Warranty</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <FormControlLabel control={<Checkbox name="has_expiry" checked={formData.has_expiry} onChange={handleProductChange} />} label="Product has Expiry Date" sx={{...commonFormControlSx, mb: {xs:0, sm:2}}} /> {/* Adjusted mb for checkbox */}
                            </Grid>
                            {formData.has_expiry && (
                                <Grid item xs={12} sm={6}>
                                    <TextField fullWidth label="Expiry Notification Days" name="expiry_notification_days" type="number" value={formData.expiry_notification_days} onChange={handleProductChange} sx={commonFormControlSx} helperText="Days before expiry to notify" />
                                </Grid>
                            )}
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Max Sales Quantity per Person" name="max_sales_qty_per_person" type="number" value={formData.max_sales_qty_per_person} onChange={handleProductChange} sx={commonFormControlSx} helperText="Leave blank for no limit" />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth sx={commonFormControlSx}>
                                    <InputLabel id="warranty-select-label">Warranty</InputLabel>
                                    <Select labelId="warranty-select-label" name="warranty_id" value={formData.warranty_id} label="Warranty" onChange={handleProductChange}>
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {warranties.map(w => <MenuItem key={w.id} value={w.id.toString()}>{w.name} ({w.duration} {w.duration_type})</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, pt: 3, mt:2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Button variant="outlined" onClick={() => navigate('/dashboard/products')} disabled={loadingProduct}>Cancel</Button>
                        <Button type="submit" variant="contained" color="primary" disabled={loadingProduct || (formData.product_type === 'Variable' && loadingVariations)}>
                            {loadingProduct ? <CircularProgress size={24} color="inherit"/> : isEditing ? 'Update Product' : 'Create Product'}
                        </Button>
                    </Box>
                </Box>
            )}
        </Paper>
    );
}
export default ProductForm;