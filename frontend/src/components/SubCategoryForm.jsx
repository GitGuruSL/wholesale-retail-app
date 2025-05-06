import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function SubCategoryForm() {
    const { subCategoryId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(subCategoryId);

    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [parentCategories, setParentCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [loadingError, setLoadingError] = useState(null);

    const fetchParentCategories = useCallback(async (token) => {
        setLoading(true);
        setLoadingError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_BASE_URL}/categories`, config);
            setParentCategories(response.data || []);
            if (!isEditing) setLoading(false); // Only stop loading if not editing, as editing will have another fetch
        } catch (err) {
            console.error("Error fetching parent categories:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load parent categories.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setLoadingError('Unauthorized: Could not fetch parent categories. Please log in again.');
            } else {
                setLoadingError(errorMsg);
            }
            setLoading(false);
        }
    }, [isEditing]);

    const fetchSubCategoryData = useCallback(async (token) => {
        if (!isEditing) return;
        setLoading(true);
        setError(null);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`${API_BASE_URL}/sub-categories/${subCategoryId}`, config);
            setName(response.data.name);
            setCategoryId(response.data.category_id.toString()); // Ensure it's a string for select value
            setLoading(false);
        } catch (err) {
            console.error("Error fetching sub-category details:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load sub-category data.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch sub-category. Please log in again.');
            } else {
                setError(errorMsg);
            }
            setLoading(false);
        }
    }, [isEditing, subCategoryId]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setError('Authentication token not found. Please log in.');
            setLoading(false);
            // navigate('/login'); // Optionally redirect
            return;
        }
        fetchParentCategories(token);
    }, [fetchParentCategories, navigate]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token && isEditing) {
            setError('Authentication token not found. Please log in.');
            setLoading(false);
            return;
        }
        if (isEditing && (parentCategories.length > 0 || loadingError === null)) { // Proceed if parent cats loaded or no error yet
            fetchSubCategoryData(token);
        } else if (!isEditing) {
            setName('');
            setCategoryId('');
            setError(null);
        }
    }, [isEditing, parentCategories.length, loadingError, fetchSubCategoryData, navigate]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

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
            category_id: parseInt(categoryId),
        };

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setLoading(false);
                // navigate('/login'); // Optionally redirect
                return;
            }
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            if (isEditing) {
                await axios.put(`${API_BASE_URL}/sub-categories/${subCategoryId}`, subCategoryData, config);
            } else {
                await axios.post(`${API_BASE_URL}/sub-categories`, subCategoryData, config);
            }
            navigate('/sub-categories');
        } catch (err) {
            console.error("Error saving sub-category:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} sub-category.`;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not save sub-category. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loadingError) return <p style={styles.errorBox}>Error: {loadingError}</p>;
    if (loading && (!isEditing || !name)) return <p style={styles.centeredMessage}>Loading...</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Sub-Category' : 'Add New Sub-Category'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}

            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="parentCategory" style={styles.label}>Parent Category: *</label>
                    <select
                        id="parentCategory"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        required
                        style={styles.input}
                        disabled={loading || parentCategories.length === 0}
                    >
                        <option value="">-- Select Parent Category --</option>
                        {parentCategories.map(cat => (
                            <option key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                    {parentCategories.length === 0 && !loading && !loadingError && <p style={styles.fieldHelperText}>No parent categories available. Please add a parent category first.</p>}
                </div>

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
                        placeholder="e.g., Smartphones, Laptops, T-Shirts"
                    />
                </div>

                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}>
                        {loading ? 'Saving...' : (isEditing ? 'Update Sub-Category' : 'Create Sub-Category')}
                    </button>
                    <button type="button" onClick={() => navigate('/sub-categories')} style={styles.buttonSecondary} disabled={loading}>
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
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    fieldHelperText: { fontSize: '0.9em', color: '#666', marginTop: '5px' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default SubCategoryForm;