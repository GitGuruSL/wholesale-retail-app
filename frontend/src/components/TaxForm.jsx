import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function TaxForm() {
    const { taxId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(taxId);

    const [name, setName] = useState('');
    const [rate, setRate] = useState('');
    const [taxTypeId, setTaxTypeId] = useState('');
    const [taxTypeOptions, setTaxTypeOptions] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingError, setLoadingError] = useState(null); // For dropdown loading

    const fetchTaxTypes = useCallback(async (token) => {
        setLoading(true);
        setLoadingError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_BASE_URL}/tax-types`, config);
            setTaxTypeOptions(response.data || []);
            if (!isEditing) setLoading(false); // Only stop general loading if not editing
        } catch (err) {
            console.error("Error fetching tax types:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load tax types.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setLoadingError('Unauthorized: Could not fetch tax types. Please log in again.');
            } else {
                setLoadingError(errorMsg);
            }
            setTaxTypeOptions([]);
            setLoading(false);
        }
    }, [isEditing]);

    const fetchTaxData = useCallback(async (token) => {
        if (!isEditing) return;
        setLoading(true);
        setError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_BASE_URL}/taxes/${taxId}`, config);
            const data = response.data;
            setName(data.name);
            setRate(data.rate.toString());
            setTaxTypeId(data.tax_type_id.toString()); // Ensure it's a string for select
            setLoading(false);
        } catch (err) {
            console.error("Error fetching tax details:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load tax data.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch tax. Please log in again.');
            } else {
                setError(errorMsg);
            }
            setLoading(false);
        }
    }, [isEditing, taxId]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Authentication token not found. Please log in.');
            setLoading(false);
            // navigate('/login'); // Optionally redirect
            return;
        }
        fetchTaxTypes(token);
    }, [fetchTaxTypes, navigate]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token && isEditing) {
            setError('Authentication token not found. Please log in.');
            setLoading(false);
            return;
        }
        if (isEditing && (taxTypeOptions.length > 0 || loadingError === null)) { // Proceed if types loaded or no error yet
            fetchTaxData(token);
        } else if (!isEditing) {
            setName('');
            setRate('');
            setTaxTypeId('');
            setError(null);
        }
    }, [isEditing, taxTypeOptions.length, loadingError, fetchTaxData, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const parsedRate = parseFloat(rate);
        const parsedTypeId = parseInt(taxTypeId, 10);

        if (!name.trim()) { setError("Tax name is required."); setLoading(false); return; }
        if (isNaN(parsedRate) || parsedRate < 0) { setError("A valid non-negative numeric rate is required."); setLoading(false); return; }
        if (!taxTypeId || isNaN(parsedTypeId)) { setError("A valid tax type must be selected."); setLoading(false); return; }

        const taxData = { name: name.trim(), rate: parsedRate, tax_type_id: parsedTypeId };

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setLoading(false);
                // navigate('/login'); // Optionally redirect
                return;
            }
            const config = { headers: { Authorization: `Bearer ${token}` } };

            if (isEditing) {
                await axios.put(`${API_BASE_URL}/taxes/${taxId}`, taxData, config);
            } else {
                await axios.post(`${API_BASE_URL}/taxes`, taxData, config);
            }
            navigate('/taxes');
        } catch (err) {
            console.error("Error saving tax:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} tax.`;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not save tax. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loadingError) return <p style={styles.errorBox}>Error: {loadingError}</p>;
    if (loading && (!isEditing || !name)) return <p style={styles.centeredMessage}>Loading...</p>;


    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Tax' : 'Add New Tax'}</h2>
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
                        {taxTypeOptions.map(type => <option key={type.id} value={type.id.toString()}>{type.name}</option>)}
                    </select>
                    {taxTypeOptions.length === 0 && !loading && !loadingError && <p style={styles.fieldHelperText}>No tax types available. Please add tax types first.</p>}
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}> {loading ? 'Saving...' : (isEditing ? 'Update Tax' : 'Create Tax')} </button>
                    <button type="button" onClick={() => navigate('/taxes')} style={styles.buttonSecondary} disabled={loading}> Cancel </button>
                </div>
            </form>
        </div>
    );
}

// Consistent Form Styles
const styles = {
    container: { padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { marginBottom: '25px', color: '#333', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    fieldHelperText: { fontSize: '0.9em', color: '#666', marginTop: '5px' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default TaxForm;