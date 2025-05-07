import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const styles = {
    container: { padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { marginBottom: '25px', color: '#333', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px'},
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2', textAlign: 'center' },
    formSpecificErrorText: { color: 'red', fontSize: '0.9em', marginTop: '5px'},
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

function BarcodeSymbologyForm() {
    // Correctly use 'barcodeSymbologyId' to match the route parameter
    const { barcodeSymbologyId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

    // Use 'barcodeSymbologyId' for isEditing check and throughout the component
    const isEditing = Boolean(barcodeSymbologyId);

    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formError, setFormError] = useState('');

    const fetchSymbologyDetails = useCallback(async () => {
        // Use 'barcodeSymbologyId' here
        if (!isEditing || !apiInstance || !isAuthenticated || !barcodeSymbologyId) return;

        console.log(`[BarcodeSymbologyForm] Fetching details for ID: ${barcodeSymbologyId}`);
        setIsLoading(true);
        setPageError(null);
        try {
            // Use 'barcodeSymbologyId' in the API call
            const response = await apiInstance.get(`/barcode-symbologies/${barcodeSymbologyId}`);
            setName(response.data.name);
            console.log("[BarcodeSymbologyForm] Data fetched:", response.data);
        } catch (err) {
            console.error("[BarcodeSymbologyForm] Failed to fetch symbology:", err);
            setPageError(err.response?.data?.message || "Failed to load symbology data.");
        } finally {
            setIsLoading(false);
        }
    }, [barcodeSymbologyId, apiInstance, isAuthenticated, isEditing]); // Add 'barcodeSymbologyId' to dependencies

    useEffect(() => {
        if (isEditing && !authLoading && isAuthenticated && apiInstance) {
            fetchSymbologyDetails();
        } else if (isEditing && !authLoading && !isAuthenticated) {
            setPageError("Please log in to edit symbology types.");
        } else if (!isEditing) { // Reset form for create mode
            setName('');
            setPageError(null);
            setFormError('');
        }
    }, [isEditing, fetchSymbologyDetails, authLoading, isAuthenticated, apiInstance]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiInstance || !isAuthenticated) {
            setPageError("Authentication error. Please log in again.");
            return;
        }
        if (!name.trim()) {
            setFormError("Symbology name cannot be empty.");
            return;
        }
        setFormError('');
        setIsLoading(true);
        setPageError(null);

        const symbologyData = { name: name.trim() };
        console.log("[BarcodeSymbologyForm] Submitting data:", symbologyData);

        try {
            if (isEditing) {
                // Use 'barcodeSymbologyId' in the API call
                await apiInstance.put(`/barcode-symbologies/${barcodeSymbologyId}`, symbologyData);
            } else {
                await apiInstance.post('/barcode-symbologies', symbologyData);
            }
            navigate('/dashboard/barcode-symbologies', {
                state: {
                    message: `Barcode Type "${name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[BarcodeSymbologyForm] Error saving symbology:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} symbology.`;
            setPageError(errMsg);
            if (err.response?.data?.errors) {
                setFormError(Object.values(err.response.data.errors).join(', '));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (isLoading && isEditing && !name && !pageError) return <p style={styles.centeredMessage}>Loading symbology details...</p>;

    return (
        <div style={styles.container}>
            {/* Display barcodeSymbologyId in the title if editing */}
            <h2 style={styles.title}>{isEditing ? `Edit Barcode Type (ID: ${barcodeSymbologyId})` : 'Add New Barcode Type'}</h2>
            {pageError && <p style={styles.errorBox}>{pageError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="symbologyName" style={styles.label}>Symbology Name: *</label>
                    <input
                        type="text"
                        id="symbologyName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={isLoading}
                        placeholder="e.g., Code 128, EAN-13, QR Code"
                    />
                    {formError && <p style={styles.formSpecificErrorText}>{formError}</p>}
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading} style={styles.buttonPrimary}>
                        {isLoading ? 'Saving...' : (isEditing ? 'Update Type' : 'Create Type')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/barcode-symbologies')}
                        style={styles.buttonSecondary}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default BarcodeSymbologyForm;