import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios'; // REMOVE THIS
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

// const API_BASE_URL = 'http://localhost:5001/api'; // REMOVE THIS

function SupplierForm() {
    const { supplierId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth(); // Use AuthContext

    const isEditing = Boolean(supplierId);

    const initialFormData = {
        name: '', address: '', city: '',
        contact_person: '', telephone: '', fax: '', email: '',
        since_date: '', main_category_id: '', tax_invoice_details: '',
        default_discount_percent: '0', credit_limit: '0.00', credit_days: '0',
        is_default_supplier: false,
    };
    const [formData, setFormData] = useState(initialFormData);
    const [categories, setCategories] = useState([]);
    const [isLoading, setIsLoading] = useState(false); // Renamed from 'loading'
    const [pageError, setPageError] = useState(null);   // Renamed from 'error'
    const [formError, setFormError] = useState(''); // For specific field validation
    const [loadingCategoriesError, setLoadingCategoriesError] = useState(null); // Specific error for categories

    const fetchCategories = useCallback(async () => {
        if (!apiInstance || !isAuthenticated) return;
        setLoadingCategoriesError(null);
        try {
            const response = await apiInstance.get('/categories');
            setCategories(response.data || []);
        } catch (err) {
            console.error("[SupplierForm] Error fetching categories:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load categories for dropdown.';
            setLoadingCategoriesError(errorMsg);
            setCategories([]);
        }
    }, [apiInstance, isAuthenticated]);

    const fetchSupplierData = useCallback(async () => {
        if (!isEditing || !apiInstance || !isAuthenticated) return;
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get(`/suppliers/${supplierId}`);
            const data = response.data;
            const sinceDateFormatted = data.since_date ? data.since_date.split('T')[0] : '';
            setFormData({
                name: data.name || '',
                address: data.address || '',
                city: data.city || '',
                contact_person: data.contact_person || '',
                telephone: data.telephone || '',
                fax: data.fax || '',
                email: data.email || '',
                since_date: sinceDateFormatted,
                main_category_id: data.main_category_id?.toString() || '',
                tax_invoice_details: data.tax_invoice_details || '',
                default_discount_percent: data.default_discount_percent?.toString() ?? '0',
                credit_limit: data.credit_limit?.toString() ?? '0.00',
                credit_days: data.credit_days?.toString() ?? '0',
                is_default_supplier: data.is_default_supplier || false,
            });
        } catch (err) {
            console.error("[SupplierForm] Error fetching supplier details:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load supplier data.';
            setPageError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [isEditing, supplierId, apiInstance, isAuthenticated]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            setIsLoading(true); // General loading for initial setup
            fetchCategories().finally(() => {
                if (isEditing) {
                    fetchSupplierData(); // This will set its own loading
                } else {
                    setFormData(initialFormData);
                    setPageError(null);
                    setFormError('');
                    setIsLoading(false); // Stop general loading if not editing
                }
            });
        } else if (!authLoading && !isAuthenticated) {
            setPageError('Authentication required. Please log in.');
            setIsLoading(false);
        }
    }, [authLoading, isAuthenticated, apiInstance, fetchCategories, fetchSupplierData, isEditing]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        if (formError) setFormError(''); // Clear form error on change
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiInstance || !isAuthenticated) {
            setPageError("Authentication error. Please log in again.");
            return;
        }
        setIsLoading(true);
        setPageError(null);
        setFormError('');

        const supplierData = { ...formData };
        const fieldsToNullifyIfEmpty = [
            'city', 'contact_person', 'telephone', 'fax', 'email',
            'since_date', 'main_category_id', 'tax_invoice_details', 'address',
        ];
        Object.keys(supplierData).forEach(key => {
            if (typeof supplierData[key] === 'string') {
                supplierData[key] = supplierData[key].trim();
            }
            if (fieldsToNullifyIfEmpty.includes(key) && supplierData[key] === '') {
                supplierData[key] = null;
            }
        });

        supplierData.default_discount_percent = supplierData.default_discount_percent ? parseFloat(supplierData.default_discount_percent) : null;
        supplierData.credit_limit = supplierData.credit_limit ? parseFloat(supplierData.credit_limit) : null;
        supplierData.credit_days = supplierData.credit_days ? parseInt(supplierData.credit_days, 10) : null;
        supplierData.main_category_id = supplierData.main_category_id ? parseInt(supplierData.main_category_id, 10) : null;
        supplierData.is_default_supplier = Boolean(supplierData.is_default_supplier);

        if (!supplierData.name) { setFormError("Supplier name cannot be empty."); setIsLoading(false); return; }
        if (supplierData.default_discount_percent !== null && (isNaN(supplierData.default_discount_percent) || supplierData.default_discount_percent < 0 || supplierData.default_discount_percent > 100)) { setFormError("Default discount must be between 0 and 100."); setIsLoading(false); return; }
        if (supplierData.credit_limit !== null && (isNaN(supplierData.credit_limit) || supplierData.credit_limit < 0)) { setFormError("Credit limit must be a non-negative number."); setIsLoading(false); return; }
        if (supplierData.credit_days !== null && (isNaN(supplierData.credit_days) || supplierData.credit_days < 0)) { setFormError("Credit days must be a non-negative integer."); setIsLoading(false); return; }

        try {
            if (isEditing) {
                await apiInstance.put(`/suppliers/${supplierId}`, supplierData);
            } else {
                await apiInstance.post('/suppliers', supplierData);
            }
            // Ensure path matches App.jsx, e.g., /dashboard/suppliers
            navigate('/dashboard/suppliers', {
                state: {
                    message: `Supplier "${supplierData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[SupplierForm] Error saving supplier:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} supplier.`;
            setPageError(errMsg);
            if (err.response?.data?.errors) {
                setFormError(Object.values(err.response.data.errors).join(', '));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (isLoading && !formData.name && isEditing) return <p style={styles.centeredMessage}>Loading supplier details...</p>;
    if (isLoading && !isEditing && categories.length === 0 && !loadingCategoriesError) return <p style={styles.centeredMessage}>Loading form...</p>;
    if (loadingCategoriesError) return <p style={styles.errorBox}>Error loading categories: {loadingCategoriesError}</p>;


    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            {pageError && <p style={styles.errorBox}>{pageError}</p>}
            {formError && <p style={{...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red'}}>{formError}</p>}


            <form onSubmit={handleSubmit}>
                <fieldset style={styles.fieldset}>
                    <legend style={styles.legend}>Basic Information</legend>
                    <div style={{...styles.formGroup, alignItems: 'flex-start', marginBottom: '20px' }}>
                        <label htmlFor="is_default_supplier" style={{...styles.label, display:'flex', alignItems:'center', fontWeight:'normal', cursor:'pointer'}}>
                            <input type="checkbox" id="is_default_supplier" name="is_default_supplier" checked={formData.is_default_supplier} onChange={handleChange} disabled={isLoading} style={{marginRight:'8px', transform: 'scale(1.1)'}}/> Default Supplier?
                        </label>
                    </div>
                    <div style={styles.formGroup}> <label htmlFor="name" style={styles.label}>Name: *</label> <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required style={styles.input} disabled={isLoading} /> </div>
                    <div style={styles.formGroup}> <label htmlFor="address" style={styles.label}>Address:</label> <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows="3" style={styles.textarea} disabled={isLoading} /> </div>
                    <div style={styles.formGroup}> <label htmlFor="city" style={styles.label}>City:</label> <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} style={styles.input} disabled={isLoading} /> </div>
                </fieldset>

                <fieldset style={styles.fieldset}>
                    <legend style={styles.legend}>Contact Information</legend>
                    <div style={styles.formGroup}> <label htmlFor="contact_person" style={styles.label}>Contact Person:</label> <input type="text" id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleChange} style={styles.input} disabled={isLoading} /> </div>
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}> <label htmlFor="telephone" style={styles.label}>Telephone No.:</label> <input type="tel" id="telephone" name="telephone" value={formData.telephone} onChange={handleChange} style={styles.input} disabled={isLoading} /> </div>
                        <div style={styles.formGroup}> <label htmlFor="fax" style={styles.label}>Fax:</label> <input type="tel" id="fax" name="fax" value={formData.fax} onChange={handleChange} style={styles.input} disabled={isLoading} /> </div>
                    </div>
                    <div style={styles.formGroup}> <label htmlFor="email" style={styles.label}>Email:</label> <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} style={styles.input} disabled={isLoading} /> </div>
                </fieldset>

                 <fieldset style={styles.fieldset}>
                    <legend style={styles.legend}>Office Use</legend>
                     <div style={styles.formRow}>
                        <div style={styles.formGroup}> <label htmlFor="since_date" style={styles.label}>Supplier Since:</label> <input type="date" id="since_date" name="since_date" value={formData.since_date} onChange={handleChange} style={styles.input} disabled={isLoading} /> </div>
                        <div style={styles.formGroup}> <label htmlFor="main_category_id" style={styles.label}>Main Category:</label> <select id="main_category_id" name="main_category_id" value={formData.main_category_id} onChange={handleChange} style={styles.input} disabled={isLoading || categories.length === 0}> <option value="">-- Select Category --</option> {categories.map(cat => <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>)} </select> </div>
                    </div>
                     <div style={styles.formGroup}> <label htmlFor="tax_invoice_details" style={styles.label}>Tax Invoice # / Details:</label> <input type="text" id="tax_invoice_details" name="tax_invoice_details" value={formData.tax_invoice_details} onChange={handleChange} style={styles.input} disabled={isLoading} /> </div>
                     <div style={styles.formRow}>
                        <div style={styles.formGroup}> <label htmlFor="default_discount_percent" style={styles.label}>Discount %:</label> <input type="number" id="default_discount_percent" name="default_discount_percent" value={formData.default_discount_percent} onChange={handleChange} style={styles.input} disabled={isLoading} step="0.01" min="0" max="100"/> </div>
                        <div style={styles.formGroup}> <label htmlFor="credit_limit" style={styles.label}>Credit Limit:</label> <input type="number" id="credit_limit" name="credit_limit" value={formData.credit_limit} onChange={handleChange} style={styles.input} disabled={isLoading} step="0.01" min="0"/> </div>
                     </div>
                     <div style={styles.formRow}>
                        <div style={styles.formGroup}> <label htmlFor="credit_days" style={styles.label}>Credit Days:</label> <input type="number" id="credit_days" name="credit_days" value={formData.credit_days} onChange={handleChange} style={styles.input} disabled={isLoading} step="1" min="0"/> </div>
                        <div style={styles.formGroup}> {/* Empty div for spacing if needed */} </div>
                     </div>
                </fieldset>

                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading} style={styles.buttonPrimary}>
                        {isLoading ? 'Saving...' : (isEditing ? 'Update Supplier' : 'Create Supplier')}
                    </button>
                    {/* Ensure path matches App.jsx, e.g., /dashboard/suppliers */}
                    <button type="button" onClick={() => navigate('/dashboard/suppliers')} style={styles.buttonSecondary} disabled={isLoading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// Consistent Form Styles
const styles = {
    container: { padding: '20px', maxWidth: '750px', margin: '40px auto', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { marginBottom: '25px', color: '#333', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2', textAlign: 'center' },
    fieldset: { border: '1px solid #ddd', padding: '15px 20px 20px 20px', borderRadius: '5px', marginBottom: '25px' },
    legend: { fontWeight: 'bold', padding: '0 10px', marginLeft: '5px', color: '#333', fontSize: '1.1em' },
    formRow: { display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '0px' }, // Reduced bottom margin
    formGroup: { display: 'flex', flexDirection: 'column', flex: '1 1 calc(50% - 10px)', minWidth: '250px', marginBottom: '15px' },
    label: { marginBottom: '8px', fontWeight: 'bold', color: '#555', fontSize: '0.9em' },
    input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    textarea: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontSize: '1em' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default SupplierForm;