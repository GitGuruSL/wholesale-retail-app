// frontend/src/components/SpecialCategoryForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function SpecialCategoryForm() {
    const { categoryId } = useParams(); // Get ID from URL if editing
    const navigate = useNavigate();
    const isEditing = Boolean(categoryId);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEditing) {
            setLoading(true); setError(null);
            axios.get(`${API_BASE_URL}/special-categories/${categoryId}`)
                .then(response => {
                    setName(response.data.name);
                    setDescription(response.data.description || '');
                    setLoading(false);
                })
                .catch(err => { console.error("Error fetching special category:", err); setError('Failed to load special category data.'); setLoading(false); });
        } else { setName(''); setDescription(''); setError(null); }
    }, [categoryId, isEditing]);

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError(null);
        const categoryData = {
            name: name.trim(),
            description: description.trim() === '' ? null : description.trim(),
        };
        if (!categoryData.name) { setError("Category name cannot be empty."); setLoading(false); return; }

        try {
            if (isEditing) { await axios.put(`${API_BASE_URL}/special-categories/${categoryId}`, categoryData); }
            else { await axios.post(`${API_BASE_URL}/special-categories`, categoryData); }
            navigate('/special-categories');
        } catch (err) { console.error("Error saving special category:", err); setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} special category.`); }
        finally { setLoading(false); }
    };

    if (loading && isEditing) return <p>Loading special category details...</p>;

    return (
        <div>
            <h2>{isEditing ? 'Edit Special Category' : 'Add New Special Category'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="categoryName" style={styles.label}>Category Name: *</label>
                    <input type="text" id="categoryName" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} disabled={loading}/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="categoryDescription" style={styles.label}>Description:</label>
                    <textarea id="categoryDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" style={styles.textarea} disabled={loading}/>
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}> {loading ? 'Saving...' : (isEditing ? 'Update Category' : 'Create Category')} </button>
                    <button type="button" onClick={() => navigate('/special-categories')} style={styles.buttonSecondary} disabled={loading}> Cancel </button>
                </div>
            </form>
        </div>
    );
}

// Basic Inline Styles
const styles = { /* ... copy styles from previous forms ... */
    container: { padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' },
    title: { marginBottom: '20px', color: '#333' },
    errorBox: { color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px', borderRadius: '4px', backgroundColor: '#ffe6e6' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
    textarea: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '60px' },
    buttonGroup: { marginTop: '25px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px', opacity: 1 },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' },
};

export default SpecialCategoryForm;
