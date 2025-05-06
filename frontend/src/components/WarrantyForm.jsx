import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function WarrantyForm() {
    const { warrantyId } = useParams();
    const navigate = useNavigate();
    const { api } = useAuth();
    const isEditing = Boolean(warrantyId);

    const [name, setName] = useState('');
    const [durationMonths, setDurationMonths] = useState('');
    const [description, setDescription] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchWarrantyData = useCallback(async () => {
        if (!isEditing || !api) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/warranties/${warrantyId}`);
            const data = response.data;
            setName(data.name);
            setDurationMonths(data.duration_months?.toString() ?? '');
            setDescription(data.description || '');
        } catch (err) {
            console.error("Error fetching warranty details:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load warranty data.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch warranty. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    }, [warrantyId, isEditing, api]);

    useEffect(() => {
        if (isEditing) {
            fetchWarrantyData();
        } else {
            setName('');
            setDurationMonths('');
            setDescription('');
            setError(null);
        }
    }, [isEditing, fetchWarrantyData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

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
            duration_months: parsedDuration,
            description: description.trim() === '' ? null : description.trim(),
        };

        if (!warrantyData.name) {
            setError("Warranty name cannot be empty.");
            setLoading(false);
            return;
        }

        try {
            if (isEditing) {
                await api.put(`/warranties/${warrantyId}`, warrantyData);
            } else {
                await api.post('/warranties', warrantyData);
            }
            navigate('/warranties');
        } catch (err) {
            console.error("Error saving warranty:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} warranty.`;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not save warranty. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing && !name) return <p style={styles.centeredMessage}>Loading warranty details...</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Warranty' : 'Add New Warranty'}</h2>
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
                    <textarea id="warrantyDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" style={styles.textarea} disabled={loading} placeholder="Details about the warranty terms and conditions..."/>
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}> {loading ? 'Saving...' : (isEditing ? 'Update Warranty' : 'Create Warranty')} </button>
                    <button type="button" onClick={() => navigate('/warranties')} style={styles.buttonSecondary} disabled={loading}> Cancel </button>
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
    textarea: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontSize: '1em' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default WarrantyForm;