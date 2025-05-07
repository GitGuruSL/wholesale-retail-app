import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// import apiInstance from '../services/api'; // REMOVE THIS LINE
import { useAuth } from '../context/AuthContext'; // Ensure this is correctly pathed

// ... (initialProductFormData, initialNewUnitConfigData, styles remain the same) ...
// --- Styles (can be kept as is or refactored) ---
const styles = {
    container: { padding: '20px', maxWidth: '900px', margin: '20px auto', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { marginBottom: '25px', color: '#333', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    fieldset: { border: '1px solid #ddd', padding: '15px 20px 20px 20px', borderRadius: '5px', marginBottom: '10px' },
    legend: { fontWeight: 'bold', padding: '0 10px', marginLeft: '5px', color: '#333', fontSize: '1.1em' },
    formRow: { display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '0px' }, // Reduced bottom margin
    formGroup: { display: 'flex', flexDirection: 'column', flex: '1 1 calc(33.333% - 14px)', minWidth: '200px', marginBottom: '15px' }, // Adjusted for 3 columns
    formGroupFull: { flex: '1 1 100%', marginBottom: '15px' },
    label: { marginBottom: '6px', fontWeight: 'bold', color: '#555', fontSize: '0.9em' },
    input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '0.95em' },
    textarea: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '70px', fontSize: '0.95em' },
    radioCheckboxGroup: { display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' },
    checkboxLabel: { fontWeight: 'normal', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px' },
    inlineLabel: { fontWeight: 'normal', fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '5px', marginRight: '15px' },
    buttonGroup: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white', padding: '6px 10px', fontSize: '0.85em' },
    button: { padding: '6px 10px', margin: '0 5px 0 0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85em' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2', textAlign: 'center' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '0.9em' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '8px', textAlign: 'left', verticalAlign: 'middle', border: '1px solid #dee2e6' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' }
};
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
    // Get apiInstance from useAuth
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

    const [formData, setFormData] = useState(initialProductFormData);
    // Dropdown options state
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
    // Product Unit Configurations Data
    const [productUnits, setProductUnits] = useState([]);
    const [newUnitConfig, setNewUnitConfig] = useState(initialNewUnitConfigData);
    // Component/Loading State
    const [loadingProduct, setLoadingProduct] = useState(false); // For saving/fetching main product
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [loadingUnitConfig, setLoadingUnitConfig] = useState(false); // For unit config actions
    const [error, setError] = useState(null);
    const [unitConfigError, setUnitConfigError] = useState(null);
    const [unitConfigFeedback, setUnitConfigFeedback] = useState('');

    // --- Data Fetching ---
    const fetchDropdownData = useCallback(async () => {
        // Ensure apiInstance is available
        if (!isAuthenticated || !apiInstance) return;
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
                const response = await apiInstance.get(endpoint); // Use apiInstance from useAuth
                const data = Array.isArray(response.data) ? response.data : (response.data?.data && Array.isArray(response.data.data) ? response.data.data : []);
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
                if (key === 'categories') { setCategories(data); if(error) essentialDataMissing = true; }
                else if (key === 'subCategories') { setSubCategories(data); }
                else if (key === 'brands') { setBrands(data); if(error) essentialDataMissing = true; }
                else if (key === 'units') { setUnits(data); if(error) essentialDataMissing = true; }
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
    }, [isAuthenticated, apiInstance]); // Add apiInstance to dependencies

    const fetchProductData = useCallback(async () => {
        // Ensure apiInstance is available
        if (!isEditing || !productId || !isAuthenticated || !apiInstance) return;
        setLoadingProduct(true); setError(null); setUnitConfigError(null); setUnitConfigFeedback('');
        console.log(`Fetching product data for ID: ${productId}`);
        try {
            const response = await apiInstance.get(`/products/${productId}`); // Use apiInstance from useAuth
            const productData = response.data;
            console.log("Fetched Product Data:", productData);
            const fetchedUnits = productData.product_units || [];
            delete productData.product_units;

            const preparedFormData = { ...initialProductFormData };
            for (const key in productData) {
                if (Object.prototype.hasOwnProperty.call(initialProductFormData, key)) {
                    const value = productData[key];
                    if (key.endsWith('_id') && value !== null && value !== undefined) {
                        preparedFormData[key] = value.toString();
                    } else {
                        preparedFormData[key] = value === null ? '' : value;
                    }
                }
            }
            preparedFormData.has_expiry = Boolean(productData.has_expiry);
            preparedFormData.is_serialized = Boolean(productData.is_serialized);

            console.log("Prepared formData for editing:", preparedFormData);
            setFormData(preparedFormData);
            setProductUnits(fetchedUnits);
        } catch (err) {
            console.error("Error fetching product details:", err);
            setError(err.response?.data?.message || 'Failed to load product data.');
            setProductUnits([]);
        } finally {
            console.log("Finished fetching product data.");
            setLoadingProduct(false);
        }
    }, [productId, isEditing, isAuthenticated, apiInstance]); // Add apiInstance to dependencies

    useEffect(() => {
        // Check for apiInstance along with isAuthenticated
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchDropdownData();
            if (isEditing) {
                fetchProductData();
            } else {
                setFormData(initialProductFormData);
                setProductUnits([]);
            }
        } else if (!authLoading && !isAuthenticated) {
            setError("User not authenticated. Please log in to manage products.");
        } else if (!authLoading && !apiInstance && isAuthenticated) {
            setError("API client not available. Please try again later.");
        }
    }, [isEditing, fetchProductData, fetchDropdownData, productId, authLoading, isAuthenticated, apiInstance]); // Add apiInstance


    // --- Handlers ---
    const handleProductChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        setFormData(prevData => ({ ...prevData, [name]: newValue }));
     };
    const handleNewUnitConfigChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        setNewUnitConfig(prevData => ({ ...prevData, [name]: newValue }));
    };

    const handleProductSubmit = async (e) => {
        e.preventDefault();
        if (!isAuthenticated || !apiInstance) { setError("Not authenticated or API client not available."); return; } // Check apiInstance
        setError(null);
        if (!formData.product_name.trim()) { setError("Product Name is required."); return; }
        if (!formData.base_unit_id) { setError("A Base Unit must be selected."); return; }
        if (!formData.category_id) { setError("A Category must be selected."); return; }
        if (!formData.cost_price || parseFloat(formData.cost_price) < 0) { setError("Cost Price is required and cannot be negative."); return; }
        if (!formData.retail_price || parseFloat(formData.retail_price) < 0) { setError("Retail Price is required and cannot be negative."); return; }


        setLoadingProduct(true);
        const dataToSend = { ...formData };
        const optionalFKs = ['sub_category_id', 'special_category_id', 'brand_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id', 'manufacturer_id', 'supplier_id', 'warranty_id', 'store_id'];
        const numericFields = ['cost_price', 'retail_price', 'wholesale_price', 'discount_value', 'weight'];
        const integerFields = ['expiry_notification_days', 'max_sales_qty_per_person'];
        const textFieldsToNullifyIfEmpty = ['slug', 'sku', 'item_barcode', 'measurement_type', 'measurement_value', 'description'];

        Object.keys(dataToSend).forEach(key => {
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

        console.log("Data being sent to backend:", dataToSend);
        let isSuccess = false;
        let newProdId = null;
        try {
            if (isEditing) {
                await apiInstance.put(`/products/${productId}`, dataToSend); // Use apiInstance from useAuth
                isSuccess = true;
            } else {
                const response = await apiInstance.post(`/products`, dataToSend); // Use apiInstance from useAuth
                newProdId = response.data?.id;
                if(newProdId) isSuccess = true; else setError("Created product but failed to get ID.");
            }
        } catch (err) {
            console.error("Error saving product:", err);
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} product.`);
            isSuccess = false;
        } finally {
            setLoadingProduct(false);
            if (isSuccess) {
                // Navigate to /dashboard/products or /dashboard/products/edit/:id
                if (isEditing) navigate('/dashboard/products', { state: { message: `Product "${dataToSend.product_name}" updated.`, type: 'success' } });
                else if (newProdId) navigate(`/dashboard/products/edit/${newProdId}`, { state: { message: `Product "${dataToSend.product_name}" created.`, type: 'success' } });
            }
        }
     };

    const handleAddUnitConfig = async (e) => {
        e.preventDefault();
        if (!isAuthenticated || !isEditing || !apiInstance) { setUnitConfigError("Not authenticated, not editing, or API client not available."); return; } // Check apiInstance
        setLoadingUnitConfig(true); setUnitConfigError(null); setUnitConfigFeedback('');
        const factor = parseFloat(newUnitConfig.conversion_factor);
        if (!newUnitConfig.unit_id) { setUnitConfigError('Please select a unit.'); setLoadingUnitConfig(false); return; }
        if (isNaN(factor) || factor <= 0) { setUnitConfigError('Conversion factor must be a positive number.'); setLoadingUnitConfig(false); return; }

        const configData = {
            product_id: parseInt(productId),
            unit_id: parseInt(newUnitConfig.unit_id),
            conversion_factor: factor,
            is_purchase_unit: newUnitConfig.is_purchase_unit,
            is_sales_unit: newUnitConfig.is_sales_unit
        };
        try {
            console.log("[handleAddUnitConfig] Sending data:", configData);
            const response = await apiInstance.post(`/product-units`, configData); // Use apiInstance from useAuth
            const newConfigFromServer = response.data;
            console.log("[handleAddUnitConfig] Received new config from server:", newConfigFromServer);

            const unitOption = units.find(u => u.id.toString() === newConfigFromServer.unit_id.toString());
            const newConfigForState = { ...newConfigFromServer, unit_name: unitOption?.name || 'Unknown Unit' };

            setProductUnits(prevUnits => [...prevUnits, newConfigForState]);
            setNewUnitConfig(initialNewUnitConfigData);
            setUnitConfigFeedback('Unit configuration added successfully.');
        } catch (err) {
            console.error("[handleAddUnitConfig] Error adding unit config:", err);
            setUnitConfigError(err.response?.data?.message || 'Failed to add unit configuration.');
        } finally {
            setLoadingUnitConfig(false);
            setTimeout(() => setUnitConfigFeedback(''), 5000);
        }
     };

    const handleDeleteUnitConfig = async (configIdToDelete, unitName) => {
        if (!isAuthenticated || !isEditing || !apiInstance) { setUnitConfigError("Not authenticated, not editing, or API client not available."); return; } // Check apiInstance
        console.log(`[handleDeleteUnitConfig] Attempting to delete config ID: ${configIdToDelete}, Unit Name: ${unitName}`);
        if (!window.confirm(`Are you sure you want to delete the unit configuration for "${unitName}"?`)) {
            console.log("[handleDeleteUnitConfig] Deletion cancelled by user."); return;
        }
        setLoadingUnitConfig(true); setUnitConfigError(null); setUnitConfigFeedback('');
        try {
            await apiInstance.delete(`/product-units/${configIdToDelete}`); // Use apiInstance from useAuth
            console.log("[handleDeleteUnitConfig] DELETE request successful.");
            setProductUnits(prevUnits => prevUnits.filter(pu => pu.id !== configIdToDelete));
            setUnitConfigFeedback('Unit configuration deleted successfully.');
        } catch (err) {
            console.error("[handleDeleteUnitConfig] Error deleting unit config:", err);
            const errorMsg = err.response?.data?.message || 'Failed to delete unit configuration.';
            setUnitConfigError(errorMsg);
        } finally {
            setLoadingUnitConfig(false);
            setTimeout(() => setUnitConfigFeedback(''), 5000);
        }
    };

    // --- Render Logic ---
    const overallLoadingState = loadingProduct || loadingDropdowns || authLoading; // Renamed for clarity
    const currentCategoryId = parseInt(formData.category_id);
    const filteredSubCategories = subCategories.filter(sc => sc.category_id === currentCategoryId);

    if (authLoading) return <div style={styles.container}><p style={styles.centeredMessage}>Authenticating...</p></div>;
    if (!isAuthenticated && !authLoading) return <div style={styles.container}><p style={styles.errorBox}>Error: You must be logged in to access this page.</p></div>;
    if (!apiInstance && !authLoading && isAuthenticated) return <div style={styles.container}><p style={styles.errorBox}>Error: API client is not available. Please try refreshing.</p></div>;


    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? `Edit Product (ID: ${productId})` : 'Add New Product'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            {overallLoadingState && !error && <p style={styles.centeredMessage}>Loading form data...</p>}

            {!overallLoadingState && (
                <form onSubmit={handleProductSubmit} style={styles.form}>
                    {/* Main Product Form Fields */}
                    <fieldset style={styles.fieldset}>
                        <legend style={styles.legend}>Product Information</legend>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="store_id" style={styles.label}>Store:</label> <select id="store_id" name="store_id" value={formData.store_id} onChange={handleProductChange} style={styles.input}><option value="">-- All Stores (if applicable) --</option>{stores.map(o => <option key={o.id} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                            <div style={styles.formGroup}> <label htmlFor="product_name" style={styles.label}>Product Name: *</label> <input id="product_name" type="text" name="product_name" value={formData.product_name || ''} onChange={handleProductChange} required style={styles.input} /> </div>
                            <div style={styles.formGroup}> <label htmlFor="slug" style={styles.label}>Slug:</label> <input id="slug" type="text" name="slug" value={formData.slug || ''} onChange={handleProductChange} style={styles.input} /> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="sku" style={styles.label}>SKU:</label> <input id="sku" type="text" name="sku" value={formData.sku || ''} onChange={handleProductChange} style={styles.input} /> </div>
                            <div style={styles.formGroup}> <label htmlFor="selling_type" style={styles.label}>Selling Type:</label> <select id="selling_type" name="selling_type" value={formData.selling_type} onChange={handleProductChange} style={styles.input}><option value="Wholesale">Wholesale</option><option value="Retail">Retail</option><option value="Both">Both</option></select> </div>
                            <div style={styles.formGroup}> <label htmlFor="category_id" style={styles.label}>Category: *</label> <select id="category_id" name="category_id" value={formData.category_id} onChange={handleProductChange} required style={styles.input}> <option value="">-- Select --</option> {categories.map(o => <option key={`cat-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="sub_category_id" style={styles.label}>Sub Category:</label> <select id="sub_category_id" name="sub_category_id" value={formData.sub_category_id} onChange={handleProductChange} style={styles.input} disabled={!formData.category_id || filteredSubCategories.length === 0}> <option value="">-- Select --</option> {filteredSubCategories.map(o => <option key={`subcat-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                            <div style={styles.formGroup}> <label htmlFor="special_category_id" style={styles.label}>Special Category:</label> <select id="special_category_id" name="special_category_id" value={formData.special_category_id} onChange={handleProductChange} style={styles.input}><option value="">-- Select --</option>{specialCategories.map(o => <option key={`spcat-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                            <div style={styles.formGroup}> <label htmlFor="inventory_type" style={styles.label}>Inventory / Service:</label> <select id="inventory_type" name="inventory_type" value={formData.inventory_type} onChange={handleProductChange} style={styles.input}><option value="Inventory">Inventory</option><option value="Service">Service</option></select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="brand_id" style={styles.label}>Brand:</label> <select id="brand_id" name="brand_id" value={formData.brand_id} onChange={handleProductChange} style={styles.input}> <option value="">-- Select --</option> {brands.map(o => <option key={`brand-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                            <div style={styles.formGroup}> <label htmlFor="base_unit_id" style={styles.label}>Base Unit: *</label> <select id="base_unit_id" name="base_unit_id" value={formData.base_unit_id} onChange={handleProductChange} required style={styles.input}> <option value="">-- Select Base Unit --</option> {units.map(o => <option key={`baseunit-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                            <div style={styles.formGroup}> <label htmlFor="item_barcode" style={styles.label}>Item Barcode:</label> <input id="item_barcode" type="text" name="item_barcode" value={formData.item_barcode || ''} onChange={handleProductChange} style={styles.input} /> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="barcode_symbology_id" style={styles.label}>Barcode Symbology:</label> <select id="barcode_symbology_id" name="barcode_symbology_id" value={formData.barcode_symbology_id} onChange={handleProductChange} style={styles.input}><option value="">-- Select --</option>{barcodeSymbologies.map(o => <option key={`symb-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                            <div style={{...styles.formGroup, flex: '1 1 calc(66.666% - 14px)'}}> <label htmlFor="description" style={styles.label}>Description:</label> <textarea id="description" name="description" value={formData.description || ''} onChange={handleProductChange} rows="2" style={styles.textarea}></textarea> </div>
                        </div>
                    </fieldset>

                    <fieldset style={styles.fieldset}>
                        <legend style={styles.legend}>Pricing & Details</legend>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label style={styles.label}>Product Type:</label> <div style={styles.radioCheckboxGroup}> <label style={styles.inlineLabel}><input type="radio" name="product_type" value="Standard" checked={formData.product_type === 'Standard'} onChange={handleProductChange} /> Standard</label> <label style={styles.inlineLabel}><input type="radio" name="product_type" value="Variable" checked={formData.product_type === 'Variable'} onChange={handleProductChange} /> Variable</label> </div> </div>
                            <div style={styles.formGroup}> <label htmlFor="cost_price" style={styles.label}>Cost Price: *</label> <input id="cost_price" type="number" step="any" name="cost_price" value={formData.cost_price || ''} onChange={handleProductChange} required style={styles.input} min="0"/> </div>
                            <div style={styles.formGroup}> <label htmlFor="retail_price" style={styles.label}>Retail Price: *</label> <input id="retail_price" type="number" step="any" name="retail_price" value={formData.retail_price || ''} onChange={handleProductChange} required style={styles.input} min="0"/> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="wholesale_price" style={styles.label}>Wholesale Price:</label> <input id="wholesale_price" type="number" step="any" name="wholesale_price" value={formData.wholesale_price || ''} onChange={handleProductChange} style={styles.input} min="0"/> </div>
                            <div style={styles.formGroup}> <label htmlFor="tax_id" style={styles.label}>Tax:</label> <select id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleProductChange} style={styles.input}><option value="">-- Select Tax --</option>{taxes.map(o => <option key={`tax-${o.id}`} value={o.id.toString()}>{`${o.name} (${o.rate}%)`}</option>)}</select> </div>
                            <div style={styles.formGroup}> <label htmlFor="discount_type_id" style={styles.label}>Discount Type:</label> <select id="discount_type_id" name="discount_type_id" value={formData.discount_type_id} onChange={handleProductChange} style={styles.input}><option value="">-- Select --</option>{discountTypes.map(o => <option key={`dtype-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="discount_value" style={styles.label}>Discount Value:</label> <input id="discount_value" type="number" step="any" name="discount_value" value={formData.discount_value || ''} onChange={handleProductChange} style={styles.input} min="0"/> </div>
                            <div style={styles.formGroup}> <label htmlFor="max_sales_qty_per_person" style={styles.label}>Max Sales Qty / Person:</label> <input id="max_sales_qty_per_person" type="number" name="max_sales_qty_per_person" value={formData.max_sales_qty_per_person || ''} onChange={handleProductChange} style={styles.input} min="0" step="1"/> </div>
                            <div style={styles.formGroup}> <label htmlFor="measurement_type" style={styles.label}>Measurement Type:</label> <select id="measurement_type" name="measurement_type" value={formData.measurement_type} onChange={handleProductChange} style={styles.input}><option value="">-- Select --</option><option value="Weight">Weight</option><option value="Volume">Volume</option><option value="Length">Length</option><option value="Area">Area</option><option value="Other">Other</option></select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="measurement_value" style={styles.label}>Measurement Value:</label> <input id="measurement_value" type="text" name="measurement_value" value={formData.measurement_value || ''} onChange={handleProductChange} style={styles.input} placeholder="e.g., 10 Kg, 500ml"/> </div>
                            <div style={styles.formGroup}> <label htmlFor="weight" style={styles.label}>Weight (e.g., in Kg):</label> <input id="weight" type="number" step="any" name="weight" value={formData.weight || ''} onChange={handleProductChange} style={styles.input} min="0"/> </div>
                            <div style={styles.formGroup}> <label htmlFor="manufacturer_id" style={styles.label}>Manufacturer:</label> <select id="manufacturer_id" name="manufacturer_id" value={formData.manufacturer_id} onChange={handleProductChange} style={styles.input}><option value="">-- Select --</option>{manufacturers.map(o => <option key={`manu-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="supplier_id" style={styles.label}>Supplier:</label> <select id="supplier_id" name="supplier_id" value={formData.supplier_id} onChange={handleProductChange} style={styles.input}><option value="">-- Select --</option>{suppliers.map(o => <option key={`supp-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                            <div style={styles.formGroup}> <label htmlFor="warranty_id" style={styles.label}>Warranty:</label> <select id="warranty_id" name="warranty_id" value={formData.warranty_id} onChange={handleProductChange} style={styles.input}><option value="">-- No Warranty --</option>{warranties.map(o => <option key={`warr-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                            <div style={styles.formGroup}> <label htmlFor="expiry_notification_days" style={styles.label}>Expiry Notification (Days Before):</label> <input id="expiry_notification_days" type="number" name="expiry_notification_days" value={formData.expiry_notification_days || ''} onChange={handleProductChange} style={styles.input} min="0" step="1"/> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label style={styles.label}>Flags:</label> <div style={styles.radioCheckboxGroup}> <label style={styles.inlineLabel}><input type="checkbox" name="has_expiry" checked={formData.has_expiry} onChange={handleProductChange} /> Has Expiry?</label> <label style={styles.inlineLabel}><input type="checkbox" name="is_serialized" checked={formData.is_serialized} onChange={handleProductChange} /> Is Serialized?</label> </div> </div>
                        </div>
                    </fieldset>

                    <div style={styles.buttonGroup}>
                        <button type="submit" disabled={loadingProduct} style={styles.buttonPrimary}>
                            {loadingProduct ? 'Saving...' : (isEditing ? 'Update Product Details' : 'Create Product')}
                        </button>
                        {/* Ensure navigation path is correct, e.g., /dashboard/products */}
                        <button type="button" onClick={() => navigate('/dashboard/products')} style={styles.buttonSecondary} disabled={loadingProduct}>
                            {isEditing ? 'Back to List' : 'Cancel'}
                        </button>
                    </div>
                </form>
            )}

            {isEditing && !overallLoadingState && (
                <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <h3>Unit Configurations for this Product</h3>
                    {unitConfigError && <p style={{...styles.errorBox, marginBottom:'10px'}}>Unit Config Error: {unitConfigError}</p>}
                    {unitConfigFeedback && <p style={{...styles.feedbackBox, ...styles.feedbackSuccess, marginBottom:'10px'}}>{unitConfigFeedback}</p>}
                    {productUnits.length > 0 ? (
                        <table style={{...styles.table, marginBottom:'20px'}}>
                            <thead style={styles.tableHeader}><tr><th style={styles.tableCell}>Unit</th><th style={styles.tableCell}>Factor (vs Base)</th><th style={styles.tableCell}>Purchase?</th><th style={styles.tableCell}>Sales?</th><th style={styles.tableCell}>Actions</th></tr></thead>
                            <tbody>{productUnits.map((pu, index) => (
                                <tr key={`pu-${pu.id || index}`} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                    <td style={styles.tableCell}>{pu.unit_name || `Unit ID: ${pu.unit_id}`}</td>
                                    <td style={styles.tableCell}>{pu.conversion_factor}</td>
                                    <td style={styles.tableCell}>{pu.is_purchase_unit ? 'Yes' : 'No'}</td>
                                    <td style={styles.tableCell}>{pu.is_sales_unit ? 'Yes' : 'No'}</td>
                                    <td style={styles.tableCell}><button onClick={() => handleDeleteUnitConfig(pu.id, pu.unit_name || `Unit ID: ${pu.unit_id}`)} style={{...styles.button, ...styles.buttonDelete}} disabled={loadingUnitConfig}>Delete</button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    ) : ( <p>No specific unit configurations added yet for this product.</p> )}
                    
                    <form onSubmit={handleAddUnitConfig} style={{ padding: '15px', border: '1px solid #dee2e6', borderRadius: '5px', backgroundColor:'#f8f9fa' }}>
                        <h4>Add New Unit Configuration</h4>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}><label style={styles.label} htmlFor="new_unit_id">Unit: *</label><select id="new_unit_id" name="unit_id" value={newUnitConfig.unit_id} onChange={handleNewUnitConfigChange} required style={styles.input} disabled={units.length === 0}><option value="">-- Select Unit --</option>{units.map(u => (<option key={`unitopt-${u.id}`} value={u.id.toString()}>{u.name}</option>))}</select></div>
                            <div style={styles.formGroup}><label style={styles.label} htmlFor="new_conversion_factor">Conversion Factor: *</label><input id="new_conversion_factor" type="number" name="conversion_factor" value={newUnitConfig.conversion_factor} onChange={handleNewUnitConfigChange} required min="0.000001" step="any" style={styles.input} placeholder={`How many base units in one selected unit?`}/></div>
                            <div style={{...styles.formGroup, alignItems: 'flex-start'}}><label style={{...styles.label, marginRight:'15px', marginBottom: '8px'}}>Use For:</label><div style={styles.radioCheckboxGroup}><label style={styles.checkboxLabel}><input type="checkbox" name="is_purchase_unit" checked={newUnitConfig.is_purchase_unit} onChange={handleNewUnitConfigChange} /> Purchase</label><label style={styles.checkboxLabel}><input type="checkbox" name="is_sales_unit" checked={newUnitConfig.is_sales_unit} onChange={handleNewUnitConfigChange} /> Sales</label></div></div>
                        </div>
                        <button type="submit" disabled={loadingUnitConfig || !newUnitConfig.unit_id} style={{...styles.buttonPrimary, marginTop:'10px'}}>{loadingUnitConfig ? 'Adding...' : 'Add Unit Configuration'}</button>
                    </form>
                </div>
            )}
            {/* Embedded styles are generally not recommended for larger components. Consider moving to a CSS file or CSS-in-JS. */}
            {/* <style>{` ... `}</style> */}
        </div>
    );
}

export default ProductForm;