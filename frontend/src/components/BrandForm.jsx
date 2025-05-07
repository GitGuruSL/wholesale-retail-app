import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

// --- Styles (can be kept as is or refactored) ---
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

function BrandForm() {
    const { brandId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth(); // Use AuthContext

    const isEditing = Boolean(brandId);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false); // For form submission and data fetching
    const [pageError, setPageError] = useState(null);   // For page-level errors
    const [formError, setFormError] = useState('');     // For specific field validation errors

    const fetchBrandDetails = useCallback(async () => {
        if (!isEditing || !apiInstance || !isAuthenticated) return;

        console.log(`[BrandForm] Fetching brand details for ID: ${brandId}`);
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get(`/brands/${brandId}`);
            setName(response.data.name);
            setDescription(response.data.description || '');
            console.log("[BrandForm] Brand data fetched:", response.data);
        } catch (err) {
            console.error("[BrandForm] Failed to fetch brand:", err);
            setPageError(err.response?.data?.message || "Failed to load brand data.");
        } finally {
            setIsLoading(false);
        }
    }, [brandId, apiInstance, isAuthenticated, isEditing]);

    useEffect(() => {
        if (isEditing && !authLoading && isAuthenticated && apiInstance) {
            fetchBrandDetails();
        } else if (isEditing && !authLoading && !isAuthenticated) {
            setPageError("Please log in to edit brands.");
        } else if (!isEditing) {
            // Reset form for new brand
            setName('');
            setDescription('');
            setPageError(null);
            setFormError('');
        }
    }, [isEditing, fetchBrandDetails, authLoading, isAuthenticated, apiInstance]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiInstance || !isAuthenticated) {
            setPageError("Authentication error. Please log in again.");
            return;
        }
        if (!name.trim()) {
            setFormError("Brand name cannot be empty.");
            return;
        }
        setFormError('');
        setIsLoading(true);
        setPageError(null);

        const brandData = {
            name: name.trim(),
            description: description.trim() === '' ? null : description.trim(),
        };
        console.log("[BrandForm] Submitting data:", brandData);

        try {
            if (isEditing) {
                await apiInstance.put(`/brands/${brandId}`, brandData);
            } else {
                await apiInstance.post('/brands', brandData);
            }
            navigate('/dashboard/brands', { // Ensure path matches App.jsx
                state: {
                    message: `Brand "${name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[BrandForm] Error saving brand:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} brand.`;
            setPageError(errMsg);
            if (err.response?.data?.errors) {
                setFormError(Object.values(err.response.data.errors).join(', '));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (isLoading && isEditing && !name) return <p style={styles.centeredMessage}>Loading brand details...</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Brand' : 'Add New Brand'}</h2>
            {pageError && <p style={styles.errorBox}>{pageError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="brandName" style={styles.label}>Brand Name: *</label>
                    <input
                        type="text"
                        id="brandName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={isLoading}
                        placeholder="e.g., Sony, Apple, Samsung"
                    />
                    {formError && <p style={styles.formSpecificErrorText}>{formError}</p>}
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="brandDescription" style={styles.label}>Description:</label>
                    <textarea
                        id="brandDescription"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="3"
                        style={styles.textarea}
                        disabled={isLoading}
                        placeholder="Optional: A brief description of the brand"
                    />
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading} style={styles.buttonPrimary}>
                        {isLoading ? 'Saving...' : (isEditing ? 'Update Brand' : 'Create Brand')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/brands')} // Ensure path matches App.jsx
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

export default BrandForm;