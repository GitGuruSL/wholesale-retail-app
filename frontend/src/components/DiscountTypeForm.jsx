// frontend/src/components/DiscountTypeForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function DiscountTypeForm() {
    const { typeId } = useParams(); // Get ID from URL if editing
    const navigate = useNavigate();
    const isEditing = Boolean(typeId);

    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEditing) {
            setLoading(true); setError(null);
            axios.get(`${API_BASE_URL}/discount-types/${typeId}`)
                .then(response => { setName(response.data.name); setLoading(false); })
                .catch(err => { console.error("Error fetching discount type:", err); setError('Failed to load discount type data.'); setLoading(false); });
        } else { setName(''); setError(null); }
    }, [typeId, isEditing]);

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError(null);
        const typeData = { name: name.trim() };
        if (!typeData.name) { setError("Discount type name cannot be empty."); setLoading(false); return; }

        try {
            if (isEditing) { await axios.put(`${API_BASE_URL}/discount-types/${typeId}`, typeData); }
            else { await axios.post(`${API_BASE_URL}/discount-types`, typeData); }
            navigate('/discount-types');
        } catch (err) { console.error("Error saving discount type:", err); setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} discount type.`); }
        finally { setLoading(false); }
    };

    if (loading && isEditing) return <p>Loading discount type details...</p>;

    return (
        <div>
            <h2>{isEditing ? 'Edit Discount Type' : 'Add New Discount Type'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="typeName" style={styles.label}>Type Name: *</label>
                    <input type="text" id="typeName" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} disabled={loading} placeholder="e.g., Percentage, Fixed Amount"/>
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}> {loading ? 'Saving...' : (isEditing ? 'Update Type' : 'Create Type')} </button>
                    <button type="button" onClick={() => navigate('/discount-types')} style={styles.buttonSecondary} disabled={loading}> Cancel </button>
                </div>
            </form>
        </div>
    );
}

// Basic Inline Styles
const styles = { /* ... copy styles from previous forms ... */
    container: { padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' },
    title: { marginBottom: '20px', color: '#333' },
    errorBox: { color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px', borderRadius: '4px', backgroundColor: '#ffe6e6' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
    buttonGroup: { marginTop: '25px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px', opacity: 1 },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' },
};

export default DiscountTypeForm;
