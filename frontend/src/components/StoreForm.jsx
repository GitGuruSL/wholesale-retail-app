import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios'; // REMOVE THIS
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

// const API_BASE_URL = 'http://localhost:5001/api'; // REMOVE THIS

function StoreForm() {
    const { storeId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth(); // Use AuthContext

    const isEditing = Boolean(storeId);

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Renamed from 'loading'
    const [pageError, setPageError] = useState(null);   // Renamed from 'error'
    const [formError, setFormError] = useState('');     // For specific field validation errors

    const fetchStoreDetails = useCallback(async () => {
        if (!isEditing || !apiInstance || !isAuthenticated) return;

        console.log(`[StoreForm] Fetching details for ID: ${storeId}`);
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get(`/stores/${storeId}`);
            const data = response.data;
            setName(data.name);
            setAddress(data.address || '');
            setContactInfo(data.contact_info || '');
            console.log("[StoreForm] Data fetched:", data);
        } catch (err) {
            console.error("[StoreForm] Failed to fetch store:", err);
            setPageError(err.response?.data?.message || "Failed to load store data.");
        } finally {
            setIsLoading(false);
        }
    }, [storeId, apiInstance, isAuthenticated, isEditing]);

    useEffect(() => {
        if (isEditing && !authLoading && isAuthenticated && apiInstance) {
            fetchStoreDetails();
        } else if (isEditing && !authLoading && !isAuthenticated) {
            setPageError("Please log in to edit stores.");
        } else if (!isEditing) {
            // Reset form for new store
            setName('');
            setAddress('');
            setContactInfo('');
            setPageError(null);
            setFormError('');
        }
    }, [isEditing, fetchStoreDetails, authLoading, isAuthenticated, apiInstance]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiInstance || !isAuthenticated) {
            setPageError("Authentication error. Please log in again.");
            return;
        }

        const storeData = {
            name: name.trim(),
            address: address.trim() === '' ? null : address.trim(),
            contact_info: contactInfo.trim() === '' ? null : contactInfo.trim(),
        };

        if (!storeData.name) {
            setFormError("Store name cannot be empty.");
            setPageError(''); // Clear page error if it was a submission error
            return;
        }
        setFormError('');
        setIsLoading(true);
        setPageError(null);
        console.log("[StoreForm] Submitting data:", storeData);

        try {
            if (isEditing) {
                await apiInstance.put(`/stores/${storeId}`, storeData);
            } else {
                await apiInstance.post('/stores', storeData);
            }
            // Ensure path matches App.jsx, e.g., /dashboard/stores
            navigate('/dashboard/stores', {
                state: {
                    message: `Store "${storeData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[StoreForm] Error saving store:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} store.`;
            setPageError(errMsg);
            if (err.response?.data?.errors) { // For backend field-specific errors
                setFormError(Object.values(err.response.data.errors).join(', '));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    // Show loading for edit mode only if data isn't fetched yet
    if (isLoading && isEditing && !name) return <p style={styles.centeredMessage}>Loading store details...</p>;


    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Store' : 'Add New Store'}</h2>
            {pageError && <p style={styles.errorBox}>{pageError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="storeName" style={styles.label}>Store Name: *</label>
                    <input
                        type="text"
                        id="storeName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={isLoading}
                        placeholder="e.g., Main Branch, Downtown Outlet"
                    />
                    {formError && <p style={styles.formSpecificErrorText}>{formError}</p>}
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="storeAddress" style={styles.label}>Address:</label>
                    <textarea
                        id="storeAddress"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows="3"
                        style={styles.textarea}
                        disabled={isLoading}
                        placeholder="e.g., 123 Main St, Anytown, USA"
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="storeContact" style={styles.label}>Contact Info:</label>
                    <input
                        type="text"
                        id="storeContact"
                        value={contactInfo}
                        onChange={(e) => setContactInfo(e.target.value)}
                        style={styles.input}
                        disabled={isLoading}
                        placeholder="e.g., (555) 123-4567, manager@example.com"
                    />
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading} style={styles.buttonPrimary}>
                        {isLoading ? 'Saving...' : (isEditing ? 'Update Store' : 'Create Store')}
                    </button>
                    {/* Ensure path matches App.jsx, e.g., /dashboard/stores */}
                    <button type="button" onClick={() => navigate('/dashboard/stores')} style={styles.buttonSecondary} disabled={isLoading}>
                        Cancel
                    </button>
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
    formSpecificErrorText: { color: 'red', fontSize: '0.9em', marginTop: '5px'},
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    textarea: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontSize: '1em' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default StoreForm;