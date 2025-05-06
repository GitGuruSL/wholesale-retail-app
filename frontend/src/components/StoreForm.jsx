import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function StoreForm() {
    const { storeId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(storeId);

    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            setError(null);
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
            axios.get(`${API_BASE_URL}/stores/${storeId}`, config)
                .then(response => {
                    const data = response.data;
                    setName(data.name);
                    setAddress(data.address || '');
                    setContactInfo(data.contact_info || '');
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching store details:", err);
                    const errorMsg = err.response?.data?.message || 'Failed to load store data.';
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        setError('Unauthorized: Could not fetch store. Please log in again.');
                    } else {
                        setError(errorMsg);
                    }
                    setLoading(false);
                });
        } else {
            setName('');
            setAddress('');
            setContactInfo('');
            setError(null);
        }
    }, [storeId, isEditing, navigate]); // Added navigate

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const storeData = {
            name: name.trim(),
            address: address.trim() === '' ? null : address.trim(),
            contact_info: contactInfo.trim() === '' ? null : contactInfo.trim(),
        };

        if (!storeData.name) {
            setError("Store name cannot be empty.");
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
                await axios.put(`${API_BASE_URL}/stores/${storeId}`, storeData, config);
            } else {
                await axios.post(`${API_BASE_URL}/stores`, storeData, config);
            }
            navigate('/stores');
        } catch (err) {
            console.error("Error saving store:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} store.`;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not save store. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing) return <p style={styles.centeredMessage}>Loading store details...</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Store' : 'Add New Store'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="storeName" style={styles.label}>Store Name: *</label>
                    <input
                        type="text"
                        id="storeName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={loading}
                        placeholder="e.g., Main Branch, Downtown Outlet"
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="storeAddress" style={styles.label}>Address:</label>
                    <textarea
                        id="storeAddress"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows="3"
                        style={styles.textarea}
                        disabled={loading}
                        placeholder="e.g., 123 Main St, Anytown, USA"
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="storeContact" style={styles.label}>Contact Info:</label>
                    <input
                        type="text"
                        id="storeContact"
                        value={contactInfo}
                        onChange={(e) => setContactInfo(e.target.value)}
                        style={styles.input}
                        disabled={loading}
                        placeholder="e.g., (555) 123-4567, manager@example.com"
                    />
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}>
                        {loading ? 'Saving...' : (isEditing ? 'Update Store' : 'Create Store')}
                    </button>
                    <button type="button" onClick={() => navigate('/stores')} style={styles.buttonSecondary} disabled={loading}>
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
    textarea: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontSize: '1em' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default StoreForm;