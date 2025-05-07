import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function DiscountTypeForm() {
    // Changed 'typeId' to 'discountTypeId' to match the route parameter name
    const { discountTypeId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

    // Use 'discountTypeId' throughout this component instead of 'typeId' for the route param
    const isEditing = Boolean(discountTypeId);

    console.log(`[DiscountTypeForm] Initializing. Is Editing: ${isEditing}, Discount Type ID: ${discountTypeId}`);

    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState(null);
    const [pageError, setPageError] = useState(null);

    const fetchDiscountTypeData = useCallback(async () => {
        console.log(`[fetchDiscountTypeData] Attempting to fetch. discountTypeId: ${discountTypeId}, apiInstance ready: ${!!apiInstance}`);
        if (!discountTypeId || !apiInstance) {
            if (!discountTypeId) console.warn("[fetchDiscountTypeData] No discountTypeId provided for editing.");
            if (!apiInstance) console.warn("[fetchDiscountTypeData] API instance not available.");
            setPageError(apiInstance ? "Discount Type ID is missing." : "API service not available.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setPageError(null);
        try {
            console.log(`[fetchDiscountTypeData] Fetching discount type with ID: ${discountTypeId}`);
            const response = await apiInstance.get(`/discount-types/${discountTypeId}`);
            console.log("[fetchDiscountTypeData] Raw data received:", response.data);

            if (response.data && response.data.name !== undefined) {
                setName(response.data.name);
                console.log("[fetchDiscountTypeData] Name set:", response.data.name);
            } else {
                console.error("[fetchDiscountTypeData] 'name' not in response or data is invalid. Data:", response.data);
                setPageError("Received invalid data for discount type.");
            }
        } catch (err) {
            console.error("[fetchDiscountTypeData] Error:", err.response || err.message || err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to load discount type data.';
            setPageError(errorMsg);
        } finally {
            setLoading(false);
            console.log("[fetchDiscountTypeData] Fetch attempt finished.");
        }
    }, [discountTypeId, apiInstance]);

    useEffect(() => {
        console.log(`[DiscountTypeForm useEffect] AuthLoading: ${authLoading}, IsAuthenticated: ${isAuthenticated}, IsEditing: ${isEditing}, DiscountTypeID: ${discountTypeId}`);
        if (authLoading) {
            console.log("[DiscountTypeForm useEffect] Auth is loading, returning.");
            return;
        }
        if (!isAuthenticated) {
            setPageError("Authentication required. Please log in.");
            setLoading(false);
            console.log("[DiscountTypeForm useEffect] Not authenticated.");
            return;
        }

        if (isEditing) {
            if (apiInstance) {
                fetchDiscountTypeData();
            } else if (!authLoading) {
                setPageError("API client not available. Cannot fetch data.");
                setLoading(false);
            }
        } else {
            setName('');
            setPageError(null);
            setFormError(null);
            setLoading(false);
            console.log("[DiscountTypeForm useEffect] Create mode, form reset.");
        }
    }, [isEditing, discountTypeId, authLoading, isAuthenticated, apiInstance, fetchDiscountTypeData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("[handleSubmit] Form submitted.");
        if (!apiInstance || !isAuthenticated) {
            setFormError("Authentication error or API not available. Please log in again.");
            return;
        }

        setFormError(null);
        const typeData = { name: name.trim() };
        if (!typeData.name) {
            setFormError("Discount type name cannot be empty.");
            return;
        }
        console.log("[handleSubmit] Data to be sent:", typeData);
        setLoading(true);

        try {
            if (isEditing) {
                console.log(`[handleSubmit] Updating discount type ID: ${discountTypeId}`);
                await apiInstance.put(`/discount-types/${discountTypeId}`, typeData);
            } else {
                console.log("[handleSubmit] Creating new discount type.");
                await apiInstance.post('/discount-types', typeData);
            }
            navigate('/dashboard/discount-types', {
                state: {
                    message: `Discount type "${typeData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[handleSubmit] Error saving discount type:", err.response || err.message || err);
            const errorMsg = err.response?.data?.message || err.message || `Failed to ${isEditing ? 'update' : 'create'} discount type.`;
            setFormError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (loading && isEditing && !name) return <p style={styles.centeredMessage}>Loading discount type details...</p>;

    if (pageError && isEditing) {
        return (
            <div style={styles.container}>
                <h2 style={styles.title}>Edit Discount Type</h2>
                <p style={styles.errorBox}>Page Error: {pageError}</p>
                <button type="button" onClick={() => navigate('/dashboard/discount-types')} style={styles.buttonSecondary}>
                    Back to List
                </button>
            </div>
        );
    }
    if (pageError && !isEditing) {
         return (
            <div style={styles.container}>
                <h2 style={styles.title}>Add New Discount Type</h2>
                <p style={styles.errorBox}>Page Error: {pageError}</p>
                 <button type="button" onClick={() => navigate('/dashboard/discount-types')} style={styles.buttonSecondary}>Back to List</button>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? `Edit Discount Type (ID: ${discountTypeId})` : 'Add New Discount Type'}</h2>
            {formError && <p style={{...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red'}}>Form Error: {formError}</p>}
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
                        disabled={loading}
                        placeholder="e.g., Percentage, Fixed Amount"
                    />
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}>
                        {loading ? 'Saving...' : (isEditing ? 'Update Type' : 'Create Type')}
                    </button>
                    <button type="button" onClick={() => navigate('/dashboard/discount-types')} style={styles.buttonSecondary} disabled={loading}>
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

export default DiscountTypeForm;