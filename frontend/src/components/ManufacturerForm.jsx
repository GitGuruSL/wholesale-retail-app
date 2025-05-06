import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function ManufacturerForm() {
    const { manufacturerId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(manufacturerId);

    const [formData, setFormData] = useState({
        name: '', address: '', city: '',
        contact_person: '', telephone: '', fax: '', email: '',
        relationship_start_date: '', tax_details: '',
        // contact_info: '', // Assuming this might be deprecated or merged
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            setError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setLoading(false);
                // navigate('/login'); // Optionally redirect
                return;
            }
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            axios.get(`${API_BASE_URL}/manufacturers/${manufacturerId}`, config)
                .then(response => {
                    const data = response.data;
                    const relationshipDateFormatted = data.relationship_start_date ? data.relationship_start_date.split('T')[0] : '';
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
                        // contact_info: data.contact_info || '',
                    });
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching manufacturer details:", err);
                    const errorMsg = err.response?.data?.message || 'Failed to load manufacturer data.';
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        setError('Unauthorized: Could not fetch manufacturer. Please log in again.');
                    } else {
                        setError(errorMsg);
                    }
                    setLoading(false);
                });
        } else {
            setFormData({
                name: '', address: '', city: '',
                contact_person: '', telephone: '', fax: '', email: '',
                relationship_start_date: '', tax_details: '',
                // contact_info: '',
            });
            setError(null);
        }
    }, [manufacturerId, isEditing, navigate]); // Added navigate

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const manufacturerData = { ...formData };
        Object.keys(manufacturerData).forEach(key => {
            if (typeof manufacturerData[key] === 'string') {
                manufacturerData[key] = manufacturerData[key].trim();
            }
            if (manufacturerData[key] === '') { // Convert empty strings to null for optional fields
                if (key !== 'name') { // Assuming name is required
                    manufacturerData[key] = null;
                }
            }
        });
        if (manufacturerData.relationship_start_date === '') {
            manufacturerData.relationship_start_date = null;
        }


        if (!manufacturerData.name) {
            setError("Manufacturer name cannot be empty.");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setLoading(false);
                // navigate('/login'); // Optionally redirect
                return;
            }
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            if (isEditing) {
                await axios.put(`${API_BASE_URL}/manufacturers/${manufacturerId}`, manufacturerData, config);
            } else {
                await axios.post(`${API_BASE_URL}/manufacturers`, manufacturerData, config);
            }
            navigate('/manufacturers');
        } catch (err) {
            console.error("Error saving manufacturer:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} manufacturer.`;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not save manufacturer. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing) return <p style={styles.centeredMessage}>Loading manufacturer details...</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Manufacturer' : 'Add New Manufacturer'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <fieldset style={styles.fieldset}>
                    <legend style={styles.legend}>Basic Information</legend>
                    <div style={styles.formGroup}>
                        <label htmlFor="name" style={styles.label}>Name: *</label>
                        <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required style={styles.input} disabled={loading} />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="address" style={styles.label}>Address:</label>
                        <textarea id="address" name="address" value={formData.address} onChange={handleChange} rows="3" style={styles.textarea} disabled={loading} />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="city" style={styles.label}>City:</label>
                        <input type="text" id="city" name="city" value={formData.city} onChange={handleChange} style={styles.input} disabled={loading} />
                    </div>
                </fieldset>

                <fieldset style={styles.fieldset}>
                    <legend style={styles.legend}>Contact Information</legend>
                    <div style={styles.formGroup}>
                        <label htmlFor="contact_person" style={styles.label}>Contact Person:</label>
                        <input type="text" id="contact_person" name="contact_person" value={formData.contact_person} onChange={handleChange} style={styles.input} disabled={loading} />
                    </div>
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label htmlFor="telephone" style={styles.label}>Telephone No.:</label>
                            <input type="tel" id="telephone" name="telephone" value={formData.telephone} onChange={handleChange} style={styles.input} disabled={loading} />
                        </div>
                        <div style={styles.formGroup}>
                            <label htmlFor="fax" style={styles.label}>Fax:</label>
                            <input type="tel" id="fax" name="fax" value={formData.fax} onChange={handleChange} style={styles.input} disabled={loading} />
                        </div>
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="email" style={styles.label}>Email:</label>
                        <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} style={styles.input} disabled={loading} />
                    </div>
                </fieldset>

                <fieldset style={styles.fieldset}>
                    <legend style={styles.legend}>Additional Details</legend>
                    <div style={styles.formRow}>
                        <div style={styles.formGroup}>
                            <label htmlFor="relationship_start_date" style={styles.label}>Relationship Since:</label>
                            <input type="date" id="relationship_start_date" name="relationship_start_date" value={formData.relationship_start_date} onChange={handleChange} style={styles.input} disabled={loading} />
                        </div>
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="tax_details" style={styles.label}>Tax / Registration Details:</label>
                        <input type="text" id="tax_details" name="tax_details" value={formData.tax_details} onChange={handleChange} style={styles.input} disabled={loading} />
                    </div>
                </fieldset>

                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}>
                        {loading ? 'Saving...' : (isEditing ? 'Update Manufacturer' : 'Create Manufacturer')}
                    </button>
                    <button type="button" onClick={() => navigate('/manufacturers')} style={styles.buttonSecondary} disabled={loading}>
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
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2' },
    fieldset: { border: '1px solid #ddd', padding: '15px 20px 20px 20px', borderRadius: '5px', marginBottom: '25px' },
    legend: { fontWeight: 'bold', padding: '0 10px', marginLeft: '5px', color: '#333', fontSize: '1.1em' },
    formRow: { display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '15px' },
    formGroup: { display: 'flex', flexDirection: 'column', flex: '1 1 calc(50% - 10px)', minWidth: '250px', marginBottom: '15px' }, // Ensure items can shrink and grow
    label: { marginBottom: '8px', fontWeight: 'bold', color: '#555', fontSize: '0.9em' },
    input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    textarea: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontSize: '1em' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default ManufacturerForm;