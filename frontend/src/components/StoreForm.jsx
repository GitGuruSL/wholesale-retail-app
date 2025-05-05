// frontend/src/components/StoreForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function StoreForm() {
    const { storeId } = useParams(); // Get ID from URL if editing
    const navigate = useNavigate();
    const isEditing = Boolean(storeId);

    // State variables for form fields
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [contactInfo, setContactInfo] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch existing store data if editing
    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            setError(null);
            axios.get(`${API_BASE_URL}/stores/${storeId}`)
                .then(response => {
                    const data = response.data;
                    setName(data.name);
                    setAddress(data.address || ''); // Handle nulls
                    setContactInfo(data.contact_info || ''); // Handle nulls
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching store details:", err);
                    setError('Failed to load store data. It might not exist.');
                    setLoading(false);
                });
        } else {
            // Reset form for 'new' mode
            setName('');
            setAddress('');
            setContactInfo('');
            setError(null);
        }
    }, [storeId, isEditing]);

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
            if (isEditing) {
                await axios.put(`${API_BASE_URL}/stores/${storeId}`, storeData);
            } else {
                await axios.post(`${API_BASE_URL}/stores`, storeData);
            }
            navigate('/stores'); // Go back to list on success
        } catch (err) {
            console.error("Error saving store:", err);
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} store.`);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing) return <p>Loading store details...</p>;

    return (
        <div>
            <h2>{isEditing ? 'Edit Store' : 'Add New Store'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}

            <form onSubmit={handleSubmit}>
                {/* Store Name Input */}
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
                    />
                </div>

                {/* Store Address Input */}
                <div style={styles.formGroup}>
                    <label htmlFor="storeAddress" style={styles.label}>Address:</label>
                    <textarea
                        id="storeAddress"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        rows="3"
                        style={styles.textarea}
                        disabled={loading}
                    />
                </div>

                 {/* Store Contact Info Input */}
                 <div style={styles.formGroup}>
                    <label htmlFor="storeContact" style={styles.label}>Contact Info:</label>
                    <input
                        type="text"
                        id="storeContact"
                        value={contactInfo}
                        onChange={(e) => setContactInfo(e.target.value)}
                        style={styles.input}
                        disabled={loading}
                        placeholder="e.g., Phone number, Email"
                    />
                </div>


                {/* Action Buttons */}
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

// Basic Inline Styles
const styles = {
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

export default StoreForm;
