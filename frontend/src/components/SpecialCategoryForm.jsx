import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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

function SpecialCategoryForm() {
    // Correctly use 'specialCategoryId' to match the route parameter
    const { specialCategoryId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

    // Use 'specialCategoryId' for isEditing check and throughout the component
    const isEditing = Boolean(specialCategoryId);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [pageError, setPageError] = useState(null);
    const [formError, setFormError] = useState('');

    const fetchSpecialCategoryDetails = useCallback(async () => {
        // Use 'specialCategoryId' here
        if (!isEditing || !apiInstance || !isAuthenticated || !specialCategoryId) return;

        console.log(`[SpecialCategoryForm] Fetching details for ID: ${specialCategoryId}`);
        setIsLoading(true);
        setPageError(null);
        try {
            // Use 'specialCategoryId' in the API call
            const response = await apiInstance.get(`/special-categories/${specialCategoryId}`);
            setName(response.data.name);
            setDescription(response.data.description || '');
            console.log("[SpecialCategoryForm] Data fetched:", response.data);
        } catch (err) {
            console.error("[SpecialCategoryForm] Failed to fetch special category:", err);
            setPageError(err.response?.data?.message || "Failed to load special category data.");
        } finally {
            setIsLoading(false);
        }
    }, [specialCategoryId, apiInstance, isAuthenticated, isEditing]); // Add 'specialCategoryId' to dependencies

    useEffect(() => {
        if (isEditing && !authLoading && isAuthenticated && apiInstance) {
            fetchSpecialCategoryDetails();
        } else if (isEditing && !authLoading && !isAuthenticated) {
            setPageError("Please log in to edit special categories.");
        } else if (!isEditing) {
            setName('');
            setDescription('');
            setPageError(null);
            setFormError('');
        }
    }, [isEditing, fetchSpecialCategoryDetails, authLoading, isAuthenticated, apiInstance]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiInstance || !isAuthenticated) {
            setPageError("Authentication error. Please log in again.");
            return;
        }
        if (!name.trim()) {
            setFormError("Category name cannot be empty.");
            return;
        }
        setFormError('');
        setIsLoading(true);
        setPageError(null);

        const categoryData = {
            name: name.trim(),
            description: description.trim() === '' ? null : description.trim(),
        };
        console.log("[SpecialCategoryForm] Submitting data:", categoryData);

        try {
            if (isEditing) {
                // Use 'specialCategoryId' in the API call
                await apiInstance.put(`/special-categories/${specialCategoryId}`, categoryData);
            } else {
                await apiInstance.post('/special-categories', categoryData);
            }
            navigate('/dashboard/special-categories', {
                state: {
                    message: `Special Category "${name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[SpecialCategoryForm] Error saving special category:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} special category.`;
            setPageError(errMsg);
            if (err.response?.data?.errors) {
                setFormError(Object.values(err.response.data.errors).join(', '));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (isLoading && isEditing && !name) return <p style={styles.centeredMessage}>Loading special category details...</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? `Edit Special Category (ID: ${specialCategoryId})` : 'Add New Special Category'}</h2>
            {pageError && <p style={styles.errorBox}>{pageError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="categoryName" style={styles.label}>Category Name: *</label>
                    <input
                        type="text"
                        id="categoryName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={isLoading}
                        placeholder="e.g., Featured, On Sale, New Arrivals"
                    />
                    {formError && <p style={styles.formSpecificErrorText}>{formError}</p>}
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="categoryDescription" style={styles.label}>Description:</label>
                    <textarea
                        id="categoryDescription"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="3"
                        style={styles.textarea}
                        disabled={isLoading}
                        placeholder="Optional: A brief description of the special category"
                    />
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading} style={styles.buttonPrimary}>
                        {isLoading ? 'Saving...' : (isEditing ? 'Update Category' : 'Create Category')}
                    </button>
                    <button type="button" onClick={() => navigate('/dashboard/special-categories')} style={styles.buttonSecondary} disabled={isLoading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default SpecialCategoryForm;