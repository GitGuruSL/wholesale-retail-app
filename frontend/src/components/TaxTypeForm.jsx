import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function TaxTypeForm() {
    const { typeId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(typeId);

    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token && isEditing) {
            setError('Authentication token not found. Please log in.');
            setLoading(false);
            // navigate('/login'); // Optionally redirect
            return;
        }

        if (isEditing) {
            setLoading(true);
            setError(null);
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            axios.get(`${API_BASE_URL}/tax-types/${typeId}`, config)
                .then(response => {
                    setName(response.data.name);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching tax type:", err);
                    const errorMsg = err.response?.data?.message || 'Failed to load tax type data.';
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        setError('Unauthorized: Could not fetch tax type. Please log in again.');
                    } else {
                        setError(errorMsg);
                    }
                    setLoading(false);
                });
        } else {
            setName('');
            setError(null);
        }
    }, [typeId, isEditing, navigate]); // Added navigate

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const typeData = { name: name.trim() };

        if (!typeData.name) {
            setError("Tax type name cannot be empty.");
            setLoading(false);
            return;
        }

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
                await axios.put(`${API_BASE_URL}/tax-types/${typeId}`, typeData, config);
            } else {
                await axios.post(`${API_BASE_URL}/tax-types`, typeData, config);
            }
            navigate('/tax-types');
        } catch (err) {
            console.error("Error saving tax type:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} tax type.`;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not save tax type. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing) return <p style={styles.centeredMessage}>Loading tax type details...</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Tax Type' : 'Add New Tax Type'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="typeName" style={styles.label}>Type Name: *</label>
                    <input
                        type="text"
                        id="typeName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={loading}
                        placeholder="e.g., Percentage, Fixed Amount, Per Item"
                    />
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}>
                        {loading ? 'Saving...' : (isEditing ? 'Update Type' : 'Create Type')}
                    </button>
                    <button type="button" onClick={() => navigate('/tax-types')} style={styles.buttonSecondary} disabled={loading}>
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
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default TaxTypeForm;