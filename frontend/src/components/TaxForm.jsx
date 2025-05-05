// frontend/src/components/TaxForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function TaxForm() {
    const { taxId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(taxId);

    // State
    const [name, setName] = useState('');
    const [rate, setRate] = useState('');
    const [taxTypeId, setTaxTypeId] = useState('');
    const [taxTypeOptions, setTaxTypeOptions] = useState([]); // For dropdown

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingError, setLoadingError] = useState(null); // For dropdown loading

    // Fetch Tax Types for dropdown
    useEffect(() => {
        setLoading(true); setLoadingError(null);
        axios.get(`${API_BASE_URL}/tax-types`)
            .then(response => { setTaxTypeOptions(response.data || []); if (!isEditing) setLoading(false); })
            .catch(err => { console.error("Error fetching tax types:", err); setLoadingError('Failed to load tax types.'); setTaxTypeOptions([]); setLoading(false); });
    }, [isEditing]); // Only refetch if mode changes

    // Fetch existing Tax data if editing
    useEffect(() => {
        if (isEditing) {
            if (taxTypeOptions.length > 0 || loadingError) { // Wait for types to load/fail
                setLoading(true); setError(null);
                axios.get(`${API_BASE_URL}/taxes/${taxId}`)
                    .then(response => {
                        const data = response.data;
                        setName(data.name);
                        setRate(data.rate.toString()); // Convert number to string
                        setTaxTypeId(data.tax_type_id);
                        setLoading(false);
                    })
                    .catch(err => { console.error("Error fetching tax details:", err); setError('Failed to load tax data.'); setLoading(false); });
            }
        } else { setName(''); setRate(''); setTaxTypeId(''); setError(null); }
    }, [taxId, isEditing, taxTypeOptions.length, loadingError]);

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError(null);

        const parsedRate = parseFloat(rate);
        const parsedTypeId = parseInt(taxTypeId, 10);

        if (!name.trim()) { setError("Tax name is required."); setLoading(false); return; }
        if (isNaN(parsedRate)) { setError("A valid numeric rate is required."); setLoading(false); return; }
        if (!taxTypeId || isNaN(parsedTypeId)) { setError("A valid tax type must be selected."); setLoading(false); return; }

        const taxData = { name: name.trim(), rate: parsedRate, tax_type_id: parsedTypeId };

        try {
            if (isEditing) { await axios.put(`${API_BASE_URL}/taxes/${taxId}`, taxData); }
            else { await axios.post(`${API_BASE_URL}/taxes`, taxData); }
            navigate('/taxes');
        } catch (err) { console.error("Error saving tax:", err); setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} tax.`); }
        finally { setLoading(false); }
    };

    if (loading && !name && isEditing) return <p>Loading tax details...</p>;
    if (loadingError) return <p style={{ color: 'red' }}>Error: {loadingError}</p>;

    return (
        <div>
            <h2>{isEditing ? 'Edit Tax' : 'Add New Tax'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="taxName" style={styles.label}>Tax Name: *</label>
                    <input type="text" id="taxName" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} disabled={loading} placeholder="e.g., VAT 5%, GST 10%"/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="taxRate" style={styles.label}>Rate: *</label>
                    <input type="number" id="taxRate" value={rate} onChange={(e) => setRate(e.target.value)} required style={styles.input} disabled={loading} step="any" min="0" placeholder="e.g., 5 or 10.5"/>
                </div>
                 <div style={styles.formGroup}>
                    <label htmlFor="taxType" style={styles.label}>Tax Type: *</label>
                    <select id="taxType" value={taxTypeId} onChange={(e) => setTaxTypeId(e.target.value)} required style={styles.input} disabled={loading || taxTypeOptions.length === 0}>
                        <option value="">-- Select Type --</option>
                        {taxTypeOptions.map(type => <option key={type.id} value={type.id}>{type.name}</option>)}
                    </select>
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}> {loading ? 'Saving...' : (isEditing ? 'Update Tax' : 'Create Tax')} </button>
                    <button type="button" onClick={() => navigate('/taxes')} style={styles.buttonSecondary} disabled={loading}> Cancel </button>
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

export default TaxForm;
