import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios'; // REMOVE THIS
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

// const API_BASE_URL = 'http://localhost:5001/api'; // REMOVE THIS

function TaxForm() {
    const { taxId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth(); // Use AuthContext

    const isEditing = Boolean(taxId);

    const [name, setName] = useState('');
    const [rate, setRate] = useState('');
    const [taxTypeId, setTaxTypeId] = useState('');
    const [taxTypeOptions, setTaxTypeOptions] = useState([]);

    const [isLoading, setIsLoading] = useState(false); // Component-specific loading
    const [pageError, setPageError] = useState(null); // For general page errors
    const [formError, setFormError] = useState(null); // For form submission/validation errors
    const [loadingDropdownError, setLoadingDropdownError] = useState(null); // For tax type dropdown loading error

    const fetchTaxTypes = useCallback(async () => {
        if (!apiInstance || !isAuthenticated) return;
        setIsLoading(true); // Indicate loading for dropdown
        setLoadingDropdownError(null);
        try {
            const response = await apiInstance.get('/tax-types');
            setTaxTypeOptions(response.data || []);
        } catch (err) {
            console.error("[TaxForm] Error fetching tax types:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load tax types.';
            setLoadingDropdownError(errorMsg);
            setTaxTypeOptions([]);
        } finally {
            if (!isEditing || (isEditing && !taxId)) { // Only stop general loading if not editing or no taxId yet
                 setIsLoading(false);
            }
        }
    }, [apiInstance, isAuthenticated, isEditing, taxId]);

    const fetchTaxData = useCallback(async () => {
        if (!isEditing || !taxId || !apiInstance || !isAuthenticated) return;
        setIsLoading(true); // Indicate loading for tax data
        setPageError(null);
        try {
            const response = await apiInstance.get(`/taxes/${taxId}`);
            const data = response.data;
            setName(data.name);
            setRate(data.rate.toString());
            setTaxTypeId(data.tax_type_id.toString());
        } catch (err) {
            console.error("[TaxForm] Error fetching tax details:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load tax data.';
            setPageError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [isEditing, taxId, apiInstance, isAuthenticated]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchTaxTypes().then(() => { // Fetch tax types first
                if (isEditing && taxId) {
                    fetchTaxData(); // Then fetch tax data if editing
                } else if (!isEditing) {
                    // Reset form for new tax
                    setName('');
                    setRate('');
                    setTaxTypeId('');
                    setPageError(null);
                    setFormError(null);
                }
            });
        } else if (!authLoading && !isAuthenticated) {
            setPageError('Authentication required. Please log in.');
            setIsLoading(false);
        }
    }, [authLoading, isAuthenticated, apiInstance, isEditing, taxId, fetchTaxTypes, fetchTaxData]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiInstance || !isAuthenticated) {
            setFormError("Authentication error. Please log in again.");
            return;
        }
        setIsLoading(true);
        setPageError(null);
        setFormError(null);

        const parsedRate = parseFloat(rate);
        const parsedTypeId = parseInt(taxTypeId, 10);

        if (!name.trim()) { setFormError("Tax name is required."); setIsLoading(false); return; }
        if (isNaN(parsedRate) || parsedRate < 0) { setFormError("A valid non-negative numeric rate is required."); setIsLoading(false); return; }
        if (!taxTypeId || isNaN(parsedTypeId)) { setFormError("A valid tax type must be selected."); setIsLoading(false); return; }

        const taxData = { name: name.trim(), rate: parsedRate, tax_type_id: parsedTypeId };

        try {
            if (isEditing) {
                await apiInstance.put(`/taxes/${taxId}`, taxData);
            } else {
                await apiInstance.post('/taxes', taxData);
            }
            // Ensure path matches App.jsx, e.g., /dashboard/taxes
            navigate('/dashboard/taxes', {
                state: {
                    message: `Tax "${taxData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[TaxForm] Error saving tax:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} tax.`;
            setFormError(errMsg);
            if (err.response?.data?.errors) { // For backend field-specific errors
                setFormError(Object.values(err.response.data.errors).join(', '));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (loadingDropdownError) return <p style={styles.errorBox}>Error loading dependencies: {loadingDropdownError}</p>;
    // Show general loading if component is loading and not yet editing, or if editing but name isn't populated
    if (isLoading && ((isEditing && !name) || !isEditing)) return <p style={styles.centeredMessage}>Loading form...</p>;


    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? `Edit Tax (ID: ${taxId})` : 'Add New Tax'}</h2>
            {pageError && <p style={styles.errorBox}>Page Error: {pageError}</p>}
            {formError && <p style={{...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red'}}>Form Error: {formError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="taxName" style={styles.label}>Tax Name: *</label>
                    <input type="text" id="taxName" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} disabled={isLoading} placeholder="e.g., VAT 5%, GST 10%"/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="taxRate" style={styles.label}>Rate (%): *</label>
                    <input type="number" id="taxRate" value={rate} onChange={(e) => setRate(e.target.value)} required style={styles.input} disabled={isLoading} step="any" min="0" placeholder="e.g., 5 or 10.5"/>
                </div>
                 <div style={styles.formGroup}>
                    <label htmlFor="taxType" style={styles.label}>Tax Type: *</label>
                    <select id="taxType" value={taxTypeId} onChange={(e) => setTaxTypeId(e.target.value)} required style={styles.input} disabled={isLoading || taxTypeOptions.length === 0}>
                        <option value="">-- Select Type --</option>
                        {taxTypeOptions.map(type => <option key={type.id} value={type.id.toString()}>{type.name}</option>)}
                    </select>
                    {taxTypeOptions.length === 0 && !isLoading && !loadingDropdownError && <p style={styles.fieldHelperText}>No tax types available. Please add tax types first.</p>}
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading} style={styles.buttonPrimary}> {isLoading ? 'Saving...' : (isEditing ? 'Update Tax' : 'Create Tax')} </button>
                    {/* Ensure path matches App.jsx, e.g., /dashboard/taxes */}
                    <button type="button" onClick={() => navigate('/dashboard/taxes')} style={styles.buttonSecondary} disabled={isLoading}> Cancel </button>
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
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2', textAlign: 'center' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    fieldHelperText: { fontSize: '0.9em', color: '#666', marginTop: '5px' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default TaxForm;