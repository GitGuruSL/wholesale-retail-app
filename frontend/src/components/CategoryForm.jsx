// frontend/src/components/CategoryForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

// Configuration
const API_BASE_URL = 'http://localhost:5001/api'; // Use environment variables for production

// Component for Adding or Editing a Category
function CategoryForm() {
    // Hooks
    const { categoryId } = useParams(); // Get categoryId from URL parameters if present
    const navigate = useNavigate(); // Hook for programmatic navigation
    const isEditing = Boolean(categoryId); // Determine if we are editing or creating

    // State variables
    const [name, setName] = useState(''); // Category name input
    const [description, setDescription] = useState(''); // Category description input
    const [parentCategoryId, setParentCategoryId] = useState(''); // For parent category selection
    const [allCategories, setAllCategories] = useState([]); // For parent category dropdown
    const [loading, setLoading] = useState(false); // Tracks loading state (for API calls)
    const [formError, setFormError] = useState(null); // Stores error messages, renamed from 'error'

    // useEffect hook to fetch category data when editing and all categories for dropdown
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token && (isEditing || !allCategories.length)) { // Check token if we need to make a call
            setFormError('Authentication token not found. Please log in.');
            setLoading(false);
            // navigate('/login'); // Optionally redirect
            return;
        }
        const config = { headers: { Authorization: `Bearer ${token}` } };

        const fetchAllCategoriesForDropdown = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/categories`, config); // Added config
                setAllCategories(response.data);
            } catch (err) {
                console.error("Error fetching all categories for dropdown:", err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                     setFormError('Unauthorized: Could not load parent categories. Please log in again.');
                } else {
                    setFormError('Failed to load list of parent categories.');
                }
            }
        };

        fetchAllCategoriesForDropdown();

        if (isEditing) {
            setLoading(true); // Start loading indicator
            setFormError(null); // Clear previous errors
            axios.get(`${API_BASE_URL}/categories/${categoryId}`, config) // Added config
                .then(response => {
                    // Populate form fields with fetched data
                    setName(response.data.name);
                    setDescription(response.data.description || ''); // Handle null description from DB
                    setParentCategoryId(response.data.parent_category_id ? String(response.data.parent_category_id) : '');
                    setLoading(false); // Stop loading indicator
                })
                .catch(err => {
                    console.error("Error fetching category details:", err);
                    const errorMsg = err.response?.data?.message || 'Failed to load category data.';
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        setFormError('Unauthorized: Could not fetch category details. Please log in again.');
                    } else {
                        setFormError(errorMsg);
                    }
                    setLoading(false); // Stop loading indicator even on error
                });
        } else {
            // If creating a new category, ensure form is reset
            setName('');
            setDescription('');
            setParentCategoryId('');
            setFormError(null);
        }
    }, [categoryId, isEditing, navigate]); // Added navigate to dependency array

    // Handler for form submission
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default browser form submission
        setLoading(true); // Start loading indicator
        setFormError(null); // Clear previous errors

        // Prepare data payload for the API
        const categoryData = {
            name: name.trim(), // Trim whitespace from name
            description: description.trim() === '' ? null : description.trim(),
            parent_category_id: parentCategoryId ? parseInt(parentCategoryId, 10) : null,
        };

        if (!categoryData.name) {
             setFormError("Category name cannot be empty.");
             setLoading(false);
             return;
        }
        // Prevent setting category as its own parent
        if (isEditing && categoryData.parent_category_id === parseInt(categoryId, 10)) {
            setFormError("A category cannot be its own parent.");
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setFormError('Authentication token not found. Please log in.');
                setLoading(false);
                // navigate('/login'); // Optionally redirect
                return;
            }
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            // Choose API endpoint and method based on whether we are editing or creating
            if (isEditing) {
                await axios.put(`${API_BASE_URL}/categories/${categoryId}`, categoryData, config); // Added config
            } else {
                await axios.post(`${API_BASE_URL}/categories`, categoryData, config); // Added config
            }
            navigate('/categories'); // Navigate back to the category list on success
        } catch (err) {
            console.error("Error saving category:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} category.`;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setFormError('Unauthorized: Could not save category. Please log in again.');
            } else {
                setFormError(errorMsg);
            }
        } finally {
            setLoading(false); // Stop loading indicator regardless of success/failure
        }
    };

    // --- Render Logic ---

    // Display loading message while fetching data for editing or initial parent categories
    if (loading && (isEditing || !allCategories.length)) return <p style={styles.centeredMessage}>Loading category details...</p>;

    // Filter out the current category from the parent options when editing
    const parentCategoryOptions = isEditing
        ? allCategories.filter(cat => cat.id !== parseInt(categoryId, 10))
        : allCategories;

    // Render the form
    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Category' : 'Add New Category'}</h2>

            {/* Display error message if any */}
            {formError && <p style={styles.errorBox}>Error: {formError}</p>}

            <form onSubmit={handleSubmit}>
                {/* Category Name Input */}
                <div style={styles.formGroup}>
                    <label htmlFor="categoryName" style={styles.label}>Category Name: *</label>
                    <input
                        type="text"
                        id="categoryName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required // HTML5 validation for required field
                        style={styles.input}
                        disabled={loading} // Disable input while loading
                    />
                </div>

                {/* Parent Category Dropdown */}
                <div style={styles.formGroup}>
                    <label htmlFor="parentCategory" style={styles.label}>Parent Category:</label>
                    <select
                        id="parentCategory"
                        value={parentCategoryId}
                        onChange={(e) => setParentCategoryId(e.target.value)}
                        style={styles.input}
                        disabled={loading || !allCategories.length}
                    >
                        <option value="">-- None (Top Level) --</option>
                        {parentCategoryOptions.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name} (ID: {cat.id})
                            </option>
                        ))}
                    </select>
                    {!allCategories.length && !loading && !formError && <p style={{fontSize: '0.9em', color: 'grey'}}>Loading parent categories...</p>}
                </div>


                {/* Category Description Input */}
                <div style={styles.formGroup}>
                    <label htmlFor="categoryDescription" style={styles.label}>Description:</label>
                    <textarea
                        id="categoryDescription"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="4"
                        style={styles.textarea}
                        disabled={loading} // Disable input while loading
                    />
                </div>

                {/* Action Buttons */}
                <div style={styles.buttonGroup}>
                    <button
                        type="submit"
                        disabled={loading} // Disable button while loading
                        style={styles.buttonPrimary}
                    >
                        {loading ? 'Saving...' : (isEditing ? 'Update Category' : 'Create Category')}
                    </button>
                    {/* Cancel button navigates back to the list */}
                    <button
                        type="button"
                        onClick={() => navigate('/categories')}
                        style={styles.buttonSecondary}
                        disabled={loading} // Disable cancel button while loading
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// --- Basic Inline Styles ---
const styles = {
    container: { padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { marginBottom: '25px', color: '#333', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    textarea: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontSize: '1em' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};


export default CategoryForm;