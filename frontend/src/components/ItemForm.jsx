import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient, {
    addItem, updateItem, fetchItemById,
    fetchCategories, fetchBrands, fetchUnits, fetchSuppliers, fetchManufacturers, fetchStores, fetchTaxes,
    fetchSubCategories, fetchAttributes, fetchSpecialCategories, // <--- CHANGE HERE
    fetchItemUnitConfigs, addItemUnitConfig, deleteItemUnitConfig // New imports for unit configs
} from '../services/api';
import {
    TextField, Button, Container, Typography, Box, CircularProgress, Alert, Paper, Grid,
    Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel,
    Tabs, Tab, IconButton, Autocomplete // <--- ADD Autocomplete HERE
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

// Import sub-components
import ItemInformationFields from './ItemInformationFields.jsx';
import ItemUnitConfigurationFields from './ItemUnitConfigurationFields.jsx';
import VariableItemFields from './VariableItemFields.jsx';


const initialItemFormData = {
    // ... (keep your existing initialItemFormData structure)
    // Ensure it includes fields expected by ItemInformationFields like:
    // Item_name, slug, sku, selling_type, category_id, sub_category_id, special_category_id,
    // inventory_type, brand_id, base_unit_id, manufacturer_id, store_id, item_barcode,
    // description, item_type, is_serialized
    // For consistency, I'll use lowercase keys here and assume ItemInformationFields is adapted
    id: undefined,
    item_name: '', // Changed from Item_name
    slug: '',
    sku: '',
    item_barcode: '',
    description: '',
    item_type: 'Standard',
    category_id: '',
    sub_category_id: null,
    brand_id: null,
    supplier_id: null,
    manufacturer_id: null,
    store_id: null,
    base_unit_id: '',
    cost_price: '',
    retail_price: '',
    wholesale_price: '',
    tax_id: null,
    is_taxable: true,
    inventory_type: 'Inventory',
    selling_type: 'Retail',
    is_active: true,
    enable_stock_management: true,
    is_serialized: false, // Added from ItemInformationFields
    special_category_id: null, // Added from ItemInformationFields

    // Fields for complex data, to be sent to backend
    item_units_config: [], // Array of unit configurations for this item
    attributes_config: [], // Array of { attribute_id, name (optional), values: [] } for this item's variations
    variations_data: [],   // Array of generated/saved variations
};

const initialNewUnitConfig = {
    unit_id: '',
    conversion_factor: '',
    is_purchase_unit: false,
    is_sales_unit: false,
};

const commonFormControlSx = { mb: 2 }; // Example, adjust as needed

function ItemForm() {
    const { itemId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(itemId);

    const [formData, setFormData] = useState(initialItemFormData);
    
    // State for Unit Configurations
    const [itemUnits, setItemUnits] = useState([]); // Renamed from item_units_config in state for clarity
    const [newUnitConfig, setNewUnitConfig] = useState(initialNewUnitConfig);
    const [loadingUnitConfig, setLoadingUnitConfig] = useState(false);
    const [unitConfigError, setUnitConfigError] = useState(null);
    const [unitConfigFeedback, setUnitConfigFeedback] = useState('');

    // State for Attributes and Variations
    const [allAttributes, setAllAttributes] = useState([]); // All available attributes from DB
    const [itemAttributesConfig, setItemAttributesConfig] = useState([]); // Attributes selected/configured for *this* item
    const [itemVariations, setItemVariations] = useState([]); // Generated variations
    const [loadingVariations, setLoadingVariations] = useState(false);
    const [variationGenerationError, setVariationGenerationError] = useState(null);


    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);

    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [filteredSubCategories, setFilteredSubCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [units, setUnits] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [stores, setStores] = useState([]);
    const [taxes, setTaxes] = useState([]);
    const [specialCategories, setSpecialCategories] = useState([]); // For ItemInformationFields


    const fetchDropdownData = useCallback(async () => {
        try {
            const [catData, brandData, unitData, supplierData, manuData, storeData, taxData, subCatData, attrData, spCatData] = await Promise.all([
                fetchCategories(), fetchBrands(), fetchUnits(), fetchSuppliers(), fetchManufacturers(), fetchStores(), fetchTaxes(),
                fetchSubCategories(), fetchAttributes(), fetchSpecialCategories() // <--- CHANGE HERE
            ]);
            setCategories(catData || []);
            setBrands(brandData || []);
            setUnits(unitData || []);
            setSuppliers(supplierData || []);
            setManufacturers(manuData || []);
            setStores(storeData || []);
            setTaxes(taxData || []);
            setSubCategories(subCatData || []);
            setAllAttributes(attrData || []);
            setSpecialCategories(spCatData || []);

        } catch (err) {
            console.error("Failed to fetch dropdown data", err);
            setError(prev => prev ? prev + "\nFailed to load dropdowns." : "Failed to load dropdowns. " + (err.message || ''));
        }
    }, []);

    const loadItemData = useCallback(async () => {
        if (!itemId) return;
        // setIsLoading(true); // Handled by main initialLoad
        setError(null);
        try {
            const data = await fetchItemById(itemId);
            const preparedData = { ...initialItemFormData }; // Start with defaults

            for (const key in data) {
                if (Object.prototype.hasOwnProperty.call(data, key)) {
                    if (key === 'item_units_config' && Array.isArray(data[key])) {
                        setItemUnits(data[key]); // Populate dedicated state
                    } else if (key === 'attributes_config' && Array.isArray(data[key])) {
                        setItemAttributesConfig(data[key]); // Populate dedicated state
                    } else if (key === 'variations_data' && Array.isArray(data[key])) {
                        setItemVariations(data[key]); // Populate dedicated state
                    } else if (Object.prototype.hasOwnProperty.call(preparedData, key)) {
                         if (typeof preparedData[key] === 'string' && (data[key] === null || data[key] === undefined)) {
                            preparedData[key] = '';
                        } else if (typeof preparedData[key] === 'boolean' && (data[key] === null || data[key] === undefined)) {
                            preparedData[key] = false;
                        } else {
                            preparedData[key] = data[key];
                        }
                    }
                }
            }
            setFormData(preparedData);

            // If item_units_config was not part of the main item data, fetch separately
            if (!data.item_units_config && itemId) { // This condition might be problematic if data.item_units_config is an empty array
                const unitConfigs = await fetchItemUnitConfigs(itemId);
                setItemUnits(unitConfigs || []);
            }


        } catch (err) {
            console.error("Failed to fetch item data:", err);
            setError(prev => prev ? prev + "\nFailed to load item." : "Failed to load item. " + (err.message || ''));
        }
    }, [itemId]);
    
    useEffect(() => {
        // Filter subcategories when category_id or subCategories list changes
        if (formData.category_id && subCategories.length > 0) {
            setFilteredSubCategories(
                subCategories.filter(sc => sc.category_id?.toString() === formData.category_id?.toString())
            );
        } else {
            setFilteredSubCategories([]);
        }
    }, [formData.category_id, subCategories]);

    useEffect(() => {
        console.log('[useEffect] formData.attributes_config changed:', JSON.parse(JSON.stringify(formData.attributes_config)));
    }, [formData.attributes_config]);

    useEffect(() => {
        let active = true;
        const initialLoad = async () => {
            setIsLoading(true);
            setError(null);
            await fetchDropdownData();
            if (isEditing && itemId) {
                await loadItemData();
            } else {
                setFormData(initialItemFormData);
                setItemUnits([]);
                setItemAttributesConfig([]);
                setItemVariations([]);
            }
            if (active) setIsLoading(false);
        };
        initialLoad();
        return () => { active = false; };
    }, [itemId, isEditing, fetchDropdownData, loadItemData]);


    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };
    
    const handleItemTypeChange = (newType) => { // For ItemInformationFields
        setFormData(prev => ({ ...prev, item_type: newType }));
        if (newType === 'Standard') {
            setItemAttributesConfig([]);
            setItemVariations([]);
        }
        // Reset tab if "Variations" tab was active and is now hidden
        if (newType === 'Standard' && currentTab === 3) {
            setCurrentTab(0);
        }
    };

    // --- Handlers for ItemUnitConfigurationFields ---
    const handleNewUnitConfigChange = (e) => {
        const { name, value, type, checked } = e.target;
        setNewUnitConfig(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleAddUnitConfig = async () => {
        if (!newUnitConfig.unit_id || !newUnitConfig.conversion_factor) {
            setUnitConfigError("Unit and Conversion Factor are required.");
            return;
        }
        // Determine if this is the base unit
        const isBaseUnit = (
            newUnitConfig.unit_id.toString() === formData.base_unit_id?.toString() &&
            Number(newUnitConfig.conversion_factor) === 1
        );
        const unitName = units.find(u => u.id.toString() === newUnitConfig.unit_id)?.name || 'Unknown Unit';
        setItemUnits(prev => [
            ...prev,
            {
                ...newUnitConfig,
                id: `temp-${Date.now()}`,
                unit_name: unitName,
                is_base_unit: isBaseUnit // <-- Add this line
            }
        ]);
        setNewUnitConfig(initialNewUnitConfig);
    };

    const handleDeleteUnitConfig = async (configIdToDelete, unitName) => {
        if (!window.confirm(`Are you sure you want to delete the unit configuration for "${unitName}"?`)) return;

        if (isEditing && itemId && typeof configIdToDelete === 'number') { // API call for existing items
            setLoadingUnitConfig(true);
            setUnitConfigError(null);
            setUnitConfigFeedback('');
            try {
                await deleteItemUnitConfig(configIdToDelete);
                setItemUnits(prev => prev.filter(u => u.id !== configIdToDelete));
                setUnitConfigFeedback('Unit configuration deleted.');
            } catch (err) {
                setUnitConfigError(err.response?.data?.message || err.message || "Failed to delete unit config.");
            } finally {
                setLoadingUnitConfig(false);
            }
        } else { // Local update for new items
            setItemUnits(prev => prev.filter(u => u.id !== configIdToDelete));
        }
    };

    // --- Placeholder Handlers for Attributes & Variations ---
    const handleAddAttributeConfig = () => { // For UI in ItemForm to add to itemAttributesConfig
        // Example: Add a new empty attribute slot to itemAttributesConfig
        // This UI will be complex: select an attribute from allAttributes, then specify values
        setItemAttributesConfig(prev => [...prev, { attribute_id: '', name: '', values: [] }]);
        console.log("Placeholder: UI to add/select an attribute and its values for this item.");
    };
    const handleAttributeConfigChange = (index, field, value) => {
        setItemAttributesConfig(prev => prev.map((attr, i) => i === index ? { ...attr, [field]: value } : attr));
    };
    const handleRemoveAttributeConfig = (index) => {
        setItemAttributesConfig(prev => prev.filter((_, i) => i !== index));
    };

    const handleGenerateVariations = () => {
        setVariationGenerationError(null);
        if (itemAttributesConfig.length === 0) {
            setVariationGenerationError("Please configure at least one attribute with values to generate variations.");
            return;
        }
        // Use itemId if editing, otherwise use a temporary unique string
        const itemSkuPrefix = (formData.sku || formData.item_name || 'ITEM').replace(/\s+/g, '-').toUpperCase();
        const uniqueItemPart = isEditing && itemId ? itemId : `NEW${Date.now()}`;
        const skuPrefix = `${itemSkuPrefix}-${uniqueItemPart}`;

        // Basic Cartesian product logic
        const generate = (configs) => {
            if (!configs || configs.length === 0) return [{}];
            const [first, ...rest] = configs;
            const restGenerated = generate(rest);
            if (!first.values || first.values.length === 0) return restGenerated;
            return first.values.flatMap(val =>
                restGenerated.map(sg => ({ [first.name || `attr_${first.attribute_id}`]: val, ...sg }))
            );
        };
        const combinations = generate(itemAttributesConfig.filter(attr => attr.attribute_id && attr.values && attr.values.length > 0));
        const newVariations = combinations.map((combo, idx) => ({
            id: `new-${idx}-${Date.now()}`,
            sku: `${skuPrefix}-${Object.values(combo).join('-').toUpperCase()}`.slice(0, 50),
            cost_price: formData.cost_price || '',
            retail_price: formData.retail_price || '',
            wholesale_price: formData.wholesale_price || '',
            attribute_combination: combo,
        }));
        setItemVariations(newVariations);
        console.log("Generated Variations (with unique SKUs):", newVariations);
    };
    const handleVariationChange = (index, field, value) => {
        setItemVariations(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
    };
    const handleRemoveVariation = (idOfVariationToRemove) => {
        // idOfVariationToRemove is the 'id' property of the variation object.
        // It could be a number (from DB for already saved variations) 
        // or a string like "new-..." (for variations generated on the frontend but not yet saved).
        
        // Find the variation to get its SKU or some identifiable name for the confirmation message
        const variationToRemove = itemVariations.find(v => v.id === idOfVariationToRemove);
        const variationIdentifier = variationToRemove ? (variationToRemove.sku || `Variation ID: ${idOfVariationToRemove}`) : `this variation (ID: ${idOfVariationToRemove})`;

        if (window.confirm(`Are you sure you want to remove ${variationIdentifier}?`)) {
            console.log('Attempting to remove variation with ID:', idOfVariationToRemove);
            setItemVariations(prev => {
                const updatedVariations = prev.filter(variation => variation.id !== idOfVariationToRemove);
                console.log('Variations after removal attempt:', updatedVariations);
                return updatedVariations;
            });
        } else {
            console.log('Variation removal cancelled by user for ID:', idOfVariationToRemove);
        }
    };


    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Check for at least one base unit
        const hasBaseUnit = itemUnits.some(
            u => Number(u.conversion_factor) === 1
        );
        if (!hasBaseUnit) {
            setError("You must add at least one unit with a conversion factor of 1 (the base unit).");
            setCurrentTab(2); // Switch to Unit Configuration tab
            return;
        }

        // Check for duplicate SKUs in variations
        if (itemVariations && itemVariations.length > 0) {
            const skuSet = new Set();
            for (const v of itemVariations) {
                if (!v.sku) continue;
                if (skuSet.has(v.sku)) {
                    setError(`Duplicate SKU found in variations: "${v.sku}". SKUs must be unique.`);
                    setCurrentTab(3); // Switch to Variations tab
                    return;
                }
                skuSet.add(v.sku);
            }
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        // Ensure one unit is marked as base unit
        let updatedItemUnits = itemUnits.map(u => {
            // Mark as base if matches base_unit_id and conversion_factor === 1
            const isBase = (
                u.unit_id?.toString() === formData.base_unit_id?.toString() &&
                Number(u.conversion_factor) === 1
            );
            return { ...u, is_base_unit: isBase };
        });

        // If no base unit found, show error and stop
        if (!updatedItemUnits.some(u => u.is_base_unit)) {
            setError("You must have at least one unit with conversion factor 1 and marked as base unit.");
            setCurrentTab(2);
            return;
        }

        const payload = { ...formData };
        // Add complex data from their dedicated states
        payload.item_units_config = updatedItemUnits;
        payload.attributes_config = itemAttributesConfig; // Config used to generate variations
        payload.variations_data = itemVariations;
        
        // ... (rest of payload preparation: parseFloat, nullify empty strings) ...
        for (const key in payload) {
            if (['cost_price', 'retail_price', 'wholesale_price'].includes(key)) {
                payload[key] = parseFloat(payload[key]) || null;
            }
            if (payload[key] === '' && (key.endsWith('_id') || ['sku', 'description'].includes(key))) {
                payload[key] = null;
            }
        }
        
        try {
            let response;
            if (isEditing) {
                response = await updateItem(itemId, payload);
            } else {
                response = await addItem(payload);
            }
            setSuccessMessage(`Item "${response.item_name || formData.item_name}" ${isEditing ? 'updated' : 'created'} successfully!`);
            setTimeout(() => navigate('/dashboard/items'), 1500);
        } catch (err) {
            // ... (error handling) ...
             console.error("Error saving item:", err.response ? err.response.data : err.message);
            const errorMsg = err.response?.data?.message || err.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} item.`;
            if (err.response?.data?.errors) {
                const specificErrors = Object.values(err.response.data.errors).flat().join(' ');
                setError(`${errorMsg} ${specificErrors}`);
            } else {
                setError(errorMsg);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    if (isLoading) { /* ... loading indicator ... */ 
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress /><Typography sx={{ml: 2}}>Loading form...</Typography>
            </Container>
        );
    }
    // ... (error display if critical load error) ...

    // Map formData keys for ItemInformationFields if it strictly expects capitalized keys
    const itemInfoFormData = {
        ...formData,
        Item_name: formData.item_name, // Example mapping
        // Add other mappings if ItemInformationFields uses different casing
    };


    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                    {isEditing ? `Edit Item (ID: ${itemId})` : 'Add New Item'}
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
                {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}

                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={currentTab} onChange={handleTabChange} aria-label="item form tabs" variant="scrollable" scrollButtons="auto">
                        <Tab label="Basic Information" />
                        <Tab label="Pricing & Stock" />
                        <Tab label="Type & Units" />
                        {formData.item_type === 'Variable' && <Tab label="Attributes & Variations" />}
                        {/* <Tab label="Images & SEO" /> */}
                        {/* <Tab label="Other Details" /> */}
                    </Tabs>
                </Box>

                <form onSubmit={handleSubmit}>
                    {currentTab === 0 && (
                        // Assuming ItemInformationFields is adapted to use lowercase formData keys
                        // or pass itemInfoFormData if you created a mapped object
                        <ItemInformationFields
                            formData={formData}
                            onFormChange={handleFormChange}
                            onItemTypeChange={handleItemTypeChange}
                            stores={stores}
                            categories={categories}
                            filteredSubCategories={filteredSubCategories}
                            specialCategories={specialCategories}
                            brands={brands}
                            units={units}
                            manufacturers={manufacturers}
                            suppliers={suppliers} // <-- Add this line
                            commonFormControlSx={commonFormControlSx}
                        />
                    )}
                    {currentTab === 1 && (
                        // ... Pricing & Stock tab content ...
                        <Grid container spacing={3}>
                            {/* ... (your existing fields for cost_price, retail_price, etc.) ... */}
                            <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Cost Price" name="cost_price" value={formData.cost_price} onChange={handleFormChange} type="number" InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Retail Price" name="retail_price" value={formData.retail_price} onChange={handleFormChange} type="number" InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} sm={6} md={4}><TextField fullWidth label="Wholesale Price" name="wholesale_price" value={formData.wholesale_price} onChange={handleFormChange} type="number" InputLabelProps={{ shrink: true }} /></Grid>
                            <Grid item xs={12} sm={6}><FormControl fullWidth><InputLabel>Tax</InputLabel><Select name="tax_id" value={formData.tax_id || ''} label="Tax" onChange={(e) => handleFormChange({target: {name: 'tax_id', value: e.target.value}})}>{taxes.map(tax => <MenuItem key={tax.id} value={tax.id}>{tax.tax_name || tax.name} ({tax.tax_rate}%)</MenuItem>)}</Select></FormControl></Grid>
                            <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={formData.is_taxable} onChange={handleFormChange} name="is_taxable" />} label="Is Taxable?"/></Grid>
                            <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox checked={formData.enable_stock_management} onChange={handleFormChange} name="enable_stock_management" />} label="Enable Stock Management"/></Grid>
                        </Grid>
                    )}
                    {currentTab === 2 && (
                        <Grid container spacing={3}>
                            {/* Type and Base Unit selection already in ItemInformationFields or here?
                                Let's assume Base Unit is critical and might be here too, or ensure it's set in Tab 0.
                                Item Type switch is in ItemInformationFields.
                            */}
                             <Grid item xs={12}>
                                <ItemUnitConfigurationFields
                                    ItemUnits={itemUnits}
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
                                    isAuthenticated={true} // Assuming if form is visible, user is auth
                                />
                            </Grid>
                         </Grid>
                    )}
                    {formData.item_type === 'Variable' && currentTab === 3 && (
                        <Box>
                            <Typography variant="h6" sx={{mt: 2, mb: 1}}>Configure Attributes for Variations</Typography>
                            {/* --- UI to manage itemAttributesConfig --- */}
                            {itemAttributesConfig.map((attrConfig, index) => {
                                // Find the full attribute object for the currently selected attribute_id in this row
                                const currentSelectedFullAttribute = allAttributes.find(
                                    a => a.id?.toString() === attrConfig.attribute_id
                                );
                                // Get the array of predefined value strings for the Autocomplete options
                                const predefinedValuesForSelectedAttr = 
                                    (currentSelectedFullAttribute && Array.isArray(currentSelectedFullAttribute.values))
                                    ? currentSelectedFullAttribute.values.map(v => v.value) // Assuming v.value is the string like "Red"
                                    : [];

                                return (
                                    <Paper key={index} sx={{p: 2, mb: 2, border: '1px dashed grey'}}>
                                        <Grid container spacing={2} alignItems="center">
                                            <Grid item xs={12} sm={4}>
                                                <FormControl fullWidth size="small">
                                                    <InputLabel>Attribute</InputLabel>
                                                    <Select
                                                        value={attrConfig.attribute_id}
                                                        label="Attribute"
                                                        onChange={(e) => {
                                                            const selectedAttributeId = e.target.value;
                                                            const selectedAttr = allAttributes.find(a => a.id.toString() === selectedAttributeId);
                                                            
                                                            handleAttributeConfigChange(index, 'attribute_id', selectedAttributeId);
                                                            handleAttributeConfigChange(index, 'name', selectedAttr?.name || '');
                                                            // When attribute type changes, reset the selected values for this config row
                                                            handleAttributeConfigChange(index, 'values', []); 
                                                        }}
                                                    >
                                                        <MenuItem value=""><em>Select Attribute</em></MenuItem>
                                                        {allAttributes.map(attr => (
                                                            <MenuItem key={attr.id} value={attr.id.toString()}>{attr.name}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <Autocomplete
                                                    multiple
                                                    id={`attribute-values-select-${index}`}
                                                    options={predefinedValuesForSelectedAttr}
                                                    value={attrConfig.values || []} // Ensure value is an array
                                                    getOptionLabel={(option) => option} // Options are strings
                                                    filterSelectedOptions
                                                    onChange={(event, newValue) => {
                                                        // newValue is an array of selected string values
                                                        handleAttributeConfigChange(index, 'values', newValue);
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            variant="outlined"
                                                            label="Select Values"
                                                            placeholder={predefinedValuesForSelectedAttr.length > 0 ? "Choose values..." : "Select attribute type first"}
                                                            size="small"
                                                        />
                                                    )}
                                                    fullWidth
                                                    disabled={!attrConfig.attribute_id || predefinedValuesForSelectedAttr.length === 0}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={2}>
                                                <IconButton onClick={() => handleRemoveAttributeConfig(index)} color="error"><DeleteIcon /></IconButton>
                                            </Grid>
                                        </Grid>
                                    </Paper>
                                );
                            })}
                            <Button startIcon={<AddIcon />} onClick={handleAddAttributeConfig} sx={{mb:2}}>
                                Add Attribute for Variation
                            </Button>
                            {/* --- End UI to manage itemAttributesConfig --- */}

                            <VariableItemFields
                                formData={formData}
                                ItemVariations={itemVariations}
                                onGenerateVariations={handleGenerateVariations}
                                onVariationChange={handleVariationChange}
                                onRemoveVariation={handleRemoveVariation}
                                loadingVariations={loadingVariations}
                                variationGenerationError={variationGenerationError}
                                setVariationGenerationError={setVariationGenerationError}
                            />
                        </Box>
                    )}
                    {/* ... Other tabs ... */}

                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button onClick={() => navigate('/dashboard/items')} sx={{ mr: 2 }} disabled={isLoading && isEditing}>Cancel</Button>
                        <Button type="submit" variant="contained" color="primary" disabled={isLoading}>
                            {isLoading ? <CircularProgress size={24} /> : (isEditing ? 'Update Item' : 'Create Item')}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
}

export default ItemForm;