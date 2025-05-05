// frontend/src/components/BarcodeSymbologyForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function BarcodeSymbologyForm() {
    const { symbologyId } = useParams(); // Get ID from URL if editing
    const navigate = useNavigate();
    const isEditing = Boolean(symbologyId);

    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEditing) {
            setLoading(true); setError(null);
            axios.get(`${API_BASE_URL}/barcode-symbologies/${symbologyId}`)
                .then(response => { setName(response.data.name); setLoading(false); })
                .catch(err => { console.error("Error fetching symbology:", err); setError('Failed to load symbology data.'); setLoading(false); });
        } else { setName(''); setError(null); }
    }, [symbologyId, isEditing]);

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError(null);
        const symbologyData = { name: name.trim() };
        if (!symbologyData.name) { setError("Symbology name cannot be empty."); setLoading(false); return; }

        try {
            if (isEditing) { await axios.put(`${API_BASE_URL}/barcode-symbologies/${symbologyId}`, symbologyData); }
            else { await axios.post(`${API_BASE_URL}/barcode-symbologies`, symbologyData); }
            navigate('/barcode-symbologies');
        } catch (err) { console.error("Error saving symbology:", err); setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} symbology.`); }
        finally { setLoading(false); }
    };

    if (loading && isEditing) return <p>Loading symbology details...</p>;

    return (
        <div>
            <h2>{isEditing ? 'Edit Barcode Type' : 'Add New Barcode Type'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="symbologyName" style={styles.label}>Symbology Name: *</label>
                    <input type="text" id="symbologyName" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} disabled={loading} placeholder="e.g., Code 128, EAN-13, QR Code"/>
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}> {loading ? 'Saving...' : (isEditing ? 'Update Type' : 'Create Type')} </button>
                    <button type="button" onClick={() => navigate('/barcode-symbologies')} style={styles.buttonSecondary} disabled={loading}> Cancel </button>
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

export default BarcodeSymbologyForm;
