import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Re-using styles or define new ones
const styles = {
    formContainer: { padding: '20px', maxWidth: '600px', margin: '20px auto', boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: '8px' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold' },
    input: { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    select: { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' },
    buttonContainer: { marginTop: '20px', textAlign: 'right' },
    button: { padding: '10px 15px', marginLeft: '10px', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    buttonSave: { backgroundColor: '#28a745', color: 'white' },
    buttonCancel: { backgroundColor: '#6c757d', color: 'white' },
    errorText: { color: 'red', marginBottom: '10px' },
    centeredMessage: { textAlign: 'center', padding: '20px' }
};

const SubCategoryForm = () => {
    const { subCategoryId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState(''); // For parent category
    const [categories, setCategories] = useState([]); // To populate dropdown

    const [isLoading, setIsLoading] = useState(false); // For form submission/data loading
    const [pageError, setPageError] = useState(null);
    const [formError, setFormError] = useState('');

    const isEditMode = Boolean(subCategoryId);

    // Fetch categories for the dropdown
    const fetchParentCategories = useCallback(async () => {
        if (!apiInstance || !isAuthenticated) return;
        try {
            const response = await apiInstance.get('/categories'); // Assuming this endpoint exists
            setCategories(response.data || []);
        } catch (err) {
            console.error("Failed to fetch parent categories:", err);
            setPageError("Could not load parent categories for selection.");
        }
    }, [apiInstance, isAuthenticated]);

    // Fetch sub-category data if in edit mode
    const fetchSubCategory = useCallback(async () => {
        if (!isEditMode || !apiInstance || !isAuthenticated) return;
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get(`/sub-categories/${subCategoryId}`);
            setName(response.data.name);
            setCategoryId(response.data.category_id || ''); // Assuming backend sends category_id
        } catch (err) {
            console.error("Failed to fetch sub-category:", err);
            setPageError(err.response?.data?.message || "Failed to load sub-category data.");
        } finally {
            setIsLoading(false);
        }
    }, [subCategoryId, apiInstance, isAuthenticated, isEditMode]);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            fetchParentCategories(); // Load categories for dropdown
            if (isEditMode) {
                fetchSubCategory();
            }
        }
    }, [isEditMode, fetchSubCategory, fetchParentCategories, authLoading, isAuthenticated]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiInstance || !isAuthenticated) {
            setPageError("Not authenticated or API client not available.");
            return;
        }
        if (!name.trim()) {
            setFormError("Sub-category name cannot be empty.");
            return;
        }
        if (!categoryId) {
            setFormError("Please select a parent category.");
            return;
        }
        setFormError('');
        setIsLoading(true);
        setPageError(null);

        const subCategoryData = { name, category_id: categoryId };

        try {
            if (isEditMode) {
                await apiInstance.put(`/sub-categories/${subCategoryId}`, subCategoryData);
            } else {
                await apiInstance.post('/sub-categories', subCategoryData);
            }
            navigate('/dashboard/sub-categories');
        } catch (err) {
            console.error("Failed to save sub-category:", err);
            setPageError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} sub-category.`);
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (!isAuthenticated) return <p style={styles.centeredMessage}>Please log in to manage sub-categories.</p>;
    // More refined loading state for edit mode
    if (isEditMode && isLoading && !name) return <p style={styles.centeredMessage}>Loading sub-category data...</p>;
    if (pageError) return <p style={{ ...styles.errorText, ...styles.centeredMessage }}>Error: {pageError}</p>;


    return (
        <div style={styles.formContainer}>
            <h2>{isEditMode ? 'Edit Sub-Category' : 'Add New Sub-Category'}</h2>
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="name" style={styles.label}>Sub-Category Name:</label>
                    <input
                        type="text"
                        id="name"
                        style={styles.input}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="categoryId" style={styles.label}>Parent Category:</label>
                    <select
                        id="categoryId"
                        style={styles.select}
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        required
                    >
                        <option value="">Select Parent Category</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                {formError && <p style={styles.errorText}>{formError}</p>}
                <div style={styles.buttonContainer}>
                     <button type="button" onClick={() => navigate('/dashboard/sub-categories')} style={{...styles.button, ...styles.buttonCancel}} disabled={isLoading}>
                        Cancel
                    </button>
                    <button type="submit" style={{...styles.button, ...styles.buttonSave}} disabled={isLoading}>
                        {isLoading ? 'Saving...' : (isEditMode ? 'Update Sub-Category' : 'Create Sub-Category')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SubCategoryForm;