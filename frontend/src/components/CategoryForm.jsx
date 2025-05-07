import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Consistent styling (can be shared or component-specific)
const styles = {
    formContainer: { padding: '20px', maxWidth: '600px', margin: '20px auto', boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { textAlign: 'center', color: '#333', marginBottom: '25px'},
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1em' },
    buttonContainer: { marginTop: '25px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    button: { padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold' },
    buttonSave: { backgroundColor: '#28a745', color: 'white' },
    buttonCancel: { backgroundColor: '#6c757d', color: 'white' },
    errorText: { color: 'red', marginBottom: '15px', textAlign: 'center' },
    formSpecificErrorText: { color: 'red', fontSize: '0.9em', marginTop: '5px'},
    centeredMessage: { textAlign: 'center', padding: '30px', fontSize: '1.1em', color: '#666' }
};

const CategoryForm = () => {
    const { categoryId } = useParams(); // For edit mode
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth(); // Using api.js via AuthContext

    const [name, setName] = useState('');
    // Add other fields like description if needed
    // const [description, setDescription] = useState('');

    const [isLoading, setIsLoading] = useState(false); // For form submission and data fetching
    const [pageError, setPageError] = useState(null);   // For errors like fetching data
    const [formError, setFormError] = useState('');     // For specific field validation errors

    const isEditMode = Boolean(categoryId);

    // Fetch category data if in edit mode
    const fetchCategoryDetails = useCallback(async () => {
        if (!isEditMode || !apiInstance || !isAuthenticated) return;

        console.log(`[CategoryForm] Fetching category details for ID: ${categoryId}`);
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get(`/categories/${categoryId}`);
            setName(response.data.name);
            // setDescription(response.data.description || '');
            console.log("[CategoryForm] Category data fetched:", response.data);
        } catch (err) {
            console.error("[CategoryForm] Failed to fetch category:", err);
            setPageError(err.response?.data?.message || "Failed to load category data. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [categoryId, apiInstance, isAuthenticated, isEditMode]);

    useEffect(() => {
        if (isEditMode && !authLoading && isAuthenticated && apiInstance) {
            fetchCategoryDetails();
        }
    }, [isEditMode, fetchCategoryDetails, authLoading, isAuthenticated, apiInstance]);

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

        const categoryData = { name /*, description */ };
        console.log("[CategoryForm] Submitting data:", categoryData);

        try {
            if (isEditMode) {
                await apiInstance.put(`/categories/${categoryId}`, categoryData);
                console.log("[CategoryForm] Category updated successfully.");
            } else {
                await apiInstance.post('/categories', categoryData);
                console.log("[CategoryForm] Category created successfully.");
            }
            navigate('/dashboard/categories', { state: { message: `Category "${name}" ${isEditMode ? 'updated' : 'created'} successfully.`, type: 'success' } });
        } catch (err) {
            console.error("[CategoryForm] Failed to save category:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} category.`;
            setPageError(errMsg);
            if (err.response?.data?.errors) { // Example: if backend sends specific field errors
                setFormError(Object.values(err.response.data.errors).join(', '));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (!isAuthenticated) return <p style={styles.centeredMessage}>Please log in to manage categories.</p>;
    if (isLoading && isEditMode && !name) return <p style={styles.centeredMessage}>Loading category data...</p>; // Show loading only if data not yet fetched for edit

    return (
        <div style={styles.formContainer}>
            <h2 style={styles.title}>{isEditMode ? 'Edit Category' : 'Add New Category'}</h2>
            {pageError && <p style={styles.errorText}>{pageError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="name" style={styles.label}>Category Name:</label>
                    <input
                        type="text"
                        id="name"
                        style={styles.input}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Electronics, Books"
                    />
                    {formError && <p style={styles.formSpecificErrorText}>{formError}</p>}
                </div>

                {/* Example for a description field:
                <div style={styles.formGroup}>
                    <label htmlFor="description" style={styles.label}>Description (Optional):</label>
                    <textarea
                        id="description"
                        style={{...styles.input, height: '100px'}}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="A brief description of the category"
                    />
                </div>
                */}

                <div style={styles.buttonContainer}>
                    <button type="button" onClick={() => navigate('/dashboard/categories')} style={{...styles.button, ...styles.buttonCancel}} disabled={isLoading}>
                        Cancel
                    </button>
                    <button type="submit" style={{...styles.button, ...styles.buttonSave}} disabled={isLoading}>
                        {isLoading ? 'Saving...' : (isEditMode ? 'Update Category' : 'Create Category')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CategoryForm;