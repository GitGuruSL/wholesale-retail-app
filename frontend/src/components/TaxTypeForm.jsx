import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function TaxTypeForm() {
    // Correctly use 'taxTypeId' to match the route parameter
    const { taxTypeId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

    // Use 'taxTypeId' for isEditing check and throughout the component
    const isEditing = Boolean(taxTypeId);

    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formError, setFormError] = useState(null);

    const fetchTaxTypeDetails = useCallback(async () => {
        // Use 'taxTypeId' here
        if (!isEditing || !apiInstance || !isAuthenticated || !taxTypeId) return;

        console.log(`[TaxTypeForm] Fetching details for ID: ${taxTypeId}`);
        setIsLoading(true);
        setPageError(null);
        setFormError(null);
        try {
            // Use 'taxTypeId' in the API call
            const response = await apiInstance.get(`/tax-types/${taxTypeId}`);
            setName(response.data.name);
            console.log("[TaxTypeForm] Data fetched:", response.data);
        } catch (err) {
            console.error("[TaxTypeForm] Failed to fetch tax type:", err);
            setPageError(err.response?.data?.message || "Failed to load tax type data.");
        } finally {
            setIsLoading(false);
        }
    }, [taxTypeId, apiInstance, isAuthenticated, isEditing]); // Add 'taxTypeId' to dependencies

    useEffect(() => {
        if (isEditing && !authLoading && isAuthenticated && apiInstance) {
            fetchTaxTypeDetails();
        } else if (isEditing && !authLoading && !isAuthenticated) {
            setPageError("Please log in to edit tax types.");
        } else if (!isEditing) {
            setName('');
            setPageError(null);
            setFormError(null);
        }
    }, [isEditing, fetchTaxTypeDetails, authLoading, isAuthenticated, apiInstance]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiInstance || !isAuthenticated) {
            setFormError("Authentication error. Please log in again.");
            return;
        }

        if (!name.trim()) {
            setFormError("Tax type name cannot be empty.");
            return;
        }
        setFormError(null);
        setIsLoading(true);
        setPageError(null);

        const typeData = { name: name.trim() };
        console.log("[TaxTypeForm] Submitting data:", typeData);

        try {
            if (isEditing) {
                // Use 'taxTypeId' in the API call
                await apiInstance.put(`/tax-types/${taxTypeId}`, typeData);
            } else {
                await apiInstance.post('/tax-types', typeData);
            }
            navigate('/dashboard/tax-types', {
                state: {
                    message: `Tax Type "${name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[TaxTypeForm] Error saving tax type:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} tax type.`;
            setFormError(errMsg);
            if (err.response?.data?.errors) {
                setFormError(Object.values(err.response.data.errors).join(', '));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (isLoading && isEditing && !name) return <p style={styles.centeredMessage}>Loading tax type details...</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? `Edit Tax Type (ID: ${taxTypeId})` : 'Add New Tax Type'}</h2>
            {pageError && <p style={styles.errorBox}>Error: {pageError}</p>}
            {formError && <p style={{...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red'}}>Error: {formError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="typeName" style={styles.label}>Type Name: *</label>
                    <input
                        type="text"
                        id="typeName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={isLoading}
                        placeholder="e.g., Percentage, Fixed Amount, Per Item"
                    />
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading} style={styles.buttonPrimary}>
                        {isLoading ? 'Saving...' : (isEditing ? 'Update Type' : 'Create Type')}
                    </button>
                    <button type="button" onClick={() => navigate('/dashboard/tax-types')} style={styles.buttonSecondary} disabled={isLoading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

const styles = {
    container: { padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { marginBottom: '25px', color: '#333', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2', textAlign: 'center' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default TaxTypeForm;