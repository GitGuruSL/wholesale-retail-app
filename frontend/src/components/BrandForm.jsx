import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function BrandForm() {
    const { brandId } = useParams(); // Get brandId from URL parameters if present
    const navigate = useNavigate();
    const isEditing = Boolean(brandId);

    const [name, setName] = useState('');
    // Add description if your brands have a description field and your backend supports it
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState(null); // For displaying errors to the user

    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            setFormError(null);
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

            axios.get(`${API_BASE_URL}/brands/${brandId}`, config)
                .then(response => {
                    setName(response.data.name);
                    if (response.data.description) setDescription(response.data.description);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching brand details:", err);
                    const errorMsg = err.response?.data?.message || 'Failed to load brand data.';
                     if (err.response?.status === 401 || err.response?.status === 403) {
                        setFormError('Unauthorized: Could not fetch brand details. Please log in again.');
                    } else {
                        setFormError(errorMsg);
                    }
                    setLoading(false);
                });
        } else {
            // Reset form for new brand
            setName('');
            setDescription('');
            setFormError(null);
        }
    }, [brandId, isEditing, navigate]); // Added navigate to dependency array

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFormError(null);

        if (!name.trim()) {
            setFormError("Brand name cannot be empty.");
            setLoading(false);
            return;
        }

        const brandData = {
            name: name.trim(),
            description: description.trim() === '' ? null : description.trim(),
        };

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

            if (isEditing) {
                await axios.put(`${API_BASE_URL}/brands/${brandId}`, brandData, config);
            } else {
                await axios.post(`${API_BASE_URL}/brands`, brandData, config);
            }
            navigate('/brands'); // Navigate back to the brand list after successful operation
        } catch (err) {
            console.error("Error saving brand:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} brand.`;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setFormError('Unauthorized: Could not save brand. Please log in again.');
            } else {
                setFormError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };
    
    // Initial loading state for fetching data in edit mode
    if (loading && isEditing) return <p style={styles.centeredMessage}>Loading brand details...</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Brand' : 'Add New Brand'}</h2>

            {formError && <p style={styles.errorBox}>Error: {formError}</p>}

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

                {
                <div style={styles.formGroup}>
                    <label htmlFor="brandDescription" style={styles.label}>Description:</label>
                    <textarea
                        id="brandDescription"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows="3"
                        style={styles.textarea}
                        disabled={loading}
                    />
                </div>
                }

                <div style={styles.buttonGroup}>
                    <button
                        type="submit"
                        disabled={loading}
                        style={styles.buttonPrimary}
                    >
                        {loading ? 'Saving...' : (isEditing ? 'Update Brand' : 'Create Brand')}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/brands')}
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

// --- Basic Inline Styles (Consider refactoring for larger applications) ---
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

export default BrandForm;