// frontend/src/components/ManufacturerForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function ManufacturerForm() {
    const { manufacturerId } = useParams(); // Get ID from URL if editing
    const navigate = useNavigate();
    const isEditing = Boolean(manufacturerId);

    // State mirroring the new fields (similar to Supplier)
    const [formData, setFormData] = useState({
        name: '', address: '', city: '',
        contact_person: '', telephone: '', fax: '', email: '',
        relationship_start_date: '', tax_details: '',
        contact_info: '', // Keep old field or remove if fully replaced
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // No separate loading error needed here as we don't fetch dropdowns for this form yet

    // Fetch existing manufacturer data if editing
    useEffect(() => {
        if (isEditing) {
            setLoading(true); setError(null);
            axios.get(`${API_BASE_URL}/manufacturers/${manufacturerId}`)
                .then(response => {
                    const data = response.data;
                    const relationshipDateFormatted = data.relationship_start_date ? data.relationship_start_date.split('T')[0] : '';
                    // Set form data, handling nulls
                    setFormData({
                        name: data.name || '',
                        address: data.address || '',
                        city: data.city || '',
                        contact_person: data.contact_person || '',
                        telephone: data.telephone || '',
                        fax: data.fax || '',
                        email: data.email || '',
                        relationship_start_date: relationshipDateFormatted,
                        tax_details: data.tax_details || '',
                        contact_info: data.contact_info || '', // Keep old field
                    });
                    setLoading(false);
                })
                .catch(err => { console.error("Error fetching manufacturer details:", err); setError('Failed to load manufacturer data.'); setLoading(false); });
        } else {
            // Reset form for 'new' mode
            setFormData({
                name: '', address: '', city: '',
                contact_person: '', telephone: '', fax: '', email: '',
                relationship_start_date: '', tax_details: '',
                contact_info: '',
            });
            setError(null);
        }
    }, [manufacturerId, isEditing]);

    // Generic change handler
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target; // Although no checkboxes here yet
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError(null);

        // Prepare data (trim strings, handle nulls)
        const manufacturerData = { ...formData };
        const fieldsToNullifyIfEmpty = [
            'address', 'city', 'contact_person', 'telephone', 'fax', 'email',
            'relationship_start_date', 'tax_details', 'contact_info'
            // Add others if they exist in your final schema
        ];
         Object.keys(manufacturerData).forEach(key => {
            if (typeof manufacturerData[key] === 'string') {
                manufacturerData[key] = manufacturerData[key].trim();
            }
             if (fieldsToNullifyIfEmpty.includes(key) && manufacturerData[key] === '') {
                 manufacturerData[key] = null;
             }
        });
         // Handle date field
         if (manufacturerData.relationship_start_date === '') {
             manufacturerData.relationship_start_date = null;
         }

        if (!manufacturerData.name) { setError("Manufacturer name cannot be empty."); setLoading(false); return; }

        try {
            if (isEditing) { await axios.put(`${API_BASE_URL}/manufacturers/${manufacturerId}`, manufacturerData); }
            else { await axios.post(`${API_BASE_URL}/manufacturers`, manufacturerData); }
            navigate('/manufacturers'); // Go back to list on success
        } catch (err) { console.error("Error saving manufacturer:", err); setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} manufacturer.`); }
        finally { setLoading(false); }
    };

    if (loading && isEditing) return <p>Loading manufacturer details...</p>;
    // Removed loadingError check as it's not used here

    return (
        <div>
            <h2>{isEditing ? 'Edit Manufacturer' : 'Add New Manufacturer'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <fieldset style={styles.fieldset}>
                    <legend>Basic Information</legend>
                    {/* Mimic Supplier Form Structure */}
                    <div style={styles.formGroup}> <label htmlFor="name" style={styles.label}>Name: *</label> <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required style={styles.input} disabled={loading} /> </div>
                    <div style={styles.formGroup}> <label htmlFor="address" style={styles.label}>Address:</label> <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows="3" style={styles.textarea} disabled={loading} /> </div>
                    <div style={styles.formGroup}> <label htmlFor="city" style={styles.label}>City:</label> <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                </fieldset>

                <fieldset style={styles.fieldset}>
                    <legend>Contact Information</legend>
                    <div style={styles.formGroup}> <label htmlFor="contact_person" style={styles.label}>Contact Person:</label> <input type="text" id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}> <label htmlFor="telephone" style={styles.label}>Telephone No.:</label> <input type="tel" id="telephone" name="telephone" value={formData.telephone} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                        <div style={styles.formGroup}> <label htmlFor="fax" style={styles.label}>Fax:</label> <input type="tel" id="fax" name="fax" value={formData.fax} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                    </div>
                    <div style={styles.formGroup}> <label htmlFor="email" style={styles.label}>Email:</label> <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                    {/* Old Contact Info field - decide if needed */}
                    {/* <div style={styles.formGroup}> <label htmlFor="contact_info" style={styles.label}>Other Contact Info:</label> <textarea id="contact_info" name="contact_info" value={formData.contact_info} onChange={handleChange} rows="2" style={styles.textarea} disabled={loading} /> </div> */}
                </fieldset>

                 <fieldset style={styles.fieldset}>
                    <legend>Additional Details</legend>
                     <div style={styles.formRow}>
                        <div style={styles.formGroup}> <label htmlFor="relationship_start_date" style={styles.label}>Relationship Since:</label> <input type="date" id="relationship_start_date" name="relationship_start_date" value={formData.relationship_start_date} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                        {/* Add Main Category dropdown if uncommented in migration/backend */}
                    </div>
                     <div style={styles.formGroup}> <label htmlFor="tax_details" style={styles.label}>Tax / Registration Details:</label> <input type="text" id="tax_details" name="tax_details" value={formData.tax_details} onChange={handleChange} style={styles.input} disabled={loading} /> </div>
                     {/* Add Discount/Credit fields if uncommented in migration/backend */}
                </fieldset>

                {/* Action Buttons */}
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}> {loading ? 'Saving...' : (isEditing ? 'Update Manufacturer' : 'Create Manufacturer')} </button>
                    <button type="button" onClick={() => navigate('/manufacturers')} style={styles.buttonSecondary} disabled={loading}> Cancel </button>
                </div>
            </form>
        </div>
    );
}

// Basic Inline Styles
const styles = { /* ... copy styles from SupplierForm ... */
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

export default ManufacturerForm;
