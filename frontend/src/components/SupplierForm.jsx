// frontend/src/components/SupplierForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function SupplierForm() {
    const { supplierId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(supplierId);

    // State for all fields (Removed 'code')
    const [formData, setFormData] = useState({
        name: '', address: '', city: '',
        contact_person: '', telephone: '', fax: '', email: '',
        since_date: '', main_category_id: '', tax_invoice_details: '',
        default_discount_percent: '0', credit_limit: '0.00', credit_days: '0',
        is_default_supplier: false,
        contact_info: '', // Keep existing field for now, maybe remove later
    });
    // Removed displayCode state
    // const [displayCode, setDisplayCode] = useState('');
    const [categories, setCategories] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingError, setLoadingError] = useState(null);

    // Fetch categories for dropdown
    useEffect(() => {
        setLoadingError(null);
        axios.get(`${API_BASE_URL}/categories`)
            .then(response => {
                setCategories(response.data || []);
            })
            .catch(err => {
                console.error("Error fetching categories:", err);
                setLoadingError('Failed to load categories for dropdown.');
                setCategories([]);
            })
    }, []); // Fetch categories only once

    // Fetch existing supplier data if editing
    useEffect(() => {
        if (isEditing) {
            // Wait for categories to potentially load before fetching supplier
             if (categories.length > 0 || loadingError !== null) {
                setLoading(true);
                setError(null);
                axios.get(`${API_BASE_URL}/suppliers/${supplierId}`)
                    .then(response => {
                        const data = response.data;
                        const sinceDateFormatted = data.since_date ? data.since_date.split('T')[0] : '';
                        // Set form data, excluding code
                        setFormData({
                            name: data.name || '',
                            address: data.address || '',
                            city: data.city || '',
                            contact_person: data.contact_person || '',
                            telephone: data.telephone || '',
                            fax: data.fax || '',
                            email: data.email || '',
                            since_date: sinceDateFormatted,
                            main_category_id: data.main_category_id || '',
                            tax_invoice_details: data.tax_invoice_details || '',
                            default_discount_percent: data.default_discount_percent?.toString() ?? '0',
                            credit_limit: data.credit_limit?.toString() ?? '0.00',
                            credit_days: data.credit_days?.toString() ?? '0',
                            is_default_supplier: data.is_default_supplier || false,
                            contact_info: data.contact_info || '',
                        });
                        // Removed setting displayCode
                        // setDisplayCode(data.code || 'N/A');
                        setLoading(false);
                    })
                    .catch(err => {
                        console.error("Error fetching supplier details:", err);
                        setError('Failed to load supplier data.');
                        setLoading(false);
                    });
             }
        } else {
            // Reset form for 'new' mode
            setFormData({
                 name: '', address: '', city: '',
                 contact_person: '', telephone: '', fax: '', email: '',
                 since_date: '', main_category_id: '', tax_invoice_details: '',
                 default_discount_percent: '0', credit_limit: '0.00', credit_days: '0',
                 is_default_supplier: false, contact_info: '',
            });
            // Removed clearing displayCode
            // setDisplayCode('');
            setError(null);
            // Ensure loading is false if categories finished loading/failed
            if (loadingError === null) setLoading(false); // Only set loading false if categories didn't fail
        }
    }, [supplierId, isEditing, categories.length, loadingError]); // Depend on categories load status

    // Generic change handler
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Prepare data (trim strings, parse numbers/booleans, handle nulls)
        const supplierData = { ...formData }; // Copy state
        // Removed 'code' from fields to nullify
        const fieldsToNullifyIfEmpty = [
             'city', 'contact_person', 'telephone', 'fax', 'email',
             'since_date', 'main_category_id', 'tax_invoice_details', 'address', 'contact_info',
             'default_discount_percent', 'credit_limit', 'credit_days'
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

        if (!supplierData.name) { setError("Supplier name cannot be empty."); setLoading(false); return; }
        if (isNaN(supplierData.default_discount_percent)) supplierData.default_discount_percent = null;
        if (isNaN(supplierData.credit_limit)) supplierData.credit_limit = null;
        if (isNaN(supplierData.credit_days)) supplierData.credit_days = null;
        if (isNaN(supplierData.main_category_id)) supplierData.main_category_id = null;


        try {
            if (isEditing) {
                // Don't send 'code' in the update payload
                await axios.put(`${API_BASE_URL}/suppliers/${supplierId}`, supplierData);
            } else {
                // Backend no longer expects/generates code
                await axios.post(`${API_BASE_URL}/suppliers`, supplierData);
            }
            navigate('/suppliers'); // Go back to list on success
        } catch (err) {
            console.error("Error saving supplier:", err);
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} supplier.`);
        } finally {
            setLoading(false);
        }
    };

    // Show loading indicator based on context
    if (loading && !formData.name && isEditing) return <p>Loading supplier details...</p>;
    if (loadingError) return <p style={{ color: 'red' }}>Error: {loadingError}</p>;

    return (
        <div>
            <h2>{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}

            <form onSubmit={handleSubmit}>
                <fieldset style={styles.fieldset}>
                    <legend>Basic Information</legend>
                    <div style={styles.formRow}>
                        {/* Removed Code display */}
                        <div style={{...styles.formGroup, justifyContent: 'flex-end' }}> {/* Adjust alignment */}
                            <label htmlFor="is_default_supplier" style={{...styles.label, minWidth:'auto', display:'flex', alignItems:'center'}}>
                                <input type="checkbox" id="is_default_supplier" name="is_default_supplier" checked={formData.is_default_supplier} onChange={handleChange} disabled={loading} style={{marginRight:'5px'}}/> Default Supplier?
                            </label>
                        </div>
                    </div>
                    <div style={styles.formGroup}> <label htmlFor="name" style={styles.label}>Name: *</label> <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required style={styles.input} disabled={loading} /> </div>
                    <div style={styles.formGroup}> <label htmlFor="address" style={styles.label}>Address:</label> <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows="3" style={styles.textarea} disabled={loading} /> </div>
                    <div style={styles.formGroup}> <label htmlFor="city" style={styles.label}>City:</label> <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                </fieldset>

                {/* Contact Info Fieldset */}
                <fieldset style={styles.fieldset}>
                    <legend>Contact Information</legend>
                    <div style={styles.formGroup}> <label htmlFor="contact_person" style={styles.label}>Contact Person:</label> <input type="text" id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}> <label htmlFor="telephone" style={styles.label}>Telephone No.:</label> <input type="tel" id="telephone" name="telephone" value={formData.telephone} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                        <div style={styles.formGroup}> <label htmlFor="fax" style={styles.label}>Fax:</label> <input type="tel" id="fax" name="fax" value={formData.fax} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                    </div>
                    <div style={styles.formGroup}> <label htmlFor="email" style={styles.label}>Email:</label> <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                </fieldset>

                 {/* Office Use Fieldset */}
                 <fieldset style={styles.fieldset}>
                    <legend>Office Use</legend>
                     <div style={styles.formRow}>
                        <div style={styles.formGroup}> <label htmlFor="since_date" style={styles.label}>Supplier Since:</label> <input type="date" id="since_date" name="since_date" value={formData.since_date} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                        <div style={styles.formGroup}> <label htmlFor="main_category_id" style={styles.label}>Main Category:</label> <select id="main_category_id" name="main_category_id" value={formData.main_category_id} onChange={handleChange} style={styles.input} disabled={loading || categories.length === 0}> <option value="">-- Select Category --</option> {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)} </select> </div>
                    </div>
                     <div style={styles.formGroup}> <label htmlFor="tax_invoice_details" style={styles.label}>Tax Invoice # / Details:</label> <input type="text" id="tax_invoice_details" name="tax_invoice_details" value={formData.tax_invoice_details} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                     <div style={styles.formRow}>
                        <div style={styles.formGroup}> <label htmlFor="default_discount_percent" style={styles.label}>Discount %:</label> <input type="number" id="default_discount_percent" name="default_discount_percent" value={formData.default_discount_percent} onChange={handleChange} style={styles.input} disabled={loading} step="0.01" min="0" max="100"/> </div>
                        <div style={styles.formGroup}> <label style={{...styles.label, minWidth:'auto', marginLeft:'5px'}}>(Maximum Allowed)</label> </div>
                     </div>
                     <div style={styles.formRow}>
                        <div style={styles.formGroup}> <label htmlFor="credit_limit" style={styles.label}>Credit Limit:</label> <input type="number" id="credit_limit" name="credit_limit" value={formData.credit_limit} onChange={handleChange} style={styles.input} disabled={loading} step="0.01" min="0"/> </div>
                        <div style={styles.formGroup}> <label htmlFor="credit_days" style={styles.label}>Credit Days:</label> <input type="number" id="credit_days" name="credit_days" value={formData.credit_days} onChange={handleChange} style={styles.input} disabled={loading} step="1" min="0"/> </div>
                     </div>
                </fieldset>


                {/* Action Buttons */}
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}>
                        {loading ? 'Saving...' : (isEditing ? 'Update Supplier' : 'Create Supplier')}
                    </button>
                    <button type="button" onClick={() => navigate('/suppliers')} style={styles.buttonSecondary} disabled={loading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// Basic Inline Styles
const styles = {
    container: { padding: '20px', maxWidth: '750px', margin: '0 auto', fontFamily: 'Arial, sans-serif' },
    fieldset: { border: '1px solid #ccc', padding: '15px 20px', borderRadius: '5px', marginBottom: '20px' },
    legend: { fontWeight: 'bold', padding: '0 10px', marginLeft: '10px', color: '#333' },
    formRow: { display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '15px', alignItems:'center' },
    formGroup: { display: 'flex', flexDirection: 'column', flex: '1 1 300px', minWidth: '250px' },
    label: { marginBottom: '6px', fontWeight: 'bold', color: '#555', fontSize:'0.9em' },
    input: { width: '100%', padding: '8px 10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize:'1em' },
    textarea: { width: '100%', padding: '8px 10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px', fontSize:'1em' },
    title: { marginBottom: '20px', color: '#333', textAlign:'center' },
    errorBox: { color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px', borderRadius: '4px', backgroundColor: '#ffe6e6' },
    buttonGroup: { marginTop: '25px', textAlign:'center' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px', opacity: 1 },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' },
};

export default SupplierForm;
