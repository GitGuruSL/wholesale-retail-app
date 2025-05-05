// frontend/src/components/WarrantyForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function WarrantyForm() {
    const { warrantyId } = useParams();
    const navigate = useNavigate();
    const isEditing = Boolean(warrantyId);

    // State variables
    const [name, setName] = useState('');
    const [durationMonths, setDurationMonths] = useState(''); // Store as string for input
    const [description, setDescription] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch existing data if editing
    useEffect(() => {
        if (isEditing) {
            setLoading(true); setError(null);
            axios.get(`${API_BASE_URL}/warranties/${warrantyId}`)
                .then(response => {
                    const data = response.data;
                    setName(data.name);
                    setDurationMonths(data.duration_months?.toString() ?? ''); // Handle null, convert to string
                    setDescription(data.description || '');
                    setLoading(false);
                })
                .catch(err => { console.error("Error fetching warranty:", err); setError('Failed to load warranty data.'); setLoading(false); });
        } else { setName(''); setDurationMonths(''); setDescription(''); setError(null); }
    }, [warrantyId, isEditing]);

    const handleSubmit = async (e) => {
        e.preventDefault(); setLoading(true); setError(null);

        let parsedDuration = null;
        if (durationMonths.trim() !== '') {
            parsedDuration = parseInt(durationMonths, 10);
            if (isNaN(parsedDuration) || parsedDuration < 0) {
                setError("Duration (Months) must be a valid non-negative number or empty.");
                setLoading(false);
                return;
            }
        }

        const warrantyData = {
            name: name.trim(),
            duration_months: parsedDuration, // Send parsed number or null
            description: description.trim() === '' ? null : description.trim(),
        };

        if (!warrantyData.name) { setError("Warranty name cannot be empty."); setLoading(false); return; }

        try {
            if (isEditing) { await axios.put(`${API_BASE_URL}/warranties/${warrantyId}`, warrantyData); }
            else { await axios.post(`${API_BASE_URL}/warranties`, warrantyData); }
            navigate('/warranties');
        } catch (err) { console.error("Error saving warranty:", err); setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} warranty.`); }
        finally { setLoading(false); }
    };

    if (loading && isEditing) return <p>Loading warranty details...</p>;

    return (
        <div>
            <h2>{isEditing ? 'Edit Warranty' : 'Add New Warranty'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="warrantyName" style={styles.label}>Warranty Name: *</label>
                    <input type="text" id="warrantyName" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} disabled={loading} placeholder="e.g., 1 Year Limited, 6 Month RTB"/>
                </div>
                 <div style={styles.formGroup}>
                    <label htmlFor="durationMonths" style={styles.label}>Duration (Months):</label>
                    <input type="number" id="durationMonths" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} style={styles.input} disabled={loading} min="0" step="1" placeholder="e.g., 12 (Leave blank if not applicable)"/>
                </div>
                 <div style={styles.formGroup}>
                    <label htmlFor="warrantyDescription" style={styles.label}>Description:</label>
                    <textarea id="warrantyDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" style={styles.textarea} disabled={loading}/>
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}> {loading ? 'Saving...' : (isEditing ? 'Update Warranty' : 'Create Warranty')} </button>
                    <button type="button" onClick={() => navigate('/warranties')} style={styles.buttonSecondary} disabled={loading}> Cancel </button>
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

export default WarrantyForm;
