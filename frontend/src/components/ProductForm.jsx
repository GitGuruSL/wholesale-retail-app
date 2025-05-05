// frontend/src/components/ProductForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

// Configuration
const API_BASE_URL = 'http://localhost:5001/api';

// Initial state for the main product form
const initialProductFormData = {
    product_name: '', slug: '', sku: '', selling_type: 'Wholesale', category_id: '',
    sub_category_id: '', special_category_id: '', inventory_type: 'Inventory', brand_id: '',
    base_unit_id: '', barcode_symbology_id: '', item_barcode: '', description: '',
    product_type: 'Standard', cost_price: '', retail_price: '', wholesale_price: '',
    tax_id: '', discount_type_id: '', discount_value: '', measurement_type: '', measurement_value: '',
    weight: '', manufacturer_id: '', has_expiry: false, warranty_id: '',
    expiry_notification_days: '', is_serialized: false, supplier_id: '',
    store_id: '', max_sales_qty_per_person: '',
};

// Initial state for the "Add New Unit Config" sub-form
const initialNewUnitConfigData = {
    unit_id: '',
    conversion_factor: '',
    is_purchase_unit: false,
    is_sales_unit: false,
};

// --- Main Component ---
function ProductForm() {
    // --- State ---
    const { productId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(productId);

    const [formData, setFormData] = useState(initialProductFormData);
    // Dropdown options state
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [units, setUnits] = useState([]); // Consolidated state for all units
    const [suppliers, setSuppliers] = useState([]);
    const [manufacturers, setManufacturers] = useState([]);
    const [taxes, setTaxes] = useState([]);
    const [warranties, setWarranties] = useState([]);
    const [barcodeSymbologies, setBarcodeSymbologies] = useState([]);
    const [specialCategories, setSpecialCategories] = useState([]);
    const [discountTypes, setDiscountTypes] = useState([]);
    const [stores, setStores] = useState([]);
    // Product Unit Configurations Data
    const [productUnits, setProductUnits] = useState([]); // Existing configs for this product
    const [newUnitConfig, setNewUnitConfig] = useState(initialNewUnitConfigData); // State for the "Add Config" form
    // Component/Loading State
    const [loadingProduct, setLoadingProduct] = useState(false);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [error, setError] = useState(null); // General form error
    const [unitConfigError, setUnitConfigError] = useState(null); // Error specific to unit config actions
    const [unitConfigFeedback, setUnitConfigFeedback] = useState(''); // Feedback for unit config actions

    // --- Data Fetching ---

    // Fetch Dropdown Data with improved error handling
    const fetchDropdownData = useCallback(async () => {
        setLoadingDropdowns(true);
        setError(null);
        console.log("Fetching dropdown data...");
        const endpoints = {
            categories: '/categories', subCategories: '/sub-categories', brands: '/brands',
            units: '/units', suppliers: '/suppliers', manufacturers: '/manufacturers',
            taxes: '/taxes', warranties: '/warranties', barcodeSymbologies: '/barcode-symbologies',
            specialCategories: '/special-categories', discountTypes: '/discount-types', stores: '/stores',
        };
        const promises = Object.entries(endpoints).map(async ([key, endpoint]) => {
            try {
                const response = await axios.get(`${API_BASE_URL}${endpoint}`);
                const data = Array.isArray(response.data) ? response.data : [];
                return { key, data, error: false };
            } catch (err) {
                console.warn(`Could not fetch ${key}:`, err.response?.data?.message || err.message);
                return { key, data: [], error: true };
            }
        });
        try {
            const results = await Promise.all(promises);
            let essentialDataMissing = false;
            results.forEach(({ key, data, error }) => {
                if (key === 'categories') { console.log("Fetched Categories Raw:", data); setCategories(data); if(error) essentialDataMissing = true; }
                else if (key === 'subCategories') { setSubCategories(data); }
                else if (key === 'brands') { console.log("Fetched Brands Raw:", data); setBrands(data); if(error) essentialDataMissing = true; }
                else if (key === 'units') { console.log("Fetched Units Raw:", data); setUnits(data); if(error) essentialDataMissing = true; }
                else if (key === 'suppliers') { setSuppliers(data); }
                else if (key === 'manufacturers') { setManufacturers(data); }
                else if (key === 'taxes') { setTaxes(data); }
                else if (key === 'warranties') { setWarranties(data); }
                else if (key === 'barcodeSymbologies') { setBarcodeSymbologies(data); }
                else if (key === 'specialCategories') { setSpecialCategories(data); }
                else if (key === 'discountTypes') { setDiscountTypes(data); }
                else if (key === 'stores') { setStores(data); }
            });
            if (essentialDataMissing) { setError('Failed to load essential form options (Categories, Brands, or Units).'); }
        } catch (overallError) { console.error("Overall error processing dropdown data:", overallError); setError('An unexpected error occurred loading form options.'); }
        finally { console.log("Finished fetching dropdown data."); setLoadingDropdowns(false); }
    }, []);

    // Fetch Product Data when Editing
    const fetchProductData = useCallback(async () => {
        if (!isEditing || !productId) return; setLoadingProduct(true); setError(null); setUnitConfigError(null); setUnitConfigFeedback(''); console.log(`Fetching product data for ID: ${productId}`);
        try {
            const response = await axios.get(`${API_BASE_URL}/products/${productId}`); const productData = response.data; console.log("Fetched Product Data:", productData); const fetchedUnits = productData.product_units || []; delete productData.product_units;
            const preparedFormData = { ...initialProductFormData };
            for (const key in productData) { if (Object.prototype.hasOwnProperty.call(initialProductFormData, key)) { const value = productData[key]; if (key.endsWith('_id') && value !== null && value !== undefined) { preparedFormData[key] = value.toString(); } else { preparedFormData[key] = value === null ? '' : value; } } }
            preparedFormData.has_expiry = Boolean(productData.has_expiry); preparedFormData.is_serialized = Boolean(productData.is_serialized);
            console.log("Prepared formData for editing:", preparedFormData); setFormData(preparedFormData); setProductUnits(fetchedUnits);
        } catch (err) { console.error("Error fetching product details:", err); setError(err.response?.data?.message || 'Failed to load product data.'); setProductUnits([]); }
        finally { console.log("Finished fetching product data."); setLoadingProduct(false); }
    }, [productId, isEditing]);

    // Initial data loading effects
    useEffect(() => { fetchDropdownData(); }, [fetchDropdownData]);
    useEffect(() => { if (isEditing) { fetchProductData(); } else { setFormData(initialProductFormData); setProductUnits([]); } }, [isEditing, fetchProductData, productId]);


    // --- Handlers ---
    const handleProductChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        console.log(`--- handleProductChange --- Field: ${name}, Value: "${newValue}" (Type: ${typeof newValue})`);
        setFormData(prevData => ({ ...prevData, [name]: newValue }));
     };
    const handleNewUnitConfigChange = (e) => { const { name, value, type, checked } = e.target; const newValue = type === 'checkbox' ? checked : value; console.log(`--- handleNewUnitConfigChange --- Field: ${name}, Value: ${newValue}`); setNewUnitConfig(prevData => ({ ...prevData, [name]: newValue })); };
    const handleProductSubmit = async (e) => {
        e.preventDefault(); setError(null);
        const costPrice = parseFloat(formData.cost_price); const retailPrice = parseFloat(formData.retail_price); const wholesalePrice = parseFloat(formData.wholesale_price);
        if (isNaN(costPrice) || costPrice < 0) { setError('Cost Price must be valid & non-negative.'); return; } if (isNaN(retailPrice) || retailPrice < 0) { setError('Retail Price must be valid & non-negative.'); return; } if (retailPrice < costPrice) { setError('Retail Price cannot be less than Cost Price.'); return; } if (formData.wholesale_price.trim() !== '') { if (isNaN(wholesalePrice) || wholesalePrice < 0) { setError('Wholesale Price must be valid & non-negative if entered.'); return; } if (wholesalePrice < costPrice) { setError('Wholesale Price cannot be less than Cost Price.'); return; } }
        if (!formData.base_unit_id) { setError("A Base Unit must be selected."); return; } if (!formData.category_id) { setError("A Category must be selected."); return; }
        setLoadingProduct(true); const dataToSend = { ...formData }; const optionalFKs = ['sub_category_id', 'special_category_id', 'brand_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id', 'manufacturer_id', 'supplier_id', 'warranty_id', 'store_id']; const numericFields = ['cost_price', 'retail_price', 'wholesale_price', 'discount_value', 'weight']; const integerFields = ['expiry_notification_days', 'max_sales_qty_per_person']; const textFieldsToNullify = ['slug', 'sku', 'item_barcode', 'measurement_type', 'measurement_value', 'description'];
        Object.keys(dataToSend).forEach(key => { if ((optionalFKs.includes(key) || textFieldsToNullify.includes(key)) && dataToSend[key] === '') { dataToSend[key] = null; } if (numericFields.includes(key)) { const parsed = parseFloat(dataToSend[key]); dataToSend[key] = (dataToSend[key] === null || dataToSend[key] === '' || isNaN(parsed)) ? null : parsed; } if (integerFields.includes(key)) { const parsed = parseInt(dataToSend[key], 10); dataToSend[key] = (dataToSend[key] === null || dataToSend[key] === '' || isNaN(parsed)) ? null : parsed; } if (['has_expiry', 'is_serialized'].includes(key)) { dataToSend[key] = Boolean(dataToSend[key]); } if (['base_unit_id', 'category_id'].includes(key)) { dataToSend[key] = parseInt(dataToSend[key], 10); } if (optionalFKs.includes(key) && dataToSend[key] !== null) { dataToSend[key] = parseInt(dataToSend[key], 10); if (isNaN(dataToSend[key])) dataToSend[key] = null; } });
        console.log("Data being sent to backend:", dataToSend); let isSuccess = false; let newProdId = null;
        try { if (isEditing) { await axios.put(`${API_BASE_URL}/products/${productId}`, dataToSend); isSuccess = true; } else { const response = await axios.post(`${API_BASE_URL}/products`, dataToSend); newProdId = response.data?.id; if(newProdId) isSuccess = true; else setError("Created product but failed to get ID."); } }
        catch (err) { console.error("Error saving product:", err); setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} product.`); isSuccess = false; } finally { setLoadingProduct(false); if (isSuccess) { if (isEditing) navigate('/products'); else if (newProdId) navigate(`/products/edit/${newProdId}`); } }
     };
    const handleAddUnitConfig = async (e) => {
        e.preventDefault(); setLoadingProduct(true); setUnitConfigError(null); setUnitConfigFeedback(''); const factor = parseFloat(newUnitConfig.conversion_factor);
        if (!newUnitConfig.unit_id) { setUnitConfigError('Please select a unit.'); setLoadingProduct(false); return; } if (isNaN(factor) || factor <= 0) { setUnitConfigError('Conversion factor must be a positive number.'); setLoadingProduct(false); return; } if (parseInt(newUnitConfig.unit_id) === parseInt(formData.base_unit_id) && factor !== 1) { setUnitConfigError('Conversion factor must be 1 when adding the product\'s base unit.'); setLoadingProduct(false); return; } if (productUnits.some(pu => pu.unit_id === parseInt(newUnitConfig.unit_id))) { setUnitConfigError('This unit configuration already exists for this product.'); setLoadingProduct(false); return; }
        const configData = { product_id: parseInt(productId), unit_id: parseInt(newUnitConfig.unit_id), conversion_factor: factor, is_purchase_unit: newUnitConfig.is_purchase_unit, is_sales_unit: newUnitConfig.is_sales_unit };
        try { console.log("[handleAddUnitConfig] Sending data:", configData); const response = await axios.post(`${API_BASE_URL}/product-units`, configData); const newConfigFromServer = response.data; console.log("[handleAddUnitConfig] Received new config from server:", newConfigFromServer); const unitOption = units.find(u => u.id.toString() === newConfigFromServer.unit_id.toString()); const baseUnitOption = units.find(u => u.id.toString() === newConfigFromServer.base_unit_id?.toString()); const newConfigForState = { ...newConfigFromServer, unit_name: unitOption?.name || 'Unknown', base_unit_name: baseUnitOption ? baseUnitOption.name : 'Unknown' }; console.log("[handleAddUnitConfig] Prepared new config object for state:", newConfigForState); setProductUnits(prevUnits => { const updatedUnits = [...prevUnits, newConfigForState]; console.log("[handleAddUnitConfig] Previous productUnits state:", prevUnits); console.log("[handleAddUnitConfig] New productUnits state:", updatedUnits); return updatedUnits; }); setNewUnitConfig(initialNewUnitConfigData); setUnitConfigFeedback('Unit configuration added successfully.'); }
        catch (err) { console.error("[handleAddUnitConfig] Error adding unit config:", err); setUnitConfigError(err.response?.data?.message || 'Failed to add unit configuration.'); } finally { setLoadingProduct(false); setTimeout(() => setUnitConfigFeedback(''), 5000); }
     };
    const handleDeleteUnitConfig = async (configIdToDelete, unitName) => {
        console.log(`[handleDeleteUnitConfig] Attempting to delete config ID: ${configIdToDelete}, Unit Name: ${unitName}`); if (!window.confirm(`Are you sure you want to delete the unit configuration for "${unitName}"?`)) { console.log("[handleDeleteUnitConfig] Deletion cancelled by user."); return; } setLoadingProduct(true); setUnitConfigError(null); setUnitConfigFeedback('');
        try { console.log(`[handleDeleteUnitConfig] Sending DELETE request to: ${API_BASE_URL}/product-units/${configIdToDelete}`); await axios.delete(`${API_BASE_URL}/product-units/${configIdToDelete}`); console.log("[handleDeleteUnitConfig] DELETE request successful."); setProductUnits(prevUnits => { console.log("[handleDeleteUnitConfig] Previous productUnits state:", prevUnits); const updatedUnits = prevUnits.filter(pu => pu.id !== configIdToDelete); console.log("[handleDeleteUnitConfig] New productUnits state after filter:", updatedUnits); return updatedUnits; }); setUnitConfigFeedback('Unit configuration deleted successfully.'); }
        catch (err) { console.error("[handleDeleteUnitConfig] Error deleting unit config:", err); if (err.response) { console.error("[handleDeleteUnitConfig] Error response data:", err.response.data); console.error("[handleDeleteUnitConfig] Error response status:", err.response.status); } const errorMsg = err.response?.data?.message || 'Failed to delete unit configuration.'; setUnitConfigError(errorMsg); setUnitConfigFeedback(''); } finally { setLoadingProduct(false); setTimeout(() => setUnitConfigFeedback(''), 5000); }
    };

    // --- Render Logic ---
    const isLoading = loadingProduct || loadingDropdowns;
    const currentCategoryId = parseInt(formData.category_id);
    const filteredSubCategories = subCategories.filter(sc => sc.category_id === currentCategoryId);

    console.log(`Rendering ProductForm. formData.product_name = "${formData.product_name}"`);

    return (
        // Use the simpler container style from other forms
        <div style={styles.container}>
            <h2>{isEditing ? `Edit Product (ID: ${productId})` : 'Add New Product'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            {isLoading && <p>Loading...</p>}

            {/* --- Main Product Form --- */}
            {/* **** ENSURE THIS FORM IS NOT CONDITIONALLY RENDERED OUT **** */}
            {!isLoading && (
                <form onSubmit={handleProductSubmit} style={styles.form}>
                    {/* **** RESTORED FULL JSX STRUCTURE **** */}
                    <fieldset style={styles.fieldset}>
                        <legend style={styles.legend}>Product Information</legend>
                         <div style={styles.formGroup}> <label htmlFor="store_id" style={styles.label}>Store:</label> <select id="store_id" name="store_id" value={formData.store_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- All Stores --</option>{stores.map(o => <option key={o.id} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                         <div style={styles.formGroup}> <label htmlFor="product_name" style={styles.label}>Product Name: *</label> <input id="product_name" type="text" name="product_name" value={formData.product_name || ''} onChange={handleProductChange} required style={styles.input} disabled={isLoading} /> </div>
                         <div style={styles.formGroup}> <label htmlFor="slug" style={styles.label}>Slug:</label> <input id="slug" type="text" name="slug" value={formData.slug || ''} onChange={handleProductChange} style={styles.input} disabled={isLoading}/> </div>
                         <div style={styles.formGroup}> <label htmlFor="sku" style={styles.label}>SKU:</label> <input id="sku" type="text" name="sku" value={formData.sku || ''} onChange={handleProductChange} style={styles.input} disabled={isLoading}/> </div>
                         <div style={styles.formGroup}> <label htmlFor="selling_type" style={styles.label}>Selling Type:</label> <select id="selling_type" name="selling_type" value={formData.selling_type} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="Wholesale">Wholesale</option><option value="Retail">Retail</option><option value="Both">Both</option></select> </div>
                         <div style={styles.formGroup}> <label htmlFor="category_id" style={styles.label}>Category: *</label> <select id="category_id" name="category_id" value={formData.category_id} onChange={handleProductChange} required style={styles.input} disabled={isLoading}> <option value="">-- Select --</option> {categories.map(o => <option key={`cat-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                         <div style={styles.formGroup}> <label htmlFor="sub_category_id" style={styles.label}>Sub Category:</label> <select id="sub_category_id" name="sub_category_id" value={formData.sub_category_id} onChange={handleProductChange} style={styles.input} disabled={isLoading || !formData.category_id}> <option value="">-- Select --</option> {filteredSubCategories.map(o => <option key={`subcat-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                         <div style={styles.formGroup}> <label htmlFor="special_category_id" style={styles.label}>Special Category:</label> <select id="special_category_id" name="special_category_id" value={formData.special_category_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option>{specialCategories.map(o => <option key={`spcat-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                         <div style={styles.formGroup}> <label htmlFor="inventory_type" style={styles.label}>Inventory / Service:</label> <select id="inventory_type" name="inventory_type" value={formData.inventory_type} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="Inventory">Inventory</option><option value="Service">Service</option></select> </div>
                         <div style={styles.formGroup}> <label htmlFor="brand_id" style={styles.label}>Brand:</label> <select id="brand_id" name="brand_id" value={formData.brand_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}> <option value="">-- Select --</option> {brands.map(o => <option key={`brand-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                         <div style={styles.formGroup}> <label htmlFor="base_unit_id" style={styles.label}>Base Unit: *</label> <select id="base_unit_id" name="base_unit_id" value={formData.base_unit_id} onChange={handleProductChange} required style={styles.input} disabled={isLoading}> <option value="">-- Select Base Unit --</option> {units.map(o => <option key={`baseunit-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                         <div style={styles.formGroup}> <label htmlFor="item_barcode" style={styles.label}>Item Barcode:</label> <input id="item_barcode" type="text" name="item_barcode" value={formData.item_barcode} onChange={handleProductChange} style={styles.input} disabled={isLoading} /> </div>
                         <div style={styles.formGroup}> <label htmlFor="barcode_symbology_id" style={styles.label}>Barcode Symbology:</label> <select id="barcode_symbology_id" name="barcode_symbology_id" value={formData.barcode_symbology_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option>{barcodeSymbologies.map(o => <option key={`symb-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                         <div style={styles.formGroup}> <label htmlFor="description" style={styles.label}>Description:</label> <textarea id="description" name="description" value={formData.description} onChange={handleProductChange} rows="3" style={styles.textarea} disabled={isLoading}></textarea> </div>
                    </fieldset>

                    <fieldset style={styles.fieldset}>
                        <legend style={styles.legend}>Pricing & Details</legend>
                         <div style={styles.formGroup}> <label style={styles.label}>Product Type:</label> <div style={styles.radioCheckboxGroup}> <label style={styles.inlineLabel}><input type="radio" name="product_type" value="Standard" checked={formData.product_type === 'Standard'} onChange={handleProductChange} disabled={isLoading}/> Standard</label> <label style={styles.inlineLabel}><input type="radio" name="product_type" value="Variable" checked={formData.product_type === 'Variable'} onChange={handleProductChange} disabled={isLoading}/> Variable</label> </div> </div>
                         <div style={styles.formGroup}> <label htmlFor="cost_price" style={styles.label}>Cost Price: *</label> <input id="cost_price" type="number" step="any" name="cost_price" value={formData.cost_price} onChange={handleProductChange} required style={styles.input} disabled={isLoading} min="0"/> </div>
                         <div style={styles.formGroup}> <label htmlFor="retail_price" style={styles.label}>Retail Price: *</label> <input id="retail_price" type="number" step="any" name="retail_price" value={formData.retail_price} onChange={handleProductChange} required style={styles.input} disabled={isLoading} min="0"/> </div>
                         <div style={styles.formGroup}> <label htmlFor="wholesale_price" style={styles.label}>Wholesale Price:</label> <input id="wholesale_price" type="number" step="any" name="wholesale_price" value={formData.wholesale_price} onChange={handleProductChange} style={styles.input} disabled={isLoading} min="0"/> </div>
                         <div style={styles.formGroup}> <label htmlFor="tax_id" style={styles.label}>Tax:</label> <select id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select Tax --</option>{taxes.map(o => <option key={`tax-${o.id}`} value={o.id.toString()}>{`${o.name} (${o.rate}%)`}</option>)}</select> </div>
                         <div style={styles.formGroup}> <label htmlFor="discount_type_id" style={styles.label}>Discount Type:</label> <select id="discount_type_id" name="discount_type_id" value={formData.discount_type_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option>{discountTypes.map(o => <option key={`dtype-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                         <div style={styles.formGroup}> <label htmlFor="discount_value" style={styles.label}>Discount Value:</label> <input id="discount_value" type="number" step="any" name="discount_value" value={formData.discount_value} onChange={handleProductChange} style={styles.input} disabled={isLoading} min="0"/> </div>
                         <div style={styles.formGroup}> <label htmlFor="max_sales_qty_per_person" style={styles.label}>Max Sales Qty / Person:</label> <input id="max_sales_qty_per_person" type="number" name="max_sales_qty_per_person" value={formData.max_sales_qty_per_person} onChange={handleProductChange} style={styles.input} disabled={isLoading} min="0" step="1"/> </div>
                         <div style={styles.formGroup}> <label htmlFor="measurement_type" style={styles.label}>Measurement Type:</label> <select id="measurement_type" name="measurement_type" value={formData.measurement_type} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option><option value="Weight">Weight</option><option value="Volume">Volume</option><option value="Length">Length</option><option value="Area">Area</option><option value="Other">Other</option></select> </div>
                         <div style={styles.formGroup}> <label htmlFor="measurement_value" style={styles.label}>Measurement Value:</label> <input id="measurement_value" type="text" name="measurement_value" value={formData.measurement_value} onChange={handleProductChange} style={styles.input} disabled={isLoading} placeholder="e.g., 10 Kg, 500ml"/> </div>
                         <div style={styles.formGroup}> <label htmlFor="weight" style={styles.label}>Weight (e.g., in Kg):</label> <input id="weight" type="number" step="any" name="weight" value={formData.weight} onChange={handleProductChange} style={styles.input} disabled={isLoading} min="0"/> </div>
                         <div style={styles.formGroup}> <label htmlFor="manufacturer_id" style={styles.label}>Manufacturer:</label> <select id="manufacturer_id" name="manufacturer_id" value={formData.manufacturer_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option>{manufacturers.map(o => <option key={`manu-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                         <div style={styles.formGroup}> <label htmlFor="supplier_id" style={styles.label}>Supplier:</label> <select id="supplier_id" name="supplier_id" value={formData.supplier_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option>{suppliers.map(o => <option key={`supp-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                         <div style={styles.formGroup}> <label htmlFor="warranty_id" style={styles.label}>Warranty:</label> <select id="warranty_id" name="warranty_id" value={formData.warranty_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- No Warranty --</option>{warranties.map(o => <option key={`warr-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                         <div style={styles.formGroup}> <label htmlFor="expiry_notification_days" style={styles.label}>Expiry Notification (Days Before):</label> <input id="expiry_notification_days" type="number" name="expiry_notification_days" value={formData.expiry_notification_days} onChange={handleProductChange} style={styles.input} disabled={isLoading} min="0" step="1"/> </div>
                         <div style={styles.formGroup}> <label style={styles.label}>Flags:</label> <div style={styles.radioCheckboxGroup}> <label style={styles.inlineLabel}><input type="checkbox" name="has_expiry" checked={formData.has_expiry} onChange={handleProductChange} disabled={isLoading}/> Has Expiry?</label> <label style={styles.inlineLabel}><input type="checkbox" name="is_serialized" checked={formData.is_serialized} onChange={handleProductChange} disabled={isLoading}/> Is Serialized?</label> </div> </div>
                    </fieldset>

                    {/* --- Submit Button for Main Product Form --- */}
                    <div style={styles.buttonGroup}>
                         <button type="submit" disabled={isLoading} style={styles.buttonPrimary}> {isLoading ? 'Saving...' : (isEditing ? 'Update Product Details' : 'Create Product')} </button>
                         <button type="button" onClick={() => navigate('/products')} style={styles.buttonSecondary} disabled={isLoading}> {isEditing ? 'Back to List' : 'Cancel'} </button>
                    </div>
                </form>
             )}


            {/* --- Product Unit Configuration Section --- */}
            {/* **** RESTORED THIS SECTION **** */}
            {isEditing && !loadingProduct && (
                 <div style={{ marginTop: '30px' }}>
                    <h3>Unit Configurations for this Product</h3>
                    <p>Define how this product can be bought or sold.</p>
                    {unitConfigError && <p style={{...styles.errorBox, marginBottom:'10px'}}>Unit Config Error: {unitConfigError}</p>}
                    {unitConfigFeedback && <p style={{...styles.feedbackBox, ...styles.feedbackSuccess, marginBottom:'10px'}}>{unitConfigFeedback}</p>}
                    {productUnits.length > 0 ? ( <table style={{...styles.table, marginBottom:'20px'}}>
                        <thead style={styles.tableHeader}><tr><th style={styles.tableCell}>Unit</th><th style={styles.tableCell}>Factor (vs Base)</th><th style={styles.tableCell}>Purchase?</th><th style={styles.tableCell}>Sales?</th><th style={styles.tableCell}>Actions</th></tr></thead>
                        <tbody>{productUnits.map((pu, index) => (<tr key={`pu-${pu.id}`} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}><td style={styles.tableCell}>{pu.unit_name} (ID: {pu.unit_id})</td><td style={styles.tableCell}>{pu.conversion_factor}</td><td style={styles.tableCell}>{pu.is_purchase_unit ? 'Yes' : 'No'}</td><td style={styles.tableCell}>{pu.is_sales_unit ? 'Yes' : 'No'}</td><td style={styles.tableCell}><button onClick={() => handleDeleteUnitConfig(pu.id, pu.unit_name)} style={{...styles.button, ...styles.buttonDelete}} disabled={isLoading} title="Delete Config">Delete</button></td></tr>))}</tbody>
                    </table> ) : ( <p>No specific unit configurations added yet for this product.</p> )}
                    {/* Form to Add New */}
                    <form onSubmit={handleAddUnitConfig} style={{ padding: '15px', border: '1px solid #dee2e6', borderRadius: '5px', backgroundColor:'#f8f9fa' }}>
                         <h4>Add New Unit Configuration</h4>
                         <div style={styles.formGroup}><label style={styles.label} htmlFor="new_unit_id">Unit: *</label><select id="new_unit_id" name="unit_id" value={newUnitConfig.unit_id} onChange={handleNewUnitConfigChange} required style={styles.input} disabled={isLoading || units.length === 0}><option value="">-- Select Unit --</option>{units.map(u => (<option key={`unitopt-${u.id}`} value={u.id.toString()}>{u.name}</option>))}</select></div>
                         <div style={styles.formGroup}><label style={styles.label} htmlFor="new_conversion_factor">Conversion Factor: *</label><input id="new_conversion_factor" type="number" name="conversion_factor" value={newUnitConfig.conversion_factor} onChange={handleNewUnitConfigChange} required min="0.0001" step="any" style={styles.input} disabled={isLoading} placeholder={`How many '${units.find(u => u.id.toString() === formData.base_unit_id)?.name || 'Base Units'}' are in one selected Unit?`}/></div>
                         <div style={styles.formGroup}><label style={{...styles.label, marginRight:'15px'}}>Use For:</label><div style={styles.radioCheckboxGroup}><label style={styles.checkboxLabel}><input type="checkbox" name="is_purchase_unit" checked={newUnitConfig.is_purchase_unit} onChange={handleNewUnitConfigChange} disabled={isLoading} /> Purchase</label><label style={styles.checkboxLabel}><input type="checkbox" name="is_sales_unit" checked={newUnitConfig.is_sales_unit} onChange={handleNewUnitConfigChange} disabled={isLoading} /> Sales</label></div></div>
                         <button type="submit" disabled={isLoading} style={{...styles.buttonPrimary, marginTop:'10px'}}>{isLoading ? 'Adding...' : 'Add Unit Configuration'}</button>
                    </form>
                </div>
            )}


             {/* --- Styles --- */}
             {/* Using simpler CSS similar to other forms */}
             <style>{`
                    .form-group { margin-bottom: 15px; }
                    .form-group label { display: block; margin-bottom: 6px; font-weight: bold; color: #555; font-size: 0.9em; }
                    .form-group input[type=text],
                    .form-group input[type=number],
                    .form-group input[type=email],
                    .form-group input[type=tel],
                    .form-group input[type=date],
                    .form-group select,
                    .form-group textarea {
                        width: 100%;
                        padding: 9px 10px;
                        border: 1px solid #ccc;
                        border-radius: 4px;
                        box-sizing: border-box;
                        font-size: 1em;
                    }
                    .form-group textarea { min-height: 70px; }
                    .form-row { display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 0; }
                    .form-row .form-group { flex: 1; min-width: 250px; margin-bottom: 15px; }
                    .form-group.full-width { flex-basis: 100%; min-width: 100%; }
                    fieldset { border: 1px solid #ddd; padding: 15px 20px; border-radius: 5px; margin-bottom: 25px;}
                    legend { font-weight: bold; padding: 0 10px; margin-left: 10px; color: #333; font-size: 1.1em; }
                    small { width: 100%; font-size: 0.85em; color: #666; display: block; margin-top: 5px; }
                    .radio-checkbox-group { display: flex; align-items: center; padding-top: 9px; flex-wrap: wrap; gap: 0 15px; }
                    .inline-label { display: inline-flex; align-items: center; margin-right: 15px; font-weight: normal; }
                    .inline-label input { margin-right: 5px; }
                    .checkbox-group label { margin-bottom: 0; font-weight: normal; display: flex; align-items: center; margin-right: 15px; }
                    .checkbox-group input { margin-right: 5px; width: auto; flex: initial; }

                `}</style>
        </div>
    );
}

// --- Basic Inline Styles ---
const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
    form: { display: 'flex', flexDirection: 'column', gap: '0px'},
    fieldset: { border: '1px solid #ddd', padding: '15px 20px', borderRadius: '5px', marginBottom: '25px'},
    legend: { fontWeight: 'bold', padding: '0 10px', margin: '0 0 10px 10px', color: '#333', fontSize: '1.1em' },
    errorBox: { color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px', borderRadius: '4px', backgroundColor: '#ffe6e6' },
    feedbackBox: { padding: '10px 15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#555', fontSize: '0.9em' },
    input: { width: '100%', padding: '9px 10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1em' },
    textarea: { width: '100%', padding: '9px 10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1em', minHeight: '70px' },
    helpText: { fontSize: '0.85em', color: '#666', display: 'block', margin: '5px 0 0 0' },
    checkboxLabel: { marginRight: '20px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontWeight:'normal' },
    radioCheckboxGroup: { display: 'flex', alignItems: 'center', paddingTop: '9px', flexWrap: 'wrap', gap: '0 15px'},
    inlineLabel: { marginRight: '15px', fontWeight: 'normal', display: 'inline-flex', alignItems: 'center' },
    buttonGroup: { marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '20px', textAlign:'center' },
    button: { padding: '8px 12px', margin: '0 5px 5px 0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px', opacity: 1 },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '10px 8px', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

export default ProductForm;