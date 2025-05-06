import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    const { api, user, ROLES } = useAuth();
    const isEditing = Boolean(productId);

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
    const [loadingProduct, setLoadingProduct] = useState(false);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [error, setError] = useState(null);
    const [unitConfigError, setUnitConfigError] = useState(null);
    const [unitConfigFeedback, setUnitConfigFeedback] = useState('');

    // --- Data Fetching ---
    const fetchDropdownData = useCallback(async () => {
        if (!api) return;
        setLoadingDropdowns(true);
        setError(null);
        const endpoints = {
            categories: '/categories', subCategories: '/sub-categories', brands: '/brands',
            units: '/units', suppliers: '/suppliers', manufacturers: '/manufacturers',
            taxes: '/taxes', warranties: '/warranties', barcodeSymbologies: '/barcode-symbologies',
            specialCategories: '/special-categories', discountTypes: '/discount-types', stores: '/stores',
        };
        const promises = Object.entries(endpoints).map(async ([key, endpoint]) => {
            try {
                const response = await api.get(endpoint);
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
            results.forEach(({ key, data, error: fetchError }) => {
                const setterMap = {
                    categories: setCategories, subCategories: setSubCategories, brands: setBrands,
                    units: setUnits, suppliers: setSuppliers, manufacturers: setManufacturers,
                    taxes: setTaxes, warranties: setWarranties, barcodeSymbologies: setBarcodeSymbologies,
                    specialCategories: setSpecialCategories, discountTypes: setDiscountTypes, stores: setStores,
                };
                if (setterMap[key]) {
                    setterMap[key](data);
                    if (fetchError && ['categories', 'brands', 'units'].includes(key)) {
                        essentialDataMissing = true;
                    }
                }
            });
            if (essentialDataMissing) { setError('Failed to load essential form options (Categories, Brands, or Units).'); }
        } catch (overallError) { console.error("Overall error processing dropdown data:", overallError); setError('An unexpected error occurred loading form options.'); }
        finally { setLoadingDropdowns(false); }
    }, [api]);

    const fetchProductData = useCallback(async () => {
        if (!isEditing || !productId || !api) return;
        setLoadingProduct(true); setError(null); setUnitConfigError(null); setUnitConfigFeedback('');
        try {
            const response = await api.get(`/products/${productId}`);
            const productData = response.data;
            const fetchedUnits = productData.product_units || [];
            delete productData.product_units;

            const preparedFormData = { ...initialProductFormData };
            for (const key in productData) {
                if (Object.prototype.hasOwnProperty.call(initialProductFormData, key)) {
                    const value = productData[key];
                    if (key.endsWith('_id') && value !== null && value !== undefined) {
                        preparedFormData[key] = value.toString();
                    } else {
                        preparedFormData[key] = (value === null || value === undefined) ? '' : value;
                    }
                }
            }
            preparedFormData.has_expiry = Boolean(productData.has_expiry);
            preparedFormData.is_serialized = Boolean(productData.is_serialized);
            setFormData(preparedFormData);
            setProductUnits(fetchedUnits);
        } catch (err) {
            console.error("Error fetching product details:", err);
            setError(err.response?.data?.message || 'Failed to load product data.');
            setProductUnits([]);
        } finally {
            setLoadingProduct(false);
        }
    }, [productId, isEditing, api]);

    useEffect(() => {
        if (api) fetchDropdownData();
    }, [api, fetchDropdownData]);

    useEffect(() => {
        if (api && user) {
            if (isEditing) {
                fetchProductData();
            } else {
                const newFormData = { ...initialProductFormData };
                if (user.role === ROLES.STORE_ADMIN || user.role === ROLES.STORE_MANAGER) {
                    if (user.store_id) {
                        newFormData.store_id = user.store_id.toString();
                    }
                }
                setFormData(newFormData);
                setProductUnits([]);
            }
        }
    }, [isEditing, fetchProductData, productId, api, user, ROLES]);

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
        if (!api || !user) { setError("Authentication context not available."); return; }
        setError(null); setLoadingProduct(true);

        const costPrice = parseFloat(formData.cost_price);
        const retailPrice = parseFloat(formData.retail_price);
        const wholesalePrice = formData.wholesale_price.trim() !== '' ? parseFloat(formData.wholesale_price) : null;

        if (isNaN(costPrice) || costPrice < 0) { setError('Cost Price must be valid & non-negative.'); setLoadingProduct(false); return; }
        if (isNaN(retailPrice) || retailPrice < 0) { setError('Retail Price must be valid & non-negative.'); setLoadingProduct(false); return; }
        if (retailPrice < costPrice) { setError('Retail Price cannot be less than Cost Price.'); setLoadingProduct(false); return; }
        if (wholesalePrice !== null && (isNaN(wholesalePrice) || wholesalePrice < 0 || wholesalePrice < costPrice)) { setError('Wholesale Price must be valid, non-negative, and not less than Cost Price if entered.'); setLoadingProduct(false); return; }
        if (!formData.base_unit_id) { setError("A Base Unit must be selected."); setLoadingProduct(false); return; }
        if (!formData.category_id) { setError("A Category must be selected."); setLoadingProduct(false); return; }
        if ((user.role === ROLES.STORE_ADMIN || user.role === ROLES.STORE_MANAGER) && !formData.store_id) { setError("Store ID is missing."); setLoadingProduct(false); return; }

        const dataToSend = { ...formData };
        const optionalFKs = ['sub_category_id', 'special_category_id', 'brand_id', 'barcode_symbology_id', 'tax_id', 'discount_type_id', 'manufacturer_id', 'supplier_id', 'warranty_id', 'store_id'];
        const numericFields = ['cost_price', 'retail_price', 'wholesale_price', 'discount_value', 'weight'];
        const integerFields = ['expiry_notification_days', 'max_sales_qty_per_person'];
        const textFieldsToNullifyIfEmpty = ['slug', 'sku', 'item_barcode', 'measurement_type', 'measurement_value', 'description'];

        Object.keys(dataToSend).forEach(key => {
            if ((optionalFKs.includes(key) || textFieldsToNullifyIfEmpty.includes(key)) && dataToSend[key] === '') dataToSend[key] = null;
            if (numericFields.includes(key)) dataToSend[key] = (dataToSend[key] === null || dataToSend[key] === '' || isNaN(parseFloat(dataToSend[key]))) ? null : parseFloat(dataToSend[key]);
            if (integerFields.includes(key)) dataToSend[key] = (dataToSend[key] === null || dataToSend[key] === '' || isNaN(parseInt(dataToSend[key], 10))) ? null : parseInt(dataToSend[key], 10);
            if (['has_expiry', 'is_serialized'].includes(key)) dataToSend[key] = Boolean(dataToSend[key]);
            if (key.endsWith('_id') && dataToSend[key] !== null && dataToSend[key] !== '') dataToSend[key] = isNaN(parseInt(dataToSend[key], 10)) ? null : parseInt(dataToSend[key], 10);
        });
        if ((user.role === ROLES.STORE_ADMIN || user.role === ROLES.STORE_MANAGER) && user.store_id) dataToSend.store_id = parseInt(user.store_id, 10);

        let isSuccess = false; let newProdId = null;
        try {
            if (isEditing) {
                await api.put(`/products/${productId}`, dataToSend);
                isSuccess = true;
            } else {
                const response = await api.post('/products', dataToSend);
                newProdId = response.data?.id;
                if (newProdId) isSuccess = true; else setError("Created product but failed to get ID.");
            }
        } catch (err) {
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} product.`);
        } finally {
            setLoadingProduct(false);
            if (isSuccess) navigate(isEditing ? `/products/view/${productId}` : (newProdId ? `/products/edit/${newProdId}` : '/products'));
        }
    };

    const handleAddUnitConfig = async (e) => {
        e.preventDefault();
        if (!api || !productId) { setUnitConfigError("Product context or API not available."); return; }
        setLoadingProduct(true); setUnitConfigError(null); setUnitConfigFeedback('');
        const factor = parseFloat(newUnitConfig.conversion_factor);

        if (!newUnitConfig.unit_id) { setUnitConfigError('Please select a unit.'); setLoadingProduct(false); return; }
        if (isNaN(factor) || factor <= 0) { setUnitConfigError('Conversion factor must be a positive number.'); setLoadingProduct(false); return; }
        if (parseInt(newUnitConfig.unit_id) === parseInt(formData.base_unit_id) && factor !== 1) { setUnitConfigError('Conversion factor must be 1 for the base unit.'); setLoadingProduct(false); return; }
        if (productUnits.some(pu => pu.unit_id === parseInt(newUnitConfig.unit_id))) { setUnitConfigError('This unit configuration already exists.'); setLoadingProduct(false); return; }

        const configData = { product_id: parseInt(productId), unit_id: parseInt(newUnitConfig.unit_id), conversion_factor: factor, is_purchase_unit: newUnitConfig.is_purchase_unit, is_sales_unit: newUnitConfig.is_sales_unit };
        try {
            const response = await api.post(`/product-units`, configData);
            const newConfigFromServer = response.data;
            const unitOption = units.find(u => u.id.toString() === newConfigFromServer.unit_id.toString());
            const newConfigForState = { ...newConfigFromServer, unit_name: unitOption?.name || 'Unknown' };
            setProductUnits(prevUnits => [...prevUnits, newConfigForState]);
            setNewUnitConfig(initialNewUnitConfigData);
            setUnitConfigFeedback('Unit configuration added successfully.');
        } catch (err) {
            setUnitConfigError(err.response?.data?.message || 'Failed to add unit configuration.');
        } finally {
            setLoadingProduct(false);
            setTimeout(() => setUnitConfigFeedback(''), 5000);
        }
    };

    const handleDeleteUnitConfig = async (configIdToDelete, unitName) => {
        if (!api) { setUnitConfigError("API not available."); return; }
        if (!window.confirm(`Delete unit configuration for "${unitName}"?`)) return;
        setLoadingProduct(true); setUnitConfigError(null); setUnitConfigFeedback('');
        try {
            await api.delete(`/product-units/${configIdToDelete}`);
            setProductUnits(prevUnits => prevUnits.filter(pu => pu.id !== configIdToDelete));
            setUnitConfigFeedback('Unit configuration deleted successfully.');
        } catch (err) {
            setUnitConfigError(err.response?.data?.message || 'Failed to delete unit configuration.');
        } finally {
            setLoadingProduct(false);
            setTimeout(() => setUnitConfigFeedback(''), 5000);
        }
    };

    const isLoading = loadingProduct || loadingDropdowns;
    const currentCategoryId = parseInt(formData.category_id);
    const filteredSubCategories = subCategories.filter(sc => sc.category_id === currentCategoryId);
    const isStoreFieldDisabled = isLoading || (user && (user.role === ROLES.STORE_ADMIN || user.role === ROLES.STORE_MANAGER));

    if (isLoading && !formData.product_name) return <p style={styles.centeredMessage}>Loading product form...</p>; // Show general loading if no data yet

    return (
        <div style={styles.container}>
            <h2 style={styles.pageTitle}>{isEditing ? `Edit Product (ID: ${productId})` : 'Add New Product'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            
            {(!user || (loadingDropdowns && !categories.length)) ? <p style={styles.centeredMessage}>Loading form options...</p> : (
                <form onSubmit={handleProductSubmit} style={styles.form}>
                    <fieldset style={styles.fieldset}>
                        <legend style={styles.legend}>Product Information</legend>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}>
                                <label htmlFor="store_id" style={styles.label}>Store:</label>
                                <select id="store_id" name="store_id" value={formData.store_id} onChange={handleProductChange} style={styles.input} disabled={isStoreFieldDisabled}>
                                    <option value="">{user?.role === ROLES.GLOBAL_ADMIN ? '-- Select Store (Optional) --' : '-- Store --'}</option>
                                    {stores.map(o => <option key={o.id} value={o.id.toString()}>{o.name}</option>)}
                                </select>
                                {isStoreFieldDisabled && user?.store_id && <small style={styles.fieldHelperText}>Store assigned based on your role.</small>}
                            </div>
                            <div style={styles.formGroup}> <label htmlFor="product_name" style={styles.label}>Product Name: *</label> <input id="product_name" type="text" name="product_name" value={formData.product_name || ''} onChange={handleProductChange} required style={styles.input} disabled={isLoading} /> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="slug" style={styles.label}>Slug:</label> <input id="slug" type="text" name="slug" value={formData.slug || ''} onChange={handleProductChange} style={styles.input} disabled={isLoading}/> </div>
                            <div style={styles.formGroup}> <label htmlFor="sku" style={styles.label}>SKU:</label> <input id="sku" type="text" name="sku" value={formData.sku || ''} onChange={handleProductChange} style={styles.input} disabled={isLoading}/> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="selling_type" style={styles.label}>Selling Type:</label> <select id="selling_type" name="selling_type" value={formData.selling_type} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="Wholesale">Wholesale</option><option value="Retail">Retail</option><option value="Both">Both</option></select> </div>
                            <div style={styles.formGroup}> <label htmlFor="inventory_type" style={styles.label}>Inventory / Service:</label> <select id="inventory_type" name="inventory_type" value={formData.inventory_type} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="Inventory">Inventory</option><option value="Service">Service</option></select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="category_id" style={styles.label}>Category: *</label> <select id="category_id" name="category_id" value={formData.category_id} onChange={handleProductChange} required style={styles.input} disabled={isLoading}> <option value="">-- Select --</option> {categories.map(o => <option key={`cat-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                            <div style={styles.formGroup}> <label htmlFor="sub_category_id" style={styles.label}>Sub Category:</label> <select id="sub_category_id" name="sub_category_id" value={formData.sub_category_id} onChange={handleProductChange} style={styles.input} disabled={isLoading || !formData.category_id}> <option value="">-- Select --</option> {filteredSubCategories.map(o => <option key={`subcat-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="special_category_id" style={styles.label}>Special Category:</label> <select id="special_category_id" name="special_category_id" value={formData.special_category_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option>{specialCategories.map(o => <option key={`spcat-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                            <div style={styles.formGroup}> <label htmlFor="brand_id" style={styles.label}>Brand:</label> <select id="brand_id" name="brand_id" value={formData.brand_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}> <option value="">-- Select --</option> {brands.map(o => <option key={`brand-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="base_unit_id" style={styles.label}>Base Unit: *</label> <select id="base_unit_id" name="base_unit_id" value={formData.base_unit_id} onChange={handleProductChange} required style={styles.input} disabled={isLoading}> <option value="">-- Select Base Unit --</option> {units.map(o => <option key={`baseunit-${o.id}`} value={o.id.toString()}>{o.name}</option>)} </select> </div>
                            <div style={styles.formGroup}> <label htmlFor="item_barcode" style={styles.label}>Item Barcode:</label> <input id="item_barcode" type="text" name="item_barcode" value={formData.item_barcode || ''} onChange={handleProductChange} style={styles.input} disabled={isLoading} /> </div>
                        </div>
                        <div style={styles.formGroup}> <label htmlFor="barcode_symbology_id" style={styles.label}>Barcode Symbology:</label> <select id="barcode_symbology_id" name="barcode_symbology_id" value={formData.barcode_symbology_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option>{barcodeSymbologies.map(o => <option key={`symb-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                        <div style={styles.formGroup}> <label htmlFor="description" style={styles.label}>Description:</label> <textarea id="description" name="description" value={formData.description || ''} onChange={handleProductChange} rows="3" style={styles.textarea} disabled={isLoading}></textarea> </div>
                    </fieldset>

                    <fieldset style={styles.fieldset}>
                        <legend style={styles.legend}>Pricing & Details</legend>
                        <div style={styles.formGroup}> <label style={styles.label}>Product Type:</label> <div style={styles.radioCheckboxGroup}> <label style={styles.inlineLabel}><input type="radio" name="product_type" value="Standard" checked={formData.product_type === 'Standard'} onChange={handleProductChange} disabled={isLoading}/> Standard</label> <label style={styles.inlineLabel}><input type="radio" name="product_type" value="Variable" checked={formData.product_type === 'Variable'} onChange={handleProductChange} disabled={isLoading}/> Variable</label> </div> </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="cost_price" style={styles.label}>Cost Price: *</label> <input id="cost_price" type="number" step="any" name="cost_price" value={formData.cost_price} onChange={handleProductChange} required style={styles.input} disabled={isLoading} min="0"/> </div>
                            <div style={styles.formGroup}> <label htmlFor="retail_price" style={styles.label}>Retail Price: *</label> <input id="retail_price" type="number" step="any" name="retail_price" value={formData.retail_price} onChange={handleProductChange} required style={styles.input} disabled={isLoading} min="0"/> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="wholesale_price" style={styles.label}>Wholesale Price:</label> <input id="wholesale_price" type="number" step="any" name="wholesale_price" value={formData.wholesale_price} onChange={handleProductChange} style={styles.input} disabled={isLoading} min="0"/> </div>
                            <div style={styles.formGroup}> <label htmlFor="tax_id" style={styles.label}>Tax:</label> <select id="tax_id" name="tax_id" value={formData.tax_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select Tax --</option>{taxes.map(o => <option key={`tax-${o.id}`} value={o.id.toString()}>{`${o.name} (${o.rate}%)`}</option>)}</select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="discount_type_id" style={styles.label}>Discount Type:</label> <select id="discount_type_id" name="discount_type_id" value={formData.discount_type_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option>{discountTypes.map(o => <option key={`dtype-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                            <div style={styles.formGroup}> <label htmlFor="discount_value" style={styles.label}>Discount Value:</label> <input id="discount_value" type="number" step="any" name="discount_value" value={formData.discount_value} onChange={handleProductChange} style={styles.input} disabled={isLoading} min="0"/> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="max_sales_qty_per_person" style={styles.label}>Max Sales Qty / Person:</label> <input id="max_sales_qty_per_person" type="number" name="max_sales_qty_per_person" value={formData.max_sales_qty_per_person} onChange={handleProductChange} style={styles.input} disabled={isLoading} min="0" step="1"/> </div>
                            <div style={styles.formGroup}> <label htmlFor="measurement_type" style={styles.label}>Measurement Type:</label> <select id="measurement_type" name="measurement_type" value={formData.measurement_type} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option><option value="Weight">Weight</option><option value="Volume">Volume</option><option value="Length">Length</option><option value="Area">Area</option><option value="Other">Other</option></select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="measurement_value" style={styles.label}>Measurement Value:</label> <input id="measurement_value" type="text" name="measurement_value" value={formData.measurement_value || ''} onChange={handleProductChange} style={styles.input} disabled={isLoading} placeholder="e.g., 10 Kg, 500ml"/> </div>
                            <div style={styles.formGroup}> <label htmlFor="weight" style={styles.label}>Weight (e.g., in Kg):</label> <input id="weight" type="number" step="any" name="weight" value={formData.weight} onChange={handleProductChange} style={styles.input} disabled={isLoading} min="0"/> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="manufacturer_id" style={styles.label}>Manufacturer:</label> <select id="manufacturer_id" name="manufacturer_id" value={formData.manufacturer_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option>{manufacturers.map(o => <option key={`manu-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                            <div style={styles.formGroup}> <label htmlFor="supplier_id" style={styles.label}>Supplier:</label> <select id="supplier_id" name="supplier_id" value={formData.supplier_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- Select --</option>{suppliers.map(o => <option key={`supp-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                        </div>
                        <div style={styles.formRow}>
                            <div style={styles.formGroup}> <label htmlFor="warranty_id" style={styles.label}>Warranty:</label> <select id="warranty_id" name="warranty_id" value={formData.warranty_id} onChange={handleProductChange} style={styles.input} disabled={isLoading}><option value="">-- No Warranty --</option>{warranties.map(o => <option key={`warr-${o.id}`} value={o.id.toString()}>{o.name}</option>)}</select> </div>
                            <div style={styles.formGroup}> <label htmlFor="expiry_notification_days" style={styles.label}>Expiry Notification (Days Before):</label> <input id="expiry_notification_days" type="number" name="expiry_notification_days" value={formData.expiry_notification_days} onChange={handleProductChange} style={styles.input} disabled={isLoading} min="0" step="1"/> </div>
                        </div>
                        <div style={styles.formGroup}> <label style={styles.label}>Flags:</label> <div style={styles.radioCheckboxGroup}> <label style={styles.inlineLabel}><input type="checkbox" name="has_expiry" checked={Boolean(formData.has_expiry)} onChange={handleProductChange} disabled={isLoading}/> Has Expiry?</label> <label style={styles.inlineLabel}><input type="checkbox" name="is_serialized" checked={Boolean(formData.is_serialized)} onChange={handleProductChange} disabled={isLoading}/> Is Serialized?</label> </div> </div>
                    </fieldset>

                    <div style={styles.buttonGroup}>
                        <button type="submit" disabled={isLoading} style={styles.buttonPrimary}>
                            {isLoading ? 'Saving...' : (isEditing ? 'Update Product Details' : 'Create Product')}
                        </button>
                        <button type="button" onClick={() => navigate(isEditing ? `/products/view/${productId}` : '/products')} style={styles.buttonSecondary} disabled={isLoading}>
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {isEditing && !loadingProduct && user && (
                <div style={styles.unitConfigSection}>
                    <h3 style={styles.subHeader}>Unit Configurations for this Product</h3>
                    <p>Define how this product can be bought or sold in different units.</p>
                    {unitConfigError && <p style={{...styles.errorBox, marginBottom:'10px'}}>Unit Config Error: {unitConfigError}</p>}
                    {unitConfigFeedback && <p style={{...styles.feedbackBox, ...styles.feedbackSuccess, marginBottom:'10px'}}>{unitConfigFeedback}</p>}

                    {productUnits.length > 0 ? (
                        <table style={{...styles.table, marginBottom:'20px'}}>
                            <thead style={styles.tableHeader}><tr><th style={styles.tableCell}>Unit</th><th style={styles.tableCell}>Factor (vs Base)</th><th style={styles.tableCell}>Purchase?</th><th style={styles.tableCell}>Sales?</th><th style={styles.tableCell}>Actions</th></tr></thead>
                            <tbody>{productUnits.map((pu, index) => (
                                <tr key={`pu-${pu.id || index}`} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                    <td style={styles.tableCell}>{pu.unit_name || units.find(u => u.id === pu.unit_id)?.name || `Unit ID: ${pu.unit_id}`}</td>
                                    <td style={styles.tableCell}>{pu.conversion_factor}</td>
                                    <td style={styles.tableCell}>{pu.is_purchase_unit ? 'Yes' : 'No'}</td>
                                    <td style={styles.tableCell}>{pu.is_sales_unit ? 'Yes' : 'No'}</td>
                                    <td style={styles.tableCell}><button onClick={() => handleDeleteUnitConfig(pu.id, pu.unit_name)} style={{...styles.buttonSmall, ...styles.buttonDelete}} disabled={isLoading} title="Delete Config">Delete</button></td>
                                </tr>
                            ))}</tbody>
                        </table>
                    ) : ( <p>No specific unit configurations added yet for this product.</p> )}

                    <form onSubmit={handleAddUnitConfig} style={styles.subForm}>
                        <h4 style={styles.subFormTitle}>Add New Unit Configuration</h4>
                        <div style={styles.formGroup}><label style={styles.label} htmlFor="new_unit_id">Unit: *</label><select id="new_unit_id" name="unit_id" value={newUnitConfig.unit_id} onChange={handleNewUnitConfigChange} required style={styles.input} disabled={isLoading || units.length === 0}><option value="">-- Select Unit --</option>{units.map(u => (<option key={`unitopt-${u.id}`} value={u.id.toString()}>{u.name}</option>))}</select></div>
                        <div style={styles.formGroup}><label style={styles.label} htmlFor="new_conversion_factor">Conversion Factor: *</label><input id="new_conversion_factor" type="number" name="conversion_factor" value={newUnitConfig.conversion_factor} onChange={handleNewUnitConfigChange} required min="0.000001" step="any" style={styles.input} disabled={isLoading} placeholder={`Factor relative to '${units.find(u => u.id.toString() === formData.base_unit_id)?.name || 'Base Unit'}'`}/></div>
                        <div style={styles.formGroup}><label style={{...styles.label, marginRight:'15px'}}>Use For:</label><div style={styles.radioCheckboxGroup}><label style={styles.checkboxLabel}><input type="checkbox" name="is_purchase_unit" checked={newUnitConfig.is_purchase_unit} onChange={handleNewUnitConfigChange} disabled={isLoading} /> Purchase</label><label style={styles.checkboxLabel}><input type="checkbox" name="is_sales_unit" checked={newUnitConfig.is_sales_unit} onChange={handleNewUnitConfigChange} disabled={isLoading} /> Sales</label></div></div>
                        <button type="submit" disabled={isLoading} style={{...styles.buttonPrimary, marginTop:'10px'}}>{isLoading ? 'Adding...' : 'Add Unit Configuration'}</button>
                    </form>
                </div>
            )}
        </div>
    );
}

// Consistent Styles
const styles = {
    container: { padding: '20px', maxWidth: '900px', margin: '40px auto', fontFamily: 'Arial, sans-serif', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' },
    pageTitle: { fontSize: '1.8em', color: '#333', textAlign: 'center', marginBottom: '30px', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2' },
    form: { display: 'flex', flexDirection: 'column', gap: '20px' },
    fieldset: { border: '1px solid #ddd', padding: '20px', borderRadius: '5px', marginBottom: '10px' },
    legend: { fontWeight: 'bold', padding: '0 10px', marginLeft: '10px', color: '#333', fontSize: '1.2em', marginBottom: '10px' },
    formRow: { display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '5px' },
    formGroup: { display: 'flex', flexDirection: 'column', flex: '1 1 calc(50% - 10px)', minWidth: '280px', marginBottom: '10px' },
    label: { marginBottom: '8px', fontWeight: 'bold', color: '#555', fontSize: '0.9em' },
    input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    textarea: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontSize: '1em', resize: 'vertical' },
    radioCheckboxGroup: { display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' },
    inlineLabel: { fontWeight: 'normal', fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: '5px' },
    checkboxLabel: { fontWeight: 'normal', fontSize: '0.95em', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' },
    fieldHelperText: { fontSize: '0.8em', color: '#666', marginTop: '4px' },
    buttonGroup: { marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '20px', borderTop: '1px solid #eee' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSmall: { padding: '6px 10px', fontSize: '0.85em' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' },
    // Styles for Unit Configuration Section
    unitConfigSection: { marginTop: '30px', padding: '20px', border: '1px solid #e0e0e0', borderRadius: '5px', backgroundColor: '#f9f9f9' },
    subHeader: { fontSize: '1.4em', color: '#444', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' },
    subForm: { padding: '15px', border: '1px solid #dee2e6', borderRadius: '5px', backgroundColor:'#fff', marginTop: '15px' },
    subFormTitle: { fontSize: '1.1em', color: '#333', marginBottom: '15px' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '10px 8px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6', fontSize: '0.9em' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' },
};

export default ProductForm;