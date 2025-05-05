// frontend/src/components/BrandForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function BrandForm() {
    const { brandId } = useParams(); // Get ID from URL if editing
    const navigate = useNavigate();
    const isEditing = Boolean(brandId);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch existing brand data if editing
    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            setError(null);
            axios.get(`${API_BASE_URL}/brands/${brandId}`)
                .then(response => {
                    setName(response.data.name);
                    setDescription(response.data.description || ''); // Handle null description
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching brand details:", err);
                    setError('Failed to load brand data. It might not exist.');
                    setLoading(false);
                });
        } else {
            // Reset form for 'new' mode
            setName('');
            setDescription('');
            setError(null);
        }
    }, [brandId, isEditing]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const brandData = {
            name: name.trim(),
            description: description.trim() === '' ? null : description.trim(),
        };

        if (!brandData.name) {
             setError("Brand name cannot be empty.");
             setLoading(false);
             return;
        }

        try {
            if (isEditing) {
                await axios.put(`${API_BASE_URL}/brands/${brandId}`, brandData);
            } else {
                await axios.post(`${API_BASE_URL}/brands`, brandData);
            }
            navigate('/brands'); // Go back to list on success
        } catch (err) {
            console.error("Error saving brand:", err);
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} brand.`);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing) return <p>Loading brand details...</p>;

    return (
        <div>
            <h2>{isEditing ? 'Edit Brand' : 'Add New Brand'}</h2>
            {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px' }}>Error: {error}</p>}

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
                        disabled={loading}
                    />
                </div>

                <div style={styles.formGroup}>
                    <label htmlFor="brandDescription" style={styles.label}>Description:</label>
                    <textarea
                        id="brandDescription"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="4"
                        style={styles.textarea}
                        disabled={loading}
                    />
                </div>

                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}>
                        {loading ? 'Saving...' : (isEditing ? 'Update Brand' : 'Create Brand')}
                    </button>
                    <button type="button" onClick={() => navigate('/brands')} style={styles.buttonSecondary} disabled={loading}>
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
    textarea: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px' },
    buttonGroup: { marginTop: '25px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px', opacity: 1 },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' },
};


export default BrandForm;
