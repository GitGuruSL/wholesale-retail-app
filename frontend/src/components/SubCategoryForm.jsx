// frontend/src/components/SubCategoryForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function SubCategoryForm() {
    const { subCategoryId } = useParams(); // Get ID from URL if editing
    const navigate = useNavigate();
    const isEditing = Boolean(subCategoryId);

    // State
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState(''); // State for selected parent category ID
    const [parentCategories, setParentCategories] = useState([]); // State for parent category dropdown options
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingError, setLoadingError] = useState(null); // Separate error for loading initial data

    // Fetch parent categories for the dropdown
    useEffect(() => {
        setLoading(true); // Use main loading indicator for dropdown fetch
        setLoadingError(null);
        axios.get(`${API_BASE_URL}/categories`) // Fetch parent categories
            .then(response => {
                setParentCategories(response.data);
                // Don't stop loading here if we are editing, wait for sub-category data
                if (!isEditing) setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching parent categories:", err);
                setLoadingError('Failed to load parent categories for dropdown.');
                setLoading(false); // Stop loading on error
            });
    }, [isEditing]); // Refetch if mode changes (though unlikely needed)

    // Fetch existing sub-category data if editing
    useEffect(() => {
        if (isEditing) {
            // Ensure parent categories are loaded before trying to fetch sub-category
            if (parentCategories.length > 0 || loadingError) {
                setLoading(true); // Indicate loading sub-category data
                setError(null);
                axios.get(`${API_BASE_URL}/sub-categories/${subCategoryId}`)
                    .then(response => {
                        setName(response.data.name);
                        setCategoryId(response.data.category_id); // Set the parent category dropdown
                        setLoading(false);
                    })
                    .catch(err => {
                        console.error("Error fetching sub-category details:", err);
                        setError('Failed to load sub-category data.');
                        setLoading(false);
                    });
            }
        } else {
            // Reset form for 'new' mode
            setName('');
            setCategoryId('');
            setError(null);
        }
    // Depend on parentCategories loading state indirectly via loadingError
    }, [subCategoryId, isEditing, parentCategories.length, loadingError]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Basic validation
        if (!name.trim()) {
            setError('Sub-category name is required.');
            setLoading(false);
            return;
        }
        if (!categoryId) {
            setError('Parent category must be selected.');
            setLoading(false);
            return;
        }


        const subCategoryData = {
            name: name.trim(),
            category_id: parseInt(categoryId), // Ensure it's an integer
        };

        try {
            if (isEditing) {
                await axios.put(`${API_BASE_URL}/sub-categories/${subCategoryId}`, subCategoryData);
            } else {
                await axios.post(`${API_BASE_URL}/sub-categories`, subCategoryData);
            }
            navigate('/sub-categories'); // Go back to list on success
        } catch (err) {
            console.error("Error saving sub-category:", err);
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} sub-category.`);
        } finally {
            setLoading(false);
        }
    };

    // Show loading indicator
    // Prioritize loading error for parent categories
    if (loadingError) return <p style={{ color: 'red' }}>Error: {loadingError}</p>;
    // Show general loading if fetching dropdowns or editing data
    if (loading && (!isEditing || !name)) return <p>Loading...</p>;


    return (
        <div>
            <h2>{isEditing ? 'Edit Sub-Category' : 'Add New Sub-Category'}</h2>
            {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px' }}>Error: {error}</p>}

            <form onSubmit={handleSubmit}>
                {/* Parent Category Dropdown */}
                 <div style={styles.formGroup}>
                    <label htmlFor="parentCategory" style={styles.label}>Parent Category: *</label>
                    <select
                        id="parentCategory"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        required
                        style={styles.input}
                        disabled={loading || parentCategories.length === 0} // Disable if loading or no options
                    >
                        <option value="">-- Select Parent Category --</option>
                        {parentCategories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                     {parentCategories.length === 0 && !loading && !loadingError && <p style={{fontSize:'0.9em', color:'grey'}}>No parent categories available.</p>}
                </div>


                {/* Sub-Category Name Input */}
                <div style={styles.formGroup}>
                    <label htmlFor="subCategoryName" style={styles.label}>Sub-Category Name: *</label>
                    <input
                        type="text"
                        id="subCategoryName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={loading}
                    />
                </div>


                {/* Action Buttons */}
                <div style={styles.buttonGroup}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={styles.buttonPrimary}
                    >
                        {loading ? 'Saving...' : (isEditing ? 'Update Sub-Category' : 'Create Sub-Category')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/sub-categories')}
                        style={styles.buttonSecondary}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// Basic Inline Styles (match CategoryForm styles)
const styles = {
    container: { padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' },
    title: { marginBottom: '20px', color: '#333' },
    errorBox: { color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px', borderRadius: '4px', backgroundColor: '#ffe6e6' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
    buttonGroup: { marginTop: '25px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px', opacity: 1 },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' },
};

export default SubCategoryForm;
